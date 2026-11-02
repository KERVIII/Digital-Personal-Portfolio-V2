/* Data-driven showcase: expertise, projects, certificates, tech stack, tabs, project detail, certificate lightbox.
   Content comes from data/*.json (fetch) with embedded copies as fallback when fetch is blocked (file://). */
(function(){
  var KP=window.KP=window.KP||{};
  var data={projects:[],certificates:[],skills:{groups:[],focus:[],expertise:[]}};
  var NS="http://www.w3.org/2000/svg",XL="http://www.w3.org/1999/xlink";
  var openedByClick=false,lastFocus=null,tabsApi=null;

  /* ---------- helpers ---------- */
  function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
  function icon(id,cls){
    var s=document.createElementNS(NS,"svg");s.setAttribute("class","ico"+(cls?" "+cls:""));s.setAttribute("aria-hidden","true");
    var u=document.createElementNS(NS,"use");u.setAttribute("href","#i-"+id);u.setAttributeNS(XL,"xlink:href","#i-"+id);s.appendChild(u);return s;
  }
  function loadJSON(path,fbId){
    function fb(){try{return JSON.parse(document.getElementById(fbId).textContent)}catch(e){return null}}
    if(!window.fetch)return Promise.resolve(fb());
    return fetch(path,{cache:"no-cache"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).catch(function(){return fb()});
  }
  function isLive(p){return !!(p.repository&&p.repository.status==="available"&&p.repository.url)}
  function safeUrl(u){return typeof u==="string"&&/^https:\/\//i.test(u)?u:null}

  /* ---------- cards ---------- */
  function cover(p){
    var c=el("div","cover");
    if(p.image){var im=el("img");im.src=p.image;im.alt="";im.loading="lazy";im.decoding="async";
      im.onerror=function(){im.remove();c.insertBefore(el("span","cover__name",p.name),c.firstChild)};c.appendChild(im)}
    else c.appendChild(el("span","cover__name",p.name));
    c.appendChild(el("span","tag"+(isLive(p)?" tag--live":""),isLive(p)?(p.version?"v"+p.version:"Open source"):"Coming soon"));
    return c;
  }
  function projectCard(p,i){
    var b=el("button","card");b.type="button";b.style.setProperty("--i",i);b.setAttribute("data-id",p.id);
    b.setAttribute("aria-label",p.name+" — view details");
    b.appendChild(cover(p));
    var body=el("div","card__body");
    body.appendChild(el("p","card__cat",p.category));
    body.appendChild(el("h3","card__title",p.name));
    body.appendChild(el("p","card__sum",p.summary||""));
    if(p.technologies&&p.technologies.length){
      var tl=el("ul","card__tech");p.technologies.slice(0,4).forEach(function(t){tl.appendChild(el("li",null,t))});body.appendChild(tl);
    }
    var foot=el("div","card__foot");
    foot.appendChild(el("span",null,p.version?"v"+p.version:(p.author||"")));
    var go=el("span","card__go","Details ");go.appendChild(icon("arrow"));foot.appendChild(go);
    body.appendChild(foot);b.appendChild(body);
    b.addEventListener("click",function(){openedByClick=true;location.hash="project/"+p.id});
    return b;
  }
  function certCard(c,i){
    var b=el("button","card card--cert");b.type="button";b.style.setProperty("--i",i);
    b.setAttribute("aria-label",c.title+" — open preview");
    var cv=el("div","cover");
    var src=c.thumbnail||c.image;
    if(src){var im=el("img");im.src=src;im.alt=c.title+" certificate";im.loading="lazy";im.decoding="async";
      im.onerror=function(){im.remove();cv.appendChild(el("span","cert-fallback","Image unavailable"))};cv.appendChild(im)}
    else cv.appendChild(el("span","cert-fallback","No image"));
    b.appendChild(cv);
    var body=el("div","card__body");body.appendChild(el("h3","card__title",c.title));
    var meta=[c.issuer,c.date].filter(Boolean).join(" · ");if(meta)body.appendChild(el("p","card__meta",meta));
    b.appendChild(body);b.addEventListener("click",function(){openLightbox(i,b)});return b;
  }
  function expertiseCard(x,i){
    var d=el("article","xcard");d.style.setProperty("--i",i);
    var ic=el("span","xcard__ico");ic.appendChild(icon(x.icon||"code"));d.appendChild(ic);
    d.appendChild(el("h3",null,x.title));d.appendChild(el("p",null,x.text));
    if(x.tags&&x.tags.length){var u=el("ul","chips");x.tags.forEach(function(t){u.appendChild(el("li",null,t))});d.appendChild(u)}
    return d;
  }
  function render(){
    var pg=document.getElementById("project-grid");pg.textContent="";
    if(!data.projects.length)pg.appendChild(el("p","empty","No projects to show yet."));
    data.projects.forEach(function(p,i){pg.appendChild(projectCard(p,i))});

    var cg=document.getElementById("cert-grid");cg.textContent="";
    if(!data.certificates.length){
      var e=el("div","empty");e.appendChild(icon("award"));e.appendChild(el("p",null,"No certificates published yet."));
      e.appendChild(el("p","muted small","Entries added to data/certificates.json appear here automatically."));cg.appendChild(e);
    }
    data.certificates.forEach(function(c,i){cg.appendChild(certCard(c,i))});

    var tg=document.getElementById("tech-groups");tg.textContent="";var gi=0;
    data.skills.groups.forEach(function(g){
      var box=el("div","tech-group");box.style.setProperty("--i",gi++);
      box.appendChild(el("h3",null,g.title));
      var tiles=el("div","tiles");
      g.items.forEach(function(it){var t=el("div","tile");t.appendChild(icon(it.icon||"code"));t.appendChild(el("span",null,it.name));tiles.appendChild(t)});
      box.appendChild(tiles);tg.appendChild(box);
    });

    var xg=document.getElementById("expertise-grid");xg.textContent="";
    (data.skills.expertise||[]).forEach(function(x,i){xg.appendChild(expertiseCard(x,i))});

    var fc=document.getElementById("focus-chips");fc.textContent="";
    (data.skills.focus||[]).forEach(function(f){fc.appendChild(el("li",null,f))});

    var st=document.getElementById("stats");st.textContent="";
    var techCount=data.skills.groups.reduce(function(n,g){return n+g.items.length},0);
    [[data.projects.length,"Projects"],[techCount,"Technologies"],[data.certificates.length,"Certificates"]].forEach(function(s){
      if(!s[0])return;var d=el("div","stat");d.appendChild(el("b",null,String(s[0])));d.appendChild(el("span",null,s[1]));st.appendChild(d);
    });
  }

  /* ---------- tabs ---------- */
  function initTabs(){
    var tabs=document.getElementById("tabs"),pill=document.getElementById("tabs-pill");
    var btns=[].slice.call(tabs.querySelectorAll(".tabs__btn"));
    var current=btns[0];
    function place(b){pill.style.width=b.offsetWidth+"px";pill.style.transform="translateX("+b.offsetLeft+"px)"}
    function panelOf(b){return document.getElementById(b.getAttribute("aria-controls"))}
    function idOf(b){return b.id.replace("tab-","")}
    function select(b,focus){
      if(b===current)return;
      var from=panelOf(current),to=panelOf(b);
      btns.forEach(function(x){var on=x===b;x.setAttribute("aria-selected",on?"true":"false");x.tabIndex=on?0:-1});
      place(b);current=b;if(focus)b.focus();
      try{window.dispatchEvent(new CustomEvent("kp:tab",{detail:idOf(b)}))}catch(e){}
      from.classList.add("is-leave");
      setTimeout(function(){
        from.hidden=true;from.classList.remove("is-leave","is-enter");
        to.hidden=false;to.classList.remove("is-enter");void to.offsetWidth;to.classList.add("is-enter");
        setTimeout(function(){to.classList.remove("is-enter")},1200);
      },KP.anim&&KP.anim.reduced?0:200);
    }
    btns.forEach(function(b,i){
      b.addEventListener("click",function(){select(b)});
      b.addEventListener("keydown",function(e){
        var n=null;
        if(e.key==="ArrowRight")n=btns[(i+1)%btns.length];
        else if(e.key==="ArrowLeft")n=btns[(i-1+btns.length)%btns.length];
        else if(e.key==="Home")n=btns[0];else if(e.key==="End")n=btns[btns.length-1];
        if(n){e.preventDefault();select(n,true)}
      });
    });
    place(current);
    if("ResizeObserver" in window)new ResizeObserver(function(){place(current)}).observe(tabs);
    else addEventListener("resize",function(){place(current)});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){place(current)});
    tabsApi={select:function(id){var b=document.getElementById("tab-"+id);if(b)select(b)}};
  }
  /* #certificates deep-link: open the Certificates tab */
  function syncHashTab(){if(location.hash==="#certificates"&&tabsApi)tabsApi.select("certificates")}

  /* ---------- project detail ---------- */
  var detail,body;
  function fact(ic,main,sub){var f=el("div","fact");f.appendChild(icon(ic));var d=el("div");d.appendChild(el("b",null,main));d.appendChild(el("span",null,sub));f.appendChild(d);return f}
  function buildDetail(p){
    body.textContent="";
    var back=el("button","back");back.type="button";back.id="detail-back";back.appendChild(icon("back"));back.appendChild(document.createTextNode(" Back"));
    back.addEventListener("click",closeDetail);body.appendChild(back);

    var grid=el("div","detail__grid"),left=el("div"),right=el("div","detail__side");
    var t=el("h2","display detail__title",p.name);t.id="pv-title";left.appendChild(t);
    left.appendChild(el("p","detail__desc",p.description||p.summary||""));

    var facts=el("div","facts");
    facts.appendChild(fact("cube",p.category,"Category"));
    if(p.version)facts.appendChild(fact("code","v"+p.version,"Version"));
    facts.appendChild(fact("clock",isLive(p)?"Available":"Coming soon","Repository"));
    if(p.author)facts.appendChild(fact("user",p.author,"Author"));
    left.appendChild(facts);

    var act=el("div","detail__actions");
    var url=isLive(p)?safeUrl(p.repository.url):null;
    if(url){
      var a=el("a","btn btn--primary");a.href=url;a.target="_blank";a.rel="noopener";
      a.appendChild(icon("github"));a.appendChild(document.createTextNode(" View repository"));act.appendChild(a);
    }else{
      var s=el("span","btn btn--ghost");s.setAttribute("aria-disabled","true");
      s.appendChild(icon("clock"));s.appendChild(document.createTextNode(" Repository coming soon"));act.appendChild(s);
    }
    left.appendChild(act);

    if(p.technologies&&p.technologies.length){
      left.appendChild(el("h3",null,"Technologies used"));
      var ul=el("ul","chips");p.technologies.forEach(function(x){ul.appendChild(el("li",null,x))});left.appendChild(ul);
    }
    if(p.credit)left.appendChild(el("p","muted small",p.credit));

    var prev=el("div","detail__preview");prev.appendChild(cover(p));right.appendChild(prev);
    if(p.features&&p.features.length){
      var fc=el("div","panel-card");fc.appendChild(el("h3",null,"Key features"));
      var ft=el("ul","feat");p.features.forEach(function(x){var li=el("li");li.appendChild(icon("check"));li.appendChild(el("span",null,x));ft.appendChild(li)});
      fc.appendChild(ft);
      (p.notes||[]).forEach(function(n){fc.appendChild(el("p","note",n))});
      right.appendChild(fc);
    }
    grid.appendChild(left);grid.appendChild(right);body.appendChild(grid);
  }
  function setBackground(inert){
    ["main","#nav","footer"].forEach(function(s){
      var n=document.querySelector(s);if(!n)return;
      if(inert)n.setAttribute("inert","");else n.removeAttribute("inert");
    });
  }
  function openDetail(p){
    if(!detail.hidden&&detail.getAttribute("data-id")===p.id)return;
    lastFocus=lastFocus||document.activeElement;
    buildDetail(p);detail.setAttribute("data-id",p.id);
    detail.hidden=false;void detail.offsetWidth;detail.classList.add("is-open");
    document.getElementById("detail-scroll").scrollTop=0;
    document.body.classList.add("is-locked");setBackground(true);
    if(KP.nav)KP.nav.closeMenu();
    setTimeout(function(){var b=document.getElementById("detail-back");if(b)b.focus({preventScroll:true})},60);
  }
  function hideDetail(){
    openedByClick=false;detail.classList.remove("is-open");setBackground(false);document.body.classList.remove("is-locked");
    var wait=KP.anim&&KP.anim.reduced?0:420;
    setTimeout(function(){if(!detail.classList.contains("is-open")){detail.hidden=true;detail.removeAttribute("data-id")}},wait);
    if(lastFocus&&lastFocus.focus)try{lastFocus.focus({preventScroll:true})}catch(e){}
    lastFocus=null;
  }
  function closeDetail(){
    if(detail.hidden)return;
    if(openedByClick){openedByClick=false;history.back()}
    else{location.hash="portfolio"}
  }
  function route(){
    var m=/^#project\/([\w-]+)$/.exec(location.hash);
    if(m){
      var p=data.projects.filter(function(x){return x.id===m[1]})[0];
      if(p)openDetail(p);else location.hash="portfolio";
    }else{
      if(!detail.hidden)hideDetail();
      syncHashTab();
    }
  }

  /* ---------- certificate lightbox (prev/next, keyboard, verify link, error state) ---------- */
  var lb,lbImg,lbCap,lbMeta,lbVerify,lbErr,lbPrev,lbNext,lbFrom,lbIndex=0;
  function showCert(i){
    var n=data.certificates.length;if(!n)return;
    lbIndex=(i+n)%n;var c=data.certificates[lbIndex];
    lbErr.hidden=true;lbImg.hidden=false;
    lbImg.onerror=function(){lbImg.hidden=true;lbErr.hidden=false};
    lbImg.src=c.image||c.thumbnail||"";lbImg.alt=c.title+" certificate";
    lbCap.textContent=c.title;
    lbMeta.textContent=[c.issuer,c.date,c.credentialId?"ID "+c.credentialId:""].filter(Boolean).join(" · ");
    var v=safeUrl(c.verifyUrl);if(v){lbVerify.href=v;lbVerify.hidden=false}else{lbVerify.hidden=true;lbVerify.removeAttribute("href")}
    lbPrev.hidden=lbNext.hidden=n<2;
  }
  function openLightbox(i,from){
    lbFrom=from;showCert(i);
    lb.hidden=false;void lb.offsetWidth;lb.classList.add("is-open");
    document.body.classList.add("is-locked");
    setTimeout(function(){document.getElementById("lightbox-close").focus()},40);
  }
  function closeLightbox(){
    lb.classList.remove("is-open");
    if(detail.hidden)document.body.classList.remove("is-locked");
    setTimeout(function(){if(!lb.classList.contains("is-open")){lb.hidden=true;lbImg.removeAttribute("src")}},KP.anim&&KP.anim.reduced?0:320);
    if(lbFrom)try{lbFrom.focus({preventScroll:true})}catch(e){}
  }

  /* ---------- init ---------- */
  function init(){
    detail=document.getElementById("detail");body=document.getElementById("detail-body");
    lb=document.getElementById("lightbox");lbImg=document.getElementById("lightbox-img");lbCap=document.getElementById("lightbox-cap");
    lbMeta=document.getElementById("lightbox-meta");lbVerify=document.getElementById("lightbox-verify");lbErr=document.getElementById("lightbox-err");
    lbPrev=document.getElementById("lightbox-prev");lbNext=document.getElementById("lightbox-next");
    document.getElementById("lightbox-close").addEventListener("click",closeLightbox);
    lbPrev.addEventListener("click",function(){showCert(lbIndex-1)});
    lbNext.addEventListener("click",function(){showCert(lbIndex+1)});
    lb.addEventListener("click",function(e){if(e.target===lb)closeLightbox()});
    document.addEventListener("keydown",function(e){
      var lbOpen=!lb.hidden;
      if(e.key==="Escape"){if(lbOpen)closeLightbox();else if(!detail.hidden)closeDetail()}
      else if(lbOpen&&e.key==="ArrowLeft")showCert(lbIndex-1);
      else if(lbOpen&&e.key==="ArrowRight")showCert(lbIndex+1);
      if(e.key==="Tab"&&(lbOpen||!detail.hidden)){
        var scope=lbOpen?lb:detail;
        var f=[].slice.call(scope.querySelectorAll("a[href],button:not([disabled])")).filter(function(n){return !n.hidden&&n.offsetParent!==null});if(!f.length)return;
        var first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    });
    initTabs();
    return Promise.all([
      loadJSON("data/projects.json","fb-projects"),
      loadJSON("data/certificates.json","fb-certificates"),
      loadJSON("data/skills.json","fb-skills")
    ]).then(function(r){
      data.projects=(r[0]&&r[0].projects)||[];
      data.certificates=(r[1]&&r[1].certificates)||[];
      data.skills=r[2]||data.skills;
      render();route();
      addEventListener("hashchange",route);
      document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest('a[href="#certificates"]');if(a&&tabsApi)tabsApi.select("certificates")});
    });
  }
  KP.projects={init:init,data:data};
})();
