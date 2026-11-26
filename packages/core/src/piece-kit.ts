// Kit das peças interativas (ADR 0022). Funções prontas e testadas que toda peça recebe na
// montagem, junto com a base CSS: gráfico em SVG com eixos e escala log, canvas com espaço
// lógico e animação, trajetos para partículas, sliders, chips, cenários, status, cartões de
// revelar e cena 3D. A IA passa a compor com o kit em vez de escrever tudo do zero; o prompt
// leva só a API (PIECE_KIT_API), não uma peça inteira de exemplo.
//
// O JavaScript fica numa string sem crases nem interpolação, para caber no template da peça.

/** Endereço do módulo 3D (three.js + OrbitControls + GLTFLoader + RoomEnvironment), servido
 * pelo próprio app em apps/web/public. A peça o carrega só quando chama kit.view3d. */
export const PIECE_3D_PATH = '/piece-assets/three-r169.mjs';

export const PIECE_KIT_CSS = `
.status{display:inline-flex;align-items:center;gap:8px;font:600 13px var(--f-mono);padding:5px 10px;border-radius:4px;border:1px solid currentColor;letter-spacing:.02em}
.status::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;flex:none}
.status.ok{color:var(--success)}.status.warn{color:var(--warn)}.status.danger{color:var(--danger)}
.reveal{cursor:pointer;text-align:left}
.reveal .ans{filter:blur(6px);opacity:.45;transition:filter .3s,opacity .3s;user-select:none}
.reveal.open .ans{filter:none;opacity:1;user-select:auto}
.reveal .hint{font-size:12px;color:var(--muted)}
.reveal.open .hint{display:none}
.kit-chart{display:block;width:100%;height:auto}
.kit-chart text{font-family:var(--f-mono);font-size:12px;paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round}
.kit-chart .grid{stroke:var(--line);stroke-width:1}
.kit-chart .axis{stroke:var(--line-strong);stroke-width:1}
.stage3d{position:relative;width:100%;height:420px;border-radius:var(--radius)}
.stage3d canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}
.stage3d .kit-msg{position:absolute;inset:0;display:grid;place-items:center;color:var(--muted);font-size:14px}
.kit-tag{position:absolute;left:0;top:0;pointer-events:none;font-size:13px;font-weight:600;background:var(--surface);color:var(--fg);border:1px solid var(--line-strong);border-radius:4px;padding:2px 7px;white-space:nowrap}
@media (max-width:700px){.stage3d{height:320px}}
`;

