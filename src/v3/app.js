import {HealthRepository,verifyBackupChecksum} from './storage.js';
import {APP_VERSION,SCHEMA_VERSION,COLLECTIONS,uid,nowIso,emptyState} from './schema.js';
import {getCatalog,searchAnalytes,findAnalyte,normalizeResult,labStatus,summarizeResults,delta,normalizeText} from './labs.js';
import {parseCsv,extractPdfTextLight,parseLabText,buildReportFromCandidates,duplicateScore,validateUpload} from './importers.js';
import {buildAIContext,AIGateway} from './ai.js';
import {buildDoctorBrief,DEFAULT_SECTIONS} from './brief.js';
import {encryptBackup,decryptBackup} from './crypto.js';
import {OCRGateway} from './ocr.js';
import {pearson,pairByDate} from './analytics.js';

const S={repo:new HealthRepository(),data:null,route:'dashboard',selectedReport:null,selectedAnalyte:null,importCandidates:[],importMeta:null,searchOpen:false};
const RU={
 dashboard:'\u041e\u0431\u0437\u043e\u0440',labs:'\u0410\u043d\u0430\u043b\u0438\u0437\u044b',timeline:'\u0418\u0441\u0442\u043e\u0440\u0438\u044f',brief:'\u0412\u0440\u0430\u0447\u0443',ai:'AI-\u0440\u0430\u0437\u0431\u043e\u0440',settings:'\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438',add:'\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c',
 now:'\u0421\u0435\u0439\u0447\u0430\u0441',attention:'\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f',changed:'\u0427\u0442\u043e \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c',fresh:'\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0445',
 noData:'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445',search:'\u041f\u043e\u0438\u0441\u043a',cancel:'\u041e\u0442\u043c\u0435\u043d\u0430',save:'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',close:'\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
 addLabs:'\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0430\u043d\u0430\u043b\u0438\u0437\u044b',report:'\u041e\u0442\u0447\u0435\u0442',reference:'\u0420\u0435\u0444\u0435\u0440\u0435\u043d\u0441 \u043b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u0438',
 dataLocal:'\u0414\u0430\u043d\u043d\u044b\u0435 \u0445\u0440\u0430\u043d\u044f\u0442\u0441\u044f \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u0432 \u0432\u0430\u0448\u0435\u043c \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.',
};
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
function el(tag,attrs={},...children){ const n=document.createElement(tag); for(const [k,v] of Object.entries(attrs)){ if(v==null) continue; if(k==='class') n.className=v; else if(k==='text') n.textContent=v; else if(k.startsWith('on')&&typeof v==='function') n.addEventListener(k.slice(2).toLowerCase(),v); else n.setAttribute(k,String(v)); } for(const c of children.flat()){ if(c==null) continue; n.append(c.nodeType?c:document.createTextNode(String(c))); } return n; }
function fmtDate(v){ if(!v) return '\u2014'; const d=new Date(String(v).length===10?`${v}T12:00:00`:v); return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium'}).format(d); }
function fmtNum(v,d=2){ const n=Number(v); return Number.isFinite(n)?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d}).format(n):'\u2014'; }
function activeProfile(){ return S.data.profiles.find(x=>x.id===S.data.activeProfileId)||S.data.profiles[0]||null; }
function records(name){ const p=activeProfile(); return p?(S.data[name]||[]).filter(x=>x.profileId===p.id):[]; }
function persist(mutator){ S.data=S.repo.transaction(mutator); render(); }
function download(name,text,type='text/plain'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function toast(text){ const box=$('#toast'); box.textContent=text; box.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>box.hidden=true,3200); }
function dialog(title,body,actions=[]){ const d=$('#dialog'); $('#dialog-title').textContent=title; const b=$('#dialog-body'); b.replaceChildren(body); const a=$('#dialog-actions'); a.replaceChildren(...actions); d.showModal(); return d; }
function closeDialog(){ const d=$('#dialog'); if(d.open)d.close(); }
function button(text,fn,kind='secondary'){ return el('button',{type:'button',class:`btn ${kind}`,text,onclick:fn}); }
function field(label,input){ return el('label',{class:'field'},el('span',{text:label}),input); }
function input(name,type='text',value='',attrs={}){ return el('input',{name,type,value,...attrs}); }
function select(name,options,value=''){ const s=el('select',{name}); for(const [v,label] of options)s.append(el('option',{value:v,text:label})); s.value=value??''; return s; }
function empty(title,text,action){ return el('div',{class:'empty'},el('div',{class:'empty-mark',text:'+'}),el('h3',{text:title}),el('p',{text}),action||null); }

function bootstrap(){
  try{ S.data=S.repo.load(); }
  catch(error){ S.data=emptyState(); renderFatal(error); return; }
  if(!S.data.profiles.length) firstProfile(); else {applyTheme(); bindGlobal(); render(); registerSW();}
}
function firstProfile(){
  const wrap=el('form',{class:'stack',onsubmit:e=>{e.preventDefault(); const fd=new FormData(e.currentTarget); const id=uid('profile'); S.data=S.repo.replace({...S.data,activeProfileId:id,profiles:[{id,name:fd.get('name')||'\u041f\u0440\u043e\u0444\u0438\u043b\u044c',birthYear:fd.get('birthYear')?Number(fd.get('birthYear')):null,sex:fd.get('sex')||'',height:fd.get('height')?Number(fd.get('height')):null,primaryGoal:fd.get('goal')||'',createdAt:nowIso(),updatedAt:nowIso()}]}); closeDialog(); applyTheme(); bindGlobal(); render(); registerSW();}});
  wrap.append(el('p',{class:'muted',text:'\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c. \u041e\u0441\u0442\u0430\u043b\u044c\u043d\u043e\u0435 \u043c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0437\u0436\u0435.'}),field('\u0418\u043c\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u044f',input('name','text','',{required:true})),field('\u0413\u043e\u0434 \u0440\u043e\u0436\u0434\u0435\u043d\u0438\u044f',input('birthYear','number','',{min:1900,max:new Date().getFullYear()})),field('\u041f\u043e\u043b',select('sex',[['','\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'],['male','\u041c\u0443\u0436\u0441\u043a\u043e\u0439'],['female','\u0416\u0435\u043d\u0441\u043a\u0438\u0439']])),field('\u0420\u043e\u0441\u0442, \u0441\u043c',input('height','number','',{min:80,max:250})),field('\u0413\u043b\u0430\u0432\u043d\u0430\u044f \u0446\u0435\u043b\u044c',input('goal','text','')),el('button',{class:'btn primary',type:'submit',text:'\u0421\u043e\u0437\u0434\u0430\u0442\u044c Health OS'}));
  dialog('MARKOV HEALTH OS',wrap,[]); $('#dialog').addEventListener('cancel',e=>e.preventDefault(),{once:true});
}
function bindGlobal(){ if(bindGlobal.done)return; bindGlobal.done=true; window.addEventListener('hashchange',()=>{S.route=location.hash.slice(1)||'dashboard';S.selectedReport=null;S.selectedAnalyte=null;render();}); document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();} if(e.key==='Escape'&&S.searchOpen)closeSearch();}); $('#dialog-close').addEventListener('click',closeDialog); $('#search-close').addEventListener('click',closeSearch); $('#search-button')?.addEventListener('click',openSearch); $('#mobile-search-button')?.addEventListener('click',openSearch); $('#quick-add-button')?.addEventListener('click',openQuickAdd); $('#quick-add-fab')?.addEventListener('click',openQuickAdd); }
function applyTheme(){ const setting=S.data?.settings?.theme||'system'; const dark=setting==='dark'||(setting==='system'&&matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme=dark?'dark':'light'; }
function registerSW(){
  if(!('serviceWorker'in navigator))return;
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    const offer=worker=>{if(!worker)return;if(confirm('\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u043d\u043e\u0432\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f Markov Health OS. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0441\u0435\u0439\u0447\u0430\u0441?'))worker.postMessage({type:'SKIP_WAITING'});};
    if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offer(w);});});
    let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
  }).catch(()=>{});
}
function renderFatal(error){ document.body.replaceChildren(); const main=el('main',{class:'fatal'},el('h1',{text:'MARKOV HEALTH OS'}),el('p',{text:'\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435.'}),el('code',{text:String(error.message||error)}),button('\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c safety copy',()=>{try{S.data=S.repo.restoreSafety();location.reload();}catch(e){alert(e.message);}},'primary')); document.body.append(main); }

