/* KERVIII project-completion certificate generator (owner tool, NOT part of the public portfolio).
   Draws a PNG on a canvas. It states plainly that it is not an accreditation or third-party certification.
   Issuing is a manual, approved action: the page has no auto-issue path and is not linked from the site. */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else{root.KP=root.KP||{};root.KP.certgen=factory()}
})(typeof self!=="undefined"?self:this,function(){
  var W=1600,H=1130;
  function pad(n){return String(n).padStart(2,"0")}
  function refNumber(date,seq){
    var d=date instanceof Date?date:new Date(date);
    return "KV-"+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+"-"+String(seq).padStart(3,"0");
  }
  function validate(v){
    var e=[];
    if(!v.recipient||v.recipient.trim().length<2)e.push("Recipient name is required.");
    if(!v.title||v.title.trim().length<3)e.push("Project or service title is required.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date||""))e.push("Completion date is required.");
    if(!/^KV-\d{8}-\d{3,}$/.test(v.ref||""))e.push("Reference number must look like KV-20261102-001.");
    return e;
  }
  function wrap(ctx,text,maxW){
    var words=text.split(/\s+/),lines=[],line="";
    words.forEach(function(w){var t=line?line+" "+w:w;if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w}else line=t});
    if(line)lines.push(line);return lines;
  }
  function draw(canvas,v){
    canvas.width=W;canvas.height=H;var c=canvas.getContext("2d");
    c.fillStyle="#F4F3F0";c.fillRect(0,0,W,H);
    c.strokeStyle="#0E0E0E";c.lineWidth=3;c.strokeRect(48,48,W-96,H-96);
    c.lineWidth=1;c.strokeRect(64,64,W-128,H-128);
    c.fillStyle="#0E0E0E";c.textAlign="center";
    c.font="600 30px 'JetBrains Mono',ui-monospace,monospace";c.fillText("K E R V I I I",W/2,170);
    c.font="800 76px Syne,'Arial Black',system-ui,sans-serif";c.fillText("Certificate of Project Completion",W/2,320);
    c.fillStyle="#5A5A5A";c.font="400 30px Inter,system-ui,sans-serif";c.fillText("This certifies that",W/2,420);
    c.fillStyle="#0E0E0E";c.font="800 84px Syne,'Arial Black',system-ui,sans-serif";c.fillText(v.recipient.trim(),W/2,540);
    c.fillStyle="#5A5A5A";c.font="400 30px Inter,system-ui,sans-serif";c.fillText("has completed the project or service",W/2,620);
    c.fillStyle="#0E0E0E";c.font="600 46px Inter,system-ui,sans-serif";
    var y=700;wrap(c,v.title.trim(),W-360).slice(0,3).forEach(function(l){c.fillText(l,W/2,y);y+=60});
    c.fillStyle="#5A5A5A";c.font="400 28px Inter,system-ui,sans-serif";c.fillText("Completed on "+v.date,W/2,y+30);
    c.textAlign="left";c.font="500 24px 'JetBrains Mono',ui-monospace,monospace";c.fillText("Ref: "+v.ref,120,H-150);
    c.textAlign="right";c.fillText("Issued by KERVIII",W-120,H-150);
    c.textAlign="center";c.fillStyle="#8C8C8C";c.font="400 22px Inter,system-ui,sans-serif";
    c.fillText("Issued by KERVIII for project completion only. Not an accreditation or third-party certification.",W/2,H-100);
    return canvas;
  }
  return{refNumber:refNumber,validate:validate,draw:draw,size:{w:W,h:H}};
});
