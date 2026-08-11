import {summarizeResults,labStatus} from './labs.js';
function date(v){ if(!v) return ''; try{return new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium'}).format(new Date(v));}catch{return String(v);} }
function list(items,fn){ return items.length?items.map(fn):['Нет данных']; }
const DEFAULT_SECTIONS=['profile','labs','symptoms','medications','supplements','events','bp','body','sleep'];
export function buildDoctorBrief(state,profileId,{periodDays=365,questions='',sections=DEFAULT_SECTIONS}={}){
  const enabled=new Set(sections?.length?sections:DEFAULT_SECTIONS);
  const profile=state.profiles.find(x=>x.id===profileId)||{}; const cutoff=Date.now()-periodDays*86400000; const inPeriod=x=>{const v=x.collectedAt||x.measuredAt||x.startedAt||x.date||x.createdAt; const t=Date.parse(v||''); return !Number.isFinite(t)||t>=cutoff;}; const pick=name=>(state[name]||[]).filter(x=>x.profileId===profileId&&inPeriod(x));
  const labs=summarizeResults(pick('labResults')); const lines=[];
  const add=(key,title,values)=>{if(enabled.has(key))lines.push(title,...values,'');};
  lines.push('MARKOV HEALTH OS — CONSULTATION BRIEF',`Период: последние ${periodDays} дней`,'');
  add('profile','ПРОФИЛЬ',[`Имя: ${profile.name||'не указано'}`,`Год рождения: ${profile.birthYear||'не указан'}`,`Пол: ${profile.sex||'не указан'}`,`Рост: ${profile.height?profile.height+' см':'не указан'}`,`Основная цель: ${profile.primaryGoal||'не указана'}`]);
  if(enabled.has('labs')){lines.push('ЛАБОРАТОРНЫЕ ПОКАЗАТЕЛИ ВНЕ РЕФЕРЕНСА',...list(labs.attention,r=>`${r.canonicalName}: ${r.canonicalValue ?? r.value} ${r.canonicalUnit||''} — ${labStatus(r).label}`),'','ЗНАЧИМЫЕ ИЗМЕНЕНИЯ',...list(labs.changed.slice(0,12),x=>`${x.current.canonicalName}: ${x.previous.canonicalValue} → ${x.current.canonicalValue} ${x.current.canonicalUnit||''}${x.delta.percent==null?'':` (${x.delta.percent>0?'+':''}${x.delta.percent.toFixed(1)}%)`}`),'');}
  add('symptoms','СИМПТОМЫ',list(pick('symptoms'),x=>`${date(x.startedAt||x.date)} — ${x.name||x.symptom||'Симптом'}${x.severity!=null?`, интенсивность ${x.severity}/10`:''}`));
  add('medications','ЛЕКАРСТВА',list(pick('medications'),x=>`${x.name||'Препарат'} — ${x.dose||''} ${x.unit||''} ${x.frequency||''}`.trim()));
  add('supplements','ДОБАВКИ',list(pick('supplements'),x=>`${x.name||'Добавка'} — ${x.dose||''} ${x.unit||''} ${x.frequency||''}`.trim()));
  add('events','СОБЫТИЯ',list(pick('events'),x=>`${date(x.startedAt)} — ${x.title||x.type||'Событие'}`));
  const bp=pick('measurements').filter(x=>x.type==='bloodPressure').slice(-10); add('bp','ДАВЛЕНИЕ',list(bp,x=>`${date(x.measuredAt||x.date)} — ${x.systolic}/${x.diastolic}${x.pulse?`, пульс ${x.pulse}`:''}`));
  const weights=pick('measurements').filter(x=>x.type==='weight').slice(-10); add('body','МАССА ТЕЛА',list(weights,x=>`${date(x.measuredAt||x.date)} — ${x.value} кг`));
  add('sleep','СОН',list(pick('sleep').slice(-10),x=>`${date(x.date||x.sleepStart)} — ${x.duration||x.durationMinutes||'—'}${x.quality!=null?`, качество ${x.quality}/10`:''}`));
  if(questions.trim()) lines.push('ВОПРОСЫ ПОЛЬЗОВАТЕЛЯ',questions.trim(),'');
  lines.push('Примечание: отчёт организует пользовательские данные и не является диагнозом или медицинским заключением.');
  return lines.join('\n');
}
export {DEFAULT_SECTIONS};
