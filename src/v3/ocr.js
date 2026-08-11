const SAME_ORIGIN_ERROR='ocr-endpoint-must-be-same-origin';

export class OCRGateway{
  constructor(config={}){
    this.endpoint=String(config.endpoint||'').trim();
    this.providerLabel=String(config.providerLabel||'OCR gateway').trim();
  }
  configured(){
    if(!this.endpoint) return false;
    if(this.endpoint.startsWith('/')) return true;
    try{
      const base=globalThis.location?.origin||'http://localhost';
      const url=new URL(this.endpoint,base);
      return url.origin===base&&['http:','https:'].includes(url.protocol);
    }catch{return false;}
  }
  async extract(file,{signal}={}){
    if(!this.configured()) throw new Error(SAME_ORIGIN_ERROR);
    if(!file) throw new Error('missing-file');
    const body=new FormData();
    body.append('file',file,file.name||'health-document');
    const response=await fetch(this.endpoint,{method:'POST',body,signal,cache:'no-store',credentials:'same-origin',referrerPolicy:'no-referrer',headers:{'X-Markov-Health-Intent':'ocr'}});
    if(!response.ok) throw new Error(`ocr-http-${response.status}`);
    const payload=await response.json();
    if(!payload||typeof payload.text!=='string') throw new Error('invalid-ocr-response');
    return {text:payload.text,confidence:['high','medium','low'].includes(payload.confidence)?payload.confidence:'low',provider:this.providerLabel};
  }
}
