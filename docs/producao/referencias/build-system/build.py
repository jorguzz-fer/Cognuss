"""Monta as peças: src/<slug>.html tem blocos @@TITLE, @@CRUMB, @@STYLE, @@BODY, @@SCRIPT."""
import re,sys,os,glob
BASE=open('base.css',encoding='utf-8').read()
HEAD='''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Hind:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>{base}
{style}</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <span class="brand"><svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#c2181d"/><path d="M44 21A15 15 0 1 0 44 43" fill="none" stroke="#fff" stroke-width="8.5" stroke-linecap="round"/><circle cx="45.5" cy="32" r="4.6" fill="#fff"/></svg>COGNUSS</span>
    <span class="crumb">Fisiologia endócrina · Aula 1 · Introdução</span>
    <span class="sp"></span>
    <span class="badge">Demonstração · sem revisão</span>
    <button class="ibtn" id="themeBtn" type="button">Alternar tema</button>
  </header>
{body}
  <p class="foot">{foot}</p>
</div>
<script>
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ss=(a,b,x)=>{{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#themeBtn').onclick=()=>{{const r=document.documentElement,cur=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');r.dataset.theme=cur==='dark'?'light':'dark';window.onTheme&&window.onTheme()}};
{script}
</script>
</body>
</html>
'''
FOOT='Esquema didático, simplificado para fins de ensino. Base: Aires, <i>Fisiologia</i>, 5ª ed., cap. 64 (Guanabara Koogan, 2018), conforme a aula do Dr. Rafael.'
def block(t,n):
    m=re.search(r'@@'+n+r'\n(.*?)(?=\n@@[A-Z]+\n|\Z)',t,re.S);return m.group(1) if m else ''
for f in sorted(glob.glob('src/*.html')):
    t=open(f,encoding='utf-8').read();slug=os.path.basename(f)[:-5]
    out=HEAD.format(title=block(t,'TITLE').strip(),base=BASE,style=block(t,'STYLE'),body=block(t,'BODY'),script=block(t,'SCRIPT'),foot=block(t,'FOOT').strip() or FOOT)
    os.makedirs(f'out/{slug}',exist_ok=True);open(f'out/{slug}/index.html','w',encoding='utf-8').write(out);print('ok',slug)
