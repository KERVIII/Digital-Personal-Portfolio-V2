/* Hero card: ONE shared pointer calculation drives tilt, shift, light, ring and the white indicator dot.
   All values are derived from compute() relative to the card centre, then smoothed in a single rAF loop. */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else{root.KP=root.KP||{};root.KP.heroCard=factory()}
})(typeof self!=="undefined"?self:this,function(){
  var CFG={maxTilt:11,maxShift:7,range:1.6};
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

  /* rect: {left,top,width,height} of the UNtilted card. (x,y): pointer in the same viewport coordinates.
     Sign convention (CSS): pointer right → rotateY(+) so the right edge recedes; pointer up → rotateX(+) so the top edge recedes.
     Light and dot use the same raw offset, clamped to the card, so they always sit under the pointer. */
  function compute(rect,x,y,cfg){
    cfg=cfg||CFG;
    var hw=rect.width/2,hh=rect.height/2,cx=rect.left+hw,cy=rect.top+hh;
    var rawX=(x-cx)/hw,rawY=(y-cy)/hh;                       /* -1..1 at the card edges, beyond outside */
    var nx=clamp(rawX/cfg.range,-1,1),ny=clamp(rawY/cfg.range,-1,1);
    var lx=clamp(rawX,-1,1),ly=clamp(rawY,-1,1);
    return{
      nx:nx,ny:ny,
      inside:Math.abs(rawX)<=1&&Math.abs(rawY)<=1,
      rotY:nx*cfg.maxTilt,rotX:-ny*cfg.maxTilt,
      tx:nx*cfg.maxShift,ty:ny*cfg.maxShift,
      gx:50+lx*50,gy:50+ly*50,                               /* light position, % of card */
      dx:lx*hw,dy:ly*hh                                      /* dot offset from card centre, px */
    };
  }
  var REST={rotX:0,rotY:0,tx:0,ty:0,gx:50,gy:50,dx:0,dy:0,go:0,dot:0};

  function init(){
    var card=document.getElementById("hcard"),dot=document.getElementById("hcard-dot"),base=card&&card.parentNode;
    var home=document.getElementById("home");
    if(!card||!dot||!home)return;
    var fine=false,reduced=false;
    try{fine=matchMedia("(hover: hover) and (pointer: fine)").matches;reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
    if(!fine||reduced)return;                                /* touch-only / reduced motion: no pointer-following */

    var cur={rotX:0,rotY:0,tx:0,ty:0,gx:50,gy:50,dx:0,dy:0,go:0,dot:0};
    var tgt={rotX:0,rotY:0,tx:0,ty:0,gx:50,gy:50,dx:0,dy:0,go:0,dot:0};
    var px=0,py=0,active=false,raf=0,last=0,visible=true;

    function aim(){
      var r=base.getBoundingClientRect();                    /* wrapper is untilted → stable centre */
      var c=compute(r,px,py);
      tgt.rotX=c.rotX;tgt.rotY=c.rotY;tgt.tx=c.tx;tgt.ty=c.ty;tgt.gx=c.gx;tgt.gy=c.gy;tgt.dx=c.dx;tgt.dy=c.dy;
      tgt.go=1;tgt.dot=c.inside?1:0;
    }
    function rest(){for(var k in REST)tgt[k]=REST[k]}

    function frame(t){
      var dt=Math.min(.05,(t-last)/1000||.016);last=t;
      if(active)aim();else rest();
      var k=1-Math.exp(-dt*(active?14:7));
      var moving=false;
      for(var key in cur){var d=tgt[key]-cur[key];if(Math.abs(d)>.003){cur[key]+=d*k;moving=true}else cur[key]=tgt[key]}
      card.style.transform="perspective(900px) translate3d("+cur.tx.toFixed(2)+"px,"+cur.ty.toFixed(2)+"px,0) rotateX("+cur.rotX.toFixed(2)+"deg) rotateY("+cur.rotY.toFixed(2)+"deg)";
      card.style.setProperty("--gx",cur.gx.toFixed(2)+"%");
      card.style.setProperty("--gy",cur.gy.toFixed(2)+"%");
      card.style.setProperty("--go",cur.go.toFixed(3));
      dot.style.transform="translate3d("+cur.dx.toFixed(2)+"px,"+cur.dy.toFixed(2)+"px,0)";
      dot.style.opacity=cur.dot.toFixed(3);
      if(active||moving)raf=requestAnimationFrame(frame);
      else{raf=0;card.style.transform="";dot.style.opacity="0"}
    }
    function run(){if(!raf){last=performance.now();raf=requestAnimationFrame(frame)}}

    window.addEventListener("pointermove",function(e){
      if(e.pointerType==="touch"||!visible||!home.classList.contains("is-in"))return;
      px=e.clientX;py=e.clientY;active=true;run();           /* event only stores coordinates; math runs once per frame */
    },{passive:true});
    function leave(){active=false;run()}
    document.documentElement.addEventListener("pointerleave",leave);
    window.addEventListener("blur",leave);
    document.addEventListener("visibilitychange",function(){if(document.hidden)leave()});
    if("IntersectionObserver" in window)new IntersectionObserver(function(es){visible=es[0].isIntersecting;if(!visible)leave()}).observe(home);
  }
  return{compute:compute,CFG:CFG,init:init};
});
