/* Navigation: mobile menu, scroll-spy active state (Certificates link tracks the Certificates tab). */
(function(){
  var KP=window.KP=window.KP||{};
  var btn,menu,links=[],state={section:"home",tab:"projects"};

  function setMenu(open){
    if(!menu)return;
    menu.hidden=!open;
    btn.setAttribute("aria-expanded",open?"true":"false");
    btn.setAttribute("aria-label",open?"Close menu":"Open menu");
    var u=btn.querySelector("use");if(u)u.setAttribute("href",open?"#i-close":"#i-menu");
  }
  function mark(){
    var id=state.section==="portfolio"&&state.tab==="certificates"?"certificates":state.section;
    links.forEach(function(a){
      var on=a.hash==="#"+id;a.classList.toggle("is-active",on);
      if(on)a.setAttribute("aria-current","true");else a.removeAttribute("aria-current");
    });
  }
  function spy(){
    links=[].slice.call(document.querySelectorAll("[data-spy], .menu a"));
    mark();
    window.addEventListener("kp:tab",function(e){state.tab=e.detail;mark()});
    if(!("IntersectionObserver" in window))return;
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){state.section=e.target.id;mark()}});
    },{rootMargin:"-42% 0px -55% 0px",threshold:0});
    [].slice.call(document.querySelectorAll("[data-section]")).forEach(function(s){io.observe(s)});
  }
  function init(){
    btn=document.getElementById("menu-toggle");menu=document.getElementById("menu");
    if(btn)btn.addEventListener("click",function(){setMenu(menu.hidden)});
    if(menu)menu.addEventListener("click",function(e){if(e.target.closest("a"))setMenu(false)});
    document.addEventListener("click",function(e){if(menu&&!menu.hidden&&!e.target.closest("#nav"))setMenu(false)});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&menu&&!menu.hidden){setMenu(false);btn.focus()}});
    window.addEventListener("resize",function(){if(innerWidth>=860)setMenu(false)},{passive:true});
    spy();
  }
  KP.nav={init:init,closeMenu:function(){setMenu(false)}};
})();
