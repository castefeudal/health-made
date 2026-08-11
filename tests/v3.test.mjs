import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,migrateV2ToV3,validateState,SCHEMA_VERSION} from '../src/v3/schema.js';
import {HealthRepository,verifyBackupChecksum} from '../src/v3/storage.js';
import {findAnalyte,convertValue,normalizeResult,labStatus,delta} from '../src/v3/labs.js';
import {parseCsv,parseLabText,duplicateScore,buildReportFromCandidates,validateUpload} from '../src/v3/importers.js';
import {buildAIContext,validateAIResponse,AIGateway} from '../src/v3/ai.js';
import {encryptBackup,decryptBackup} from '../src/v3/crypto.js';
import {pearson,pairByDate} from '../src/v3/analytics.js';
import {OCRGateway} from '../src/v3/ocr.js';
import {buildDoctorBrief} from '../src/v3/brief.js';

const glucose={id:'glucose',canonicalRu:'Глюкоза',shortRu:'Глюкоза',englishName:'Glucose',abbreviations:['GLU'],russianAliases:['сахар крови'],category:'Углеводный обмен',allowedUnits:['ммоль/л','mg/dL'],canonicalUnit:'ммоль/л',unitConversions:{'мг/дл->ммоль/л':v=>v/18.0182},loincCodes:[],fsliCode:null};
const lpa={id:'lpa',canonicalRu:'Липопротеин(a)',shortRu:'Lp(a)',englishName:'Lipoprotein(a)',abbreviations:['Lp(a)'],russianAliases:['липопротеин а'],category:'Липиды',allowedUnits:['mg/dL','nmol/L'],canonicalUnit:null,unitConversions:{},loincCodes:[],fsliCode:null};
const ferritin={id:'ferritin',canonicalRu:'Ферритин',shortRu:'Ферритин',englishName:'Ferritin',abbreviations:['FER'],russianAliases:['ферритин'],category:'Железо',allowedUnits:['нг/мл'],canonicalUnit:'нг/мл',unitConversions:{},loincCodes:[],fsliCode:null};
globalThis.MarkovHealthCatalog={catalog:[glucose,lpa,ferritin]};

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
function legacy(){return {version:2,activeProfileId:'p1',profiles:[{id:'p1',name:'P'}],measurements:[{id:'m1',profileId:'p1',type:'weight',value:100,date:'2026-01-01'}],labs:[{id:'l1',profileId:'p1',name:'Глюкоза',value:90,unit:'mg/dL',referenceMin:70,referenceMax:99,date:'2026-02-01',laboratory:'Lab A'},{id:'l2',profileId:'p1',name:'Ферритин',value:50,unit:'нг/мл',referenceMin:20,referenceMax:200,date:'2026-02-01',laboratory:'Lab A'}],sleep:[],activity:[],training:[],nutrition:[],medications:[],supplements:[],symptoms:[],goals:[],notes:[],settings:{theme:'dark'}};}

test('v2 migration creates v3 reports/results without losing records',()=>{
  const v3=migrateV2ToV3(legacy());
  assert.equal(v3.version,SCHEMA_VERSION);
  assert.equal(v3.labReports.length,1);
  assert.equal(v3.labResults.length,2);
  assert.equal(v3.measurements.length,1);
  assert.equal(v3.labResults[0].collectedAt,'2026-02-01');
  assert.equal(validateState(v3).ok,true);
});

test('validation rejects duplicate and orphan ids',()=>{
  const s=emptyState();s.profiles=[{id:'p1'}];s.activeProfileId='p1';s.measurements=[{id:'x',profileId:'p1'},{id:'x',profileId:'missing'}];
  const check=validateState(s);assert.equal(check.ok,false);assert.ok(check.errors.some(x=>x.startsWith('duplicate-id:')));assert.ok(check.errors.some(x=>x.includes('orphan')));
});

test('repository migrates with safety copy and readback',()=>{
  const storage=new MemoryStorage({markovHealthOSData:JSON.stringify(legacy())});
  const repo=new HealthRepository(storage);const data=repo.load();assert.equal(data.version,3);assert.ok(storage.getItem('markovHealthOSDataSafetyBackup'));assert.equal(JSON.parse(storage.getItem('markovHealthOSData')).version,3);
});


test('repository imports legacy raw v2 backup format',()=>{
  const raw=legacy();raw.backupMetadata={application:'MARKOV_HEALTH_OS',schemaVersion:2,appVersion:'1.1.0'};
  const repo=new HealthRepository(new MemoryStorage());repo.load();const restored=repo.importBackup(raw);assert.equal(restored.version,3);assert.equal(restored.labResults.length,2);
});

