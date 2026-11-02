/* Entry point. Order: theme → navigation → data/render → interactions → intro. */
(function(){
  var KP=window.KP=window.KP||{};
  function boot(){
    KP.theme.init();
    KP.nav.init();
    KP.anim.reveal();
    KP.anim.roles();
    KP.interactions.init();
    KP.heroCard.init();
    KP.commission.init();
    KP.projects.init().catch(function(e){if(window.console)console.error("Portfolio data failed to load",e)});
    KP.anim.intro();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
