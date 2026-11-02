/* KERVIII commission endpoint — Cloudflare Worker (ES module).
   Receives the website's multipart form, validates everything server-side and forwards it to Telegram.
   Secrets live ONLY in environment bindings: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Never in the frontend.
   Optional: ALLOWED_ORIGIN (CORS allow-list, comma separated), KV namespace binding RATE (rate limit + duplicate protection). */

export const LIMITS={nickname:[2,40],title:[3,80],description:[20,2000],budget:[0,40],imageBytes:5*1024*1024,minElapsedMs:2500,ratePerHour:5};
export const SERVICES=["Website Development","Application Development","Android Module Development","WebUI Development","Custom Digital Tools","Other Custom Requests"];

export function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}

/* Identify the real image type from magic bytes — never trust the client's MIME type or filename. */
export function sniffImage(bytes){
  if(bytes.length>=3&&bytes[0]===0xFF&&bytes[1]===0xD8&&bytes[2]===0xFF)return{mime:"image/jpeg",ext:"jpg"};
  if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4E&&bytes[3]===0x47&&bytes[4]===0x0D&&bytes[5]===0x0A&&bytes[6]===0x1A&&bytes[7]===0x0A)return{mime:"image/png",ext:"png"};
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return{mime:"image/webp",ext:"webp"};
  return null;
}

export function validateFields(f){
  const errors=[];
  const t=k=>(typeof f[k]==="string"?f[k].trim():"");
  const chk=(k,label,[min,max])=>{const v=t(k);if(v.length<min||v.length>max)errors.push(`${label} must be ${min}–${max} characters.`);};
  chk("nickname","Nickname",LIMITS.nickname);chk("title","Project title",LIMITS.title);
  chk("description","Project description",LIMITS.description);chk("budget","Budget",LIMITS.budget);
  if(!SERVICES.includes(t("service")))errors.push("Unknown service type.");
  const key=t("idempotencyKey");if(!/^[\w-]{8,64}$/.test(key))errors.push("Missing or invalid request key.");
  return{errors,clean:{nickname:t("nickname"),service:t("service"),title:t("title"),description:t("description"),budget:t("budget"),key}};
}

export function buildMessage(c){
  return [
    "<b>New commission inquiry</b>",
    `<b>Nickname:</b> ${escapeHtml(c.nickname)}`,
    `<b>Service:</b> ${escapeHtml(c.service)}`,
    `<b>Project:</b> ${escapeHtml(c.title)}`,
    `<b>Budget:</b> ${c.budget?escapeHtml(c.budget):"not provided"}`,
    "",
    `<b>Description</b>\n${escapeHtml(c.description)}`
  ].join("\n");
}

function cors(env,origin){
  const allowed=(env.ALLOWED_ORIGIN||"").split(",").map(s=>s.trim()).filter(Boolean);
  const ok=allowed.length===0?false:allowed.includes(origin);
  return{ok,headers:ok?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"}:{"Vary":"Origin"}};
}
const json=(status,body,headers={})=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...headers}});

async function telegram(env,method,body){
  const r=await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,{method:"POST",body});
  let j=null;try{j=await r.json()}catch(e){}
  return{ok:r.ok&&j&&j.ok===true,status:r.status};
}

export async function handleRequest(request,env){
  const origin=request.headers.get("Origin")||"";
  const c=cors(env,origin);
  if(request.method==="OPTIONS")return new Response(null,{status:c.ok?204:403,headers:c.headers});
  if(request.method!=="POST")return json(405,{ok:false,error:"Method not allowed."},c.headers);
  if(!c.ok)return json(403,{ok:false,error:"Origin not allowed."},c.headers);
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return json(500,{ok:false,error:"Server is not configured."},c.headers);

  const len=Number(request.headers.get("Content-Length")||0);
  if(len>LIMITS.imageBytes+200*1024)return json(413,{ok:false,error:"Request is too large."},c.headers);

  let form;try{form=await request.formData()}catch(e){return json(400,{ok:false,error:"Invalid form data."},c.headers)}
  const fields={};for(const k of["nickname","service","title","description","budget","idempotencyKey","website","elapsedMs"])fields[k]=form.get(k);

  /* spam: honeypot filled or form submitted implausibly fast → pretend success without forwarding */
  if(typeof fields.website==="string"&&fields.website.trim()!=="")return json(200,{ok:true},c.headers);
  if(Number(fields.elapsedMs)<LIMITS.minElapsedMs)return json(400,{ok:false,error:"Please take a moment to complete the form."},c.headers);

  const {errors,clean}=validateFields(fields);
  if(errors.length)return json(422,{ok:false,error:errors[0],errors},c.headers);

  let image=null;const file=form.get("image");
  if(file&&typeof file==="object"&&file.size>0){
    if(file.size>LIMITS.imageBytes)return json(413,{ok:false,error:"Image must be 5 MB or smaller."},c.headers);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const kind=sniffImage(bytes);
    if(!kind)return json(415,{ok:false,error:"Image must be a real JPG, PNG or WebP file."},c.headers);
    image={bytes,kind};
  }

  /* rate limit + duplicate protection (needs the RATE KV binding; without it these two protections are NOT active) */
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  if(env.RATE){
    const dupKey=`dup:${clean.key}`;
    if(await env.RATE.get(dupKey))return json(200,{ok:true,duplicate:true},c.headers);
    const hour=Math.floor(Date.now()/3600000),rk=`rl:${ip}:${hour}`;
    const n=Number(await env.RATE.get(rk)||0);
    if(n>=LIMITS.ratePerHour)return json(429,{ok:false,error:"Too many requests. Please try again later."},{...c.headers,"Retry-After":"3600"});
    await env.RATE.put(rk,String(n+1),{expirationTtl:3700});
  }

  const text=buildMessage(clean);
  let res;
  if(image){
    const caption=text.length<=1000?text:`<b>New commission inquiry</b>\n${escapeHtml(clean.title)} — see next message`;
    const fd=new FormData();fd.append("chat_id",env.TELEGRAM_CHAT_ID);fd.append("caption",caption);fd.append("parse_mode","HTML");
    fd.append("photo",new Blob([image.bytes],{type:image.kind.mime}),`reference.${image.kind.ext}`);
    res=await telegram(env,"sendPhoto",fd);
    if(res.ok&&text.length>1000){const m=new FormData();m.append("chat_id",env.TELEGRAM_CHAT_ID);m.append("text",text);m.append("parse_mode","HTML");res=await telegram(env,"sendMessage",m)}
  }else{
    const m=new FormData();m.append("chat_id",env.TELEGRAM_CHAT_ID);m.append("text",text);m.append("parse_mode","HTML");
    res=await telegram(env,"sendMessage",m);
  }
  if(!res.ok)return json(502,{ok:false,error:"Delivery to Telegram failed. Nothing was sent."},c.headers);
  if(env.RATE)await env.RATE.put(`dup:${clean.key}`,"1",{expirationTtl:86400});
  return json(200,{ok:true},c.headers);
}

export default{fetch:(request,env)=>handleRequest(request,env)};
