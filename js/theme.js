/* Theme: dark/light, persisted (storage may be unavailable in WebView/private mode). */
(function(){
  var KP=window.KP=window.KP||{};
  var root=document.documentElement,KEY="kp-theme";
  var META={dark:"#080808",light:"#F4F3F0"};

  function get(){return root.getAttribute("data-theme")==="light"?"light":"dark"}
  function paint(t){
    root.setAttribute("data-theme",t);
    var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=META[t];
    var b=document.getElementById("theme-toggle");
    if(b)b.setAttribute("aria-label",t==="dark"?"Switch to light theme":"Switch to dark theme");
  }
  function set(t,save){
    root.classList.add("theme-anim");
    paint(t);
    if(save!==false){try{localStorage.setItem(KEY,t)}catch(e){}}
    setTimeout(function(){root.classList.remove("theme-anim")},500);
  }
  function init(){
    paint(get());
    var b=document.getElementById("theme-toggle");
    if(b)b.addEventListener("click",function(){set(get()==="dark"?"light":"dark")});
    try{
      var mq=matchMedia("(prefers-color-scheme: light)"),stored=null;
      try{stored=localStorage.getItem(KEY)}catch(e){}
      var on=function(e){var s=null;try{s=localStorage.getItem(KEY)}catch(x){}if(!s)set(e.matches?"light":"dark",false)};
      if(!stored){if(mq.addEventListener)mq.addEventListener("change",on);else if(mq.addListener)mq.addListener(on)}
    }catch(e){}
  }
  KP.theme={init:init,get:get,set:set};
})();
