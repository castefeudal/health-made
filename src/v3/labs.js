import {uid,nowIso} from './schema.js';

const supplemental=[
  ['rdw','RDW','RDW','Red cell distribution width',['RDW'],['ширина распределения эритроцитов'],'Общий анализ крови',['%'],'%'],
  ['mpv','Средний объем тромбоцита','MPV','Mean platelet volume',['MPV'],['средний объем тромбоцитов'],'Общий анализ крови',['фл','fL'],'фл'],
  ['pct','Тромбокрит','PCT','Plateletcrit',['PCT'],['тромбокрит'],'Общий анализ крови',['%'],'%'],
  ['urea','Мочевина','Мочевина','Urea',['UREA'],['мочевина'],'Почки',['ммоль/л','mmol/L'],'ммоль/л'],
  ['uric_acid','Мочевая кислота','Мочевая кислота','Uric acid',['UA'],['урат','мочевая кислота'],'Почки',['мкмоль/л','µmol/L','мг/дл','mg/dL'],'мкмоль/л'],
  ['cystatin_c','Цистатин C','Цистатин C','Cystatin C',['CysC'],['цистатин c'],'Почки',['мг/л','mg/L'],'мг/л'],
  ['non_hdl','Холестерин не-ЛПВП','не-ЛПВП','Non-HDL cholesterol',['non-HDL'],['не лпвп','non hdl'],'Липидный профиль',['ммоль/л','mmol/L','мг/дл','mg/dL'],'ммоль/л'],
  ['tpo_ab','Антитела к тиреопероксидазе','АТ-ТПО','Thyroid peroxidase antibodies',['AT-TPO','TPOAb'],['ат тпо','антитела к тпо'],'Щитовидная железа',['МЕ/мл','IU/mL'],'МЕ/мл'],
  ['tg_ab','Антитела к тиреоглобулину','АТ-ТГ','Thyroglobulin antibodies',['AT-TG','TgAb'],['ат тг','антитела к тиреоглобулину'],'Щитовидная железа',['МЕ/мл','IU/mL'],'МЕ/мл'],
  ['dheas','ДГЭА-сульфат','ДГЭА-S','DHEA sulfate',['DHEA-S','DHEAS'],['дгэа с','дгэа-с'],'Гормоны',['мкмоль/л','µmol/L','мкг/дл','µg/dL'],null],
  ['inr','МНО','МНО','International normalized ratio',['INR','МНО'],['международное нормализованное отношение'],'Коагулограмма',[''],''],
  ['aptt','АЧТВ','АЧТВ','Activated partial thromboplastin time',['APTT','АЧТВ'],['активированное частичное тромбопластиновое время'],'Коагулограмма',['с','s'],'с'],
  ['fibrinogen','Фибриноген','Фибриноген','Fibrinogen',['FIB'],['фибриноген'],'Коагулограмма',['г/л','g/L'],'г/л'],
  ['d_dimer','D-димер','D-димер','D-dimer',['D-dimer'],['д димер','d димер'],'Коагулограмма',['нг/мл','ng/mL','мкг/л','µg/L'],null]
].map(([id,canonicalRu,shortRu,englishName,abbreviations,aliases,category,allowedUnits,canonicalUnit])=>({id,canonicalRu,shortRu,englishName,abbreviations,russianAliases:aliases,category,specimen:'Кровь',allowedUnits,canonicalUnit,unitConversions:{},loincCodes:[],fsliCode:null,descriptionRu:'',sourceReferences:[]}));

