export const APP_ID = 'MARKOV_HEALTH_OS';
export const APP_VERSION = '2.0.0';
export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = 'markovHealthOSData';
export const SAFETY_KEY = 'markovHealthOSDataSafetyBackup';

export const COLLECTIONS = [
  'profiles','measurements','labReports','labResults','events','sleep','activity',
  'training','nutrition','medications','supplements','symptoms','goals','notes'
];

export function nowIso(){ return new Date().toISOString(); }
export function uid(prefix='rec'){
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}
export function emptyState(){
  return {
    version: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    activeProfileId: null,
    profiles: [], measurements: [], labReports: [], labResults: [], events: [],
    sleep: [], activity: [], training: [], nutrition: [], medications: [],
    supplements: [], symptoms: [], goals: [], notes: [],
    settings: {
      theme: 'system', locale: 'ru-RU', modules: {}, lastBackupAt: null,
      ai: { enabled: false, endpoint: '', providerLabel: '' },
      ocr: { enabled: false, endpoint: '', providerLabel: '' }
    },
    metadata: { migratedFrom: null, migratedAt: null, updatedAt: nowIso() }
  };
}

function arr(value){ return Array.isArray(value) ? value : []; }
function text(value){ return value == null ? '' : String(value); }
function finiteOrNull(value){ const n=Number(value); return Number.isFinite(n)?n:null; }

export function validateState(data){
  const errors=[];
  if(!data || typeof data!=='object' || Array.isArray(data)) return {ok:false,errors:['state-not-object']};
  if(Number(data.version)!==SCHEMA_VERSION) errors.push('schema-version');
  for(const key of COLLECTIONS) if(!Array.isArray(data[key])) errors.push(`collection:${key}`);
  const profileIds=new Set(arr(data.profiles).map(x=>x?.id).filter(Boolean));
  const ids=new Set();
  for(const key of COLLECTIONS){
    for(const record of arr(data[key])){
      if(!record || typeof record!=='object'){ errors.push(`${key}:record-object`); continue; }
      if(!record.id){ errors.push(`${key}:missing-id`); continue; }
      if(ids.has(record.id)) errors.push(`duplicate-id:${record.id}`); else ids.add(record.id);
      if(key!=='profiles' && record.profileId && !profileIds.has(record.profileId)) errors.push(`${key}:orphan:${record.id}`);
    }
  }
  const reportIds=new Set(arr(data.labReports).map(x=>x?.id).filter(Boolean));
  for(const result of arr(data.labResults)) if(result.reportId && !reportIds.has(result.reportId)) errors.push(`labResults:orphan-report:${result.id}`);
  if(data.activeProfileId && !profileIds.has(data.activeProfileId)) errors.push('active-profile-orphan');
  return {ok:errors.length===0,errors};
}

function stamp(record, fallback){
  const createdAt=record?.createdAt || fallback || nowIso();
  return {...record, createdAt, updatedAt:record?.updatedAt || createdAt};
}

function legacyLabGroups(labs){
  const groups=new Map();
  for(const lab of labs){
    const profileId=lab.profileId || null;
    const date=lab.date || lab.collectedAt || nowIso().slice(0,10);
    const laboratoryName=text(lab.laboratory || lab.laboratoryName).trim();
    const key=`${profileId||'none'}|${date}|${laboratoryName}`;
    if(!groups.has(key)) groups.set(key,{profileId,date,laboratoryName,labs:[]});
    groups.get(key).labs.push(lab);
  }
  return [...groups.values()];
}

export function migrateV2ToV3(input){
  if(!input || typeof input!=='object') throw new Error('Legacy state is not an object');
  if(Number(input.version)!==2) throw new Error(`Expected schema v2, received ${input.version}`);
  const out=emptyState();
  const migratedAt=nowIso();
  out.metadata={migratedFrom:2,migratedAt,updatedAt:migratedAt};
  out.settings={...out.settings,...(input.settings||{}),ai:{...out.settings.ai,...(input.settings?.ai||{})}};
  out.profiles=arr(input.profiles).map(p=>stamp({...p,id:p.id||uid('profile')},migratedAt));
  out.activeProfileId=input.activeProfileId || out.profiles[0]?.id || null;
  for(const key of ['measurements','sleep','activity','training','nutrition','medications','supplements','symptoms','goals','notes']){
    out[key]=arr(input[key]).map(r=>stamp({...r,id:r.id||uid(key.slice(0,-1)||'rec')},migratedAt));
  }
  for(const group of legacyLabGroups(arr(input.labs))){
    const reportId=uid('lab-report');
    out.labReports.push(stamp({
      id:reportId, profileId:group.profileId, laboratoryName:group.laboratoryName,
      laboratoryId:null, reportNumber:'', orderName:'', collectedAt:group.date, reportedAt:null,
      fasting:null, fastingHours:null, specimen:'', specimenDetails:'', comment:'',
      sourceType:'migration', sourceFileId:null, sourceFileName:null,
      provenance:{sourceSchema:2,legacyCount:group.labs.length}
    },migratedAt));
    for(const lab of group.labs){
      const rawValue=lab.value ?? null;
      const n=finiteOrNull(rawValue);
      const valueType=n===null?'text':'numeric';
      out.labResults.push(stamp({
        id:lab.id || uid('lab-result'), profileId:group.profileId, reportId,
        analyteId:lab.analyteId || null, originalName:text(lab.name||lab.originalName),
        canonicalName:text(lab.canonicalName||lab.name||lab.originalName), valueType,
        value:n, qualitativeValue:n===null?text(rawValue):'', operator:null,
        originalValue:rawValue, originalUnit:text(lab.unit||lab.originalUnit),
        canonicalValue:lab.canonicalValue ?? n, canonicalUnit:text(lab.canonicalUnit||lab.unit||lab.originalUnit),
        referenceLow:lab.referenceLow ?? lab.referenceMin ?? null,
        referenceHigh:lab.referenceHigh ?? lab.referenceMax ?? null,
        referenceText:text(lab.referenceText), referenceSource:'laboratory',
        referenceSex:null, referenceAge:null, referenceMethod:null, referenceSpecimen:null,
        originalFlag:text(lab.originalFlag), extractionConfidence:'high', verifiedByUser:true,
        collectedAt:group.date, laboratoryName:group.laboratoryName, provenance:{sourceType:'migration',legacyRecord:{...lab}}
      },migratedAt));
    }
  }
  const check=validateState(out);
  if(!check.ok) throw new Error(`Migration validation failed: ${check.errors.join(', ')}`);
  return out;
}

export function normalizeV3(input){
  const base=emptyState();
  const out={...base,...input,settings:{...base.settings,...(input?.settings||{}),ai:{...base.settings.ai,...(input?.settings?.ai||{})}}};
  for(const key of COLLECTIONS) out[key]=arr(input?.[key]);
  out.version=SCHEMA_VERSION; out.appVersion=APP_VERSION;
  out.metadata={...base.metadata,...(input?.metadata||{}),updatedAt:nowIso()};
  return out;
}
