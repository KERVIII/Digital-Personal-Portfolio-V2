/* Hero card pointer tracking: pure math + a DOM-stub run of init() to verify sync, direction mapping and smooth reset. */
const assert=require("assert");
const hc=require("../js/hero-card.js");
const rect={left:400,top:200,width:200,height:260};   // centre (500,330)
let pass=0;const ok=(n,f)=>{try{f();pass++;console.log("  ok  "+n)}catch(e){console.log("  FAIL "+n+"\n       "+e.message);process.exitCode=1}};

console.log("compute()");
const UL=hc.compute(rect,420,220),UR=hc.compute(rect,580,220),LL=hc.compute(rect,420,440),LR=hc.compute(rect,580,440),C=hc.compute(rect,500,330);
ok("centre: no tilt, no shift, light at 50/50, dot at 0,0",()=>{assert.deepStrictEqual([C.rotX,C.rotY,C.tx,C.ty,C.gx,C.gy,C.dx,C.dy].map(v=>Math.abs(v)),[0,0,0,0,50,0+50,0,0].map((v,i)=>i===4||i===5?50:v)); assert(C.inside)});
ok("upper-left: rotY<0, rotX>0, shift (-,-), light <50/<50, dot (-,-)",()=>{assert(UL.rotY<0&&UL.rotX>0&&UL.tx<0&&UL.ty<0&&UL.gx<50&&UL.gy<50&&UL.dx<0&&UL.dy<0)});
ok("upper-right: rotY>0, rotX>0, shift (+,-), light >50/<50, dot (+,-)",()=>{assert(UR.rotY>0&&UR.rotX>0&&UR.tx>0&&UR.ty<0&&UR.gx>50&&UR.gy<50&&UR.dx>0&&UR.dy<0)});
ok("lower-left: rotY<0, rotX<0, shift (-,+), light <50/>50, dot (-,+)",()=>{assert(LL.rotY<0&&LL.rotX<0&&LL.tx<0&&LL.ty>0&&LL.gx<50&&LL.gy>50&&LL.dx<0&&LL.dy>0)});
ok("lower-right: rotY>0, rotX<0, shift (+,+), light >50/>50, dot (+,+)",()=>{assert(LR.rotY>0&&LR.rotX<0&&LR.tx>0&&LR.ty>0&&LR.gx>50&&LR.gy>50&&LR.dx>0&&LR.dy>0)});
ok("light position equals dot position (same coordinate system)",()=>{for(const c of [UL,UR,LL,LR]){assert(Math.abs((c.gx-50)/50-c.dx/(rect.width/2))<1e-9);assert(Math.abs((c.gy-50)/50-c.dy/(rect.height/2))<1e-9)}});
ok("tilt, shift and light share the same sign per axis",()=>{for(const c of [UL,UR,LL,LR]){assert(Math.sign(c.rotY)===Math.sign(c.tx)&&Math.sign(c.tx)===Math.sign(c.gx-50));assert(Math.sign(-c.rotX)===Math.sign(c.ty)&&Math.sign(c.ty)===Math.sign(c.gy-50))}});
ok("far outside: tilt clamps to max, dot/light stay inside the card",()=>{const f=hc.compute(rect,5000,-5000);assert.strictEqual(f.rotY,hc.CFG.maxTilt);assert.strictEqual(f.rotX,hc.CFG.maxTilt);assert(f.gx===100&&f.gy===0&&!f.inside)});
ok("outside card: indicator hidden (inside=false)",()=>{assert(!hc.compute(rect,900,330).inside)});

console.log("init() with DOM stubs");
function el(){const s={};return{style:{setProperty(k,v){s[k]=v},_s:s,transform:"",opacity:""},parentNode:null,classList:{contains:()=>true},getBoundingClientRect:()=>rect}}
const card=el(),dot=el(),home=el(),base=el();card.parentNode=base;
const q={hcard:card,"hcard-dot":dot,home};
const listeners={};let queue=[],now=0;
global.document={getElementById:i=>q[i],documentElement:{addEventListener:(t,f)=>listeners["doc:"+t]=f},addEventListener(){},hidden:false};
global.window={addEventListener:(t,f)=>listeners[t]=f};
global.matchMedia=m=>({matches:/hover: hover|pointer: fine/.test(m)});
global.requestAnimationFrame=f=>{queue.push(f);return queue.length};
global.performance={now:()=>now};
global.IntersectionObserver=undefined;
hc.init();
const run=(n)=>{for(let i=0;i<n;i++){const q2=queue;queue=[];now+=16;q2.forEach(f=>f(now))}};
const tilt=()=>{const m=/rotateX\(([-\d.]+)deg\) rotateY\(([-\d.]+)deg\)/.exec(card.style.transform);return m?{x:+m[1],y:+m[2]}:null};
const g=()=>({x:parseFloat(card.style._s["--gx"]),y:parseFloat(card.style._s["--gy"])});
ok("pointer lower-right drives tilt, light and dot in the same direction",()=>{listeners.pointermove({pointerType:"mouse",clientX:580,clientY:440});run(90);const t=tilt(),l=g();assert(t.y>0&&t.x<0&&l.x>50&&l.y>50);assert(/translate3d\(([\d.]+)px,([\d.]+)px/.exec(dot.style.transform)&&+dot.style.opacity>.9)});
ok("pointer upper-left reverses all of them",()=>{listeners.pointermove({pointerType:"mouse",clientX:420,clientY:220});run(120);const t=tilt(),l=g();assert(t.y<0&&t.x>0&&l.x<50&&l.y<50)});
ok("touch pointer is ignored",()=>{const before=card.style.transform;listeners.pointermove({pointerType:"touch",clientX:580,clientY:440});run(30);assert.strictEqual(card.style.transform,before)});
ok("pointer exit eases back to rest (monotonic, then cleared)",()=>{listeners["doc:pointerleave"]();let prev=Math.abs(tilt().y),mono=true;for(let i=0;i<40;i++){run(1);const t=tilt();if(!t)break;const a=Math.abs(t.y);if(a>prev+1e-6)mono=false;prev=a}assert(mono);run(200);assert.strictEqual(card.style.transform,"");assert.strictEqual(dot.style.opacity,"0")});
console.log(pass+" passed");