export function normalizeText(value){ return String(value??'').toLowerCase().replaceAll('ё','е').replace(/[\s_\-–—().,/\\]+/g,' ').trim(); }
export function getCatalog(){
  const legacy=globalThis.MarkovHealthCatalog?.catalog || [];
  const ids=new Set(legacy.map(x=>x.id));
  return [...legacy,...supplemental.filter(x=>!ids.has(x.id))];
}
export function analyteHaystack(item){ return [item.canonicalRu,item.shortRu,item.englishName,...(item.abbreviations||[]),...(item.russianAliases||[])].map(normalizeText); }
export function findAnalyte(query){
  const q=normalizeText(query); if(!q) return null;
  let best=null,bestScore=0;
  for(const item of getCatalog()) for(const v of analyteHaystack(item)){
    const score=v===q?100:v.startsWith(q)?80:v.includes(q)?60:q.includes(v)&&v.length>2?40:0;
    if(score>bestScore){best=item;bestScore=score;}
  }
  return best;
}
export function searchAnalytes(query,limit=20){
  const q=normalizeText(query); const list=getCatalog(); if(!q) return list.slice(0,limit);
  return list.map(item=>({item,score:Math.max(...analyteHaystack(item).map(v=>v===q?100:v.startsWith(q)?80:v.includes(q)?60:0))}))
    .filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.canonicalRu.localeCompare(b.item.canonicalRu,'ru')).slice(0,limit).map(x=>x.item);
}
function finite(v){ return v!==''&&v!=null&&Number.isFinite(Number(v)); }
export function labStatus(result){
  if(result.valueType && result.valueType!=='numeric' && result.valueType!=='lessThan' && result.valueType!=='greaterThan') return {key:'qualitative',label:'Качественный результат'};
  if(!finite(result.value??result.canonicalValue)) return {key:'unknown',label:'Нет числового значения'};
  const v=Number(result.canonicalValue??result.value), lo=finite(result.referenceLow)?Number(result.referenceLow):null, hi=finite(result.referenceHigh)?Number(result.referenceHigh):null;
  if(lo==null&&hi==null) return {key:'unknown',label:'Референс не указан'};
  if(lo!=null&&v<lo) return {key:'low',label:'Ниже референса лаборатории'};
  if(hi!=null&&v>hi) return {key:'high',label:'Выше референса лаборатории'};
  return {key:'range',label:'В референсе лаборатории'};
}
function unitKey(v){ return String(v??'').trim().replaceAll('μ','µ'); }
export function convertValue(analyte,value,fromUnit,toUnit){
  if(!analyte||!finite(value)) return {ok:false,reason:'invalid-input'};
  const from=unitKey(fromUnit),to=unitKey(toUnit); if(!from||!to) return {ok:false,reason:'missing-unit'}; if(from===to) return {ok:true,value:Number(value),converted:false};
  if(analyte.id==='lpa') return {ok:false,reason:'conversion-not-verified'};
  const aliases={'mmol/L':'ммоль/л','mg/dL':'мг/дл','µmol/L':'мкмоль/л','ng/mL':'нг/мл','nmol/L':'нмоль/л','g/L':'г/л','µg/L':'мкг/л','U/L':'Ед/л','IU/mL':'МЕ/мл'};
  const a=aliases[from]||from,b=aliases[to]||to;
  const fn=analyte.unitConversions?.[`${a}->${b}`]||analyte.unitConversions?.[`${from}->${to}`];
  if(typeof fn==='function') return {ok:true,value:fn(Number(value)),converted:true};
  return {ok:false,reason:'conversion-not-verified'};
}
export function normalizeResult(input){
  const analyte=findAnalyte(input.analyteId||input.originalName||input.canonicalName||input.name);
  const originalValue=input.originalValue??input.value??null;
  const originalUnit=unitKey(input.originalUnit||input.unit);
  let value=finite(input.value)?Number(input.value):finite(originalValue)?Number(originalValue):null;
  let canonicalValue=input.canonicalValue??value,canonicalUnit=input.canonicalUnit||originalUnit;
  const originalReferenceLow=input.originalReferenceLow??input.referenceLow??null,originalReferenceHigh=input.originalReferenceHigh??input.referenceHigh??null,originalReferenceText=input.originalReferenceText??input.referenceText??'';
  let referenceLow=input.referenceLow??null,referenceHigh=input.referenceHigh??null,referenceConverted=false;
  if(analyte?.canonicalUnit&&originalUnit&&canonicalUnit!==analyte.canonicalUnit&&value!=null){
    const c=convertValue(analyte,value,originalUnit,analyte.canonicalUnit);
    if(c.ok){
      canonicalValue=c.value;canonicalUnit=analyte.canonicalUnit;
      if(finite(referenceLow)){const lo=convertValue(analyte,referenceLow,originalUnit,analyte.canonicalUnit);if(lo.ok){referenceLow=lo.value;referenceConverted=true;}}
      if(finite(referenceHigh)){const hi=convertValue(analyte,referenceHigh,originalUnit,analyte.canonicalUnit);if(hi.ok){referenceHigh=hi.value;referenceConverted=true;}}
    }
  }
  return {...input,id:input.id||uid('lab-result'),analyteId:analyte?.id||input.analyteId||null,originalName:input.originalName||input.name||'',canonicalName:analyte?.canonicalRu||input.canonicalName||input.originalName||input.name||'Неизвестный показатель',value,originalValue,originalUnit,canonicalValue,canonicalUnit,referenceLow,referenceHigh,referenceText:referenceConverted?'':(input.referenceText??''),originalReferenceLow,originalReferenceHigh,originalReferenceText,referenceConverted,referenceSource:input.referenceSource||'laboratory',extractionConfidence:input.extractionConfidence||'high',verifiedByUser:input.verifiedByUser??true,createdAt:input.createdAt||nowIso(),updatedAt:nowIso()};
}
export function delta(current,previous){ const a=Number(current),b=Number(previous); if(!Number.isFinite(a)||!Number.isFinite(b)) return null; const absolute=a-b; return {absolute,percent:b===0?null:absolute/Math.abs(b)*100}; }
export function summarizeResults(results){
  const normalized=(results||[]).map(normalizeResult); const groups=new Map();
  for(const r of normalized){ const k=r.analyteId||normalizeText(r.canonicalName||r.originalName); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(r); }
  const current=[],changed=[];
  for(const rows of groups.values()){
    rows.sort((a,b)=>String(b.collectedAt||b.date||'').localeCompare(String(a.collectedAt||a.date||'')));
    const a=rows[0],b=rows[1]; current.push(a);
    if(b&&a.canonicalUnit===b.canonicalUnit){ const d=delta(a.canonicalValue,b.canonicalValue); if(d) changed.push({current:a,previous:b,delta:d}); }
  }
  changed.sort((a,b)=>Math.abs(b.delta.percent||0)-Math.abs(a.delta.percent||0));
  return {current,changed,attention:current.filter(x=>['low','high'].includes(labStatus(x).key)),unknownReference:current.filter(x=>labStatus(x).key==='unknown')};
}
