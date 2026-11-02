/* Lanyard physics: two coupled damped springs (lace + card). Drag the card to swing it. Independent from tilt (separate elements). */
(function(){
  var KP=window.KP=window.KP||{};

  function lace(){
    var strap=document.getElementById("lace"),swing=document.getElementById("swing"),root=document.getElementById("badge");
    if(!strap||!swing)return;
    var reduced=KP.anim&&KP.anim.reduced;
    var a1=0,v1=0,a2=0,v2=0,raf=0,last=0,drag=false,px=0,py=0,pa=0;
    var K1=13,C1=1.5,K2=30,C2=2.4,MAX=.55;
    function paint(){strap.style.transform="rotate("+a1+"rad)";swing.style.transform="rotate("+a2+"rad)"}
    function step(t){
      var dt=Math.min(.033,(t-last)/1000||.016);last=t;
      var acc1=0;
      if(!drag){acc1=-K1*a1-C1*v1;v1+=acc1*dt;a1+=v1*dt}
      var acc2=-K2*a2-C2*v2-acc1*.9;
      if(drag)acc2-=((v1-pa)/Math.max(dt,.001))*.04;
      v2+=acc2*dt;a2+=v2*dt;pa=v1;
      paint();
      var still=!drag&&Math.abs(a1)<.002&&Math.abs(v1)<.01&&Math.abs(a2)<.002&&Math.abs(v2)<.01;
      if(still){a1=v1=a2=v2=0;strap.style.transform="";swing.style.transform="";raf=0;return}
      raf=requestAnimationFrame(step);
    }
    function run(){if(!raf){last=performance.now();raf=requestAnimationFrame(step)}}
    /* first swing once the lace has finished extending */
    window.addEventListener("kp:hero",function(){if(!reduced)setTimeout(function(){a1=.3;run()},2000)});
    if(reduced)return;

    function pivot(){
      var r=root.getBoundingClientRect(),top=parseFloat(getComputedStyle(strap).top)||0;
      px=r.left+r.width/2;py=r.top+top;
    }
    swing.addEventListener("pointerdown",function(e){
      drag=true;swing.classList.add("is-drag");pivot();
      try{swing.setPointerCapture(e.pointerId)}catch(x){}
      v1=0;pa=0;run();
    });
    swing.addEventListener("pointermove",function(e){
      if(!drag)return;
      var ang=Math.atan2(e.clientX-px,Math.max(40,e.clientY-py));
      ang=Math.max(-MAX,Math.min(MAX,ang));
      v1=(ang-a1)*30;a1=ang;
    });
    function release(){if(!drag)return;drag=false;swing.classList.remove("is-drag");v1=Math.max(-3,Math.min(3,v1));run()}
    swing.addEventListener("pointerup",release);
    swing.addEventListener("pointercancel",release);
    swing.addEventListener("lostpointercapture",release);
  }
  KP.interactions={init:function(){lace()}};
})();