test('catalog aliases and analyte-specific conversion work',()=>{
  assert.equal(findAnalyte('сахар крови').id,'glucose');
  const c=convertValue(glucose,90,'mg/dL','ммоль/л');assert.equal(c.ok,true);assert.ok(Math.abs(c.value-4.995)<0.01);
  assert.equal(convertValue(lpa,20,'mg/dL','nmol/L').ok,false);
});

test('normalization converts reference interval with value',()=>{
  const r=normalizeResult({originalName:'Глюкоза',value:90,originalValue:90,originalUnit:'mg/dL',referenceLow:70,referenceHigh:99,valueType:'numeric'});
  assert.equal(r.canonicalUnit,'ммоль/л');assert.ok(r.referenceLow<4);assert.ok(r.referenceHigh<6);assert.equal(r.referenceConverted,true);assert.equal(r.originalReferenceLow,70);assert.equal(labStatus(r).key,'range');
});

test('delta handles zero denominator safely',()=>{assert.deepEqual(delta(12,10),{absolute:2,percent:20});assert.equal(delta(1,0).percent,null);});

test('CSV parser detects delimiter and aliases',()=>{
  const csv='Показатель;Значение;Единица;Референс min;Референс max\nсахар крови;90;mg/dL;70;99';
  const result=parseCsv(csv);assert.equal(result.delimiter,';');assert.equal(result.rows.length,1);assert.equal(result.rows[0].analyteId,'glucose');
});

test('lab text parser supports less-than operator',()=>{
  const rows=parseLabText('Ферритин < 5 нг/мл 10-100');assert.equal(rows.length,1);assert.equal(rows[0].valueType,'lessThan');assert.equal(rows[0].operator,'<');
});

test('upload validation checks extension, mime and size',()=>{
  assert.equal(validateUpload({name:'a.pdf',type:'application/pdf',size:100},'pdf').ok,true);
  assert.equal(validateUpload({name:'a.pdf',type:'image/png',size:100},'pdf').ok,false);
  assert.equal(validateUpload({name:'a.exe',type:'application/pdf',size:100},'pdf').ok,false);
});

test('duplicate detection finds likely duplicate report',()=>{
  const meta={profileId:'p1',laboratoryName:'Lab A',collectedAt:'2026-02-01',sourceType:'manual'};
  const pack=buildReportFromCandidates([{originalName:'Ферритин',canonicalName:'Ферритин',analyteId:'ferritin',value:50,originalValue:50,originalUnit:'нг/мл',valueType:'numeric',removed:false}],meta);
  const existing={...pack.report,id:'old'};const existingResults=pack.results.map(x=>({...x,id:'old-r',reportId:'old'}));
  assert.ok(duplicateScore(pack.report,pack.results,[existing],existingResults)?.score>=55);
});

test('AI response contract rejects malformed output',()=>{
  const good={summary:'ok',importantFindings:[],changes:[],possibleExplanations:[],missingContext:[],questionsForDoctor:[],limitations:[],confidence:'moderate'};
  assert.equal(validateAIResponse(good).ok,true);assert.equal(validateAIResponse({...good,confidence:'certain'}).ok,false);
});

test('AI context is profile isolated',()=>{
  const s=emptyState();s.profiles=[{id:'p1',name:'A',sex:'male',primaryGoal:'fitness'},{id:'p2',name:'B',sex:'female'}];s.activeProfileId='p1';s.measurements=[{id:'m1',profileId:'p1',type:'weight',value:100},{id:'m2',profileId:'p2',type:'weight',value:80}];
  const ctx=buildAIContext(s,'p1','overview');assert.equal(ctx.profile.sex,'male');assert.equal(ctx.profile.primaryGoal,'fitness');assert.equal('name' in ctx.profile,false);assert.equal(ctx.facts.measurements.length,1);assert.equal(ctx.facts.measurements[0].value,100);
});

test('AI gateway only accepts same-origin endpoint',()=>{
  const old=globalThis.location;Object.defineProperty(globalThis,'location',{value:{origin:'https://health.local'},configurable:true});
  assert.equal(new AIGateway({endpoint:'/api/health-ai'}).configured(),true);assert.equal(new AIGateway({endpoint:'https://evil.example/api'}).configured(),false);
  Object.defineProperty(globalThis,'location',{value:old,configurable:true});
});

test('encrypted backup roundtrip',async()=>{
  const payload={application:'MARKOV_HEALTH_OS',data:{version:3,x:1}};const box=await encryptBackup(payload,'strong-pass-123');const restored=await decryptBackup(box,'strong-pass-123');assert.deepEqual(restored,payload);await assert.rejects(()=>decryptBackup(box,'wrong-pass-123'));
});

test('pearson requires enough observations and pairByDate aligns dates',()=>{
  assert.equal(pearson([[1,2],[2,3]]).ok,false);const pairs=pairByDate([{date:'2026-01-01',value:1},{date:'2026-01-02',value:2}],[{date:'2026-01-02',value:4}]);assert.deepEqual(pairs,[[2,4]]);
});