export const PIECE_KIT_JS = `
(function(){
var kit={};var lg=Math.log10;
kit.el=function(s){return typeof s==='string'?document.querySelector(s):s};
kit.css=function(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()};
kit.fmt=function(v,d){d=d==null?0:d;return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})};
kit.lerp=function(a,b,t){return a+(b-a)*t};
function attr(o){var s='';for(var k in o){if(o[k]!=null&&o[k]!==false)s+=' '+k+'="'+String(o[k]).replace(/"/g,'&quot;')+'"'}return s}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
kit.chart=function(svg,o){
  svg=kit.el(svg);o=o||{};svg.classList.add('kit-chart');
  var W=o.width||640,H=o.height||380;svg.setAttribute('viewBox','0 0 '+W+' '+H);
  var L=o.left!=null?o.left:64,R=o.right!=null?o.right:20,T=o.top!=null?o.top:16,B=o.bottom!=null?o.bottom:52;
  var x0=o.x[0],x1=o.x[1],y0=o.y[0],y1=o.y[1];
  var sx=function(v){return o.logx?(lg(v)-lg(x0))/(lg(x1)-lg(x0)):(v-x0)/(x1-x0)};
  var sy=function(v){return o.logy?(lg(v)-lg(y0))/(lg(y1)-lg(y0)):(v-y0)/(y1-y0)};
  var c={W:W,H:H,L:L,R:R,T:T,B:B,parts:[]};
  c.X=function(v){return L+sx(v)*(W-L-R)};c.Y=function(v){return H-B-sy(v)*(H-T-B)};
  c.clear=function(){c.parts=[];return c};
  c.add=function(m){c.parts.push(m);return c};
  c.line=function(f,p){p=p||{};var a=p.from!=null?p.from:x0,b=p.to!=null?p.to:x1,n=p.n||240,d='';
    for(var i=0;i<=n;i++){var x=o.logx?Math.pow(10,lg(a)+(lg(b)-lg(a))*i/n):a+(b-a)*i/n;var y=f(x);if(!isFinite(y))continue;y=Math.max(y0,Math.min(y1,y));d+=(d?'L':'M')+c.X(x).toFixed(1)+' '+c.Y(y).toFixed(1)}
    if(p.area)d+='L'+c.X(b).toFixed(1)+' '+c.Y(y0)+'L'+c.X(a).toFixed(1)+' '+c.Y(y0)+'Z';
    return c.add('<path d="'+d+'"'+attr({style:p.area?'fill:'+(p.color||'var(--accent)')+';opacity:'+(p.opacity||.15)+';stroke:none':'fill:none;stroke:'+(p.color||'var(--accent)')+';stroke-width:'+(p.width||3)+(p.dash?';stroke-dasharray:'+p.dash:'')})+' stroke-linecap="round" stroke-linejoin="round"/>')};
  c.dot=function(x,y,p){p=p||{};return c.add('<circle cx="'+c.X(x)+'" cy="'+c.Y(y)+'" r="'+(p.r||6)+'" style="fill:'+(p.color||'var(--accent)')+';stroke:var(--surface);stroke-width:2"/>')};
  c.text=function(x,y,t,p){p=p||{};return c.add('<text x="'+(c.X(x)+(p.dx||0))+'" y="'+(c.Y(y)+(p.dy||0))+'" text-anchor="'+(p.anchor||'start')+'" style="fill:'+(p.color||'var(--fg)')+';font-size:'+(p.size||13)+'px">'+esc(t)+'</text>')};
  c.vline=function(x,p){p=p||{};c.add('<line x1="'+c.X(x)+'" x2="'+c.X(x)+'" y1="'+(p.y!=null?c.Y(p.y):T)+'" y2="'+(H-B)+'" style="stroke:'+(p.color||'var(--fg)')+';stroke-width:'+(p.width||1.5)+(p.dash?';stroke-dasharray:'+p.dash:'')+'"/>');if(p.label)c.text(x,p.labelY!=null?p.labelY:y1,p.label,{dx:6,dy:14,color:p.color,anchor:p.anchor});return c};
  c.hline=function(y,p){p=p||{};c.add('<line x1="'+L+'" x2="'+(W-R)+'" y1="'+c.Y(y)+'" y2="'+c.Y(y)+'" style="stroke:'+(p.color||'var(--fg)')+';stroke-width:'+(p.width||1.5)+(p.dash?';stroke-dasharray:'+p.dash:'')+'"/>');if(p.label)c.text(p.labelX!=null?p.labelX:x1,y,p.label,{anchor:p.labelX!=null?'start':'end',dx:p.labelX!=null?6:-6,dy:-8,color:p.color});return c};
  c.band=function(a,b,p){p=p||{};var X1=c.X(a),X2=c.X(b);c.add('<rect x="'+Math.min(X1,X2)+'" y="'+T+'" width="'+Math.abs(X2-X1)+'" height="'+(H-B-T)+'" style="fill:'+(p.color||'var(--accent)')+';opacity:'+(p.opacity||.12)+'"/>');if(p.label)c.text(a,y1,p.label,{dx:6,dy:16,color:p.color});return c};
  c.hband=function(a,b,p){p=p||{};var Y1=c.Y(a),Y2=c.Y(b);c.add('<rect x="'+L+'" y="'+Math.min(Y1,Y2)+'" width="'+(W-L-R)+'" height="'+Math.abs(Y2-Y1)+'" style="fill:'+(p.color||'var(--accent)')+';opacity:'+(p.opacity||.12)+'"/>');if(p.label)c.text(x1,Math.max(a,b),p.label,{anchor:'end',dx:-6,dy:16,color:p.color});return c};
  c.draw=function(){var s='',xf=o.xfmt||function(v){return kit.fmt(v,v%1?1:0)},yf=o.yfmt||function(v){return kit.fmt(v,v%1?1:0)};
    (o.xticks||[]).forEach(function(v){s+='<line class="grid" x1="'+c.X(v)+'" x2="'+c.X(v)+'" y1="'+T+'" y2="'+(H-B)+'"/><text x="'+c.X(v)+'" y="'+(H-B+20)+'" text-anchor="middle" style="fill:var(--muted)">'+esc(xf(v))+'</text>'});
    (o.yticks||[]).forEach(function(v){s+='<line class="grid" x1="'+L+'" x2="'+(W-R)+'" y1="'+c.Y(v)+'" y2="'+c.Y(v)+'"/><text x="'+(L-8)+'" y="'+(c.Y(v)+4)+'" text-anchor="end" style="fill:var(--muted)">'+esc(yf(v))+'</text>'});
    s+='<line class="axis" x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'"/><line class="axis" x1="'+L+'" x2="'+L+'" y1="'+T+'" y2="'+(H-B)+'"/>';
    if(o.xlabel)s+='<text x="'+((L+W-R)/2)+'" y="'+(H-8)+'" text-anchor="middle" style="fill:var(--fg)">'+esc(o.xlabel)+'</text>';
    if(o.ylabel)s+='<text transform="translate(14 '+((T+H-B)/2)+') rotate(-90)" text-anchor="middle" style="fill:var(--fg)">'+esc(o.ylabel)+'</text>';
    svg.innerHTML=s+c.parts.join('');return c};
  return c};
kit.canvas=function(el,o){
  el=kit.el(el);o=o||{};var VW=o.width||1000,VH=o.height||600,ctx=el.getContext('2d');
  var c={el:el,ctx:ctx,W:VW,H:VH,k:1,ox:0,oy:0,_draw:null,_raf:0};
  c.size=function(){var dpr=Math.min(2,window.devicePixelRatio||1),w=el.clientWidth||VW,h=el.clientHeight||VH;el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);c.k=Math.min(w/VW,h/VH)*dpr;c.ox=(el.width-VW*c.k)/2;c.oy=(el.height-VH*c.k)/2};
  c.begin=function(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,el.width,el.height);ctx.setTransform(c.k,0,0,c.k,c.ox,c.oy);return ctx};
  c.draw=function(fn){c._draw=fn;c.begin();fn(ctx,0,0);return c};
  c.animate=function(fn){c._draw=fn;cancelAnimationFrame(c._raf);var last=performance.now(),t=0;
    var step=function(now){var dt=Math.min(.05,(now-last)/1000);last=now;if(!document.hidden){t+=dt;c.begin();fn(ctx,t,dt)}c._raf=requestAnimationFrame(step)};
    c._raf=requestAnimationFrame(step);return c};
  c.stop=function(){cancelAnimationFrame(c._raf);return c};
  c.size();new ResizeObserver(function(){c.size();if(c._draw){c.begin();c._draw(ctx,0,0)}}).observe(el);
  return c};
kit.path=function(pts,hw){
  var cum=[0];for(var i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
  hw=hw||pts.map(function(){return 0});
  return{len:cum[cum.length-1],at:function(d){d=Math.max(0,Math.min(cum[cum.length-1],d));var i=1;while(i<cum.length-1&&cum[i]<d)i++;
    var t=(d-cum[i-1])/((cum[i]-cum[i-1])||1),a=pts[i-1],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
    return{x:a[0]+dx*t,y:a[1]+dy*t,tx:dx/l,ty:dy/l,nx:-dy/l,ny:dx/l,h:hw[i-1]+(hw[i]-hw[i-1])*t}}}};
kit.range=function(input,o){input=kit.el(input);o=o||{};var out=o.out?kit.el(o.out):null;
  var show=function(){var v=Number(input.value);input.style.setProperty('--p',((v-input.min)/(input.max-input.min)*100)+'%');if(out)out.textContent=o.fmt?o.fmt(v):kit.fmt(v);return v};
  var f=function(){var v=show();if(o.onInput)o.onInput(v)};
  // A primeira chamada fica para depois do script da peça: assim o retorno pode usar
  // variáveis declaradas depois do kit.range sem cair na zona morta do let/const.
  input.addEventListener('input',f);show();if(o.onInput)queueMicrotask(f);
  return{get value(){return Number(input.value)},set:function(v){input.value=v;f()}}};
kit.chips=function(box,o){box=kit.el(box);o=o||{};var btns=[].slice.call(box.querySelectorAll('button'));
  var pick=function(b){btns.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});if(o.onPick)o.onPick(b.dataset.value,b)};
  btns.forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){pick(b)})});
  var mark=function(b){btns.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')})};
  var first=btns.filter(function(b){return b.dataset.value===o.value})[0]||btns[0];
  if(first&&o.value!==null){mark(first);queueMicrotask(function(){pick(first)})}
  return{pick:function(v){var b=btns.filter(function(x){return x.dataset.value===v})[0];if(b)pick(b)}}};
kit.scenarios=function(box,apply){var h=decodeURIComponent((location.hash||'').slice(1));
  return kit.chips(box,{value:h||undefined,onPick:function(v,b){apply(v,b)}})};
kit.status=function(el,kind,text){el=kit.el(el);el.className='status '+kind;el.textContent=text};
kit.reveal=function(sel){[].slice.call(document.querySelectorAll(sel||'.reveal')).forEach(function(r){r.addEventListener('click',function(){r.classList.toggle('open')})})};
var three=null;
kit.three=function(){if(!three)three=import(window.__PIECE_3D__);return three};
kit.view3d=function(el,o){el=kit.el(el);o=o||{};el.classList.add('stage3d');
  return kit.three().then(function(M){var T=M.THREE;
    var r=new T.WebGLRenderer({antialias:true,alpha:true});r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=o.exposure||1;el.appendChild(r.domElement);
    var scene=new T.Scene(),pm=new T.PMREMGenerator(r);scene.environment=pm.fromScene(new M.RoomEnvironment(),.04).texture;scene.environmentIntensity=o.env!=null?o.env:.6;
    var key=new T.DirectionalLight(0xffffff,2);key.position.set(3,4,5);scene.add(key);
    var cam=new T.PerspectiveCamera(o.fov||35,1,o.near||.1,o.far||1000);cam.position.set(0,0,o.distance||10);
    var ctl=new M.OrbitControls(cam,r.domElement);ctl.enableDamping=true;ctl.autoRotate=!!o.autoRotate;ctl.autoRotateSpeed=o.autoRotateSpeed||1;
    var v={THREE:T,M:M,scene:scene,camera:cam,renderer:r,controls:ctl,el:el,frames:[],tags:[]};
    var size=function(){var w=el.clientWidth||1,h=el.clientHeight||1;r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
    size();new ResizeObserver(size).observe(el);
    v.onFrame=function(fn){v.frames.push(fn);return v};
    v.tag=function(text,pos){var d=document.createElement('div');d.className='kit-tag';d.textContent=text;el.appendChild(d);var t={el:d,pos:pos};v.tags.push(t);return t};
    v.cylinder=function(a,b,radius,mat){var d=new T.Vector3().subVectors(b,a),m=new T.Mesh(new T.CylinderGeometry(radius,radius,d.length(),16),mat);m.position.copy(a).addScaledVector(d,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());return m};
    var last=performance.now();
    r.setAnimationLoop(function(now){var dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden)return;v.frames.forEach(function(f){f(dt)});ctl.update();r.render(scene,cam);
      var w=el.clientWidth,h=el.clientHeight;v.tags.forEach(function(t){var p=t.pos.clone().project(cam);t.el.style.transform='translate('+((p.x+1)/2*w)+'px,'+((1-p.y)/2*h)+'px) translate(-50%,-50%)';t.el.style.display=p.z>1?'none':''})});
    return v}).catch(function(e){var m=document.createElement('div');m.className='kit-msg';m.textContent='A cena 3D não carregou.';el.appendChild(m);console.error('kit.view3d: '+(e&&e.message||e));throw e})};
window.kit=kit;
})();
`;

