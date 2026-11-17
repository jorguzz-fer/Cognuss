const {chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const path=require('path');
(async()=>{const b=await chromium.launch();const [dir,out,...pages]=process.argv.slice(2);
for(const scheme of ['light','dark']){const ctx=await b.newContext({viewport:{width:1280,height:900},colorScheme:scheme,deviceScaleFactor:1});
 await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
 for(const spec of pages){const [slug,hash,js]=spec.split('|');const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.goto('file://'+path.resolve(dir,slug,'index.html')+(hash?'#'+hash:''));await p.waitForTimeout(600);
  if(js){await p.evaluate(js);await p.waitForTimeout(1800)}
  const name=`${out}/${slug}${hash?'-'+hash:''}${js?'-js':''}-${scheme}.png`;await p.screenshot({path:name,fullPage:true});
  console.log(scheme,slug,hash||'',errs.filter(e=>!/fonts|ERR_FAILED/.test(e)).join(' | ')||'ok');await p.close()}
 await ctx.close()}await b.close()})();
