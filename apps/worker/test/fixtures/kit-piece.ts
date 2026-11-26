import type { PieceBlocks } from '@gutta/core';

// Peça de teste do kit (ADR 0022): gráfico, canvas animado com trajeto, slider, chips,
// cenários e status. A variante 3D acrescenta a cena do kit.view3d.
export const KIT_PIECE: PieceBlocks = {
  title: 'A meia-vida dita quando o fármaco some',
  style: '#cv{height:260px}',
  body: `<section><div class="eyebrow">Peça interativa · Farmacocinética</div><h1>A meia-vida dita quando o fármaco some</h1><p class="lead">Mude a meia-vida e veja a concentração cair pela metade a cada intervalo.</p></section>
<div class="grid">
  <div class="card stage"><svg id="ch" role="img" aria-label="Concentração plasmática ao longo do tempo"></svg><canvas id="cv" aria-label="Fluxo do fármaco no vaso"></canvas></div>
  <div class="card panel">
    <div class="ctl"><label for="t">Meia-vida</label><input type="range" id="t" min="1" max="24" value="6"><span class="v" id="tv"></span></div>
    <div class="chips" id="sc"><button class="chip" data-value="unica">Dose única</button><button class="chip" data-value="repetida">Doses repetidas</button></div>
    <div class="tiles"><div class="tile" style="--c:var(--accent)"><div class="k">Após 5 meias-vidas</div><div class="n" id="h5">—</div></div></div>
    <span id="st" class="status ok">—</span>
  </div>
</div>
<div class="card explain"><div><div class="eyebrow">Para fixar</div><p>A cada meia-vida a concentração cai pela metade.</p></div><div class="exam"><div class="lbl">Na prova</div><p>Equilíbrio em 4 a 5 meias-vidas.</p></div></div>`,
  script: `let mode='unica';
const c=kit.chart('#ch',{width:800,height:360,x:[0,48],y:[0,100],xticks:[0,12,24,36,48],yticks:[0,50,100],xlabel:'Tempo (h)',ylabel:'Concentração (%)'});
const r=kit.range('#t',{out:'#tv',fmt:v=>v+' h',onInput:draw});
kit.scenarios('#sc',v=>{mode=v;draw()});
function draw(){const th=r?r.value:6,k=Math.LN2/th;
  c.clear().hband(25,50,{color:'var(--success)',label:'janela'}).line(t=>100*Math.exp(-k*t)).vline(th,{dash:'4 4',label:'1 t½'}).dot(th,50).draw();
  $('#h5').textContent=kit.fmt(5*th)+' h';kit.status('#st',th>12?'warn':'ok',th>12?'Meia-vida longa':'Meia-vida curta');}
draw();
const p=kit.path([[40,300],[500,260],[960,300]],[60,30,60]);
const cv=kit.canvas('#cv',{width:1000,height:600});
cv.animate((ctx,t)=>{ctx.strokeStyle=css('--line-strong');ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(40,300);ctx.lineTo(960,300);ctx.stroke();
  for(let i=0;i<40;i++){const a=p.at((i*37+t*200)%p.len);ctx.fillStyle=css('--accent');ctx.beginPath();ctx.arc(a.x+a.nx*a.h*((i%7)/3-1),a.y+a.ny*a.h*((i%7)/3-1),6,0,7);ctx.fill()}});`,
};

export const KIT_PIECE_3D: PieceBlocks = {
  ...KIT_PIECE,
  body: KIT_PIECE.body.replace(
    '<canvas id="cv" aria-label="Fluxo do fármaco no vaso"></canvas>',
    '<canvas id="cv" aria-label="Fluxo do fármaco no vaso"></canvas><div id="mol" role="img" aria-label="Molécula em 3D"></div>',
  ),
  script:
    KIT_PIECE.script +
    `\nkit.view3d('#mol',{distance:8,autoRotate:true}).then(v=>{const T=v.THREE;const m=new T.MeshStandardMaterial({color:0xe8473b,roughness:.4});const a=new T.Vector3(-1.5,0,0),b=new T.Vector3(1.5,0,0);[a,b].forEach(p=>{const s=new T.Mesh(new T.SphereGeometry(.8,32,24),m);s.position.copy(p);v.scene.add(s)});v.scene.add(v.cylinder(a,b,.2,new T.MeshStandardMaterial({color:0xb9b2ad})));v.tag('O',new T.Vector3(-1.5,1.1,0));});`,
};
