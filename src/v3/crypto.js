const enc=new TextEncoder();
const dec=new TextDecoder();
function b64(bytes){ let s=''; for(const b of bytes)s+=String.fromCharCode(b); return btoa(s); }
function unb64(value){ const s=atob(value); return Uint8Array.from(s,c=>c.charCodeAt(0)); }
async function keyFromPassword(password,salt,iterations){
  const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function encryptBackup(payload,password){
  if(!password||password.length<8) throw new Error('password-too-short');
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const iterations=210000;
  const key=await keyFromPassword(password,salt,iterations);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(payload))));
  return JSON.stringify({application:'MARKOV_HEALTH_OS',format:'MHOS_ENCRYPTED_BACKUP',formatVersion:1,kdf:'PBKDF2-SHA256',iterations,cipher:'AES-GCM',salt:b64(salt),iv:b64(iv),ciphertext:b64(cipher)},null,2);
}
export async function decryptBackup(text,password){
  const box=JSON.parse(text);
  let iterations,salt,iv,data;
  if(box?.application==='MARKOV_HEALTH_OS'&&box.format==='MHOS_ENCRYPTED_BACKUP'&&box.formatVersion===1){
    iterations=Number(box.iterations)||210000;salt=unb64(box.salt);iv=unb64(box.iv);data=unb64(box.ciphertext);
  }else if(box?.format==='MARKOV_HEALTH_OS_ENCRYPTED'&&box.version===1){
    iterations=Number(box.kdf?.iterations)||210000;salt=unb64(box.kdf.salt);iv=unb64(box.cipher.iv);data=unb64(box.cipher.data);
  }else throw new Error('invalid-encrypted-backup');
  const key=await keyFromPassword(password,salt,iterations);
  try{return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,data)));}
  catch{throw new Error('wrong-password-or-corrupted-backup');}
}
