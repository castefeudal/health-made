'use strict';
(() => {
  const catalogApi = () => window.MarkovHealthCatalog;
  const finite = value => Number.isFinite(Number(value));
  const num = value => finite(value) ? Number(value) : null;
  const normalizeUnit = value => String(value ?? '').trim().replace('μ','µ');
  const normalizeName = value => catalogApi()?.normalize(value) ?? String(value ?? '').toLowerCase().trim();

  function findAnalyte(query) {
    const api = catalogApi();
    if (!api) return null;
    const q = normalizeName(query);
    const exact = api.aliasIndex.get(q);
    if (exact) return api.catalog.find(x => x.id === exact) || null;
    const scored = api.catalog.map(item => {
      const hay = [item.canonicalRu,item.shortRu,item.englishName,...item.abbreviations,...item.russianAliases].map(normalizeName);
      const score = Math.max(...hay.map(v => v === q ? 100 : v.startsWith(q) ? 80 : v.includes(q) ? 60 : q.includes(v) ? 40 : 0));
      return { item, score };
    }).filter(x => x.score > 0).sort((a,b) => b.score - a.score || a.item.canonicalRu.localeCompare(b.item.canonicalRu,'ru'));
    return scored[0]?.item || null;
  }

  function searchAnalytes(query, limit = 12) {
    const api = catalogApi();
    if (!api) return [];
    const q = normalizeName(query);
    if (!q) return api.catalog.slice(0,limit);
    return api.catalog.map(item => {
      const values = [item.canonicalRu,item.shortRu,item.englishName,...item.abbreviations,...item.russianAliases].map(normalizeName);
      let score = 0;
      for (const v of values) score = Math.max(score, v === q ? 100 : v.startsWith(q) ? 80 : v.includes(q) ? 60 : 0);
      return { item, score };
    }).filter(x => x.score).sort((a,b) => b.score-a.score || a.item.canonicalRu.localeCompare(b.item.canonicalRu,'ru')).slice(0,limit).map(x=>x.item);
  }

  function labStatus(lab) {
    const value = num(lab.value);
    if (value === null) return { key:'unknown', label:'Нет числового значения', source:'laboratory-reference' };
    const low = num(lab.referenceLow ?? lab.referenceMin);
    const high = num(lab.referenceHigh ?? lab.referenceMax);
    const hasLow = lab.referenceLow !== '' && lab.referenceMin !== '' && low !== null;
    const hasHigh = lab.referenceHigh !== '' && lab.referenceMax !== '' && high !== null;
    if (!hasLow && !hasHigh) return { key:'unknown', label:'Референс не указан', source:'laboratory-reference' };
    if (hasLow && value < low) return { key:'low', label:'Ниже референса лаборатории', source:'laboratory-reference' };
    if (hasHigh && value > high) return { key:'high', label:'Выше референса лаборатории', source:'laboratory-reference' };
    return { key:'range', label:'В референсе лаборатории', source:'laboratory-reference' };
  }

  function convertValue(analyteOrName, value, fromUnit, toUnit) {
    const analyte = typeof analyteOrName === 'string' ? findAnalyte(analyteOrName) : analyteOrName;
    if (!analyte || !finite(value)) return { ok:false, reason:'unknown-analyte-or-value' };
    const from = normalizeUnit(fromUnit), to = normalizeUnit(toUnit);
    if (!from || !to) return { ok:false, reason:'missing-unit' };
    if (from === to) return { ok:true, value:Number(value), fromUnit:from, toUnit:to, converted:false };
    const aliases = {'mmol/L':'ммоль/л','mg/dL':'мг/дл','µmol/L':'мкмоль/л','ng/mL':'нг/мл','nmol/L':'нмоль/л','g/L':'г/л','g/dL':'g/dL','µg/L':'мкг/л','ng/dL':'нг/дл'};
    const fromKey = aliases[from] || from;
    const toKey = aliases[to] || to;
    const direct = analyte.unitConversions?.[`${fromKey}->${toKey}`] || analyte.unitConversions?.[`${from}->${to}`];
    if (typeof direct === 'function') return { ok:true, value:direct(Number(value)), fromUnit:from, toUnit:to, converted:true };
    const viaCanonical = analyte.canonicalUnit;
    if (viaCanonical && fromKey !== viaCanonical && toKey !== viaCanonical) {
      const a = analyte.unitConversions?.[`${fromKey}->${viaCanonical}`];
      const b = analyte.unitConversions?.[`${viaCanonical}->${toKey}`];
      if (typeof a === 'function' && typeof b === 'function') return { ok:true, value:b(a(Number(value))), fromUnit:from, toUnit:to, converted:true };
    }
    return { ok:false, reason:'conversion-not-verified' };
  }

  function normalizeLab(lab) {
    const analyte = findAnalyte(lab.analyteId || lab.originalName || lab.name);
    const originalUnit = normalizeUnit(lab.originalUnit || lab.unit);
    const originalValue = num(lab.value);
    let canonicalValue = originalValue;
    let canonicalUnit = originalUnit;
    let conversion = null;
    if (analyte?.canonicalUnit && originalUnit && originalUnit !== analyte.canonicalUnit && originalValue !== null) {
      conversion = convertValue(analyte, originalValue, originalUnit, analyte.canonicalUnit);
      if (conversion.ok) { canonicalValue = conversion.value; canonicalUnit = analyte.canonicalUnit; }
    }
    return {
      ...lab,
      analyteId: analyte?.id || lab.analyteId || null,
      canonicalName: analyte?.canonicalRu || lab.name || lab.originalName || 'Неизвестный показатель',
      originalName: lab.originalName || lab.name || '', originalUnit,
      canonicalUnit, canonicalValue, conversion: conversion?.ok ? { from:originalUnit, to:canonicalUnit } : null,
      referenceLow: lab.referenceLow ?? lab.referenceMin ?? null,
      referenceHigh: lab.referenceHigh ?? lab.referenceMax ?? null,
      status: labStatus(lab)
    };
  }

  function delta(current, previous) {
    const a = num(current), b = num(previous);
    if (a === null || b === null) return null;
    const absolute = a-b;
    return { absolute, percent: b === 0 ? null : (absolute/Math.abs(b))*100 };
  }

  function pearson(pairs) {
    const valid = pairs.filter(p => finite(p?.[0]) && finite(p?.[1])).map(p => [Number(p[0]),Number(p[1])]);
    if (valid.length < 5) return { ok:false, n:valid.length, reason:'insufficient-observations' };
    const mx = valid.reduce((s,p)=>s+p[0],0)/valid.length, my = valid.reduce((s,p)=>s+p[1],0)/valid.length;
    let numerator=0, dx=0, dy=0;
    for (const [x,y] of valid) { const a=x-mx,b=y-my; numerator+=a*b; dx+=a*a; dy+=b*b; }
    if (!dx || !dy) return { ok:false, n:valid.length, reason:'zero-variance' };
    const r = numerator/Math.sqrt(dx*dy);
    return { ok:true, n:valid.length, r, strength:Math.abs(r)<.3?'weak':Math.abs(r)<.6?'moderate':'strong', caveat:'Корреляция не доказывает причинную связь.' };
  }

  function summarizeLabs(labs) {
    const normalized = (labs || []).map(normalizeLab).filter(x => x.value !== '' && x.value != null);
    const byAnalyte = new Map();
    for (const lab of normalized) {
      const key = lab.analyteId || normalizeName(lab.originalName || lab.canonicalName);
      if (!byAnalyte.has(key)) byAnalyte.set(key, []);
      byAnalyte.get(key).push(lab);
    }
    const current = [], changed = [];
    for (const records of byAnalyte.values()) {
      records.sort((a,b)=>new Date(b.date||b.collectedAt||0)-new Date(a.date||a.collectedAt||0));
      const latest = records[0], previous = records[1];
      current.push(latest);
      if (previous && latest.canonicalUnit === previous.canonicalUnit) {
        const d = delta(latest.canonicalValue, previous.canonicalValue);
        if (d) changed.push({ analyte:latest.canonicalName, current:latest.canonicalValue, previous:previous.canonicalValue, unit:latest.canonicalUnit, delta:d, date:latest.date||latest.collectedAt, previousDate:previous.date||previous.collectedAt });
      }
    }
    changed.sort((a,b)=>Math.abs(b.delta.percent||0)-Math.abs(a.delta.percent||0));
    const attention = current.filter(x => ['low','high'].includes(x.status.key));
    const unknownRefs = current.filter(x => x.status.key === 'unknown');
    return { totalResults:normalized.length, uniqueAnalytes:byAnalyte.size, current, attention, unknownRefs, changed, latestDate:normalized.map(x=>x.date||x.collectedAt).filter(Boolean).sort().at(-1)||null };
  }

  function buildAIContext(data, profileId) {
    const pick = name => (data?.[name] || []).filter(x => !profileId || x.profileId === profileId);
    const profile = (data?.profiles || []).find(x => x.id === profileId) || null;
    const labs = summarizeLabs(pick('labs'));
    return {
      schema:'markov-health-ai-context/1', generatedAt:new Date().toISOString(), profile,
      facts:{ labs:{ latestDate:labs.latestDate, attention:labs.attention.map(x=>({name:x.canonicalName,value:x.value,unit:x.unit,status:x.status.label,referenceLow:x.referenceLow,referenceHigh:x.referenceHigh})), changes:labs.changed.slice(0,12) }, measurements:pick('measurements').slice(-100), sleep:pick('sleep').slice(-60), activity:pick('activity').slice(-60), medications:pick('medications'), supplements:pick('supplements'), symptoms:pick('symptoms').slice(-100), training:pick('training').slice(-60), goals:pick('goals') },
      rules:['Факты и расчёты уже подготовлены кодом. Не пересчитывай значения без необходимости.','Не ставь диагноз и не назначай лечение.','Отделяй факты, общую информацию, гипотезы и неопределённость.','Не придумывай отсутствующие данные.']
    };
  }

  function validateAIResponse(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const arrays = ['importantFindings','trends','possibleExplanations','missingContext','questionsForDoctor','limitations'];
    if (typeof value.summary !== 'string') return false;
    if (!arrays.every(k => Array.isArray(value[k]))) return false;
    return ['low','moderate','high'].includes(value.confidence);
  }

  window.MarkovHealthEngine = Object.freeze({ findAnalyte,searchAnalytes,labStatus,convertValue,normalizeLab,delta,pearson,summarizeLabs,buildAIContext,validateAIResponse });
})();