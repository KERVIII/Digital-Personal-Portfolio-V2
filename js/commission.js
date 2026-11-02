/* Commission form: validation, image preview, real submission to a backend endpoint.
   Success is shown ONLY after the endpoint answers { ok:true }. With no endpoint configured the form is disabled and says so. */
(function(){
  var KP=window.KP=window.KP||{};
  var MAX_BYTES=5*1024*1024,TYPES=["image/jpeg","image/png","image/webp"];

  function uuid(){
    try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID()}catch(e){}
    return "k"+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  }
  function fmt(b){return b<1024?b+" B":b<1048576?(b/1024).toFixed(0)+" KB":(b/1048576).toFixed(1)+" MB"}

  function init(){
    var f=document.getElementById("commission-form");if(!f)return;
    var q=function(id){return document.getElementById(id)};
    var nick=q("c-nick"),svc=q("c-service"),title=q("c-title"),desc=q("c-desc"),budget=q("c-budget"),img=q("c-image");
    var status=q("form-status"),submit=q("form-submit"),notice=q("form-notice"),hp=f.querySelector(".hp");
    var prev=q("preview"),prevImg=q("preview-img"),prevName=q("preview-name"),prevSize=q("preview-size"),dropText=q("drop-text");
    var endpoint=(f.getAttribute("data-endpoint")||"").trim();
    var openedAt=Date.now(),key=uuid(),busy=false,objectUrl=null;

    if(!endpoint){notice.hidden=false;submit.setAttribute("aria-disabled","true");submit.disabled=true}

    function err(input,text){
      var box=input.closest(".field"),out=q(input.getAttribute("aria-describedby"));
      box.classList.toggle("is-bad",!!text);out.textContent=text||"";input.setAttribute("aria-invalid",text?"true":"false");
    }
    function range(input,min,max,label){
      var v=input.value.trim();
      if(!v.length&&min>0){err(input,label+" is required.");return false}
      if(v.length<min){err(input,label+" must be at least "+min+" characters.");return false}
      if(v.length>max){err(input,label+" must be at most "+max+" characters.");return false}
      err(input,"");return true;
    }
    var vNick=function(){return range(nick,2,40,"Nickname")};
    var vSvc=function(){if(!svc.value){err(svc,"Please choose a service.");return false}err(svc,"");return true};
    var vTitle=function(){return range(title,3,80,"Project title")};
    var vDesc=function(){return range(desc,20,2000,"Project description")};
    var vBudget=function(){return range(budget,0,40,"Budget")};
    function vImage(){
      var file=img.files&&img.files[0];
      if(!file){err(img,"");return true}
      if(TYPES.indexOf(file.type)<0){err(img,"Use a JPG, PNG or WebP image.");return false}
      if(file.size>MAX_BYTES){err(img,"Image is "+fmt(file.size)+". The maximum is 5 MB.");return false}
      err(img,"");return true;
    }
    [[nick,vNick],[svc,vSvc],[title,vTitle],[desc,vDesc],[budget,vBudget]].forEach(function(p){
      p[0].addEventListener("blur",p[1]);
      p[0].addEventListener("input",function(){if(p[0].closest(".field").classList.contains("is-bad"))p[1]();clearStatus()});
      p[0].addEventListener("change",function(){if(p[0]===svc)vSvc()});
    });
    function clearStatus(){status.textContent="";status.className="form__status"}
    function say(text,kind){status.textContent=text;status.className="form__status"+(kind==="ok"?" is-ok":kind==="err"?" is-err":"")}

    /* image preview */
    function clearImage(){
      if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}
      img.value="";prev.hidden=true;prevImg.removeAttribute("src");dropText.textContent="Choose an image";err(img,"");
    }
    img.addEventListener("change",function(){
      var file=img.files&&img.files[0];
      if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}
      if(!file){clearImage();return}
      if(!vImage()){prev.hidden=true;return}
      objectUrl=URL.createObjectURL(file);prevImg.src=objectUrl;
      prevName.textContent=file.name;prevSize.textContent=fmt(file.size);prev.hidden=false;dropText.textContent="Replace image";
      clearStatus();
    });
    q("preview-clear").addEventListener("click",function(){clearImage();img.focus()});

    f.addEventListener("submit",function(e){
      e.preventDefault();
      if(busy||!endpoint)return;
      var checks=[[nick,vNick()],[svc,vSvc()],[title,vTitle()],[desc,vDesc()],[budget,vBudget()],[img,vImage()]];
      var bad=checks.filter(function(c){return !c[1]})[0];
      if(bad){bad[0].focus();say("Please fix the highlighted fields.","err");return}

      var fd=new FormData();
      fd.append("nickname",nick.value.trim());fd.append("service",svc.value);fd.append("title",title.value.trim());
      fd.append("description",desc.value.trim());fd.append("budget",budget.value.trim());
      fd.append("idempotencyKey",key);fd.append("elapsedMs",String(Date.now()-openedAt));
      fd.append("website",hp?hp.value:"");
      if(img.files&&img.files[0])fd.append("image",img.files[0],img.files[0].name);

      busy=true;submit.setAttribute("aria-busy","true");submit.disabled=true;submit.querySelector("span").textContent="Sending…";
      say("Sending your request…");
      var ctl=("AbortController" in window)?new AbortController():null,timer=setTimeout(function(){if(ctl)ctl.abort()},25000);

      fetch(endpoint,{method:"POST",body:fd,signal:ctl?ctl.signal:undefined,mode:"cors",credentials:"omit"})
        .then(function(res){return res.json().catch(function(){return null}).then(function(j){return{res:res,j:j}})})
        .then(function(o){
          if(o.res.ok&&o.j&&o.j.ok===true){
            say("Request sent. I’ll get back to you on Telegram.","ok");
            f.reset();clearImage();key=uuid();openedAt=Date.now();
          }else if(o.res.status===429){
            say("Too many requests. Please wait a while and try again.","err");
          }else{
            say((o.j&&o.j.error)||"The request could not be delivered. Nothing was sent — please try again or message me on Telegram.","err");
          }
        })
        .catch(function(e){
          say(e&&e.name==="AbortError"?"The server took too long to respond. Nothing was confirmed — please try again.":"Couldn’t reach the server. Nothing was sent — check your connection and try again.","err");
        })
        .then(function(){clearTimeout(timer);busy=false;submit.removeAttribute("aria-busy");submit.disabled=false;submit.querySelector("span").textContent="Send request"});
    });
  }
  KP.commission={init:init};
})();
