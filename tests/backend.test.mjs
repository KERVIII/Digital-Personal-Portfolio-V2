/* Backend logic tests with a MOCKED Telegram. These prove validation/formatting/flow — they are NOT an end-to-end Telegram test. */
import assert from "node:assert";
import {validateFields,sniffImage,escapeHtml,buildMessage,handleRequest,SERVICES} from "../backend/worker.js";
let pass=0;const ok=async(n,f)=>{try{await f();pass++;console.log("  ok  "+n)}catch(e){console.log("  FAIL "+n+"\n       "+e.message);process.exitCode=1}};
const JPG=new Uint8Array([0xFF,0xD8,0xFF,0xE0,0,16,...new Array(64).fill(1)]);
const PNG=new Uint8Array([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,...new Array(32).fill(2)]);
const WEBP=new Uint8Array([...Buffer.from("RIFF"),1,0,0,0,...Buffer.from("WEBP"),...new Array(16).fill(3)]);
const good={nickname:"Luffy",service:SERVICES[0],title:"My site",description:"A description that is long enough.",budget:"",idempotencyKey:"abcdef123456"};

console.log("validation");
await ok("accepts a valid payload",()=>assert.strictEqual(validateFields(good).errors.length,0));
await ok("rejects short nickname/title/description and bad service/key",()=>{const r=validateFields({...good,nickname:"a",title:"x",description:"short",service:"Hack",idempotencyKey:"!"});assert(r.errors.length>=5)});
await ok("rejects over-long budget",()=>assert(validateFields({...good,budget:"x".repeat(41)}).errors.length===1));
await ok("sniffs real JPG/PNG/WebP and rejects text renamed to .jpg",()=>{assert.strictEqual(sniffImage(JPG).ext,"jpg");assert.strictEqual(sniffImage(PNG).ext,"png");assert.strictEqual(sniffImage(WEBP).ext,"webp");assert.strictEqual(sniffImage(new TextEncoder().encode("hello, not an image")),null)});
await ok("escapes HTML in Telegram text",()=>{const m=buildMessage({...validateFields({...good,nickname:"<b>x</b>"}).clean});assert(!m.includes("<b>x</b>")&&m.includes("&lt;b&gt;x&lt;/b&gt;"))});

console.log("handleRequest (mock Telegram)");
const env=(extra={})=>({TELEGRAM_BOT_TOKEN:"T",TELEGRAM_CHAT_ID:"C",ALLOWED_ORIGIN:"https://site.example",...extra});
function kv(){const m=new Map();return{get:async k=>m.get(k)??null,put:async(k,v)=>{m.set(k,v)},_m:m}}
let calls=[],tgOk=true;
globalThis.fetch=async(url,init)=>{calls.push({url,body:init.body});return new Response(JSON.stringify({ok:tgOk}),{status:tgOk?200:400})};
function req(fields={},img,hdr={}){const fd=new FormData();const f={...good,elapsedMs:"9000",website:"",...fields};for(const k in f)fd.append(k,f[k]);if(img)fd.append("image",new Blob([img.bytes],{type:img.type||"image/jpeg"}),img.name||"a.jpg");return new Request("https://api.example/",{method:"POST",body:fd,headers:{Origin:"https://site.example",...hdr}})}
const j=async r=>({s:r.status,b:await r.json()});
await ok("valid text-only inquiry → sendMessage, 200 ok:true",async()=>{calls=[];const r=await j(await handleRequest(req(),env()));assert.deepStrictEqual([r.s,r.b.ok],[200,true]);assert(calls[0].url.endsWith("/sendMessage"))});
await ok("valid inquiry with image → sendPhoto carrying the image and caption",async()=>{calls=[];const r=await j(await handleRequest(req({},{bytes:PNG,type:"image/png",name:"r.png"}),env()));assert.strictEqual(r.s,200);const c=calls[0];assert(c.url.endsWith("/sendPhoto"));assert(c.body.get("photo").size===PNG.length);assert(c.body.get("caption").includes("Luffy")&&c.body.get("caption").includes("My site"))});
await ok("long description → full text message + photo",async()=>{calls=[];await handleRequest(req({description:"d".repeat(1900)},{bytes:JPG}),env());assert.deepStrictEqual(calls.map(c=>c.url.split("/").pop()),["sendPhoto","sendMessage"])});
await ok("fake image (text renamed .jpg) → 415, nothing sent",async()=>{calls=[];const r=await j(await handleRequest(req({},{bytes:new TextEncoder().encode("not an image at all"),name:"x.jpg"}),env()));assert.strictEqual(r.s,415);assert.strictEqual(calls.length,0)});
await ok("image over 5 MB → 413",async()=>{const r=await j(await handleRequest(req({},{bytes:new Uint8Array(5*1024*1024+1).fill(0xFF)}),env()));assert.strictEqual(r.s,413)});
await ok("invalid fields → 422",async()=>{const r=await j(await handleRequest(req({title:"x"}),env()));assert.strictEqual(r.s,422)});
await ok("wrong origin → 403; preflight allowed only for allowed origin",async()=>{assert.strictEqual((await handleRequest(req({},null,{Origin:"https://evil.example"}),env())).status,403);const p=await handleRequest(new Request("https://a/",{method:"OPTIONS",headers:{Origin:"https://site.example"}}),env());assert.strictEqual(p.status,204)});
await ok("honeypot filled → pretend success, nothing forwarded",async()=>{calls=[];const r=await j(await handleRequest(req({website:"http://spam"}),env()));assert.strictEqual(r.s,200);assert.strictEqual(calls.length,0)});
await ok("submitted implausibly fast → 400",async()=>{const r=await j(await handleRequest(req({elapsedMs:"300"}),env()));assert.strictEqual(r.s,400)});
await ok("Telegram failure → 502 ok:false (site must not show success)",async()=>{tgOk=false;const r=await j(await handleRequest(req(),env()));tgOk=true;assert.deepStrictEqual([r.s,r.b.ok],[502,false])});
await ok("duplicate idempotency key is not forwarded twice (KV)",async()=>{calls=[];const e=env({RATE:kv()});await handleRequest(req({idempotencyKey:"dupdupdup1"}),e);const r2=await j(await handleRequest(req({idempotencyKey:"dupdupdup1"}),e));assert.strictEqual(calls.length,1);assert.strictEqual(r2.b.duplicate,true)});
await ok("rate limit: 6th request in an hour → 429 (KV)",async()=>{const e=env({RATE:kv()});let last;for(let i=0;i<6;i++)last=await handleRequest(req({idempotencyKey:"rl-key-"+i+"-xxxx"},null,{"CF-Connecting-IP":"1.2.3.4"}),e);assert.strictEqual(last.status,429)});
await ok("missing secrets → 500, nothing sent",async()=>{calls=[];const r=await j(await handleRequest(req(),{ALLOWED_ORIGIN:"https://site.example"}));assert.strictEqual(r.s,500);assert.strictEqual(calls.length,0)});
console.log(pass+" passed");
