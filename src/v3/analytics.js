function finite(value){ return Number.isFinite(Number(value)); }
export function pearson(pairs,{minN=5}={}){
  const valid=(pairs||[]).filter(p=>Array.isArray(p)&&finite(p[0])&&finite(p[1])).map(p=>[Number(p[0]),Number(p[1])]);
  if(valid.length<minN) return {ok:false,n:valid.length,reason:'insufficient-observations'};
  const mx=valid.reduce((s,p)=>s+p[0],0)/valid.length;
  const my=valid.reduce((s,p)=>s+p[1],0)/valid.length;
  let numerator=0,dx=0,dy=0;
  for(const [x,y] of valid){const a=x-mx,b=y-my;numerator+=a*b;dx+=a*a;dy+=b*b;}
  if(!dx||!dy) return {ok:false,n:valid.length,reason:'zero-variance'};
  const r=numerator/Math.sqrt(dx*dy);
  const strength=Math.abs(r)<0.3?'weak':Math.abs(r)<0.6?'moderate':'strong';
  return {ok:true,n:valid.length,r,strength,caveat:'Correlation does not establish causation.'};
}
export function pairByDate(left,right,{leftDate=x=>x.date||x.measuredAt,rightDate=x=>x.date||x.measuredAt,leftValue=x=>x.value,rightValue=x=>x.value}={}){
  const map=new Map();
  for(const item of left||[]){const d=String(leftDate(item)||'').slice(0,10);const v=leftValue(item);if(d&&finite(v))map.set(d,Number(v));}
  const pairs=[];
  for(const item of right||[]){const d=String(rightDate(item)||'').slice(0,10);const v=rightValue(item);if(d&&finite(v)&&map.has(d))pairs.push([map.get(d),Number(v)]);}
  return pairs;
}
