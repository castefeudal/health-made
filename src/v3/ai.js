import {summarizeResults,labStatus} from './labs.js';

export const AI_CONTRACT={required:['summary','importantFindings','changes','possibleExplanations','missingContext','questionsForDoctor','limitations','confidence']};
export function validateAIResponse(value){
  if(!value||typeof value!=='object'||Array.isArray(value)) return {ok:false,error:'not-object'};
  const arrays=['importantFindings','changes','possibleExplanations','missingContext','questionsForDoctor','limitations'];
  if(typeof value.summary!=='string'||!arrays.every(k=>Array.isArray(value[k]))||!['low','moderate','high'].includes(value.confidence)) return {ok:false,error:'schema'};
  return {ok:true,value};
}
export function buildAIContext(state,profileId,purpose='overview'){
  const pick=name=>(state[name]||[]).filter(x=>x.profileId===profileId); const profile=state.profiles.find(x=>x.id===profileId)||null; const results=pick('labResults'); const labs=summarizeResults(results);
  return {schema:'markov-health-ai-context/2',purpose,generatedAt:new Date().toISOString(),profile:profile?{sex:profile.sex||null,birthYear:profile.birthYear||null,height:profile.height||null,primaryGoal:profile.primaryGoal||null}:null,facts:{labs:{attention:labs.attention.map(r=>({name:r.canonicalName,value:r.canonicalValue,unit:r.canonicalUnit,status:labStatus(r).label,referenceLow:r.referenceLow,referenceHigh:r.referenceHigh})),changes:labs.changed.slice(0,20).map(x=>({name:x.current.canonicalName,current:x.current.canonicalValue,previous:x.previous.canonicalValue,unit:x.current.canonicalUnit,delta:x.delta}))},measurements:pick('measurements').slice(-120),sleep:pick('sleep').slice(-60),events:pick('events').slice(-80),symptoms:pick('symptoms').slice(-80),medications:pick('medications'),supplements:pick('supplements'),training:pick('training').slice(-60),goals:pick('goals')},rules:['Facts and calculations are prepared by deterministic code.','Do not diagnose or prescribe.','Separate facts, general information, hypotheses and uncertainty.','Do not invent missing data.']};
}
export class AIGateway{
  constructor(config){ this.endpoint=String(config?.endpoint||'').trim(); this.providerLabel=String(config?.providerLabel||'AI provider'); }
  configured(){ if(!this.endpoint)return false; if(this.endpoint.startsWith('/'))return true; try{const base=globalThis.location?.origin||'http://localhost';const u=new URL(this.endpoint,base);return u.origin===base&&['http:','https:'].includes(u.protocol);}catch{return false;} }
  async request(action,context,{signal}={}){
    if(!this.configured()) throw new Error('ai-gateway-not-configured');
    const response=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,context}),signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!response.ok) throw new Error(`ai-http-${response.status}`); const data=await response.json(); const check=validateAIResponse(data); if(!check.ok) throw new Error('ai-invalid-response'); return check.value;
  }
}
