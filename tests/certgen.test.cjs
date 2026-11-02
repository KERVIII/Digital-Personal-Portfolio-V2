const assert=require("assert");const g=require("../js/certgen.js");let p=0;const ok=(n,f)=>{try{f();p++;console.log("  ok  "+n)}catch(e){console.log("  FAIL "+n+" "+e.message);process.exitCode=1}};
ok("reference number format",()=>assert.strictEqual(g.refNumber("2026-11-02T00:00:00",7),"KV-20261102-007"));
ok("valid input passes",()=>assert.deepStrictEqual(g.validate({recipient:"Ana",title:"Website build",date:"2026-11-02",ref:"KV-20261102-007"}),[]));
ok("invalid input reports every problem",()=>assert.strictEqual(g.validate({recipient:"",title:"",date:"",ref:"x"}).length,4));
console.log(p+" passed");