function render(){
  if(!S.data)return; applyTheme(); S.route=location.hash.slice(1)||S.route||'dashboard'; const profile=activeProfile();
  $('#profile-name').textContent=profile?.name||'Health OS'; $('#app-version').textContent=`v${APP_VERSION} / schema ${SCHEMA_VERSION}`;
  $$('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.route===S.route));
  const main=$('#main'); main.replaceChildren();
  const renderers={dashboard:renderDashboard,labs:renderLabs,timeline:renderTimeline,brief:renderBrief,ai:renderAI,settings:renderSettings}; (renderers[S.route]||renderDashboard)(main);
}
function pageHead(title,subtitle,actions=[]){ return el('header',{class:'page-head'},el('div',{},el('p',{class:'eyebrow',text:'MARKOV HEALTH OS · LOCAL-FIRST'}),el('h1',{text:title}),el('p',{class:'subtitle',text:subtitle})),el('div',{class:'page-actions'},...actions)); }
function metric(label,value,meta=''){ return el('article',{class:'metric'},el('span',{class:'metric-label',text:label}),el('strong',{text:value}),el('small',{text:meta})); }
function latestBy(list,pred=()=>true){ return list.filter(pred).sort((a,b)=>String(b.measuredAt||b.date||b.createdAt||'').localeCompare(String(a.measuredAt||a.date||a.createdAt||'')))[0]||null; }
function freshness(v){ if(!v)return RU.noData; const t=Date.parse(v); if(!Number.isFinite(t))return fmtDate(v); const days=Math.max(0,Math.floor((Date.now()-t)/86400000)); return days===0?'\u0421\u0435\u0433\u043e\u0434\u043d\u044f':days===1?'\u0412\u0447\u0435\u0440\u0430':`${days} \u0434\u043d. \u043d\u0430\u0437\u0430\u0434`; }
function renderDashboard(root){
  const ms=records('measurements');
  const sleep=records('sleep');
  const labs=records('labResults');
  const events=records('events');
  const goals=records('goals');
  const summary=summarizeResults(labs);
  const weight=latestBy(ms,x=>x.type==='weight');
  const bp=latestBy(ms,x=>x.type==='bloodPressure');
  const sl=latestBy(sleep);
  root.append(pageHead(RU.dashboard,'\u041a\u043e\u0440\u043e\u0442\u043a\u0430\u044f \u043a\u0430\u0440\u0442\u0438\u043d\u0430 \u0442\u043e\u0433\u043e, \u0447\u0442\u043e \u043f\u0440\u043e\u0438\u0441\u0445\u043e\u0434\u0438\u0442 \u0441\u0435\u0439\u0447\u0430\u0441.',[button('Добавить анализы',openLabImport),button('+ '+RU.add,openQuickAdd,'primary')]));
  const metrics=el('section',{class:'metric-grid'});
  metrics.append(
    metric('\u041c\u0430\u0441\u0441\u0430',weight?`${fmtNum(weight.value,1)} \u043a\u0433`:'\u2014',freshness(weight?.measuredAt||weight?.date)),
    metric('\u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435',bp?`${bp.systolic}/${bp.diastolic}`:'\u2014',freshness(bp?.measuredAt||bp?.date)),
    metric('\u0421\u043e\u043d',sl?String(sl.duration||sl.durationMinutes||'\u2014'):'\u2014',freshness(sl?.date||sl?.sleepStart)),
    metric('\u0410\u043d\u0430\u043b\u0438\u0437\u044b',summary.current.length?String(summary.current.length):'\u2014',summary.attention.length?`${summary.attention.length} \u0432\u043d\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u0430`:'\u0411\u0435\u0437 \u0441\u0438\u0433\u043d\u0430\u043b\u043e\u0432')
  );
  root.append(metrics);
  root.append(renderHealthAnalytics());

  const att=el('section',{class:'panel'});
  att.append(el('div',{class:'section-head'},el('div',{},el('h2',{text:RU.attention}),el('p',{text:'\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c \u043f\u044f\u0442\u044c \u0444\u0430\u043a\u0442\u043e\u0432, \u0430 \u043d\u0435 alarm-dashboard.'}))));
  const signals=[];
  for(const r of summary.attention.slice(0,5)) signals.push(signal(r.canonicalName,`${fmtNum(r.canonicalValue)} ${r.canonicalUnit||''}`,labStatus(r).label,'warn'));
  if(!signals.length&&labs.length) signals.push(signal('\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435','\u041d\u0435\u0442 \u0442\u0435\u043a\u0443\u0449\u0438\u0445 \u0432\u044b\u0445\u043e\u0434\u043e\u0432 \u0437\u0430 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043d\u044b\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u044b.','\u0420\u0435\u0444\u0435\u0440\u0435\u043d\u0441 \u043b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u0438','ok'));
  if(!labs.length) signals.push(signal('\u0410\u043d\u0430\u043b\u0438\u0437\u044b','\u0415\u0449\u0435 \u043d\u0435\u0442 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0445 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432.',RU.noData,'neutral'));
  att.append(el('div',{class:'signal-list'},...signals));
  root.append(att);

  const changed=el('section',{class:'panel'});
  changed.append(el('div',{class:'section-head'},el('div',{},el('h2',{text:RU.changed}),el('p',{text:'\u0421\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u044b\u0445 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u0439, \u0430 \u043d\u0435 \u0434\u0438\u0430\u0433\u043d\u043e\u0437.'}))));
  if(summary.changed.length) changed.append(el('div',{class:'change-grid'},...summary.changed.slice(0,6).map(changeCard)));
  else changed.append(empty('\u041f\u043e\u043a\u0430 \u043d\u0435\u0447\u0435\u0433\u043e \u0441\u0440\u0430\u0432\u043d\u0438\u0432\u0430\u0442\u044c','\u041d\u0443\u0436\u043d\u044b \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u044b\u0435 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f \u043e\u0434\u043d\u043e\u0433\u043e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044f.'));
  root.append(changed);
  root.append(dataFreshnessPanel());

  const split=el('section',{class:'split'});
  const contextPanel=el('div',{class:'panel'},el('h2',{text:'\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442'}));
  const recentEvents=[...events].sort((a,b)=>String(b.startedAt||'').localeCompare(String(a.startedAt||''))).slice(0,4);
  if(recentEvents.length){
    const list=el('div',{class:'timeline-mini'});
    for(const x of recentEvents) list.append(el('div',{class:'timeline-row'},el('time',{text:fmtDate(x.startedAt)}),el('strong',{text:x.title||x.type}),el('small',{text:x.notes||''})));
    contextPanel.append(list);
  }else contextPanel.append(empty('\u041d\u0435\u0442 \u0441\u043e\u0431\u044b\u0442\u0438\u0439','\u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u043d\u0430\u0433\u0440\u0443\u0437\u043a\u0438, \u0441\u043d\u0430, \u043f\u0438\u0442\u0430\u043d\u0438\u044f \u0438 \u043f\u0440\u0435\u043f\u0430\u0440\u0430\u0442\u043e\u0432.'));
  const goalsPanel=el('div',{class:'panel'},el('h2',{text:'\u0426\u0435\u043b\u0438'}));
  if(goals.length){ const list=el('div',{class:'stack'}); for(const g of goals.slice(0,4)) list.append(signal(g.name||g.metric||'\u0426\u0435\u043b\u044c',g.targetValue!=null?`\u0426\u0435\u043b\u044c: ${g.targetValue}`:(g.notes||''),'','neutral')); goalsPanel.append(list); }
  else goalsPanel.append(empty('\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0446\u0435\u043b\u0435\u0439','\u0426\u0435\u043b\u044c \u0434\u043e\u043b\u0436\u043d\u0430 \u0431\u044b\u0442\u044c \u0438\u0437\u043c\u0435\u0440\u0438\u043c\u043e\u0439.'));
  split.append(contextPanel,goalsPanel);
  root.append(split);
  root.append(correlationPanel());
}
function dataFreshnessPanel(){
  const ms=records('measurements'),sleep=records('sleep'),activity=records('activity'),training=records('training'),labs=records('labResults');
  const items=[
    ['Масса',latestBy(ms,x=>x.type==='weight')?.measuredAt||latestBy(ms,x=>x.type==='weight')?.date],
    ['Давление',latestBy(ms,x=>x.type==='bloodPressure')?.measuredAt||latestBy(ms,x=>x.type==='bloodPressure')?.date],
    ['Сон',latestBy(sleep)?.date||latestBy(sleep)?.sleepStart],
    ['Активность',latestBy(activity)?.date],
    ['Тренировки',latestBy(training)?.date],
    ['Анализы',latestBy(labs,x=>true)?.collectedAt]
  ];
  const card=(label,date)=>{
    let state='empty',meta=RU.noData;
    if(date){ const t=Date.parse(date); const days=Number.isFinite(t)?Math.max(0,Math.floor((Date.now()-t)/86400000)):null; meta=freshness(date); state=days==null?'neutral':days<=7?'fresh':days<=30?'aging':'stale'; }
    return el('div',{class:`freshness-item ${state}`},el('span',{class:'freshness-dot'}),el('div',{},el('strong',{text:label}),el('small',{text:meta})));
  };
  return el('section',{class:'panel'},el('div',{class:'section-head'},el('div',{},el('h2',{text:'Актуальность данных'}),el('p',{text:'Показывает свежесть записей, а не качество здоровья.'}))),el('div',{class:'freshness-grid'},...items.map(x=>card(...x))));
}

function correlationPanel(){
  const panel=el('section',{class:'panel stack'}),choice=select('correlation',[['sleep-rhr','Длительность сна ↔ пульс в покое'],['steps-weight','Шаги ↔ масса'],['training-sleep','Нагрузка ↔ сон'],['caffeine-sleep','Кофеин ↔ сон']],'sleep-rhr'),out=el('div');
  const draw=()=>{
    let pairs=[],label='';
    const ms=records('measurements'),sleep=records('sleep'),activity=records('activity'),training=records('training'),nutrition=records('nutrition');
    if(choice.value==='sleep-rhr'){pairs=pairByDate(sleep,ms.filter(x=>x.type==='restingHeartRate'),{leftDate:x=>x.date||x.sleepStart,leftValue:x=>x.duration,rightDate:x=>x.measuredAt||x.date,rightValue:x=>x.value});label='Длительность сна ↔ пульс в покое';}
    if(choice.value==='steps-weight'){pairs=pairByDate(activity,ms.filter(x=>x.type==='weight'),{leftDate:x=>x.date,leftValue:x=>x.steps,rightDate:x=>x.measuredAt||x.date,rightValue:x=>x.value});label='Шаги ↔ масса';}
    if(choice.value==='training-sleep'){pairs=pairByDate(training,sleep,{leftDate:x=>x.date,leftValue:x=>x.volume??x.duration,rightDate:x=>x.date||x.sleepStart,rightValue:x=>x.duration});label='Нагрузка ↔ сон';}
    if(choice.value==='caffeine-sleep'){pairs=pairByDate(nutrition,sleep,{leftDate:x=>x.date,leftValue:x=>x.caffeine,rightDate:x=>x.date||x.sleepStart,rightValue:x=>x.duration});label='Кофеин ↔ сон';}
    const r=pearson(pairs); out.replaceChildren(scatterPlot(pairs,label),r.ok?el('p',{text:`N=${r.n}; r=${fmtNum(r.r,2)}; ${r.strength==='strong'?'сильная':r.strength==='moderate'?'умеренная':'слабая'} связь. Корреляция не доказывает причинность.`}):el('p',{class:'muted',text:`N=${r.n}. \u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u0430\u043d\u043d\u044b\u0445 \u0434\u043b\u044f \u043d\u0430\u0434\u0435\u0436\u043d\u043e\u0433\u043e \u0430\u043d\u0430\u043b\u0438\u0437\u0430.`}));
  };
  choice.addEventListener('change',draw); panel.append(el('div',{class:'section-head'},el('div',{},el('h2',{text:'Исследование связей'}),el('p',{text:'\u0422\u043e\u043b\u044c\u043a\u043e \u043d\u0430\u0431\u043b\u044e\u0434\u0430\u0435\u043c\u044b\u0435 \u0441\u0432\u044f\u0437\u0438; \u043d\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u043d\u043e\u0441\u0442\u044c.'}))),field('Пара показателей',choice),out);draw();return panel;
}
function scatterPlot(pairs,label){
  const box=el('div',{class:'scatter',role:'img','aria-label':`${label}; ${pairs.length} observations`});
  if(!pairs.length){box.append(el('p',{class:'muted',text:'Нет совпадающих наблюдений по датам'}));return box;}
  const xs=pairs.map(x=>x[0]),ys=pairs.map(x=>x[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),dx=xmax-xmin||1,dy=ymax-ymin||1;
  pairs.forEach(([x,y])=>{const dot=el('span',{class:'scatter-dot',title:`${fmtNum(x)} / ${fmtNum(y)}`});dot.style.left=`${5+(x-xmin)/dx*90}%`;dot.style.bottom=`${5+(y-ymin)/dy*90}%`;box.append(dot);});return box;
}
function renderHealthAnalytics(){
  const p=activeProfile(),ms=records('measurements'),sleep=records('sleep');
  const latestType=type=>latestBy(ms,x=>x.type===type),weight=latestType('weight'),waist=latestType('waist'),fat=latestType('bodyFat'),rhr=latestType('restingHeartRate'),hrv=latestType('hrv'),spo2=latestType('spo2'),temp=latestType('temperature');
  const bmi=weight&&p?.height?Number(weight.value)/Math.pow(Number(p.height)/100,2):null;
  const whtr=waist&&p?.height?Number(waist.value)/Number(p.height):null;
  const avg=(list,key)=>{const a=list.map(x=>Number(x[key])).filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:null;};
  const cutoff=days=>Date.now()-days*86400000,dated=(list,days)=>list.filter(x=>{const t=Date.parse(x.date||x.measuredAt||x.sleepStart||'');return Number.isFinite(t)&&t>=cutoff(days);});
  const w7=avg(dated(ms.filter(x=>x.type==='weight'),7),'value'),s7=avg(dated(sleep,7),'duration'),s30=avg(dated(sleep,30),'duration');
  const grid=el('section',{class:'metric-grid secondary-metrics'},
    metric('ИМТ',bmi?fmtNum(bmi,1):'\u2014',bmi?'\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043e':'\u041d\u0443\u0436\u043d\u044b \u0432\u0435\u0441 \u0438 \u0440\u043e\u0441\u0442'),
    metric('Талия / рост',whtr?fmtNum(whtr,2):'\u2014',whtr?'\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043e':'\u041d\u0443\u0436\u043d\u044b \u0442\u0430\u043b\u0438\u044f \u0438 \u0440\u043e\u0441\u0442'),
    metric('Пульс в покое',rhr?`${fmtNum(rhr.value,0)} bpm`:'\u2014',freshness(rhr?.measuredAt)),
    metric('HRV',hrv?`${fmtNum(hrv.value,0)} ${hrv.unit||'ms'}`:'\u2014',freshness(hrv?.measuredAt)),
    metric('Жировая масса',fat?`${fmtNum(fat.value,1)}%`:'\u2014',freshness(fat?.measuredAt)),
    metric('SpO2',spo2?`${fmtNum(spo2.value,1)}%`:'\u2014',freshness(spo2?.measuredAt)),
    metric('Температура',temp?`${fmtNum(temp.value,1)} C`:'\u2014',freshness(temp?.measuredAt)),
    metric('Средняя масса · 7 дней',w7?`${fmtNum(w7,1)} kg`:'\u2014','\u0420\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043e'),
    metric('Сон · 7 дней',s7?`${fmtNum(s7,1)} h`:'\u2014',s30?`30d: ${fmtNum(s30,1)} h`:'\u041d\u0435\u0442 30d data')
  );
  return el('section',{class:'panel'},el('div',{class:'section-head'},el('div',{},el('h2',{text:'Тело и восстановление'}),el('p',{text:'\u0418\u0437\u043c\u0435\u0440\u0435\u043d\u043d\u044b\u0435 \u0438 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d\u043d\u044b\u0435 \u043c\u0435\u0442\u0440\u0438\u043a\u0438 \u0440\u0430\u0437\u0434\u0435\u043b\u0435\u043d\u044b.'}))),grid);
}

function signal(title,value,meta,kind='neutral'){ return el('div',{class:`signal ${kind}`},el('div',{},el('strong',{text:title}),el('p',{text:value})),el('span',{text:meta})); }
function changeCard(x){ const p=x.delta.percent; return el('article',{class:'change-card'},el('strong',{text:x.current.canonicalName}),el('div',{class:'change-values'},el('span',{text:fmtNum(x.previous.canonicalValue)}),el('span',{text:'\u2192'}),el('span',{text:fmtNum(x.current.canonicalValue)})),el('small',{text:`${x.current.canonicalUnit||''}${p==null?'':`  ${p>0?'+':''}${fmtNum(p,1)}%`}`})); }

function renderLabs(root){
  if(S.selectedReport){renderLabReport(root,S.selectedReport);return;} if(S.selectedAnalyte){renderAnalyte(root,S.selectedAnalyte);return;}
  const reports=records('labReports').sort((a,b)=>String(b.collectedAt||'').localeCompare(String(a.collectedAt||''))); const results=records('labResults'); const summary=summarizeResults(results);
  root.append(pageHead(RU.labs,'\u0421\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0435 \u043e\u0442\u0447\u0435\u0442\u044b, \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u044b \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u043d\u043e\u0439 \u043b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u0438 \u0438 \u0434\u0438\u043d\u0430\u043c\u0438\u043a\u0430.',[button('+ '+RU.addLabs,openLabImport,'primary')]));
  root.append(el('section',{class:'metric-grid'},metric('\u041e\u0442\u0447\u0435\u0442\u044b',String(reports.length),reports[0]?fmtDate(reports[0].collectedAt):RU.noData),metric('\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438',String(summary.current.length),'\u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0435'),metric('\u0412\u043d\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u0430',String(summary.attention.length),RU.reference),metric('\u0418\u0437\u043c\u0435\u043d\u0438\u043b\u0438\u0441\u044c',String(summary.changed.length),'\u0435\u0441\u0442\u044c \u043f\u043e\u0432\u0442\u043e\u0440\u043d\u044b\u0435 \u0442\u043e\u0447\u043a\u0438')));
  const compare=el('section',{class:'panel'}); compare.append(el('div',{class:'section-head'},el('div',{},el('h2',{text:'\u0421\u0440\u0430\u0432\u043d\u0438\u0442\u044c \u043e\u0442\u0447\u0435\u0442\u044b'}),el('p',{text:'\u0421\u0440\u0430\u0432\u043d\u0435\u043d\u0438\u0435 \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u043e\u043f\u043e\u0441\u0442\u0430\u0432\u0438\u043c\u044b\u0445 \u0435\u0434\u0438\u043d\u0438\u0446.'}))));
  if(reports.length>=2){ const opts=reports.map(r=>[r.id,`${fmtDate(r.collectedAt)} ${r.laboratoryName||''}`]); const a=select('a',opts,reports[1].id),b=select('b',opts,reports[0].id),out=el('div',{class:'compare-out'}); compare.append(el('div',{class:'compare-controls'},a,b,button('\u0421\u0440\u0430\u0432\u043d\u0438\u0442\u044c',()=>renderComparison(out,a.value,b.value),'secondary')),out); } else compare.append(el('p',{class:'muted',text:'\u041d\u0443\u0436\u043d\u043e \u043c\u0438\u043d\u0438\u043c\u0443\u043c \u0434\u0432\u0430 \u043e\u0442\u0447\u0435\u0442\u0430.'})); root.append(compare);
  const sec=el('section',{class:'panel'},el('div',{class:'section-head'},el('div',{},el('h2',{text:'\u041e\u0442\u0447\u0435\u0442\u044b'}),el('p',{text:'\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u0438 \u0435\u0434\u0438\u043d\u0438\u0446\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u044e\u0442\u0441\u044f.'}))));
  sec.append(reports.length?el('div',{class:'report-list'},...reports.map(r=>reportCard(r,results.filter(x=>x.reportId===r.id)))):empty('\u041d\u0435\u0442 \u043e\u0442\u0447\u0435\u0442\u043e\u0432','\u0418\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u0443\u0439\u0442\u0435 CSV/PDF \u0438\u043b\u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u044b \u0432\u0440\u0443\u0447\u043d\u0443\u044e.',button(RU.addLabs,openLabImport,'primary'))); root.append(sec);
  const current=el('section',{class:'panel'},el('div',{class:'section-head'},el('div',{},el('h2',{text:'\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438'}),el('p',{text:'\u041f\u043e \u043e\u0434\u043d\u043e\u043c\u0443 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0435\u043c\u0443 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044e \u043d\u0430 analyte.'})))); current.append(summary.current.length?resultTable(summary.current,true):empty(RU.noData,'\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043f\u0435\u0440\u0432\u044b\u0439 \u043e\u0442\u0447\u0435\u0442.')); root.append(current);
}
function reportCard(report,results){ const out=results.filter(r=>['low','high'].includes(labStatus(r).key)).length; return el('button',{class:'report-card',type:'button',onclick:()=>{S.selectedReport=report.id;render();}},el('div',{},el('strong',{text:fmtDate(report.collectedAt)}),el('span',{text:report.laboratoryName||'\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u044f \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430'})),el('div',{class:'report-meta'},el('span',{text:`${results.length} \u043f\u043e\u043a\u0430\u0437.`}),el('span',{class:out?'pill warn':'pill',text:out?`${out} \u0432\u043d\u0435 \u0440\u0435\u0444.`:'\u0431\u0435\u0437 \u0432\u044b\u0445\u043e\u0434\u043e\u0432'}))); }
function resultTable(rows,clickable=false,manage=false){
  const wrap=el('div',{class:'table-wrap'}),t=el('table',{class:'data-table'}),labels=['\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c','\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435','\u0420\u0435\u0444\u0435\u0440\u0435\u043d\u0441','\u0421\u0442\u0430\u0442\u0443\u0441']; if(manage)labels.push('');
  const head=el('thead',{},el('tr',{},...labels.map(x=>el('th',{text:x})))); const body=el('tbody');
  for(const r of rows){
    const st=labStatus(r),attrs={class:clickable&&!manage?'clickable':'',onclick:clickable&&!manage?()=>{S.selectedAnalyte=r.analyteId||r.canonicalName;render();}:null};
    const tr=el('tr',attrs,
      el('td',{},el('button',{type:'button',class:'link-button',text:r.canonicalName||r.originalName,onclick:()=>{S.selectedAnalyte=r.analyteId||r.canonicalName;render();}}),r.originalName&&r.originalName!==r.canonicalName?el('small',{text:r.originalName}):null),
      el('td',{},el('span',{class:'number',text:`${fmtNum(r.canonicalValue??r.value)} ${r.canonicalUnit||r.originalUnit||''}`}),r.originalUnit&&r.canonicalUnit&&r.originalUnit!==r.canonicalUnit?el('small',{text:`\u0418\u0441\u0445\u043e\u0434\u043d\u043e: ${r.originalValue} ${r.originalUnit}`}):null),
      el('td',{},el('span',{text:(r.referenceConverted?'':r.referenceText)||[r.referenceLow,r.referenceHigh].filter(v=>v!=null&&v!=='').map(v=>fmtNum(v,3)).join(' - ')||'\u2014'}),r.referenceConverted?el('small',{text:`\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0439 ref: ${r.originalReferenceText||[r.originalReferenceLow,r.originalReferenceHigh].filter(v=>v!=null&&v!=='').join(' - ')} ${r.originalUnit||''}`}):null),
      el('td',{},el('span',{class:`pill ${st.key==='high'||st.key==='low'?'warn':st.key==='range'?'ok':''}`,text:st.label}))
    );
    if(manage)tr.append(el('td',{},el('div',{class:'row-actions'},button('\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c',()=>editLabResult(r)),button('\u0423\u0434\u0430\u043b\u0438\u0442\u044c',()=>deleteLabResult(r),'danger'))));
    body.append(tr);
  }
  t.append(head,body);wrap.append(t);return wrap;
}
function editLabResult(result){
  const name=input('name','text',result.canonicalName||result.originalName,{required:true}),value=input('value','text',result.originalValue??result.value??''),unit=input('unit','text',result.originalUnit||''),low=input('low','number',result.referenceLow??'',{step:'any'}),high=input('high','number',result.referenceHigh??'',{step:'any'}),form=el('form',{class:'stack'});
  form.append(field('\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c',name),field('\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435',value),field('\u0415\u0434\u0438\u043d\u0438\u0446\u0430',unit),el('div',{class:'form-grid'},field('Реф. min',low),field('Реф. max',high)),el('button',{class:'btn primary',type:'submit',text:RU.save}));
  form.addEventListener('submit',e=>{e.preventDefault();const a=findAnalyte(name.value),raw=value.value,n=Number(String(raw).replace(',','.'));persist(d=>{const i=d.labResults.findIndex(x=>x.id===result.id);if(i<0)return d;const next=normalizeResult({...d.labResults[i],originalName:name.value,canonicalName:a?.canonicalRu||name.value,analyteId:a?.id||null,valueType:Number.isFinite(n)?'numeric':'text',value:Number.isFinite(n)?n:null,qualitativeValue:Number.isFinite(n)?'':raw,originalValue:raw,originalUnit:unit.value,canonicalValue:null,canonicalUnit:'',referenceLow:low.value===''?null:Number(low.value),referenceHigh:high.value===''?null:Number(high.value),verifiedByUser:true,provenance:{...(d.labResults[i].provenance||{}),editedByUser:true,verifiedAt:nowIso()}});d.labResults[i]=next;return d;});closeDialog();toast('\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d');});
  dialog('\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442',form,[button(RU.cancel,closeDialog)]);
}
function deleteLabResult(result){if(!confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u044d\u0442\u043e\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442?'))return;persist(d=>{d.labResults=d.labResults.filter(x=>x.id!==result.id);return d;});toast('\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0443\u0434\u0430\u043b\u0435\u043d');}
function deleteLabReport(report){const count=records('labResults').filter(x=>x.reportId===report.id).length;if(!confirm(`\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u0442\u0447\u0435\u0442 \u0438 ${count} \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432?`))return;persist(d=>{d.labReports=d.labReports.filter(x=>x.id!==report.id);d.labResults=d.labResults.filter(x=>x.reportId!==report.id);return d;});S.selectedReport=null;render();toast('\u041e\u0442\u0447\u0435\u0442 \u0443\u0434\u0430\u043b\u0435\u043d');}
function renderLabReport(root,id){ const report=records('labReports').find(x=>x.id===id); if(!report){S.selectedReport=null;renderLabs(root);return;} const rows=records('labResults').filter(x=>x.reportId===id); root.append(pageHead(`${RU.report} - ${fmtDate(report.collectedAt)}`,report.laboratoryName||'\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u044f \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430',[button('\u2190 '+RU.labs,()=>{S.selectedReport=null;render();}),button('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043e\u0442\u0447\u0435\u0442',()=>deleteLabReport(report),'danger')])); root.append(el('section',{class:'metric-grid'},metric('\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0438',String(rows.length)),metric('\u0412\u043d\u0435 \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u0430',String(rows.filter(r=>['low','high'].includes(labStatus(r).key)).length)),metric('\u041d\u0430\u0442\u043e\u0449\u0430\u043a',report.fasting===true?'\u0414\u0430':report.fasting===false?'\u041d\u0435\u0442':'\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u043e'),metric('\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b',report.specimen||'\u2014'))); const groups=new Map(); for(const r of rows){ const a=findAnalyte(r.analyteId||r.canonicalName); const c=a?.category||'\u0414\u0440\u0443\u0433\u0438\u0435'; if(!groups.has(c))groups.set(c,[]); groups.get(c).push(r); } for(const [name,items] of groups) root.append(el('section',{class:'panel'},el('h2',{text:name}),resultTable(items,true,true))); }
function renderAnalyte(root,key){ const target=findAnalyte(key)?.id||normalizeText(key); const all=records('labResults').filter(r=>(r.analyteId||normalizeText(r.canonicalName||r.originalName))===target).sort((a,b)=>String(a.collectedAt||'').localeCompare(String(b.collectedAt||''))); if(!all.length){S.selectedAnalyte=null;renderLabs(root);return;} const current=all.at(-1),prev=all.at(-2),d=prev&&current.canonicalUnit===prev.canonicalUnit?delta(current.canonicalValue,prev.canonicalValue):null; const analyte=findAnalyte(current.analyteId||current.canonicalName); root.append(pageHead(current.canonicalName,'\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u0434\u043d\u043e\u0433\u043e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044f \u0441 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u043e\u043c \u0438 \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441\u0430\u043c\u0438.',[button('\u2190 '+RU.labs,()=>{S.selectedAnalyte=null;render();}),button('\u041e\u0431\u044a\u044f\u0441\u043d\u0438\u0442\u044c \u0441 AI',()=>{location.hash='ai';setTimeout(()=>{const p=$('#ai-purpose');if(p)p.value='analyte';},0);},'primary')])); root.append(el('section',{class:'metric-grid'},metric('\u0421\u0435\u0439\u0447\u0430\u0441',`${fmtNum(current.canonicalValue)} ${current.canonicalUnit||''}`,labStatus(current).label),metric('\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0435\u0435',prev?`${fmtNum(prev.canonicalValue)} ${prev.canonicalUnit||''}`:'\u2014',prev?fmtDate(prev.collectedAt):RU.noData),metric('\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435',d?`${d.absolute>0?'+':''}${fmtNum(d.absolute)}${d.percent==null?'':` / ${d.percent>0?'+':''}${fmtNum(d.percent,1)}%`}`:'\u2014',all.length===2?'\u041c\u0435\u0436\u0434\u0443 \u0434\u0432\u0443\u043c\u044f \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f\u043c\u0438':'\u0418\u0441\u0442\u043e\u0440\u0438\u044f'),metric('\u0422\u043e\u0447\u0435\u043a',String(all.length),all.length<3?'\u041d\u0435 \u0438\u043d\u0442\u0435\u0440\u043f\u0440\u0435\u0442\u0438\u0440\u0443\u0439\u0442\u0435 \u043a\u0430\u043a \u0443\u0441\u0442\u043e\u0439\u0447\u0438\u0432\u044b\u0439 \u0442\u0440\u0435\u043d\u0434':'\u0414\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0434\u043b\u044f \u0434\u0438\u043d\u0430\u043c\u0438\u043a\u0438'))); root.append(el('section',{class:'panel'},el('h2',{text:'\u0418\u0441\u0442\u043e\u0440\u0438\u044f'}),sparkline(all),resultTable([...all].reverse(),false))); root.append(el('section',{class:'panel prose'},el('h2',{text:'\u041e \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0435'}),el('p',{text:analyte?.descriptionRu||'\u0421\u043f\u0440\u0430\u0432\u043e\u0447\u043d\u043e\u0435 \u043e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0435\u0449\u0435 \u043d\u0435 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u043e.'}),el('p',{class:'muted',text:'\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u043d\u044b\u0439 \u0440\u0435\u0444\u0435\u0440\u0435\u043d\u0441, \u043a\u043b\u0438\u043d\u0438\u0447\u0435\u0441\u043a\u0438\u0439 decision limit \u0438 AI-\u0438\u043d\u0442\u0435\u0440\u043f\u0440\u0435\u0442\u0430\u0446\u0438\u044f - \u0440\u0430\u0437\u043d\u044b\u0435 \u0441\u0443\u0449\u043d\u043e\u0441\u0442\u0438.'}))); }
function sparkline(rows){ const vals=rows.map(r=>Number(r.canonicalValue)).filter(Number.isFinite); const box=el('div',{class:'spark',role:'img','aria-label':`\u0418\u0441\u0442\u043e\u0440\u0438\u044f: ${rows.map(r=>`${fmtDate(r.collectedAt)} ${r.canonicalValue}`).join(', ')}`}); if(vals.length<2){box.append(el('p',{class:'muted',text:'\u041d\u0443\u0436\u043d\u043e \u043c\u0438\u043d\u0438\u043c\u0443\u043c \u0434\u0432\u0435 \u0442\u043e\u0447\u043a\u0438.'}));return box;} const min=Math.min(...vals),max=Math.max(...vals),span=max-min||1; rows.forEach((r,i)=>{const v=Number(r.canonicalValue); if(!Number.isFinite(v))return; const dot=el('button',{type:'button',class:'spark-dot',title:`${fmtDate(r.collectedAt)} - ${fmtNum(v)} ${r.canonicalUnit||''}`}); dot.style.left=`${i/(rows.length-1)*100}%`; dot.style.bottom=`${(v-min)/span*80+10}%`; box.append(dot);}); return box; }
function renderComparison(out,aId,bId){ const ar=records('labResults').filter(x=>x.reportId===aId),br=records('labResults').filter(x=>x.reportId===bId); const map=new Map(ar.map(x=>[x.analyteId||normalizeText(x.canonicalName),x])); const rows=[]; for(const b of br){ const a=map.get(b.analyteId||normalizeText(b.canonicalName)); if(!a)continue; rows.push({a,b,comparable:a.canonicalUnit===b.canonicalUnit,d:a.canonicalUnit===b.canonicalUnit?delta(b.canonicalValue,a.canonicalValue):null}); } out.replaceChildren(rows.length?el('div',{class:'compare-list'},...rows.map(x=>el('div',{class:'compare-row'},el('strong',{text:x.b.canonicalName}),el('span',{text:x.comparable?`${fmtNum(x.a.canonicalValue)} \u2192 ${fmtNum(x.b.canonicalValue)} ${x.b.canonicalUnit||''}`:'\u0420\u0430\u0437\u043d\u044b\u0435 \u043d\u0435\u0441\u043e\u043f\u043e\u0441\u0442\u0430\u0432\u0438\u043c\u044b\u0435 \u0435\u0434\u0438\u043d\u0438\u0446\u044b'}),el('span',{text:x.d?.percent==null?'':`${x.d.percent>0?'+':''}${fmtNum(x.d.percent,1)}%`})))):el('p',{class:'muted',text:'\u041d\u0435\u0442 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0449\u0438\u0445 \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u0435\u0439.'})); }

function renderTimeline(root){
  const items=[];
  const add=(type,date,title,detail='')=>{ if(date) items.push({type,date,title,detail}); };
  for(const r of records('labReports')) add('lab',r.collectedAt,'\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u043d\u044b\u0439 \u043e\u0442\u0447\u0435\u0442',r.laboratoryName);
  for(const x of records('events')) add('event',x.startedAt,x.title||x.type,x.notes);
  for(const x of records('measurements')){
    const title=x.type==='weight'?`\u041c\u0430\u0441\u0441\u0430 ${x.value} \u043a\u0433`:x.type==='bloodPressure'?`\u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435 ${x.systolic}/${x.diastolic}`:x.type;
    add(x.type,x.measuredAt||x.date,title,String(x.notes||''));
  }
  for(const x of records('sleep')) add('sleep',x.date||x.sleepStart,'\u0421\u043e\u043d',String(x.duration||x.durationMinutes||''));
  for(const x of records('symptoms')) add('symptom',x.startedAt||x.date,x.name||x.symptom,x.severity!=null?`${x.severity}/10`:x.notes);
  for(const x of records('medications')) add('medication',x.startDate||x.createdAt,x.name||'\u041f\u0440\u0435\u043f\u0430\u0440\u0430\u0442',`${x.dose||''} ${x.unit||''}`);
  for(const x of records('supplements')) add('supplement',x.startDate||x.createdAt,x.name||'\u0414\u043e\u0431\u0430\u0432\u043a\u0430',`${x.dose||''} ${x.unit||''}`);
  for(const x of records('training')) add('training',x.date||x.startedAt||x.createdAt,x.type||'\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430',x.duration?`${x.duration} \u043c\u0438\u043d`:x.notes);
  items.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  root.append(pageHead(RU.timeline,'\u0415\u0434\u0438\u043d\u0430\u044f \u0438\u0441\u0442\u043e\u0440\u0438\u044f \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u0439, \u043e\u0442\u0447\u0435\u0442\u043e\u0432 \u0438 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430.',[button('+ '+RU.add,openQuickAdd,'primary')]));
  const filter=input('q','search','',{placeholder:'\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0438\u0441\u0442\u043e\u0440\u0438\u0438'});
  const list=el('div',{class:'timeline'});
  const draw=()=>{
    const q=normalizeText(filter.value);
    list.replaceChildren();
    for(const x of items){
      if(q&&!normalizeText(`${x.type} ${x.title} ${x.detail}`).includes(q)) continue;
      list.append(el('article',{class:'timeline-item'},el('time',{text:fmtDate(x.date)}),el('div',{},el('strong',{text:x.title}),el('p',{text:x.detail||''})),el('span',{class:'pill',text:x.type})));
    }
    if(!list.children.length) list.append(empty(RU.noData,'\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u0435 \u0444\u0438\u043b\u044c\u0442\u0440 \u0438\u043b\u0438 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0437\u0430\u043f\u0438\u0441\u044c.'));
  };
  filter.addEventListener('input',draw);
  root.append(el('section',{class:'panel'},filter,list));
  draw();
}
function renderBrief(root){
  const p=activeProfile(); let current='';
  root.append(pageHead(RU.brief,'\u041a\u043e\u043c\u043f\u0430\u043a\u0442\u043d\u0430\u044f \u0441\u0432\u043e\u0434\u043a\u0430 \u0431\u0435\u0437 \u0441\u043a\u0440\u044b\u0442\u044b\u0445 AI-\u0441\u043f\u0435\u043a\u0443\u043b\u044f\u0446\u0438\u0439.'));
  const period=select('period',[['90','90 \u0434\u043d\u0435\u0439'],['365','1 \u0433\u043e\u0434'],['1095','3 \u0433\u043e\u0434\u0430']],365),questions=el('textarea',{rows:3,placeholder:'\u0412\u043e\u043f\u0440\u043e\u0441\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0432\u044b \u0445\u043e\u0442\u0438\u0442\u0435 \u043e\u0431\u0441\u0443\u0434\u0438\u0442\u044c'}),pre=el('pre',{class:'brief-preview'});
  const sectionLabels={profile:'\u041f\u0440\u043e\u0444\u0438\u043b\u044c',labs:'\u0410\u043d\u0430\u043b\u0438\u0437\u044b',symptoms:'\u0421\u0438\u043c\u043f\u0442\u043e\u043c\u044b',medications:'\u041b\u0435\u043a\u0430\u0440\u0441\u0442\u0432\u0430',supplements:'\u0414\u043e\u0431\u0430\u0432\u043a\u0438',events:'\u0421\u043e\u0431\u044b\u0442\u0438\u044f',bp:'\u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435',body:'\u0422\u0435\u043b\u043e',sleep:'\u0421\u043e\u043d'};
  const checks=new Map(DEFAULT_SECTIONS.map(k=>{const c=input(`section-${k}`,'checkbox','');c.checked=true;return [k,c];}));
  const generate=()=>{const sections=[...checks].filter(([,c])=>c.checked).map(([k])=>k);current=buildDoctorBrief(S.data,p.id,{periodDays:Number(period.value),questions:questions.value,sections});pre.textContent=current;};
  period.addEventListener('change',generate);questions.addEventListener('input',generate);for(const c of checks.values())c.addEventListener('change',generate);
  const sectionBox=el('div',{class:'check-grid'},...[...checks].map(([k,c])=>el('label',{class:'check'},c,el('span',{text:sectionLabels[k]}))));
  root.append(el('section',{class:'panel stack'},el('div',{class:'form-row'},field('\u041f\u0435\u0440\u0438\u043e\u0434',period)),el('div',{},el('strong',{text:'\u0420\u0430\u0437\u0434\u0435\u043b\u044b'}),sectionBox),field('\u0412\u043e\u043f\u0440\u043e\u0441\u044b \u0432\u0440\u0430\u0447\u0443',questions),el('div',{class:'action-row'},button('\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c',async()=>{await navigator.clipboard.writeText(current);toast('\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e');}),button('TXT',()=>download('markov-health-brief.txt',current)),button('JSON',()=>download('markov-health-brief.json',JSON.stringify({generatedAt:nowIso(),text:current},null,2),'application/json')),button('\u041f\u0435\u0447\u0430\u0442\u044c / PDF',()=>window.print(),'primary')),pre));generate();
}
function renderAI(root){ const p=activeProfile(),config=S.data.settings.ai||{}; const context=buildAIContext(S.data,p.id,'overview'); root.append(pageHead(RU.ai,'\u041a\u043e\u0434 \u0441\u0447\u0438\u0442\u0430\u0435\u0442. AI \u043e\u0431\u044a\u044f\u0441\u043d\u044f\u0435\u0442. \u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0431\u0435\u0437 \u0432\u0430\u0448\u0435\u0433\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f.')); const purpose=select('purpose',[['overview','\u0420\u0430\u0437\u043e\u0431\u0440\u0430\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435'],['changes','\u0427\u0442\u043e \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c'],['analyte','\u041e\u0431\u044a\u044f\u0441\u043d\u0438\u0442\u044c \u043f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c'],['doctor','\u0412\u043e\u043f\u0440\u043e\u0441\u044b \u0432\u0440\u0430\u0447\u0443']]),consent=input('consent','checkbox',''),preview=el('pre',{class:'json-preview',text:JSON.stringify(context,null,2)}),result=el('div',{class:'ai-result'}); const send=button('\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u0430 AI-\u0440\u0430\u0437\u0431\u043e\u0440',async()=>{if(!consent.checked){toast('\u041d\u0443\u0436\u043d\u043e \u044f\u0432\u043d\u043e\u0435 \u0441\u043e\u0433\u043b\u0430\u0441\u0438\u0435');return;} const gw=new AIGateway(config); if(!gw.configured()){toast('AI gateway not configured');return;} send.disabled=true; result.textContent='\u041e\u0436\u0438\u0434\u0430\u043d\u0438\u0435 \u043e\u0442\u0432\u0435\u0442\u0430...'; try{const c=buildAIContext(S.data,p.id,purpose.value),r=await gw.request(purpose.value,c);renderAIResult(result,r);}catch(e){result.textContent=`\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u044b\u0439 AI-\u043e\u0442\u0432\u0435\u0442: ${e.message}`;}finally{send.disabled=false;}},'primary'); root.append(el('section',{class:'panel stack'},field('\u0426\u0435\u043b\u044c',purpose),el('div',{class:'privacy-box'},el('strong',{text:'\u041f\u0440\u0435\u0432\u044c\u044e \u043f\u0435\u0440\u0435\u0434\u0430\u0432\u0430\u0435\u043c\u043e\u0433\u043e \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430'}),el('p',{text:config.endpoint?`Gateway: ${config.providerLabel||config.endpoint}`:'AI gateway \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d. \u041e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 Health OS \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0431\u0435\u0437 AI.'}),preview),el('label',{class:'check'},consent,el('span',{text:'\u042f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u044e \u043f\u0435\u0440\u0435\u0434\u0430\u0447\u0443 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u043d\u043e\u0433\u043e \u0432\u044b\u0448\u0435 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430 \u0432\u043d\u0435\u0448\u043d\u0435\u043c\u0443 AI-\u0441\u0435\u0440\u0432\u0438\u0441\u0443.'})),send,result)); }
function renderAIResult(root,r){ root.replaceChildren(el('article',{class:'ai-card'},el('span',{class:'pill',text:`AI-гипотеза · уверенность: ${r.confidence==='high'?'высокая':r.confidence==='moderate'?'средняя':'низкая'}`}),el('h2',{text:'\u0420\u0435\u0437\u044e\u043c\u0435'}),el('p',{text:r.summary}),...['importantFindings','changes','possibleExplanations','missingContext','questionsForDoctor','limitations'].flatMap(k=>[el('h3',{text:({importantFindings:'Важные наблюдения',changes:'Изменения',possibleExplanations:'Возможные объяснения',missingContext:'Недостающий контекст',questionsForDoctor:'Вопросы врачу',limitations:'Ограничения'})[k]}),el('ul',{},...r[k].map(x=>el('li',{text:typeof x==='string'?x:JSON.stringify(x)})))]))); }

function openAddProfile(){
  const form=el('form',{class:'stack'}),name=input('name','text','',{required:true}),height=input('height','number','',{min:80,max:250}),goal=input('goal','text','');
  form.append(field('\u0418\u043c\u044f',name),field('\u0420\u043e\u0441\u0442, \u0441\u043c',height),field('\u0426\u0435\u043b\u044c',goal),el('button',{class:'btn primary',type:'submit',text:RU.save}));
  form.addEventListener('submit',e=>{e.preventDefault();const id=uid('profile');persist(d=>{d.profiles.push({id,name:name.value.trim(),height:height.value?Number(height.value):null,primaryGoal:goal.value.trim(),createdAt:nowIso(),updatedAt:nowIso()});d.activeProfileId=id;return d;});closeDialog();});
  dialog('\u041d\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c',form,[button(RU.cancel,closeDialog)]);
}
function deleteActiveProfile(){
  const p=activeProfile();if(!p||S.data.profiles.length<=1)return;
  const count=COLLECTIONS.filter(x=>x!=='profiles').reduce((n,k)=>n+(S.data[k]||[]).filter(x=>x.profileId===p.id).length,0);
  if(!confirm(`\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c "${p.name}" \u0438 ${count} \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0445 \u0437\u0430\u043f\u0438\u0441\u0435\u0439?`))return;
  persist(d=>{for(const k of COLLECTIONS.filter(x=>x!=='profiles'))d[k]=d[k].filter(x=>x.profileId!==p.id);d.profiles=d.profiles.filter(x=>x.id!==p.id);d.activeProfileId=d.profiles[0]?.id||null;return d;});
}
function createDemoProfile(){
  const existing=S.data.profiles.find(x=>x.isDemo);if(existing){persist(d=>{d.activeProfileId=existing.id;return d;});return;}
  const id=uid('demo'),mk=(date,type,value,extra={})=>({id:uid('m'),profileId:id,type,value,measuredAt:date,createdAt:nowIso(),updatedAt:nowIso(),...extra});
  persist(d=>{
    d.profiles.push({id,name:'Demo - Alex',isDemo:true,birthYear:1990,sex:'male',height:182,primaryGoal:'General health',createdAt:nowIso(),updatedAt:nowIso()});d.activeProfileId=id;
    d.measurements.push(mk('2026-05-01','weight',92),mk('2026-06-01','weight',90.5),mk('2026-07-01','weight',89.2),mk('2026-08-01','weight',88.4),mk('2026-08-01','bloodPressure',null,{systolic:122,diastolic:78,pulse:62}),mk('2026-08-01','restingHeartRate',58));
    d.sleep.push({id:uid('sleep'),profileId:id,date:'2026-08-01',duration:7.4,quality:8,hrv:54,createdAt:nowIso(),updatedAt:nowIso()});
    d.training.push({id:uid('training'),profileId:id,date:'2026-07-31',type:'strength',duration:70,rpe:7,volume:8200,createdAt:nowIso(),updatedAt:nowIso()});
    d.events.push({id:uid('event'),profileId:id,type:'training block',title:'New training block',startedAt:'2026-06-15',notes:'Demo context event',tags:['demo'],createdAt:nowIso(),updatedAt:nowIso()});
    d.symptoms.push({id:uid('symptom'),profileId:id,name:'Fatigue',severity:3,startedAt:'2026-05-10',endedAt:'2026-05-20',notes:'Demo',createdAt:nowIso(),updatedAt:nowIso()});
    d.supplements.push({id:uid('supplement'),profileId:id,name:'Vitamin D',dose:'1000',unit:'IU',frequency:'daily',startDate:'2026-05-15',createdAt:nowIso(),updatedAt:nowIso()});
    d.goals.push({id:uid('goal'),profileId:id,metric:'weight',startValue:92,targetValue:86,targetDate:'2026-10-01',leadingIndicators:['steps','sleep'],status:'active',createdAt:nowIso(),updatedAt:nowIso()});
    const reports=[['2026-04-01',42,2.9],['2026-06-15',55,2.7],['2026-08-01',61,2.5]];
    for(const [date,ferritin,ldl] of reports){const reportId=uid('lab-report');d.labReports.push({id:reportId,profileId:id,laboratoryName:'Demo Lab',collectedAt:date,reportedAt:date,sourceType:'demo',fasting:true,createdAt:nowIso(),updatedAt:nowIso()});d.labResults.push(normalizeResult({id:uid('lab-result'),profileId:id,reportId,originalName:'Ferritin',value:ferritin,originalValue:ferritin,originalUnit:'ng/mL',referenceLow:30,referenceHigh:300,valueType:'numeric',collectedAt:date,laboratoryName:'Demo Lab',provenance:{sourceType:'demo'}}),normalizeResult({id:uid('lab-result'),profileId:id,reportId,originalName:'LDL',value:ldl,originalValue:ldl,originalUnit:'mmol/L',referenceLow:0,referenceHigh:3,valueType:'numeric',collectedAt:date,laboratoryName:'Demo Lab',provenance:{sourceType:'demo'}}));}
    return d;
  });
}

function renderSettings(root){
  const p=activeProfile();
  root.append(pageHead(RU.settings,RU.dataLocal));
  const theme=select('theme',[['system','Как в системе'],['light','Светлая'],['dark','Тёмная']],S.data.settings.theme);
  theme.addEventListener('change',()=>persist(d=>{d.settings.theme=theme.value;return d;}));
  const profileName=input('profileName','text',p.name||'',{required:true});
  const profilePanel=el('section',{class:'panel stack'});
  profilePanel.append(
    el('h2',{text:'\u041f\u0440\u043e\u0444\u0438\u043b\u044c'}),
    field('\u0418\u043c\u044f',profileName),
    field('\u0422\u0435\u043c\u0430',theme),
    button(RU.save,()=>persist(d=>{const row=d.profiles.find(x=>x.id===p.id);if(row){row.name=profileName.value.trim()||row.name;row.updatedAt=nowIso();}return d;}),'primary'),
    el('p',{class:'muted',text:`ID: ${p.id}`})
  );
  const profileSelect=select('activeProfile',S.data.profiles.map(x=>[x.id,x.name+(x.isDemo?' (demo)':'')]),p.id);
  profileSelect.addEventListener('change',()=>persist(d=>{d.activeProfileId=profileSelect.value;return d;}));
  profilePanel.prepend(field('\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c',profileSelect));
  profilePanel.append(el('div',{class:'action-row'},button('+ \u041f\u0440\u043e\u0444\u0438\u043b\u044c',openAddProfile),button('Demo profile',createDemoProfile),S.data.profiles.length>1?button('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c',deleteActiveProfile,'danger'):null));
  root.append(profilePanel);

  const endpoint=input('endpoint','text',S.data.settings.ai?.endpoint||'',{placeholder:'/api/health-ai'});
  const provider=input('provider','text',S.data.settings.ai?.providerLabel||'',{placeholder:'AI provider via secure gateway'});
  const ocrEndpoint=input('ocrEndpoint','text',S.data.settings.ocr?.endpoint||'',{placeholder:'/api/health-ocr'});
  const ocrProvider=input('ocrProvider','text',S.data.settings.ocr?.providerLabel||'',{placeholder:'OCR provider via secure gateway'});
  const aiPanel=el('section',{class:'panel stack'});
  aiPanel.append(
    el('h2',{text:'AI и распознавание документов'}),
    el('p',{class:'muted',text:'\u0412 frontend \u043d\u0435\u0442 provider API keys. Endpoint \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c same-origin gateway, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 /api/health-ai.'}),
    field('AI gateway',endpoint),field('AI provider label',provider),field('OCR gateway',ocrEndpoint),field('OCR provider label',ocrProvider),
    button(RU.save,()=>persist(d=>{d.settings.ai={...d.settings.ai,endpoint:endpoint.value.trim(),providerLabel:provider.value.trim(),enabled:Boolean(endpoint.value.trim())};d.settings.ocr={endpoint:ocrEndpoint.value.trim(),providerLabel:ocrProvider.value.trim(),enabled:Boolean(ocrEndpoint.value.trim())};return d;}),'primary')
  );
  root.append(aiPanel);

  const dataPanel=el('section',{class:'panel stack'});
  dataPanel.append(
    el('h2',{text:'\u0414\u0430\u043d\u043d\u044b\u0435 \u0438 backup'}),
    el('p',{class:'muted',text:'JSON backup \u043d\u0435 \u0437\u0430\u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d. .mhos \u0448\u0438\u0444\u0440\u0443\u0435\u0442\u0441\u044f \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e \u043f\u0430\u0440\u043e\u043b\u0435\u043c; \u043f\u0430\u0440\u043e\u043b\u044c \u043d\u0435 \u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f.'}),
    el('div',{class:'action-row'},
      button('Export JSON',async()=>{const payload=await S.repo.exportBackupWithChecksum();download(`markov-health-os-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2),'application/json');}),
      button('Export .mhos',exportEncryptedBackup),
      button('Import backup',openBackupImport),
      button('Restore safety copy',()=>{try{S.data=S.repo.restoreSafety();render();toast('Safety copy restored');}catch(e){toast(e.message);}})
    ),
    button('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435',()=>{if(confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u0441\u0435 \u0434\u0430\u043d\u043d\u044b\u0435?')){S.repo.clear();location.reload();}},'danger')
  );
  root.append(dataPanel);
  root.append(el('section',{class:'panel prose'},el('h2',{text:'\u041f\u0440\u0438\u0432\u0430\u0442\u043d\u043e\u0441\u0442\u044c'}),el('p',{text:'\u041f\u043e \u0443\u043c\u043e\u043b\u0447\u0430\u043d\u0438\u044e: \u0431\u0435\u0437 analytics, tracking, telemetry, cloud sync \u0438 AI transmission.'}),el('p',{text:'AI/OCR \u043f\u043e\u043b\u0443\u0447\u0430\u044e\u0442 \u0434\u0430\u043d\u043d\u044b\u0435 \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 \u044f\u0432\u043d\u043e\u0433\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f. Health values \u043d\u0435 \u043f\u043e\u043c\u0435\u0449\u0430\u044e\u0442\u0441\u044f \u0432 URL \u0438 \u043d\u0435 \u043b\u043e\u0433\u0438\u0440\u0443\u044e\u0442\u0441\u044f.'})));
}
async function exportEncryptedBackup(){
  try{
    const password=prompt('\u041f\u0430\u0440\u043e\u043b\u044c \u0434\u043b\u044f .mhos backup (\u043c\u0438\u043d\u0438\u043c\u0443\u043c 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432)');
    if(!password)return;
    const payload=await S.repo.exportBackupWithChecksum();
    const box=await encryptBackup(payload,password);
    download(`markov-health-os-${new Date().toISOString().slice(0,10)}.mhos`,box,'application/octet-stream');
  }catch(e){toast(`Encrypted export failed: ${e.message}`);}
}
function openBackupImport(){
  const f=input('file','file','',{accept:'application/json,.json,.mhos,application/octet-stream'});
  const wrap=el('div',{class:'stack'},field('JSON / .mhos backup',f));
  f.addEventListener('change',async()=>{
    try{
      const file=f.files[0]; if(!file)return;
      let payload;
      if(file.name.toLowerCase().endsWith('.mhos')){const password=prompt('\u041f\u0430\u0440\u043e\u043b\u044c .mhos backup');if(!password)return;payload=await decryptBackup(await file.text(),password);}else payload=JSON.parse(await file.text());
      const checksum=await verifyBackupChecksum(payload);if(!checksum.ok)throw new Error('backup-checksum-mismatch');
      if(!confirm(`Import ${payload.recordCount||payload.backupMetadata?.recordCount||'?'} records?${checksum.verified?' Checksum verified.':''}`))return;
      S.data=S.repo.importBackup(payload);closeDialog();render();toast('Backup imported');
    }catch(e){toast(`Import failed: ${e.message}`);}
  });
  dialog('Import backup',wrap,[button(RU.close,closeDialog)]);
}

function openQuickAdd(){ const choices=[['body','\u0422\u0435\u043b\u043e'],['weight','\u041c\u0430\u0441\u0441\u0430'],['bp','\u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435'],['sleep','\u0421\u043e\u043d'],['symptom','\u0421\u0438\u043c\u043f\u0442\u043e\u043c'],['event','\u0421\u043e\u0431\u044b\u0442\u0438\u0435'],['training','\u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043a\u0430'],['medication','\u041b\u0435\u043a\u0430\u0440\u0441\u0442\u0432\u043e'],['supplement','\u0414\u043e\u0431\u0430\u0432\u043a\u0430'],['nutrition','\u041f\u0438\u0442\u0430\u043d\u0438\u0435'],['note','\u0417\u0430\u043c\u0435\u0442\u043a\u0430'],['goal','\u0426\u0435\u043b\u044c'],['labs',RU.addLabs]]; dialog(RU.add,el('div',{class:'quick-grid'},...choices.map(([k,label])=>button(label,()=>{closeDialog();k==='labs'?openLabImport():openRecordForm(k);},'quick'))),[button(RU.close,closeDialog)]); }
function openRecordForm(kind){ const p=activeProfile(),form=el('form',{class:'stack'}),dateValue=new Date().toISOString().slice(0,10); const common=()=>field('\u0414\u0430\u0442\u0430',input('date','date',dateValue));
  if(kind==='body')form.append(common(),field('\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c',select('type',[['waist','\u0422\u0430\u043b\u0438\u044f'],['bodyFat','% \u0436\u0438\u0440\u0430'],['restingHeartRate','\u041f\u0443\u043b\u044c \u0432 \u043f\u043e\u043a\u043e\u0435'],['hrv','HRV'],['spo2','SpO2'],['temperature','\u0422\u0435\u043c\u043f\u0435\u0440\u0430\u0442\u0443\u0440\u0430']])),field('\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435',input('value','number','',{step:'0.1',required:true})),field('\u0415\u0434\u0438\u043d\u0438\u0446\u0430',input('unit','text','')),field('\u0417\u0430\u043c\u0435\u0442\u043a\u0430',input('notes')));
  if(kind==='weight')form.append(common(),field('\u041c\u0430\u0441\u0441\u0430, \u043a\u0433',input('value','number','',{step:'0.1',required:true})),field('\u0417\u0430\u043c\u0435\u0442\u043a\u0430',input('notes')));
  if(kind==='bp')form.append(common(),field('\u0421\u0438\u0441\u0442\u043e\u043b\u0438\u0447\u0435\u0441\u043a\u043e\u0435',input('systolic','number','',{required:true})),field('\u0414\u0438\u0430\u0441\u0442\u043e\u043b\u0438\u0447\u0435\u0441\u043a\u043e\u0435',input('diastolic','number','',{required:true})),field('\u041f\u0443\u043b\u044c\u0441',input('pulse','number')),field('\u0420\u0443\u043a\u0430',select('arm',[['','\u2014'],['left','\u041b\u0435\u0432\u0430\u044f'],['right','\u041f\u0440\u0430\u0432\u0430\u044f']])),field('\u041f\u043e\u043b\u043e\u0436\u0435\u043d\u0438\u0435',input('position','text','')));
  if(kind==='sleep')form.append(common(),field('\u041e\u0442\u0431\u043e\u0439',input('bedTime','time','')),field('\u041f\u043e\u0434\u044a\u0435\u043c',input('wakeTime','time','')),field('\u0414\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c, \u0447',input('duration','number','',{step:'0.1',required:true})),field('\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e 0-10',input('quality','number','',{min:0,max:10})),field('\u041f\u0440\u043e\u0431\u0443\u0436\u0434\u0435\u043d\u0438\u044f',input('awakenings','number','',{min:0})),field('Resting HR',input('restingHR','number')),field('HRV',input('hrv','number')),field('\u0417\u0430\u043c\u0435\u0442\u043a\u0430',input('notes','text','')));
  if(kind==='symptom')form.append(common(),field('\u0421\u0438\u043c\u043f\u0442\u043e\u043c',input('name','text','',{required:true})),field('\u0418\u043d\u0442\u0435\u043d\u0441\u0438\u0432\u043d\u043e\u0441\u0442\u044c 0-10',input('severity','number','',{min:0,max:10})),field('\u041e\u043a\u043e\u043d\u0447\u0430\u043d\u0438\u0435',input('endedAt','date','')),field('\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439',input('notes')));
  if(kind==='event')form.append(common(),field('\u0422\u0438\u043f',input('type','text','',{placeholder:'stress / illness / travel'})),field('\u0421\u043e\u0431\u044b\u0442\u0438\u0435',input('title','text','',{required:true})),field('\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439',input('notes')));
  if(kind==='training')form.append(common(),field('\u0422\u0438\u043f',input('type','text','',{required:true})),field('\u0414\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c, \u043c\u0438\u043d',input('duration','number')),field('RPE',input('rpe','number','',{min:1,max:10})),field('\u0423\u043f\u0440\u0430\u0436\u043d\u0435\u043d\u0438\u044f',input('exercises','text','')),field('\u041f\u043e\u0434\u0445\u043e\u0434\u044b',input('sets','number')),field('\u041f\u043e\u0432\u0442\u043e\u0440\u044b',input('reps','number')),field('\u041d\u0430\u0433\u0440\u0443\u0437\u043a\u0430',input('load','number','',{step:'0.1'})),field('\u041e\u0431\u044a\u0435\u043c',input('volume','number')),field('\u0417\u0430\u043c\u0435\u0442\u043a\u0430',input('notes')));
  if(kind==='medication'||kind==='supplement')form.append(field('\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435',input('name','text','',{required:true})),field('\u0414\u043e\u0437\u0430',input('dose','text','')),field('\u0415\u0434\u0438\u043d\u0438\u0446\u0430',input('unit','text','')),field('\u0427\u0430\u0441\u0442\u043e\u0442\u0430',input('frequency','text','')),field('Schedule',input('schedule','text','')),field('\u0414\u0430\u0442\u0430 \u043d\u0430\u0447\u0430\u043b\u0430',input('startDate','date',dateValue)),field('\u0414\u0430\u0442\u0430 \u043e\u043a\u043e\u043d\u0447\u0430\u043d\u0438\u044f',input('endDate','date','')),field('\u041f\u0440\u0438\u0447\u0438\u043d\u0430',input('reason','text','')),kind==='medication'?el('label',{class:'check'},input('prescribedByDoctor','checkbox',''),el('span',{text:'\u041d\u0430\u0437\u043d\u0430\u0447\u0438\u043b \u0432\u0440\u0430\u0447'})):null,field('\u0417\u0430\u043c\u0435\u0442\u043a\u0430',input('notes','text','')));
  if(kind==='nutrition')form.append(common(),...Object.entries({kcal:'Калории, ккал',protein:'Белок, г',carbs:'Углеводы, г',fat:'Жиры, г',fiber:'Клетчатка, г',water:'Вода, мл',caffeine:'Кофеин, мг',alcohol:'Алкоголь, г'}).map(([k,label])=>field(label,input(k,'number','',{step:'0.1'}))));
  if(kind==='note')form.append(common(),field('\u0417\u0430\u0433\u043e\u043b\u043e\u0432\u043e\u043a',input('title','text','')),field('\u0422\u0435\u043a\u0441\u0442',el('textarea',{name:'text',rows:5,required:true})));
  if(kind==='goal')form.append(field('\u041c\u0435\u0442\u0440\u0438\u043a\u0430',input('metric','text','',{required:true,placeholder:'weight / waist / sleep'})),field('\u0421\u0442\u0430\u0440\u0442',input('startValue','number','',{step:'any'})),field('\u0426\u0435\u043b\u044c',input('targetValue','number','',{step:'any',required:true})),field('\u0414\u0435\u0434\u043b\u0430\u0439\u043d',input('targetDate','date','')),field('\u0412\u0435\u0434\u0443\u0449\u0438\u0435 \u0438\u043d\u0434\u0438\u043a\u0430\u0442\u043e\u0440\u044b',input('leadingIndicators','text','',{placeholder:'steps, protein, sleep'})));
  form.append(el('button',{class:'btn primary',type:'submit',text:RU.save})); form.addEventListener('submit',e=>{e.preventDefault(); const fd=Object.fromEntries(new FormData(form).entries()),date=fd.date||dateValue; persist(d=>{let collection,record={id:uid(kind),profileId:p.id,createdAt:nowIso(),updatedAt:nowIso()}; if(kind==='body'){collection='measurements';record={...record,type:fd.type,value:Number(fd.value),unit:fd.unit||'',measuredAt:date,notes:fd.notes};} if(kind==='weight'){collection='measurements';record={...record,type:'weight',value:Number(fd.value),measuredAt:date,notes:fd.notes};} if(kind==='bp'){collection='measurements';record={...record,type:'bloodPressure',systolic:Number(fd.systolic),diastolic:Number(fd.diastolic),pulse:fd.pulse?Number(fd.pulse):null,arm:fd.arm,position:fd.position,measuredAt:date};} if(kind==='sleep'){collection='sleep';record={...record,date,bedTime:fd.bedTime||null,wakeTime:fd.wakeTime||null,sleepStart:fd.bedTime?`${date}T${fd.bedTime}`:null,sleepEnd:fd.wakeTime?`${date}T${fd.wakeTime}`:null,duration:Number(fd.duration),quality:fd.quality?Number(fd.quality):null,awakenings:fd.awakenings?Number(fd.awakenings):null,restingHR:fd.restingHR?Number(fd.restingHR):null,hrv:fd.hrv?Number(fd.hrv):null,notes:fd.notes};} if(kind==='symptom'){collection='symptoms';record={...record,name:fd.name,severity:fd.severity?Number(fd.severity):null,startedAt:date,endedAt:fd.endedAt||null,notes:fd.notes};} if(kind==='event'){collection='events';record={...record,type:fd.type||'custom',title:fd.title,startedAt:date,notes:fd.notes,tags:[]};} if(kind==='training'){collection='training';record={...record,date,type:fd.type,duration:fd.duration?Number(fd.duration):null,rpe:fd.rpe?Number(fd.rpe):null,exercises:fd.exercises||'',sets:fd.sets?Number(fd.sets):null,reps:fd.reps?Number(fd.reps):null,load:fd.load?Number(fd.load):null,volume:fd.volume?Number(fd.volume):null,notes:fd.notes};} if(kind==='medication'){collection='medications';record={...record,...fd,prescribedByDoctor:Boolean(fd.prescribedByDoctor)};} if(kind==='supplement'){collection='supplements';record={...record,...fd};} if(kind==='nutrition'){collection='nutrition';record={...record,date,...Object.fromEntries(Object.entries(fd).filter(([k])=>k!=='date').map(([k,v])=>[k,v===''?null:Number(v)]))};} if(kind==='note'){collection='notes';record={...record,date,title:fd.title,text:fd.text};} if(kind==='goal'){collection='goals';record={...record,metric:fd.metric,startValue:fd.startValue===''?null:Number(fd.startValue),targetValue:Number(fd.targetValue),targetDate:fd.targetDate||null,leadingIndicators:String(fd.leadingIndicators||'').split(',').map(x=>x.trim()).filter(Boolean),status:'active'};} d[collection].push(record);return d;}); closeDialog();toast('\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e');}); dialog(RU.add,form,[button(RU.cancel,closeDialog)]); }

function openLabImport(){ S.importCandidates=[];S.importMeta={profileId:activeProfile().id,sourceType:'manual',collectedAt:new Date().toISOString().slice(0,10),laboratoryName:'',sourceFileName:null}; const tabs=el('div',{class:'tab-row'}),body=el('div',{class:'stack'}); const modes=[['manual','\u0412\u0440\u0443\u0447\u043d\u0443\u044e'],['csv','CSV'],['pdf','PDF'],['image','\u0424\u043e\u0442\u043e / OCR']]; const choose=m=>{body.replaceChildren(); $$('.tab-row button',tabs).forEach(x=>x.classList.toggle('active',x.dataset.mode===m)); if(m==='manual')manualImport(body); if(m==='csv')fileImport(body,'csv'); if(m==='pdf')fileImport(body,'pdf'); if(m==='image')imageImport(body);}; for(const [m,label] of modes)tabs.append(el('button',{type:'button','data-mode':m,class:'tab',text:label,onclick:()=>choose(m)})); const wrap=el('div',{class:'stack'},tabs,body); dialog(RU.addLabs,wrap,[button(RU.cancel,closeDialog)]); choose('manual'); }
function manualImport(root){ const meta=importMetaFields(),form=el('div',{class:'stack'}),name=input('name','text','',{placeholder:'\u0424\u0435\u0440\u0440\u0438\u0442\u0438\u043d'}),value=input('value','text',''),unit=input('unit','text',''),low=input('low','number','',{step:'any'}),high=input('high','number','',{step:'any'}),rows=el('div',{class:'candidate-list'}); const add=()=>{const a=findAnalyte(name.value),n=Number(String(value.value).replace(',','.')); S.importCandidates.push({id:uid('candidate'),originalText:`${name.value} ${value.value} ${unit.value}`,originalName:name.value,analyteId:a?.id||null,canonicalName:a?.canonicalRu||name.value,valueType:Number.isFinite(n)?'numeric':'text',value:Number.isFinite(n)?n:null,qualitativeValue:Number.isFinite(n)?'':value.value,originalValue:value.value,originalUnit:unit.value,referenceLow:low.value===''?null:Number(low.value),referenceHigh:high.value===''?null:Number(high.value),extractionConfidence:a?'high':'low',verifiedByUser:false,removed:false}); name.value=value.value=unit.value=low.value=high.value='';renderCandidateList(rows);}; form.append(meta,field('\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c',name),el('div',{class:'form-grid'},field('\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435',value),field('\u0415\u0434\u0438\u043d\u0438\u0446\u0430',unit),field('Ref min',low),field('Ref max',high)),button('+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c',add),rows,button('\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',()=>reviewCandidates(),'primary')); root.append(form); }
function importMetaFields(){ const lab=input('lab','text',S.importMeta.laboratoryName||'',{placeholder:'\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u044f'}),date=input('date','date',S.importMeta.collectedAt); lab.addEventListener('input',()=>S.importMeta.laboratoryName=lab.value);date.addEventListener('input',()=>S.importMeta.collectedAt=date.value); return el('div',{class:'form-grid'},field('\u041b\u0430\u0431\u043e\u0440\u0430\u0442\u043e\u0440\u0438\u044f',lab),field('\u0414\u0430\u0442\u0430 \u0437\u0430\u0431\u043e\u0440\u0430',date)); }
function fileImport(root,kind){ const file=input('file','file','',{accept:kind==='csv'?'.csv,.tsv,text/csv,text/tab-separated-values':'.pdf,application/pdf'}),status=el('p',{class:'muted'}),rows=el('div',{class:'candidate-list'}); root.append(importMetaFields(),field(kind.toUpperCase(),file),status,rows,button('\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',()=>reviewCandidates(),'primary')); file.addEventListener('change',async()=>{const f=file.files[0],check=validateUpload(f,kind); if(!check.ok){status.textContent=check.error;return;} S.importMeta.sourceType=kind;S.importMeta.sourceFileName=f.name; try{if(kind==='csv'){const parsed=parseCsv(await f.text());S.importCandidates=parsed.rows;status.textContent=`${parsed.rows.length} rows / ${parsed.errors.join(', ')||'ok'}`;}else{const ext=extractPdfTextLight(await f.arrayBuffer());S.importCandidates=parseLabText(ext.text);status.textContent=`${S.importCandidates.length} candidates. PDF mode: ${ext.limitations}.`; if(!S.importCandidates.length)status.textContent+=' Scanned/compressed PDF may require OCR.';}renderCandidateList(rows);}catch(e){status.textContent=`Import error: ${e.message}`;}}); }
function imageImport(root){
  const file=input('file','file','',{accept:'image/png,image/jpeg,image/webp'});
  const text=el('textarea',{rows:8,placeholder:'OCR text / \u0440\u0443\u0447\u043d\u0430\u044f \u0432\u0441\u0442\u0430\u0432\u043a\u0430 \u0440\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u043d\u043d\u043e\u0433\u043e \u0442\u0435\u043a\u0441\u0442\u0430'});
  const rows=el('div',{class:'candidate-list'}),status=el('p',{class:'muted'}),consent=input('ocrConsent','checkbox','');
  const config=S.data.settings.ocr||{};
  const msg=el('div',{class:'privacy-box'},el('strong',{text:'OCR'}),el('p',{text:config.endpoint?`Gateway: ${config.providerLabel||config.endpoint}. \u0424\u0430\u0439\u043b \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e \u044f\u0432\u043d\u043e\u043c\u0443 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044e.`:'OCR gateway \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d. \u0424\u0430\u0439\u043b \u043d\u0438\u043a\u0443\u0434\u0430 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u044f\u0435\u0442\u0441\u044f; \u043c\u043e\u0436\u043d\u043e \u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044c OCR text \u0432\u0440\u0443\u0447\u043d\u0443\u044e.'}));
  const parse=()=>{S.importMeta.sourceType='ocr';S.importMeta.sourceFileName=file.files[0]?.name||null;S.importCandidates=parseLabText(text.value);renderCandidateList(rows);status.textContent=`${S.importCandidates.length} candidates`;};
  const run=button('\u0420\u0430\u0441\u043f\u043e\u0437\u043d\u0430\u0442\u044c \u0447\u0435\u0440\u0435\u0437 OCR gateway',async()=>{
    const f=file.files[0],check=validateUpload(f,'image'); if(!check.ok){status.textContent=check.error;return;}
    if(!consent.checked){status.textContent='Explicit consent required';return;}
    const gateway=new OCRGateway(config); if(!gateway.configured()){status.textContent='OCR gateway not configured';return;}
    run.disabled=true;status.textContent='OCR...';
    try{const result=await gateway.extract(f);text.value=result.text;status.textContent=`OCR ${result.confidence} / ${result.provider}`;parse();}
    catch(e){status.textContent=`OCR error: ${e.message}`;} finally{run.disabled=false;}
  });
  root.append(importMetaFields(),msg,field('\u0418\u0437\u043e\u0431\u0440\u0430\u0436\u0435\u043d\u0438\u0435',file),el('label',{class:'check'},consent,el('span',{text:'\u042f \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u044e \u043f\u0435\u0440\u0435\u0434\u0430\u0442\u044c \u044d\u0442\u043e\u0442 \u0444\u0430\u0439\u043b \u043d\u0430 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u043d\u044b\u0439 OCR gateway.'})),run,field('OCR text',text),button('\u0420\u0430\u0437\u043e\u0431\u0440\u0430\u0442\u044c \u0442\u0435\u043a\u0441\u0442',parse),status,rows,button('\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',()=>reviewCandidates(),'primary'));
}
function renderCandidateList(root){ root.replaceChildren(...S.importCandidates.map(c=>el('div',{class:`candidate ${c.extractionConfidence}`},el('div',{},el('strong',{text:c.canonicalName||c.originalName}),el('small',{text:c.originalText||''})),el('span',{class:'number',text:`${c.value??c.qualitativeValue??''} ${c.originalUnit||''}`}),el('span',{class:'pill',text:c.extractionConfidence})))); }
function reviewCandidates(){ if(!S.importCandidates.filter(x=>!x.removed).length){toast('\u041d\u0435\u0442 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438');return;} const wrap=el('div',{class:'review-list'}); const datalist=el('datalist',{id:'analytes-list'},...getCatalog().map(a=>el('option',{value:a.canonicalRu}))); for(const c of S.importCandidates){ const name=input('name','text',c.canonicalName||c.originalName,{list:'analytes-list'}),value=input('value','text',c.value??c.qualitativeValue??''),unit=input('unit','text',c.originalUnit||''),low=input('low','number',c.referenceLow??'',{step:'any'}),high=input('high','number',c.referenceHigh??'',{step:'any'}),remove=input('remove','checkbox',''); remove.checked=Boolean(c.removed); const sync=()=>{const a=findAnalyte(name.value);c.originalName=c.originalName||name.value;c.analyteId=a?.id||null;c.canonicalName=a?.canonicalRu||name.value;const n=Number(String(value.value).replace(',','.'));c.value=Number.isFinite(n)?n:null;c.qualitativeValue=Number.isFinite(n)?'':value.value;c.valueType=Number.isFinite(n)?'numeric':'text';c.originalValue=value.value;c.originalUnit=unit.value;c.referenceLow=low.value===''?null:Number(low.value);c.referenceHigh=high.value===''?null:Number(high.value);c.removed=remove.checked;c.extractionConfidence=a&&value.value!==''?'high':a?'medium':'low';}; for(const x of [name,value,unit,low,high,remove])x.addEventListener('input',sync); wrap.append(el('div',{class:'review-row'},el('div',{class:'review-original'},el('strong',{text:c.originalText||c.originalName}),el('small',{text:`Уверенность распознавания: ${c.extractionConfidence==='high'?'высокая':c.extractionConfidence==='medium'?'средняя':'низкая'}`})),field('\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u0435\u043b\u044c',name),field('\u0417\u043d\u0430\u0447\u0435\u043d\u0438\u0435',value),field('\u0415\u0434.',unit),field('Ref min',low),field('Ref max',high),el('label',{class:'check'},remove,el('span',{text:'\u041f\u0440\u043e\u043f\u0443\u0441\u0442\u0438\u0442\u044c'})))); }
  const save=button(RU.save,()=>{const pack=buildReportFromCandidates(S.importCandidates,S.importMeta),dupe=duplicateScore(pack.report,pack.results,records('labReports'),records('labResults')); if(dupe&&!confirm(`\u0412\u043e\u0437\u043c\u043e\u0436\u043d\u044b\u0439 duplicate (${dupe.score}%). \u0418\u043c\u043f\u043e\u0440\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e?`))return; persist(d=>{d.labReports.push(pack.report);d.labResults.push(...pack.results);return d;});closeDialog();S.selectedReport=pack.report.id;location.hash='labs';render();toast('\u041e\u0442\u0447\u0435\u0442 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d');},'primary'); dialog('\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u0435\u0440\u0435\u0434 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435\u043c',el('div',{},el('p',{class:'muted',text:'AI/OCR/parser \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0435. \u041f\u043e\u0441\u043b\u0435 \u044d\u0442\u043e\u0433\u043e \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f \u043e\u043d\u0438 \u0441\u0442\u0430\u043d\u0443\u0442 \u0447\u0430\u0441\u0442\u044c\u044e Health OS.'}),datalist,wrap),[button(RU.cancel,closeDialog),save]); }

function openSearch(){
  S.searchOpen=true;
  const d=$('#search-dialog'),q=$('#global-search'),out=$('#search-results');
  const nav=[['dashboard',RU.dashboard],['labs',RU.labs],['timeline',RU.timeline],['brief',RU.brief],['ai',RU.ai],['settings',RU.settings]];
  const commands=[
    ['+ \u041c\u0430\u0441\u0441\u0430',()=>openRecordForm('weight')],['+ \u0414\u0430\u0432\u043b\u0435\u043d\u0438\u0435',()=>openRecordForm('bp')],['+ \u0421\u043e\u043d',()=>openRecordForm('sleep')],['+ \u0421\u043e\u0431\u044b\u0442\u0438\u0435',()=>openRecordForm('event')],['+ \u0410\u043d\u0430\u043b\u0438\u0437\u044b',openLabImport],['+ \u0426\u0435\u043b\u044c',()=>openRecordForm('goal')]
  ];
  const entityItems=()=>[
    ...records('medications').map(x=>({label:`\u041b\u0435\u043a\u0430\u0440\u0441\u0442\u0432\u043e: ${x.name}`,detail:x.reason||x.dose||''})),
    ...records('supplements').map(x=>({label:`\u0414\u043e\u0431\u0430\u0432\u043a\u0430: ${x.name}`,detail:x.reason||x.dose||''})),
    ...records('symptoms').map(x=>({label:`\u0421\u0438\u043c\u043f\u0442\u043e\u043c: ${x.name}`,detail:x.notes||''})),
    ...records('goals').map(x=>({label:`\u0426\u0435\u043b\u044c: ${x.metric||x.name||''}`,detail:String(x.targetValue??'')})),
    ...records('notes').map(x=>({label:`\u0417\u0430\u043c\u0435\u0442\u043a\u0430: ${x.title||''}`,detail:x.text||''}))
  ];
  const draw=()=>{
    const query=q.value,needle=normalizeText(query),an=searchAnalytes(query,12);
    const links=nav.filter(x=>!needle||normalizeText(x[1]).includes(needle));
    const cmd=commands.filter(x=>!needle||normalizeText(x[0]).includes(needle));
    const entities=entityItems().filter(x=>!needle||normalizeText(`${x.label} ${x.detail}`).includes(needle)).slice(0,12);
    out.replaceChildren(
      ...cmd.map(([label,fn])=>el('button',{type:'button',text:label,onclick:()=>{closeSearch();fn();}})),
      ...links.map(([r,l])=>el('button',{type:'button',text:l,onclick:()=>{location.hash=r;closeSearch();}})),
      ...an.map(a=>el('button',{type:'button',text:`${a.canonicalRu}${a.shortRu?` - ${a.shortRu}`:''}`,onclick:()=>{S.selectedAnalyte=a.id;location.hash='labs';closeSearch();render();}})),
      ...entities.map(x=>el('button',{type:'button',text:x.label,onclick:()=>{location.hash='timeline';closeSearch();}}))
    );
  };
  q.value='';q.oninput=draw;draw();d.showModal();q.focus();
}
function closeSearch(){ S.searchOpen=false; const d=$('#search-dialog');if(d.open)d.close(); }

document.addEventListener('DOMContentLoaded',bootstrap);
