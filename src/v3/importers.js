import {findAnalyte,normalizeResult,normalizeText} from './labs.js';
import {uid,nowIso} from './schema.js';

export const MAX_FILE_BYTES=8*1024*1024;
export function validateUpload(file,kind){
  if(!file) return {ok:false,error:'missing-file'};
  if(Number(file.size)>MAX_FILE_BYTES) return {ok:false,error:'file-too-large'};
  const name=String(file.name||'').toLowerCase();
  const mime=String(file.type||'').toLowerCase();
  const extOk=kind==='csv'?/\.(csv|tsv|txt)$/.test(name):kind==='pdf'?/\.pdf$/.test(name):kind==='image'?/\.(png|jpe?g|webp)$/.test(name):false;
  const allowed={csv:new Set(['','text/csv','text/plain','text/tab-separated-values','application/vnd.ms-excel']),pdf:new Set(['','application/pdf']),image:new Set(['','image/png','image/jpeg','image/webp'])};
  if(!extOk) return {ok:false,error:'unsupported-file-extension'};
  if(!allowed[kind]?.has(mime)) return {ok:false,error:'mime-type-mismatch'};
  return {ok:true};
}
function splitCsvLine(line,delimiter){
  const out=[]; let cur='',quoted=false;
  for(let i=0;i<line.length;i++){ const ch=line[i]; if(ch==='"'){ if(quoted&&line[i+1]==='"'){cur+='"';i++;} else quoted=!quoted; } else if(ch===delimiter&&!quoted){out.push(cur);cur='';} else cur+=ch; }
  out.push(cur); return out.map(x=>x.trim());
}
export function detectDelimiter(text){
  const line=String(text).split(/\r?\n/).find(Boolean)||''; const candidates=[',',';','\t'];
  return candidates.map(d=>({d,n:splitCsvLine(line,d).length})).sort((a,b)=>b.n-a.n)[0]?.d||';';
}
function headerIndex(headers,names){ const h=headers.map(normalizeText); for(const name of names){ const i=h.findIndex(x=>x===normalizeText(name)||x.includes(normalizeText(name))); if(i>=0) return i; } return -1; }
export function parseCsv(text){
  const delimiter=detectDelimiter(text); const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()); if(lines.length<2) return {rows:[],delimiter,errors:['empty-csv']};
  const headers=splitCsvLine(lines[0],delimiter);
  const idx={name:headerIndex(headers,['показатель','анализ','название','test','analyte']),value:headerIndex(headers,['значение','результат','value','result']),unit:headerIndex(headers,['единица','ед. изм','unit']),low:headerIndex(headers,['референс min','min','нижняя граница','reference low']),high:headerIndex(headers,['референс max','max','верхняя граница','reference high']),reference:headerIndex(headers,['референс','reference','норма']),date:headerIndex(headers,['дата','date']),lab:headerIndex(headers,['лаборатория','laboratory','lab'])};
  const rows=[]; const errors=[];
  for(let n=1;n<lines.length;n++){
    const cols=splitCsvLine(lines[n],delimiter); const original=lines[n]; const name=idx.name>=0?cols[idx.name]:cols[0]; const valueRaw=idx.value>=0?cols[idx.value]:cols[1];
    if(!name) continue; const analyte=findAnalyte(name); const numeric=Number(String(valueRaw).replace(',','.')); const value=Number.isFinite(numeric)?numeric:null;
    rows.push({id:uid('candidate'),originalText:original,originalName:name,analyteId:analyte?.id||null,canonicalName:analyte?.canonicalRu||name,valueType:value==null?'text':'numeric',value,qualitativeValue:value==null?String(valueRaw||''):'',originalValue:valueRaw,originalUnit:idx.unit>=0?cols[idx.unit]:'',referenceLow:idx.low>=0?cols[idx.low]||null:null,referenceHigh:idx.high>=0?cols[idx.high]||null:null,referenceText:idx.reference>=0?cols[idx.reference]:'',collectedAt:idx.date>=0?cols[idx.date]:'',laboratoryName:idx.lab>=0?cols[idx.lab]:'',extractionConfidence:analyte&&valueRaw!==''?'high':analyte?'medium':'low',verifiedByUser:false,removed:false});
  }
  if(idx.name<0) errors.push('name-column-inferred'); if(idx.value<0) errors.push('value-column-inferred');
  return {rows,delimiter,headers,errors};
}