/** API do kit para o prompt do escritor: curta, para a IA compor em vez de escrever do zero. */
export const PIECE_KIT_API = `O kit já está carregado como window.kit. Use-o sempre que couber; escreva à mão só o que é próprio da peça.

Gráfico em SVG (eixos, grade, escala log, rótulos com halo legível nos dois temas):
  const c = kit.chart('#svg', {width:640, height:380, x:[0,24], y:[0,100], logx:false, xticks:[0,6,12,18,24], yticks:[0,50,100], xfmt:v=>v+' h', xlabel:'Tempo (h)', ylabel:'Concentração (%)'});
  c.clear().band(10,15,{color:'var(--success)',label:'faixa'}).hband(4,16,{color:'var(--success)'}).line(t=>100*Math.exp(-0.1*t),{color:'var(--accent)'}).line(f,{area:true}).dot(x,y).vline(x,{dash:'4 4',label:'Tmáx'}).hline(y,{label:'limite'}).text(x,y,'rótulo',{anchor:'end'}).draw();
  Redesenhe chamando de novo a sequência a partir de c.clear(). c.X(v) e c.Y(v) convertem valor em coordenada.
Canvas com espaço lógico fixo, ajuste ao devicePixelRatio e ao tamanho:
  const cv = kit.canvas('#cv', {width:1000, height:600}); cv.draw((ctx)=>{…}); ou cv.animate((ctx,t,dt)=>{…}) para animação (para quando a aba some).
Trajeto para partículas e fluxos: const p = kit.path([[x,y],…], [meiaLargura,…]); p.len; p.at(d) → {x,y,tx,ty,nx,ny,h}. Velocidade proporcional a 1/h (continuidade).
Controles: kit.range('#dose', {out:'#doseOut', fmt:v=>v+' mg', onInput:v=>atualizar()}) devolve {value, set(v)}; kit.chips('#modos', {value:'normal', onPick:(v,b)=>…}) (botões com data-value); kit.scenarios('#cenarios', id=>aplicar(id)) lê #id da URL. A primeira chamada de onInput, onPick e do cenário acontece logo depois do script da peça terminar, então eles podem usar variáveis declaradas mais abaixo.
Leituras: kit.status('#st', 'ok'|'warn'|'danger', 'texto'); kit.fmt(1234.5, 1) → "1.234,5"; kit.css('--accent').
Revelar: cartões <button class="card reveal">…<span class="ans">resposta</span><span class="hint">clique para revelar</span></button> + kit.reveal().
3D (three.js r169, carregado do app só quando usado): kit.view3d('#cena', {distance:12, autoRotate:true}).then(v=>{ const T=v.THREE; v.scene.add(new T.Mesh(new T.SphereGeometry(1,48,32), new T.MeshStandardMaterial({color:0xc0392b, roughness:.4}))); v.cylinder(a,b,raio,material); v.tag('Rótulo', new T.Vector3(0,1.2,0)); v.onFrame(dt=>{…}); });
  O elemento da cena é um <div id="cena" role="img" aria-label="…"></div>. Sem modelos externos: monte a geometria com primitivas do three.js. Cores fixas de significado (artéria, veia, átomos) podem ser hexadecimais; o resto sai dos tokens.`;
