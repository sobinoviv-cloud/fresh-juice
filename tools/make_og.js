// Fresh Juice: Telegram/social previews and permanent issue pages.
// Usage (repo root):  node tools/make_og.js site          -> og/site.jpg
//                     node tools/make_og.js <issue_id>    -> og/<issue_id>.jpg + <slug>/index.html
//                     node tools/make_og.js all           -> site + every issue in data/index.json
const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');const SITE='https://sobinoviv-cloud.github.io/fresh-juice/';
const RUBC={scripted:'#FF4458',unscripted:'#9071FF',doc:'#4A93FF',digital:'#FF4FA8',branded:'#FFA12E',short:'#FFE14D',sport:'#1FC781',event:'#22D3EE'};
const RUB={scripted:'Scripted',unscripted:'Non-scripted',doc:'Doc',digital:'Digital',branded:'Branded content',short:'Short media',sport:'Sport content',event:'Event'};
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const fd=iso=>{const [y,m,d]=iso.split('-').map(Number);return `${d} ${MON[m-1]}`};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MODE={daily:'Утренний выпуск',weekly:'Обзор недели',alert:'Срочно',pilot:'Пилотный выпуск'};
function slugOf(iss){const d=iss.date;switch(iss.mode){case 'weekly':return 'nedelya-'+d;case 'alert':return 'srochno-'+iss.id.slice(1);case 'pilot':return 'pilot-'+d;default:return d}}
const FONT='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@500;700&family=Unbounded:wght@700;900&display=block">';
const base=`*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0E0D10;color:#F5F1EB;font-family:'Golos Text',sans-serif;overflow:hidden}
.logo{display:flex;flex-direction:column;align-items:center;color:#FF5A1F;font-family:Unbounded}
.logo .f{font-weight:900;line-height:.9;letter-spacing:-.03em}.logo .j{font-weight:900;line-height:.86;letter-spacing:-.035em}
.logo .n{display:flex;align-items:center;gap:.55em;color:#fff;font-weight:700;letter-spacing:.3em;padding-left:.3em;line-height:1;margin:.3em 0 .24em}
.logo .n:before,.logo .n:after{content:"";width:1.6em;height:2px;background:#fff;opacity:.55}`;
const rubrics=`<div class="rb">${Object.keys(RUB).map(k=>`<span style="color:${RUBC[k]}">${RUB[k]}</span>`).join('<i></i>')}</div>`;
const shell=(top,body)=>`<html><head>${FONT}<style>${base}
body{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 120%,#3a1a0e 0,#0E0D10 60%)}
.logo{margin-top:-30px}.logo .f{font-size:112px}.logo .n{font-size:34px}.logo .j{font-size:168px}
.t{margin-top:22px;font-size:28px;font-weight:700;color:#BDB7C4;letter-spacing:.02em}
.top{position:absolute;left:52px;right:52px;top:40px;display:flex;justify-content:space-between;align-items:baseline;font-family:Unbounded;font-weight:700}
.top .d{font-size:30px;color:#fff;letter-spacing:-.01em}.top .m{font-family:'Golos Text';font-size:22px;color:#BDB7C4}
.rb{position:absolute;left:40px;right:40px;bottom:38px;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px 12px;font-size:21px;font-weight:700;letter-spacing:0;white-space:nowrap}
.rb i{width:6px;height:6px;border-radius:50%;background:#5A5560;display:block}</style></head><body>${top}${body}${rubrics}</body></html>`;
const logo=`<div class="logo"><span class="f">FRESH</span><span class="n">news</span><span class="j">JUICE</span></div>`;
function siteHTML(){return shell('',`${logo}<div class="t">Рынок видеоконтента · каждое утро в 10:00</div>`)}
const fullDate=iso=>{const [y,m,d]=iso.split('-').map(Number);return `${d} ${MON[m-1]} ${y} года`};
const plural=n=>n%10===1&&n%100!==11?'новость':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'новости':'новостей';
function issueHTML(iss,lead,n){
 return shell(`<div class="top"><span class="d">${esc(fullDate(iss.date))}</span><span class="m">${esc(MODE[iss.mode]||'Выпуск')} · ${n} ${plural(n)}</span></div>`,
  `${logo}<div class="t">Рынок видеоконтента · каждое утро в 10:00</div>`)}
function stub(iss,lead,n,slug){
 const url=SITE+slug+'/';const title=`Fresh Juice · ${MODE[iss.mode]||'Выпуск'} · ${fd(iss.date)}`;
 const desc=lead?`${lead.headline}. И ещё ${Math.max(0,n-1)} новостей рынка видеоконтента: Scripted, Non-scripted, Doc, Digital, Branded content, Short media, Sport content, Event.`:'Новости рынка видеоконтента от JUICE.';
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<meta property="og:site_name" content="Fresh news Juice"><meta property="og:type" content="article"><meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}og/${iss.id}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}og/${iss.id}.jpg">
<meta name="theme-color" content="#0E0D10"><link rel="icon" href="../favicon.svg" type="image/svg+xml">
<meta http-equiv="refresh" content="0;url=../#${iss.id}"><script>location.replace('../#${iss.id}')</script>
<style>body{background:#0E0D10;color:#F5F1EB;font:18px system-ui;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#FF5A1F}</style></head>
<body><a href="../#${iss.id}">Открыть выпуск Fresh Juice от ${esc(fd(iss.date))}</a></body></html>`}
(async()=>{
 const arg=process.argv[2];if(!arg){console.error('usage: node tools/make_og.js site|<issue_id>|all');process.exit(1)}
 const idx=JSON.parse(fs.readFileSync(path.join(ROOT,'data/index.json'),'utf8'));
 const ids=arg==='all'?['site',...idx.issues.map(i=>i.id)]:[arg];
 fs.mkdirSync(path.join(ROOT,'og'),{recursive:true});
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});
 for(const id of ids){
  if(id==='site'){await p.setContent(siteHTML(),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(ROOT,'og/site.jpg'),type:'jpeg',quality:86});console.log('og/site.jpg');continue}
  const d=JSON.parse(fs.readFileSync(path.join(ROOT,`data/${id}.json`),'utf8'));const iss=d.issue,st=d.stories||[];
  const lead=st.find(s=>s.id===iss.lead_id)||st.find(s=>s.lead)||st[0];
  await p.setContent(issueHTML(iss,lead,st.length),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:path.join(ROOT,`og/${id}.jpg`),type:'jpeg',quality:84});
  const slug=slugOf(iss);fs.mkdirSync(path.join(ROOT,slug),{recursive:true});fs.writeFileSync(path.join(ROOT,slug,'index.html'),stub(iss,lead,st.length,slug));
  const e=idx.issues.find(i=>i.id===id);if(e)e.url=SITE+slug+'/';
  console.log(`og/${id}.jpg  ${SITE}${slug}/`);
 }
 fs.writeFileSync(path.join(ROOT,'data/index.json'),JSON.stringify(idx,null,1));
 await b.close();
})();