export function extractPdfTextLight(buffer){
  const bytes=new Uint8Array(buffer); let raw=''; const cap=Math.min(bytes.length,MAX_FILE_BYTES); for(let i=0;i<cap;i++) raw+=String.fromCharCode(bytes[i]);
  const chunks=[]; const re=/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj|\[(.*?)\]\s*TJ/gs; let m;
  while((m=re.exec(raw))){
    if(m[1]) chunks.push(m[1].replace(/\\([()\\])/g,'$1'));
    else if(m[2]){ const inner=[...m[2].matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g)].map(x=>x[1].replace(/\\([()\\])/g,'$1')).join(' '); if(inner) chunks.push(inner); }
  }
  const text=chunks.join('\n').replace(/\\n/g,'\n').trim(); return {text,confidence:text.length>50?'medium':'low',limitations:'lightweight-text-layer-only'};
}

export function parseLabText(text){
  const rows=[];
  for(const line of String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){
    const m=line.match(/^(.{2,80}?)\s+([<>]?\s*-?\d+(?:[.,]\d+)?)\s*([^\d]{0,18}?)(?:\s+(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?))?$/);
    if(!m) continue; const name=m[1].trim(); const analyte=findAnalyte(name); const raw=m[2].replace(/\s/g,''); const operator=raw.startsWith('<')?'<':raw.startsWith('>')?'>':null; const value=Number(raw.replace(/[<>]/,'').replace(',','.'));
    if(!Number.isFinite(value)) continue;
    rows.push({id:uid('candidate'),originalText:line,originalName:name,analyteId:analyte?.id||null,canonicalName:analyte?.canonicalRu||name,valueType:operator==='<'?'lessThan':operator==='>'?'greaterThan':'numeric',operator,value,originalValue:m[2],originalUnit:m[3].trim(),referenceLow:m[4]?Number(m[4].replace(',','.')):null,referenceHigh:m[5]?Number(m[5].replace(',','.')):null,referenceText:m[4]&&m[5]?`${m[4]}-${m[5]}`:'',extractionConfidence:analyte?'medium':'low',verifiedByUser:false,removed:false});
  }
  return rows;
}

export function buildReportFromCandidates(candidates,meta){
  const reportId=uid('lab-report'); const createdAt=nowIso(); const active=candidates.filter(x=>!x.removed);
  const report={id:reportId,profileId:meta.profileId,laboratoryName:meta.laboratoryName||active.find(x=>x.laboratoryName)?.laboratoryName||'',laboratoryId:null,reportNumber:meta.reportNumber||'',orderName:meta.orderName||'',collectedAt:meta.collectedAt||active.find(x=>x.collectedAt)?.collectedAt||new Date().toISOString().slice(0,10),reportedAt:meta.reportedAt||null,fasting:meta.fasting??null,fastingHours:meta.fastingHours??null,specimen:meta.specimen||'',specimenDetails:'',comment:meta.comment||'',sourceType:meta.sourceType||'manual',sourceFileId:null,sourceFileName:meta.sourceFileName||null,createdAt,updatedAt:createdAt};
  const results=active.map(x=>normalizeResult({...x,id:uid('lab-result'),profileId:meta.profileId,reportId,collectedAt:x.collectedAt||report.collectedAt,laboratoryName:report.laboratoryName,verifiedByUser:true,provenance:{sourceType:report.sourceType,sourceFileName:report.sourceFileName,original:x.originalText||x.originalValue,editedByUser:true,verifiedAt:createdAt}}));
  return {report,results};
}

export function duplicateScore(report,results,existingReports,existingResults){
  let best=null;
  for(const candidate of existingReports.filter(x=>x.profileId===report.profileId)){
    let score=0; if(report.collectedAt&&candidate.collectedAt===report.collectedAt) score+=35; if(report.laboratoryName&&normalizeText(candidate.laboratoryName)===normalizeText(report.laboratoryName)) score+=20; if(report.reportNumber&&candidate.reportNumber===report.reportNumber) score+=30;
    const a=results.filter(x=>x.reportId===report.id),b=existingResults.filter(x=>x.reportId===candidate.id); const keys=new Set(b.map(x=>x.analyteId||normalizeText(x.canonicalName))); const overlap=a.filter(x=>keys.has(x.analyteId||normalizeText(x.canonicalName))).length; if(a.length) score+=Math.min(15,Math.round(overlap/a.length*15));
    if(!best||score>best.score) best={report:candidate,score};
  }
  return best&&best.score>=55?best:null;
}
