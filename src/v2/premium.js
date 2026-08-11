'use strict';
(() => {
  const STORAGE_KEY = 'markovHealthOSData';
  const engine = () => window.MarkovHealthEngine;
  const catalog = () => window.MarkovHealthCatalog;
  const $ = (sel, root=document) => root.querySelector(sel);
  const el = (tag, props={}, ...children) => {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([k,v]) => {
      if (k === 'className') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('data-')) node.setAttribute(k,v);
      else if (v !== undefined && v !== null) node[k] = v;
    });
    children.flat().filter(Boolean).forEach(child => node.append(child));
    return node;
  };
  const readData = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } };
  const activeProfileId = data => data?.activeProfileId || data?.profiles?.[0]?.id || null;
  const profileLabs = data => (data?.labs || []).filter(x => !activeProfileId(data) || x.profileId === activeProfileId(data));
  const fmt = n => Number.isFinite(Number(n)) ? new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(Number(n)) : '—';
  const fmtDate = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',year:'numeric'}).format(d); };

  function metric(label, value, hint, tone='neutral') {
    return el('div',{className:`v2-metric v2-${tone}`},el('span',{className:'v2-metric-label',text:label}),el('strong',{text:String(value)}),el('small',{text:hint}));
  }

  function renderLabsIntelligence() {
    const main = $('#mainContent');
    if (!main || $('#v2LabsIntelligence') || !location.hash.includes('labs')) return;
    const data = readData();
    const summary = engine()?.summarizeLabs(profileLabs(data));
    const panel = el('section',{id:'v2LabsIntelligence',className:'v2-intelligence',ariaLabel:'Лабораторная аналитика Health OS 2.0'});
    const head = el('div',{className:'v2-intelligence-head'},
      el('div',{},el('div',{className:'v2-kicker',text:'HEALTH OS 2.0 · LAB INTELLIGENCE'}),el('h2',{text:'Картина анализов за 20 секунд'}),el('p',{text:'Сводка основана на ваших значениях и референсах конкретной лаборатории. Это не диагноз и не универсальная «норма».'})),
      el('div',{className:'v2-actions'},
        el('button',{type:'button',className:'btn secondary',text:'Каталог анализов',onclick:openCatalog}),
        el('button',{type:'button',className:'btn secondary',text:'Импорт CSV',onclick:openCsvImport}),
        el('button',{type:'button',className:'btn primary',text:'AI-ready разбор',onclick:openAIContext})
      )
    );
    panel.append(head);
    if (!summary || !summary.totalResults) {
      panel.append(el('div',{className:'v2-empty'},el('strong',{text:'Пока недостаточно данных'}),el('p',{text:'Добавьте результаты вручную или импортируйте CSV. После двух измерений одного показателя появится сравнение динамики.'})));
    } else {
      const metrics = el('div',{className:'v2-metrics'},
        metric('Показателей',summary.uniqueAnalytes,`${summary.totalResults} результатов`),
        metric('Вне референса',summary.attention.length,'по референсу лаборатории',summary.attention.length?'attention':'ok'),
        metric('Есть сравнение',summary.changed.length,'повторные измерения'),
        metric('Без референса',summary.unknownRefs.length,'нельзя оценить статус',summary.unknownRefs.length?'muted':'ok')
      );
      panel.append(metrics);
      const grid = el('div',{className:'v2-grid'});
      const attention = el('div',{className:'v2-card'},el('div',{className:'v2-card-title'},el('strong',{text:'Требует внимания'}),el('span',{text:'не диагноз'})));
      if (!summary.attention.length) attention.append(el('p',{className:'v2-positive',text:'Среди последних значений нет выходов за введённые лабораторные референсы.'}));
      summary.attention.slice(0,5).forEach(item => attention.append(labRow(item.canonicalName,`${fmt(item.value)} ${item.unit||''}`,item.status.label,'attention')));
      const changes = el('div',{className:'v2-card'},el('div',{className:'v2-card-title'},el('strong',{text:'Что изменилось'}),el('span',{text:'последнее vs предыдущее'})));
      if (!summary.changed.length) changes.append(el('p',{className:'v2-muted',text:'Нужны повторные измерения сопоставимых показателей и единиц.'}));
      summary.changed.slice(0,5).forEach(item => {
        const p = item.delta.percent;
        const delta = p === null ? `${item.delta.absolute>=0?'+':''}${fmt(item.delta.absolute)}` : `${p>=0?'+':''}${fmt(p)}%`;
        changes.append(labRow(item.analyte,`${fmt(item.current)} ${item.unit||''}`,`${delta} · ${fmtDate(item.previousDate)} → ${fmtDate(item.date)}`,'change'));
      });
      grid.append(attention,changes); panel.append(grid);
    }
    main.insertBefore(panel, main.children[1] || main.firstChild);
  }

  function labRow(name,value,detail,tone) {
    return el('div',{className:`v2-row v2-row-${tone}`},el('div',{},el('strong',{text:name}),el('small',{text:detail})),el('span',{text:value}));
  }

  function ensureDialog(id, title) {
    let dialog = document.getElementById(id);
    if (dialog) return dialog;
    dialog = el('dialog',{id,className:'v2-dialog'});
    const shell = el('div',{className:'v2-dialog-shell'});
    const header = el('header',{className:'v2-dialog-header'},el('div',{},el('div',{className:'v2-kicker',text:'MARKOV HEALTH OS 2.0'}),el('h2',{text:title})),el('button',{type:'button',className:'icon-btn close-btn',ariaLabel:'Закрыть',text:'×',onclick:()=>dialog.close()}));
    const body = el('div',{className:'v2-dialog-body','data-v2-body':'1'});
    shell.append(header,body); dialog.append(shell); document.body.append(dialog);
    dialog.addEventListener('click',e=>{ if(e.target===dialog) dialog.close(); });
    return dialog;
  }

  function openCatalog() {
    const dialog=ensureDialog('v2CatalogDialog','Русский каталог анализов'); const body=$('[data-v2-body]',dialog); body.replaceChildren();
    const search=el('input',{type:'search',className:'v2-search',placeholder:'Например: ТТГ, ферритин, LDL, АЛТ',ariaLabel:'Поиск показателя'});
    const results=el('div',{className:'v2-catalog-results'});
    const draw=()=>{ results.replaceChildren(); const items=engine()?.searchAnalytes(search.value,40)||[]; items.forEach(item=>results.append(el('article',{className:'v2-catalog-item'},el('div',{},el('strong',{text:item.canonicalRu}),el('small',{text:[item.shortRu,item.englishName].filter(Boolean).join(' · ')})),el('div',{className:'v2-catalog-meta'},el('span',{text:item.category}),el('span',{text:item.canonicalUnit||'единицы зависят от метода'})),el('p',{text:item.descriptionRu})))); if(!items.length)results.append(el('p',{className:'v2-muted',text:'Совпадений нет. Можно сохранить исходное название без выдуманного mapping.'})); };
    search.addEventListener('input',draw); body.append(search,el('p',{className:'v2-note',text:'LOINC/ФСЛИ-коды намеренно не заполняются без подтверждённого mapping. Каталог нормализует названия, но не подменяет лабораторный отчёт.'}),results); draw(); dialog.showModal(); search.focus();
  }

  function openAIContext() {
    const dialog=ensureDialog('v2AiDialog','AI-ready Health Brief'); const body=$('[data-v2-body]',dialog); body.replaceChildren(); const data=readData();
    if(!data){ body.append(el('p',{text:'Нет локальных данных профиля.'})); dialog.showModal(); return; }
    const context=engine().buildAIContext(data,activeProfileId(data));
    const summary=engine().summarizeLabs(profileLabs(data));
    const privacy=el('div',{className:'v2-privacy'},el('strong',{text:'Приватность по умолчанию'}),el('p',{text:'Этот контекст сформирован локально. Markov Health OS 2.0 не отправляет его внешней модели автоматически. Передача возможна только по вашему явному действию.'}));
    const facts=el('div',{className:'v2-ai-facts'},metric('Последний анализ',fmtDate(summary.latestDate),'из локальных данных'),metric('Вне референса',summary.attention.length,'по лабораторным диапазонам',summary.attention.length?'attention':'ok'),metric('Изменения',summary.changed.length,'сопоставимые пары'));
    const pre=el('pre',{className:'v2-code',text:JSON.stringify(context,null,2)});
    const copy=el('button',{type:'button',className:'btn primary',text:'Скопировать структурированный контекст',onclick:async()=>{try{await navigator.clipboard.writeText(JSON.stringify(context,null,2));copy.textContent='Скопировано';setTimeout(()=>copy.textContent='Скопировать структурированный контекст',1500);}catch{copy.textContent='Не удалось скопировать';}}});
    body.append(privacy,facts,el('h3',{text:'Что будет передано AI'}),el('p',{className:'v2-muted',text:'Только выбранный профиль и структурированные факты: расчёты выполняет код, AI должен объяснять, а не пересчитывать.'}),pre,copy); dialog.showModal();
  }

  function openCsvImport() {
    const dialog=ensureDialog('v2CsvDialog','Импорт лабораторного CSV'); const body=$('[data-v2-body]',dialog); body.replaceChildren();
    const input=el('input',{type:'file',accept:'.csv,text/csv'}); const preview=el('div',{className:'v2-import-preview'}); const commit=el('button',{type:'button',className:'btn primary',text:'Подтвердить импорт',disabled:true}); let pending=[];
    const help=el('p',{className:'v2-note',text:'Ожидаемые колонки: name,value,unit,referenceMin,referenceMax,date,laboratory. Данные сначала показываются для проверки и сохраняются только после подтверждения.'});
    input.addEventListener('change',async()=>{ pending=[]; preview.replaceChildren(); commit.disabled=true; const file=input.files?.[0]; if(!file)return; const text=await file.text(); const parsed=parseCsv(text); if(!parsed.length){preview.append(el('p',{className:'v2-muted',text:'Не удалось распознать строки CSV.'}));return;} pending=parsed; preview.append(el('strong',{text:`Распознано строк: ${parsed.length}`}),el('p',{className:'v2-muted',text:'Проверьте первые строки перед сохранением.'})); parsed.slice(0,12).forEach(row=>preview.append(labRow(row.name,`${row.value} ${row.unit||''}`,`${row.referenceMin||'—'}–${row.referenceMax||'—'} · ${row.date||'без даты'}`,'change'))); commit.disabled=false; });
    commit.addEventListener('click',()=>{ const data=readData(); if(!data||!pending.length)return; const pid=activeProfileId(data); const now=Date.now(); const existing=new Set((data.labs||[]).map(x=>x.id)); data.labs=Array.isArray(data.labs)?data.labs:[]; pending.forEach((row,i)=>{ let id=`lab-v2-${now}-${i}`; while(existing.has(id))id+='x'; existing.add(id); data.labs.push({id,profileId:pid,name:row.name,value:Number(row.value),unit:row.unit||'',referenceMin:row.referenceMin??'',referenceMax:row.referenceMax??'',date:row.date||new Date().toISOString().slice(0,10),laboratory:row.laboratory||'',notes:'Импортировано из CSV · проверено пользователем'}); }); localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); dialog.close(); location.reload(); });
    body.append(help,input,preview,commit); dialog.showModal();
  }

  function parseCsv(text) {
    const lines=String(text).replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim()); if(lines.length<2)return[];
    const delim=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
    const split=line=>{const out=[];let cur='',quote=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){cur+='"';i++;}else quote=!quote;}else if(c===delim&&!quote){out.push(cur.trim());cur='';}else cur+=c;}out.push(cur.trim());return out;};
    const headers=split(lines[0]).map(x=>x.toLowerCase().replace(/\s+/g,'')); const aliases={name:['name','показатель','анализ'],value:['value','значение','результат'],unit:['unit','единица','единицы'],referenceMin:['referencemin','refmin','мин','от'],referenceMax:['referencemax','refmax','макс','до'],date:['date','дата'],laboratory:['laboratory','lab','лаборатория']};
    const idx=key=>{for(const a of aliases[key]){const i=headers.indexOf(a);if(i>=0)return i;}return-1;}; const ni=idx('name'),vi=idx('value'); if(ni<0||vi<0)return[];
    return lines.slice(1).map(line=>{const c=split(line);const get=k=>{const i=idx(k);return i>=0?c[i]??'':''};const raw=String(c[vi]??'').replace(',','.').replace(/[^0-9+-.]/g,'');return{name:c[ni]||'',value:raw,unit:get('unit'),referenceMin:get('referenceMin').replace(',','.'),referenceMax:get('referenceMax').replace(',','.'),date:get('date'),laboratory:get('laboratory')};}).filter(x=>x.name&&Number.isFinite(Number(x.value)));
  }

  function installTopAction() {
    const actions=$('.topbar-actions'); if(!actions||$('#v2AiButton'))return;
    const btn=el('button',{id:'v2AiButton',type:'button',className:'v2-ai-button',ariaLabel:'Открыть AI-ready Health Brief',onclick:openAIContext},el('span',{className:'v2-ai-dot'}),el('span',{text:'Health AI'}));
    actions.insertBefore(btn,$('#themeCycleBtn')||null);
  }

  function installVersion() { const version=$('#appVersion'); if(version) version.textContent='v2.0 · premium'; }
  function refresh() { installTopAction(); installVersion(); renderLabsIntelligence(); }
  document.addEventListener('DOMContentLoaded',()=>{ refresh(); const main=$('#mainContent'); if(main)new MutationObserver(()=>queueMicrotask(refresh)).observe(main,{childList:true}); window.addEventListener('hashchange',()=>setTimeout(refresh,0)); });
})();