test('encrypted backup keeps legacy MHOS envelope compatibility',async()=>{
  const text=await encryptBackup({application:'MARKOV_HEALTH_OS',data:{version:3}},'strong-pass-123');const box=JSON.parse(text);assert.equal(box.format,'MHOS_ENCRYPTED_BACKUP');assert.equal(box.formatVersion,1);assert.equal(box.kdf,'PBKDF2-SHA256');assert.equal(box.cipher,'AES-GCM');
});

test('production shell has no inline handlers or generic innerHTML rendering',async()=>{
  const {readFile}=await import('node:fs/promises');const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const app=await readFile(new URL('../src/v3/app.js',import.meta.url),'utf8');assert.equal(/\son[a-z]+\s*=/.test(html),false);assert.equal(app.includes('innerHTML'),false);
});

test('service worker bypasses sensitive API paths and caches v3 modules',async()=>{
  const {readFile}=await import('node:fs/promises');const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');assert.ok(sw.includes("url.pathname.includes('/api/')"));assert.ok(sw.includes("'./src/v3/crypto.js'"));assert.ok(sw.includes("'./src/v3/ocr.js'"));
});


test('backup checksum detects tampering',async()=>{
  const repo=new HealthRepository(new MemoryStorage());const data=repo.load();data.profiles=[{id:'p1'}];data.activeProfileId='p1';repo.replace(data);const payload=await repo.exportBackupWithChecksum();assert.equal((await verifyBackupChecksum(payload)).ok,true);payload.data.profiles[0].id='tampered';assert.equal((await verifyBackupChecksum(payload)).ok,false);
});

test('OCR gateway only accepts same-origin endpoint',()=>{
  const old=globalThis.location;Object.defineProperty(globalThis,'location',{value:{origin:'https://health.local'},configurable:true});
  assert.equal(new OCRGateway({endpoint:'/api/ocr'}).configured(),true);
  assert.equal(new OCRGateway({endpoint:'https://health.local/api/ocr'}).configured(),true);
  assert.equal(new OCRGateway({endpoint:'https://ocr.example/api'}).configured(),false);
  Object.defineProperty(globalThis,'location',{value:old,configurable:true});
});

test('Doctor Brief respects selected sections and profile isolation',()=>{
  const s=emptyState();s.profiles=[{id:'p1',name:'A'},{id:'p2',name:'B'}];s.activeProfileId='p1';
  s.symptoms=[{id:'s1',profileId:'p1',name:'Головная боль',severity:3,startedAt:new Date().toISOString()},{id:'s2',profileId:'p2',name:'Не должен попасть',severity:9,startedAt:new Date().toISOString()}];
  s.measurements=[{id:'m1',profileId:'p1',type:'weight',value:100,date:new Date().toISOString()}];
  const brief=buildDoctorBrief(s,'p1',{periodDays:30,sections:['profile','symptoms'],questions:'Что обсудить?'});
  assert.match(brief,/Имя: A/);assert.match(brief,/Головная боль/);assert.match(brief,/Что обсудить\?/);
  assert.doesNotMatch(brief,/Не должен попасть/);assert.doesNotMatch(brief,/МАССА ТЕЛА/);assert.doesNotMatch(brief,/ДАВЛЕНИЕ/);
});

test('premium shell exposes global quick add and mobile search controls', async()=>{
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../src/v3/app.js',import.meta.url),'utf8');
  for(const id of ['quick-add-button','quick-add-fab','mobile-search-button']) assert.ok(html.includes(`id="${id}"`));
  assert.ok(app.includes("$('#quick-add-button')?.addEventListener('click',openQuickAdd)"));
  assert.ok(app.includes("$('#quick-add-fab')?.addEventListener('click',openQuickAdd)"));
  assert.ok(app.includes("$('#mobile-search-button')?.addEventListener('click',openSearch)"));
});

test('dashboard includes non-medical data freshness surface', async()=>{
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../src/v3/app.js',import.meta.url),'utf8');
  assert.ok(app.includes('function dataFreshnessPanel(){'));
  assert.ok(app.includes('Показывает свежесть записей, а не качество здоровья.'));
});

test('product shell includes local-first onboarding, explicit AI scope and PWA assets',async()=>{
  const {readFile,access}=await import('node:fs/promises');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../src/v3/app.js',import.meta.url),'utf8');
  const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.ok(html.includes('skip-link'));assert.ok(html.includes('og:title'));assert.ok(html.includes('markov-health-os.svg'));
  assert.ok(app.includes('function aiScopePanel(){'));assert.ok(app.includes('function importStepper('));assert.ok(app.includes('function renderAnalyteEducation('));
  assert.ok(manifest.shortcuts?.length>=2);await access(new URL('../assets/icon-192.png',import.meta.url));await access(new URL('../assets/icon-512.png',import.meta.url));
});
