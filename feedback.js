/* First-party, anonymous feedback; no names, cookies, fingerprinting or third-party trackers. */
(() => {
  'use strict';
  const API='https://72-56-84-95.sslip.io/fresh-juice-api';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
  const write=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
  const uid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  const valid=x=>typeof x==='string'&&/^[a-f0-9]{32}$/.test(x);
  let browser=read('fj-browser-v1');if(!valid(browser)){browser=uid();write('fj-browser-v1',browser)}
  let session=null,issue=null,active=null,readTimer=null,flushTimer=null,busy=false,retries=0,observer=null;
  const queue=[],seen=new Set(),timers=new Map(),scores=new Map(),saving=new Set();
  function touch(){
    let saved;try{saved=JSON.parse(read('fj-session-v1'))}catch(_){}
    if(saved&&valid(saved.id)&&Date.now()-saved.last<1800000)session=saved;
    if(!session||Date.now()-session.last>=1800000)session={id:uid(),last:Date.now()};
    session.last=Date.now();write('fj-session-v1',JSON.stringify(session));return session.id;
  }
  async function request(path,data,keepalive=false){
    const r=await fetch(API+path,{method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,browser_id:browser}),keepalive,
      signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(10000):undefined});
    if(!r.ok)throw Error('feedback unavailable');return r.json();
  }
  function add(kind,story='',sid=touch()){
    if(!issue)return;
    const key=[sid,issue,kind,story].join('|');if(seen.has(key))return;seen.add(key);
    queue.push({kind,story_id:story,issue_id:issue,sid});if(queue.length>120)queue.shift();
    clearTimeout(flushTimer);flushTimer=setTimeout(flush,1000);
  }
  function emit(kind,story=''){
    if(document.visibilityState!=='visible')return;
    const sid=touch();add('visit','',sid);if(kind!=='visit')add(kind,story,sid);
  }
  async function flush(){
    if(busy||!queue.length)return;busy=true;
    const sid=queue[0].sid,batch=[];
    while(queue.length&&queue[0].sid===sid&&batch.length<30)batch.push(queue.shift());
    try{await request('/v1/events',{session_id:sid,events:batch.map(({sid,...e})=>e)},true);retries=0}
    catch(_){if(++retries<3)queue.unshift(...batch)}
    finally{busy=false;if(queue.length){clearTimeout(flushTimer);flushTimer=setTimeout(flush,retries?10000:1000)}}
  }
  function clearImpressions(){if(observer)observer.disconnect();for(const t of timers.values())clearTimeout(t);timers.clear()}
  function observe(){
    clearImpressions();if(active||!('IntersectionObserver' in window))return;
    observer=new IntersectionObserver(entries=>entries.forEach(e=>{
      clearTimeout(timers.get(e.target));timers.delete(e.target);
      if(e.intersectionRatio>=.5&&document.visibilityState==='visible')timers.set(e.target,setTimeout(()=>{
        if(!active&&document.visibilityState==='visible')emit('impression',e.target.closest('[data-open]').dataset.open);
        timers.delete(e.target);
      },1000));
    }),{threshold:.5});
    document.querySelectorAll('[data-open] h2,[data-open] h3').forEach(el=>observer.observe(el));
  }
  function paint(story,message){
    document.querySelectorAll('[data-feedback]').forEach(box=>{
      if(box.dataset.feedback!==story)return;
      const score=scores.get(story);
      box.querySelectorAll('[data-score]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.score)===score));b.disabled=saving.has(story)});
      box.querySelector('[data-rating-status]').textContent=message||(score?`Ваша оценка: ${score} из 5. Можно изменить.`:'Без имени и входа. Оценку можно изменить.');
    });
  }
  function startRead(){
    clearTimeout(readTimer);if(!active||document.visibilityState!=='visible')return;
    const story=active;readTimer=setTimeout(()=>{if(active===story){emit('read15',story);flush()}},15000);
  }
  window.JuiceFeedback={
    widget(story){return `<fieldset class="rating" data-feedback="${esc(story)}"><legend>Интересно читать такие новости?</legend><div class="rating-buttons" role="group" aria-label="Оценка интереса от 1 до 5">${[1,2,3,4,5].map(n=>`<button type="button" data-score="${n}" aria-label="${n} из 5${n===1?' — совсем неинтересно':n===5?' — очень интересно':''}" aria-pressed="false">${n}<span aria-hidden="true">★</span></button>`).join('')}</div><div class="rating-scale"><span>Совсем неинтересно</span><span>Очень интересно</span></div><p class="rating-status" data-rating-status role="status" aria-live="polite">Без имени и входа. Оценку можно изменить.</p></fieldset>`},
    issue(id){issue=id;active=null;clearTimeout(readTimer);emit('visit');observe()},
    open(story){
      if(active===story)return;active=story;clearImpressions();emit('open',story);paint(story);startRead();
      if(!scores.has(story))request('/v1/rating/get',{issue_id:issue,story_id:story}).then(r=>{
        if(!saving.has(story)&&!scores.has(story)){scores.set(story,r.score);paint(story)}
      }).catch(()=>{});
    },
    close(){active=null;clearTimeout(readTimer);observe()},
    privacy:'<details class="feedback-privacy"><summary>Об оценках и статистике</summary><p>Оценки помогают выбирать темы следующих выпусков. Считаем посещения, показы заголовков, открытия и чтение новостей без имён, контактов и привязки к Telegram. В браузере сохраняется случайный код: он позволяет изменить свою оценку. Другой браузер или устройство учитывается отдельно. Общая статистика доступна редакции.</p></details>'
  };
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-feedback] [data-score]');if(!button)return;
    e.stopPropagation();const box=button.closest('[data-feedback]'),story=box.dataset.feedback,score=Number(button.dataset.score);
    if(saving.has(story))return;saving.add(story);paint(story,'Сохраняем оценку…');
    try{const result=await request('/v1/rating',{issue_id:issue,story_id:story,score});scores.set(story,result.score);saving.delete(story);paint(story,'Спасибо! Ваша оценка: '+result.score+' из 5. Можно изменить.')}
    catch(_){saving.delete(story);paint(story,'Не удалось сохранить. Попробуйте ещё раз.')}
  });
  document.addEventListener('visibilitychange',()=>{
    clearTimeout(readTimer);clearImpressions();
    if(document.visibilityState==='visible'){if(active){emit('open',active);startRead()}else{emit('visit');observe()}}else flush();
  });
  window.addEventListener('pagehide',flush);
})();
