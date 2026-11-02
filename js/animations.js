/* Motion controller: intro (every document load), section reveal (replays on entry), hero sequence, role cycler. */
(function(){
  var KP=window.KP=window.KP||{};
  var reduced=false;
  try{reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
  var heroReady=false;
  var root=document.documentElement;

  function revealSections(){
    var secs=[].slice.call(document.querySelectorAll("[data-section]"));
    if(!("IntersectionObserver" in window)){secs.forEach(function(s){s.classList.add("is-in")});return}
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(e.target.id==="home"&&!heroReady)return;
        e.target.classList.toggle("is-in",e.isIntersecting);
      });
    },{rootMargin:"-10% 0px -10% 0px",threshold:0});
    secs.forEach(function(s){io.observe(s)});
  }

  function startHero(){
    heroReady=true;
    root.classList.add("grid-in");
    var home=document.getElementById("home");
    if(home)home.classList.add("is-in");
    try{window.dispatchEvent(new CustomEvent("kp:hero"))}catch(e){}
    /* after the first full run, re-entries use short delays */
    setTimeout(function(){root.classList.add("hero-played")},reduced?0:4200);
  }

  /* Intro runs on every full load. Curtain exits at 3.0s (CSS), hero begins at 3.3s. No storage involved. */
  function intro(){
    var pre=document.getElementById("preloader");
    if(reduced){if(pre)pre.classList.add("is-gone");startHero();return}
    document.body.classList.add("is-locked");
    setTimeout(startHero,3300);
    setTimeout(function(){document.body.classList.remove("is-locked");if(pre)pre.classList.add("is-gone")},4100);
  }

  /* Role cycler: the current title leaves first, then the next one enters; fixed-size grid means no layout jump. */
  function roles(){
    var box=document.getElementById("role");if(!box)return;
    var ws=[].slice.call(box.querySelectorAll(".role__w"));if(ws.length<2||reduced)return;
    var i=0;
    function next(){
      var cur=ws[i];i=(i+1)%ws.length;var nx=ws[i];
      cur.classList.remove("is-on");cur.classList.add("is-off");
      nx.classList.remove("is-off");nx.classList.add("is-on");
      setTimeout(function(){cur.classList.remove("is-off")},900);
    }
    function loop(){setTimeout(function(){if(!document.hidden)next();loop()},2800)}
    window.addEventListener("kp:hero",function(){setTimeout(loop,2600)},{once:true});
  }

  KP.anim={reduced:reduced,intro:intro,reveal:revealSections,roles:roles};
})();
