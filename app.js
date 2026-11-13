'use strict';
const main = document.querySelector('main');
// הגדרות האתר מגיעות מ־data/site-config.js (SITE). כל השדות אופציונליים מלבד title ו־storageKey.
const SITE = Object.assign({title:'מחברת לימוד',shortTitle:'מחברת',eyebrow:'',lede:'',coverLabel:'',footer:'',storageKey:'study-app-v1',
  modules:['chapters','practice','exams','search'],sourceLabel:'למקור',chapterSourceLabel:'חומר הפרק במקור'}, typeof site==='object'?site:{});
const has = m => SITE.modules.includes(m);
const key = SITE.storageKey;
const papersData = typeof papers==='object' ? papers : [];
const glossaryData = typeof glossary==='object' ? glossary : [];
const casesData = typeof cases==='object' ? cases : [];
if(typeof reconstructionSets==='undefined') window.reconstructionSets=[];
let state = {history:{},runs:{},read:{}};
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && saved.history && typeof saved.history === 'object') state = saved;
} catch {}
state.runs ??= {};
state.read ??= {};
delete state.run;
let activeTopic = topics[0]?.[0];
const byId = new Map(questions.map(q=>[q.id,q]));
const topicIds = topics.map(t=>t[0]);
const isTopic = id => topicIds.includes(id);
const keyPointsData = typeof keyPoints==='object' ? keyPoints : {};
function safe(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{const s=document.getElementById('save-status');if(s)s.textContent='השמירה בדפדפן אינה זמינה כרגע';}}
function shuffle(list){for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
const letters = 'אבגדה';
const pct = (a,b) => b ? Math.round(100*a/b) : 0;
function scopeTitle(id){
  if(id==='mixed')return 'תרגול מעורב';
  const t=topics.find(t=>t[0]===id);if(t)return t[1];
  return reconstructionSets.find(s=>s.id===id)?.title || '';
}
function stats(list){
  let answered=0,correct=0;
  for(const q of list){if(Object.hasOwn(state.history,q.id)){answered++;if(state.history[q.id])correct++;}}
  return {total:list.length,answered,correct,wrong:answered-correct};
}
const questionsOf = id => questions.filter(q=>q.topic===id);
const sectionName = q => chapters[q.topic]?.sections.find(section=>section[0]===q.section)?.[1] || '';
function meter(s,label){
  const done=pct(s.answered,s.total),ok=pct(s.correct,s.total);
  return '<span class="meter" role="img" aria-label="'+safe(label)+': נענו '+s.answered+' מתוך '+s.total+', '+s.correct+' נכונות"><i class="meter-done" style="width:'+done+'%"></i><i class="meter-ok" style="width:'+ok+'%"></i></span>';
}
function statLine(s){
  if(!s.answered)return 'טרם התחלת · '+s.total+' שאלות';
  return s.answered+'/'+s.total+' נענו · '+pct(s.correct,s.answered)+'% נכון';
}
function activeRun(){
  let best=null;
  for(const [scope,run] of Object.entries(state.runs||{})){
    if(!run?.ids?.length||run.idx>=run.ids.length||!run.ids.every(id=>byId.has(id)))continue;
    if(!best||(run.t||0)>(best.run.t||0))best={scope,run};
  }
  return best;
}
function scopeHref(scope){
  if(scope==='mixed')return '#practice';
  if(isTopic(scope))return '#topic/'+scope+'/practice';
  return '#exams/'+scope;
}
function ring(value){
  const r=52,c=2*Math.PI*r,off=c*(1-value/100);
  return '<svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="'+r+'"/><circle class="ring-value" cx="60" cy="60" r="'+r+'" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg>';
}
function progressPanel(){
  const all=stats(questions);
  const readCount=topicIds.filter(id=>state.read[id]).length;
  const answeredPct=pct(all.answered,all.total);
  const run=activeRun();
  const actions=[];
  if(run)actions.push('<a class="primary" href="'+scopeHref(run.scope)+'">המשך סבב: '+safe(scopeTitle(run.scope))+' · שאלה '+(run.run.idx+1)+' מתוך '+run.run.ids.length+' ←</a>');
  if(all.wrong)actions.push('<a class="secondary" href="#practice/wrong">חזרה על '+all.wrong+' טעויות</a>');
  if(has('practice')&&questions.length)actions.push('<a class="secondary" href="#practice">תרגול מעורב מכל הנושאים</a>');
  return '<section class="progress-panel" aria-labelledby="progress-title"><div class="ring-wrap">'+ring(answeredPct)+'<div class="ring-label"><strong>'+answeredPct+'%</strong><span>מהשאלות נענו</span></div></div><div class="progress-body"><h2 id="progress-title">ההתקדמות שלך</h2><dl class="facts"><div><dt>שאלות שנענו</dt><dd>'+all.answered+' <small>מתוך '+all.total+'</small></dd></div><div><dt>תשובות נכונות</dt><dd>'+all.correct+' <small>'+(all.answered?pct(all.correct,all.answered)+'% מהנענות':'—')+'</small></dd></div><div><dt>פרקים שנקראו</dt><dd>'+readCount+' <small>מתוך '+topicIds.length+'</small></dd></div><div><dt>לחזרה</dt><dd>'+all.wrong+' <small>טעויות</small></dd></div></dl><div class="actions">'+actions.join('')+'</div>'+(all.answered||readCount?'<button type="button" class="link-button" id="reset-progress">איפוס ההתקדמות</button>':'')+'</div></section>';
}
function home(){
  const rows=topics.map(([id,title,description],i)=>{
    const s=stats(questionsOf(id));
    return '<li><a class="topic-row" href="#topic/'+id+'"><span class="number">'+String(i+1).padStart(2,'0')+'</span><span class="topic-main"><strong>'+safe(title)+(state.read[id]?' <em class="read-badge">נקרא ✓</em>':'')+'</strong><small>'+safe(description)+'</small>'+meter(s,title)+'<small class="topic-stat">'+statLine(s)+'</small></span><span class="row-status">סיכום ותרגול <b aria-hidden="true">←</b></span></a></li>';
  }).join('');
  const sets=reconstructionSets.filter(set=>questionsOf(set.id).length).map(set=>{
    const s=stats(questionsOf(set.id));
    return '<li><a href="#exams/'+set.id+'"><span>'+safe(set.title)+'</span>'+meter(s,set.title)+'<small>'+statLine(s)+'</small></a></li>';
  }).join('');
  const examAside=has('exams')&&sets?'<aside class="exam-panel"><p class="eyebrow">מסלול תרגול</p><h2>'+safe(SITE.examsTitle||'שחזורי בחינות')+'</h2><p>'+safe(SITE.examsBlurb||'שחזורים ובחנים, לפי הסדר שבו הופיעו במקור. בסוף כל שאלה מופיעה הפניה למקור.')+'</p><ul class="set-list">'+sets+'</ul><a href="#exams">לכל השחזורים <span aria-hidden="true">←</span></a></aside>':'';
  const extras=[has('papers')&&papersData.length?'<a class="secondary" href="#papers">מאמרים ('+papersData.length+')</a>':'',has('glossary')&&glossaryData.length?'<a class="secondary" href="#glossary">מילון מונחים ('+glossaryData.length+')</a>':'',has('cases')&&casesData.length?'<a class="secondary" href="#cases">מקרים ('+casesData.length+')</a>':''].join('');
  main.innerHTML='<section class="opening"><div>'+(SITE.eyebrow?'<p class="eyebrow">'+safe(SITE.eyebrow)+'</p>':'')+'<h1>'+safe(SITE.title).replace(/\n/g,'<br>')+'</h1>'+(SITE.lede?'<p class="lede">'+safe(SITE.lede)+'</p>':'')+'<a class="primary" href="#topic/'+topics[0][0]+'">להתחלת הלימוד <span aria-hidden="true">←</span></a>'+(extras?'<div class="actions extra-links">'+extras+'</div>':'')+'</div><figure class="cover" aria-hidden="true"><div class="cover-mark">'+safe(SITE.coverMark||SITE.shortTitle)+'</div>'+(SITE.coverLabel?'<figcaption>'+safe(SITE.coverLabel)+'</figcaption>':'')+'</figure></section>'+progressPanel()+'<div class="home-grid'+(examAside?'':' single')+'"><section><div class="list-head"><h2>'+safe(SITE.chaptersTitle||'נושאי הקורס')+'</h2>'+(has('search')?'<form class="search-form compact" role="search" id="home-search"><label for="home-q" class="visually-hidden">חיפוש</label><input id="home-q" type="search" placeholder="חיפוש בסיכומים ובשאלות" autocomplete="off"><button type="submit" class="secondary">חיפוש</button></form>':'')+'</div><ol class="topic-list">'+rows+'</ol></section>'+examAside+'</div>';
  const hs=document.getElementById('home-search');if(hs)hs.onsubmit=e=>{e.preventDefault();const v=document.getElementById('home-q').value.trim();location.hash='#search/'+encodeURIComponent(v);};
  const reset=document.getElementById('reset-progress');
  if(reset)reset.onclick=()=>{
    if(!confirm('למחוק את כל ההתקדמות, התשובות והסימונים שנשמרו בדפדפן הזה?'))return;
    state={history:{},runs:{},read:{}};save();home();
  };
}
// קישור למקור הפרק: chapters[id].source = {url, label, note}
function presentationLink(topicId=activeTopic){
  const src=chapters[topicId]?.source;
  if(!src?.url)return '';
  return '<a href="'+safe(src.url)+'" target="_blank" rel="noopener">'+safe(src.label||SITE.chapterSourceLabel)+'</a>'+(src.note?' <small>('+safe(src.note)+')</small>':'');
}
// מילה מודגשת: **טקסט**
function inline(t){return safe(t).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
// בלוקים: "|" שורת טבלה, "- " פריט ברשימה, "### " כותרת משנה, "! " תיבת "לזכור", אחרת פסקה
function sectionBody(blocks){
  let output='', open=null, columns=0;
  const close=()=>{if(open==='table')output+='</table></div>';if(open==='list')output+='</ul>';open=null;};
  for(const block of blocks){
    if(block.startsWith('|')){
      const cells=block.slice(1,-1).split('|');
      // טבלה חדשה מתחילה כשמספר העמודות משתנה, גם אם שתי טבלאות צמודות בטקסט
      if(open==='table'&&cells.length!==columns)close();
      const tag=open==='table'?'td':'th';
      if(open!=='table'){close();output+='<div class="table-scroll" tabindex="0" role="region" aria-label="טבלת השוואה"><table>';open='table';columns=cells.length;}
      output+='<tr>'+cells.map(cell=>'<'+tag+(tag==='th'?' scope="col"':'')+'>'+inline(cell)+'</'+tag+'>').join('')+'</tr>';
    } else if(block.startsWith('- ')){
      if(open!=='list'){close();output+='<ul class="points">';open='list';}
      output+='<li>'+inline(block.slice(2))+'</li>';
    } else {
      close();
      if(block.startsWith('### '))output+='<h3>'+inline(block.slice(4))+'</h3>';
      else if(block.startsWith('! '))output+='<p class="remember"><strong>לזכור:</strong> '+inline(block.slice(2))+'</p>';
      else output+='<p>'+inline(block)+'</p>';
    }
  }
  close();
  return output;
}
function figure(id){
  return (chapters[activeTopic].figures?.[id] || []).map(f=>'<figure class="clinical-figure"><img src="'+safe(f.src)+'" alt="'+safe(f.title)+'" loading="lazy" decoding="async"><figcaption><strong>'+safe(f.title)+'</strong><span>'+safe(f.caption)+'</span>'+(f.slide?'<small class="source">מצגת הקורס · שקופית '+f.slide+'</small>':'')+(f.credit?'<small class="source credit"><a href="'+safe(f.credit.page)+'" target="_blank" rel="noopener">'+safe(f.credit.text)+'</a> · '+safe(f.credit.license)+'</small>':'')+'</figcaption></figure>').join('');
}
function readingSection(id,paragraphs){
  // figureAfter: מספר הפסקאות שאחריהן ממוקם האיור (ברירת מחדל: בסוף הסעיף)
  const after=chapters[activeTopic].figureAfter?.[id];
  if(Number.isInteger(after))return sectionBody(paragraphs.slice(0,after))+figure(id)+sectionBody(paragraphs.slice(after));
  return sectionBody(paragraphs)+figure(id);
}
function keyPointsBox(id){
  const points=keyPointsData[id];
  if(!points?.length)return '';
  return '<section id="keypoints" class="keypoints" tabindex="-1"><h2>נקודות מפתח לבחינה</h2><ul>'+points.map(p=>'<li>'+safe(p)+'</li>').join('')+'</ul></section>';
}
function topic(id,tab){
  const entry=topics.find(t=>t[0]===id);
  if(!entry){home();return;}
  activeTopic=id;
  const title=safe(entry[1]);
  const index=topics.indexOf(entry);
  const s=stats(questionsOf(id));
  const header='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><p class="eyebrow">פרק '+String(index+1).padStart(2,'0')+' מתוך '+topics.length+'</p><h1>'+title+'</h1><div class="chapter-progress">'+meter(s,entry[1])+'<span>'+statLine(s)+(state.read[id]?' · הסיכום נקרא ✓':'')+'</span></div></header>';
  const chapter=chapters[id];
  const tabs='<nav class="tabs" aria-label="תצוגת הפרק"><a '+(!tab?'aria-current="page"':'')+' href="#topic/'+id+'">סיכום</a><a '+(tab?'aria-current="page"':'')+' href="#topic/'+id+'/practice">תרגול <small>('+s.total+')</small></a></nav>';
  const prev=topics[index-1],next=topics[index+1];
  const pager='<nav class="pager" aria-label="מעבר בין פרקים">'+(prev?'<a href="#topic/'+prev[0]+'"><small>הפרק הקודם</small>→ '+safe(prev[1])+'</a>':'<span></span>')+(next?'<a href="#topic/'+next[0]+'"><small>הפרק הבא</small>'+safe(next[1])+' ←</a>':'<span></span>')+'</nav>';
  const kp=keyPointsData[id]?.length;
  const contents='<aside class="contents"><strong>בפרק הזה</strong>'+(kp?'<button type="button" data-section="keypoints">נקודות מפתח</button>':'')+chapter.sections.map(([sid,stitle])=>'<button type="button" data-section="'+sid+'">'+safe(stitle)+'</button>').join('')+'</aside>';
  const readButton='<button type="button" class="secondary read-toggle" aria-pressed="'+(state.read[id]?'true':'false')+'">'+(state.read[id]?'✓ סימנת שקראת את הפרק':'סימון הפרק כנקרא')+'</button>';
  main.innerHTML=header+tabs+(tab?'<div id="practice"></div>':'<div class="reading">'+contents+'<article><p class="lede">'+safe(chapter.intro)+'</p>'+keyPointsBox(id)+chapter.sections.map(([sid,stitle,paragraphs])=>'<section id="'+sid+'" tabindex="-1"><h2>'+safe(stitle)+'</h2>'+readingSection(sid,paragraphs)+'</section>').join('')+(presentationLink(id)?'<p class="source">'+presentationLink(id)+'</p>':'')+'<div class="chapter-end">'+readButton+'<a class="primary" href="#topic/'+id+'/practice">לתרגול הפרק ←</a></div>'+pager+'</article></div>');
  if(tab){practice();return;}
  main.querySelectorAll('[data-section]').forEach(button=>button.onclick=()=>{
    const section=document.getElementById(button.dataset.section);
    section.focus({preventScroll:true});section.scrollIntoView({block:'start',behavior:'smooth'});
  });
  main.querySelector('.read-toggle').onclick=()=>{
    if(state.read[id])delete state.read[id];else state.read[id]=true;
    save();
    const y=window.scrollY;topic(id,false);window.scrollTo(0,y);
    main.querySelector('.read-toggle').focus({preventScroll:true});
  };
}
function exams(id){
  const exam=reconstructionSets.find(item=>item.id===id);
  if(exam&&questions.some(q=>q.topic===exam.id)){
    activeTopic=exam.id;
    const s=stats(questionsOf(exam.id));
    main.innerHTML='<a class="back" href="#exams">חזרה לשחזורים</a><header class="chapter-header"><h1>'+safe(exam.title)+'</h1><p>'+safe(exam.origin)+'</p><p>השאלות בנוסח השחזור המקורי, עם הסבר לכל אפשרות. המספור במשוב מפנה לשאלה המקורית.</p><div class="chapter-progress">'+meter(s,exam.title)+'<span>'+statLine(s)+'</span></div></header><div id="practice"></div>';
    practice();
    return;
  }
  const cards=items=>items.map(item=>{
    const list=questionsOf(item.id),count=list.length,s=stats(list);
    const status=count ? count+' שאלות מעובדות'+(item.total?' מתוך '+item.total+' במקור':'') : 'המקור אותר וממתין לקליטה';
    return '<section class="exam-panel"><h3>'+safe(item.title)+'</h3><p>'+safe(item.origin)+'</p><p>'+status+'</p>'+(count?'<div class="chapter-progress">'+meter(s,item.title)+'<span>'+statLine(s)+'</span></div>':'')+(count?'<a class="primary" href="#exams/'+item.id+'">'+(item.opening?'לתרגול בוחן הפתיחה':'לתרגול השחזור')+' ←</a> ':'')+(item.url?'<a href="'+safe(item.url)+'" target="_blank" rel="noopener">'+safe(item.urlLabel||SITE.sourceLabel)+'</a>':'')+'</section>';
  }).join('');
  main.innerHTML='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><h1>שחזורי בחינות</h1><p>בחרו שחזור לפי המועד והנוסח.</p></header>'+(reconstructionSets.some(item=>item.opening)?'<section><h2>בחני פתיחה</h2><div class="recon-list">'+cards(reconstructionSets.filter(item=>item.opening))+'</div></section>':'')+'<section><h2>'+(reconstructionSets.some(item=>item.opening)?'שחזורים נוספים':'כל השחזורים')+'</h2><div class="recon-list">'+cards(reconstructionSets.filter(item=>!item.opening))+'</div></section>';
}
function mixedPage(mode){
  activeTopic='mixed';
  const s=stats(questions);
  main.innerHTML='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><p class="eyebrow">כל המאגר</p><h1>תרגול מעורב</h1><p>שאלות מכל הפרקים, השחזורים ובחני הפתיחה. אפשר לצמצם לפרק אחד, לבחור רק שאלות חדשות או לחזור על טעויות.</p><div class="chapter-progress">'+meter(s,'כל המאגר')+'<span>'+statLine(s)+'</span></div></header><div id="practice"></div>';
  practice(mode);
}
function inMixedScope(q,topicFilter){
  if(!topicFilter)return true;
  if(topicFilter==='recon')return !isTopic(q.topic);
  return q.topic===topicFilter;
}
function settings(stage,presetMode){
  const mixed=activeTopic==='mixed';
  const chapter=mixed?null:chapters[activeTopic];
  const intro=mixed
    ? '<p>הסבב נבנה באקראי מתוך השאלות שבחרתם.</p>'
    : chapter
    ? '<p>לבדיקת הכיסוי של הפרק, בחרו את כל תתי־הנושאים ואת כל השאלות המתאימות. בסיום יופיע פירוט לפי תת־נושא.</p>'
    : '<p>הסבב כולל שאלות מהשחזור שבחרת, לפי הסדר שבו הופיעו במקור.</p>';
  const topicFilter=mixed
    ? '<label>מקור השאלות<select name="topic"><option value="">כל השאלות במאגר</option>'+topics.map(([id,title])=>'<option value="'+id+'">'+safe(title)+'</option>').join('')+'<option value="recon">שחזורים ובחני פתיחה</option></select></label>'
    : '';
  const sectionFilter=chapter
    ? '<label>תת־נושא<select name="section"><option value="">כל תתי־הנושאים</option>'+chapter.sections.filter(([id])=>questions.some(q=>q.topic===activeTopic&&q.section===id)).map(([id,title])=>'<option value="'+id+'">'+safe(title)+'</option>').join('')+'</select></label>'
    : '';
  const sizes=mixed?'<option value="10">10 שאלות</option><option value="20">20 שאלות</option><option value="all">כל השאלות המתאימות</option>':'<option value="all">כל השאלות המתאימות</option><option value="4">4 שאלות</option><option value="10">10 שאלות</option>';
  stage.innerHTML='<section class="quiz"><h2>בחירת סבב</h2>'+intro+'<form id="quiz-form">'+topicFilter+sectionFilter+'<label>סוג התרגול<select name="mode"><option value="all">כל השאלות</option><option value="new">שאלות שטרם נענו</option><option value="wrong">חזרה על טעויות</option></select></label><label>מספר שאלות<select name="size">'+sizes+'</select></label><p id="available" aria-live="polite"></p><button type="submit" class="primary">התחלת סבב ←</button></form></section>';
  const form=stage.querySelector('form');
  if(presetMode==='wrong')form.mode.value='wrong';
  function pool(){
    const {section,mode,topic}=Object.fromEntries(new FormData(form));
    return questions.filter(q=>(mixed?inMixedScope(q,topic):q.topic===activeTopic)&&(!section||section===q.section)&&(mode==='all'||(mode==='new'?!Object.hasOwn(state.history,q.id):state.history[q.id]===false)));
  }
  function update(){
    const count=pool().length;
    stage.querySelector('#available').textContent=count?count+' שאלות מתאימות':'אין שאלות שמתאימות לבחירה הזאת';
    form.querySelector('button').disabled=!count;
  }
  form.onchange=update;update();
  form.onsubmit=event=>{
    event.preventDefault();
    const selected=pool();
    const ordered=!chapter&&!mixed;
    if(ordered)selected.sort((a,b)=>a.number-b.number);
    const availableIds=selected.map(q=>q.id);
    const ids=(ordered?availableIds:shuffle(availableIds)).slice(0,Number(new FormData(form).get('size'))||Infinity);
    if(!ids.length)return;
    startRun(ids);
  };
}
function startRun(ids){
  state.runs[activeTopic]={ids,idx:0,picks:[],t:Date.now()};save();practice();focusQuestion();
}
function focusQuestion(){document.getElementById('question')?.focus();}
function answer(index){
  const run=state.runs[activeTopic];
  if(run.picks.length>run.idx)return;
  const position={left:window.scrollX,top:window.scrollY,behavior:'instant'};
  const id=run.ids[run.idx];
  run.picks.push(index);run.t=Date.now();state.history[id]=index===byId.get(id).k;save();practice();
  document.querySelector('.answers').focus({preventScroll:true});
  window.scrollTo(position);
}
let repeatIndex=null;
function questionTokens(q){
  const words=normalize(q.q+' '+q.a.join(' ')).replace(/[^א-תa-z0-9 ]/g,' ').split(' ').map(w=>w.replace(/^[והבלמשכ](?=[א-ת]{3})/,''));
  return new Set(words.filter(w=>w.length>1));
}
function similar(a,b){let n=0;for(const w of a)if(b.has(w))n++;return n/Math.min(a.size,b.size);}
function appearsAlso(q){
  if(!repeatIndex){
    repeatIndex=new Map();
    const pool=questions.filter(x=>reconstructionSets.some(s=>s.id===x.topic)).map(x=>[x,questionTokens(x)]);
    for(const [x] of pool)repeatIndex.set(x.id,[]);
    for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){
      const [x,tx]=pool[i],[y,ty]=pool[j];
      if(x.topic===y.topic)continue;
      const sameAnswer=similar(questionTokens({q:x.a[x.k],a:[]}),questionTokens({q:y.a[y.k],a:[]}))>=.5;
      if(!sameAnswer&&similar(tx,ty)<.85)continue;
      if(similar(tx,ty)>=.6){repeatIndex.get(x.id).push(y.topic);repeatIndex.get(y.id).push(x.topic);}
    }
  }
  return [...new Set(repeatIndex.get(q.id)||[])].map(scopeTitle);
}
function feedback(q){
  const exam=reconstructionSets.find(item=>item.id===q.topic);
  const source=exam
    ? '<p class="source">שאלה '+q.number+' במקור'+(q.page?', עמ׳ '+q.page:'')+(exam.url?' · <a href="'+safe(exam.url)+'" target="_blank" rel="noopener">תיקיית המקור</a>':'')+'</p>'
    : '<p class="source">'+(presentationLink(q.topic)?presentationLink(q.topic)+' · ':'')+'<a href="#topic/'+q.topic+'/read/'+q.section+'">לסעיף בסיכום</a></p>';
  const also=appearsAlso(q);
  return '<section class="feedback">'+(also.length?'<p class="also">⭐ שאלה חוזרת: הופיעה גם ב'+also.map(t=>safe(t)).join(', ')+'</p>':'')+'<p class="explanation">'+safe(q.e)+'</p>'+(q.clarification?'<p class="explanation">'+safe(q.clarification)+'</p>':'')+'<h3>הסבר לכל אפשרות</h3><ol class="review">'+q.a.map((a,i)=>'<li'+(i===q.k?' class="is-correct"':'')+'><strong>'+letters[i]+'. '+safe(a)+'</strong><p>'+safe(q.x[i])+'</p></li>').join('')+'</ol>'+source+'</section>';
}
function breakdownTable(caption,rows){
  return '<h3>'+caption+'</h3><div class="table-scroll" tabindex="0" role="region" aria-label="'+caption+'"><table><thead><tr><th scope="col">נושא</th><th scope="col">נכונות בסבב</th><th scope="col">שאלות שלא נכללו</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function runBreakdown(run){
  const resultById=new Map(run.ids.map((id,index)=>[id,byId.get(id).k===run.picks[index]]));
  if(activeTopic==='mixed'){
    const groups=[...new Set(run.ids.map(id=>byId.get(id).topic))];
    const rows=groups.map(g=>{
      const ids=run.ids.filter(id=>byId.get(id).topic===g);
      const correct=ids.filter(id=>resultById.get(id)).length;
      return '<tr><th scope="row">'+safe(scopeTitle(g))+'</th><td>'+correct+' מתוך '+ids.length+'</td><td>'+(questionsOf(g).length-ids.length)+'</td></tr>';
    }).join('');
    return breakdownTable('פירוט לפי מקור',rows);
  }
  const chapter=chapters[activeTopic];
  if(!chapter)return '';
  const chapterQuestions=questionsOf(activeTopic);
  const rows=chapter.sections.map(([id,title])=>{
    const available=chapterQuestions.filter(q=>q.section===id);
    if(!available.length)return '';
    const attempted=available.filter(q=>resultById.has(q.id));
    const correct=attempted.filter(q=>resultById.get(q.id)).length;
    const unseen=available.length-attempted.length;
    const answerText=attempted.length?correct+' מתוך '+attempted.length:'לא נבדק בסבב';
    return '<tr><th scope="row">'+safe(title)+'</th><td>'+answerText+'</td><td>'+unseen+'</td></tr>';
  }).join('');
  return breakdownTable('כיסוי לפי תת־נושא',rows)+'<p>הפירוט מתייחס לשאלות במאגר. תת־נושא שלא נבדק בסבב עדיין דורש תרגול.</p>';
}
function practice(presetMode){
  const stage=document.getElementById('practice');
  const run=state.runs[activeTopic];
  const valid=run?.ids?.length&&run.ids.every(id=>byId.has(id)&&(activeTopic==='mixed'||byId.get(id).topic===activeTopic));
  if(!valid){settings(stage,presetMode);return;}
  if(run.idx>=run.ids.length){
    const results=run.ids.map((id,i)=>byId.get(id).k===run.picks[i]);
    const score=results.filter(Boolean).length;
    const wrongIds=run.ids.filter((id,i)=>!results[i]);
    const list='<h3>השאלות בסבב</h3><ol class="run-list">'+run.ids.map((id,i)=>'<li class="'+(results[i]?'ok':'no')+'"><span class="mark" aria-hidden="true">'+(results[i]?'✓':'✗')+'</span><span>'+safe(byId.get(id).q)+'<small>'+(results[i]?'נכון':'התשובה הנכונה: '+letters[byId.get(id).k]+'. '+safe(byId.get(id).a[byId.get(id).k]))+'</small></span></li>').join('')+'</ol>';
    stage.innerHTML='<section class="quiz"><h2 tabindex="-1" id="question">סיכום הסבב</h2><p class="score">'+score+' מתוך '+run.ids.length+'</p><p>תשובות נכונות ('+pct(score,run.ids.length)+'%)</p><div class="actions">'+(wrongIds.length?'<button class="primary" id="retry">חזרה על '+wrongIds.length+' הטעויות מהסבב ←</button>':'')+'<button class="'+(wrongIds.length?'secondary':'primary')+'" id="reset">בחירת סבב נוסף</button></div>'+runBreakdown(run)+list+'</section>';
    stage.querySelector('#reset').onclick=()=>{state.runs[activeTopic]=null;save();practice();stage.querySelector('select')?.focus();};
    const retry=stage.querySelector('#retry');
    if(retry)retry.onclick=()=>startRun(shuffle([...wrongIds]));
    return;
  }
  const q=byId.get(run.ids[run.idx]),selected=run.picks[run.idx],done=Number.isInteger(selected);
  const label=activeTopic==='mixed'?scopeTitle(q.topic)+(sectionName(q)&&isTopic(q.topic)?' · '+sectionName(q):''):sectionName(q);
  const hint=!done&&matchMedia('(hover:hover)').matches?'<p class="kbd-hint">אפשר לענות גם במקלדת: 1–'+q.a.length+'</p>':'';
  stage.innerHTML='<section class="quiz"><div class="quiz-top"><span>'+safe(label)+'</span><span>שאלה '+(run.idx+1)+' מתוך '+run.ids.length+' · <button type="button" class="link-button" id="quit">יציאה מהסבב</button></span></div><progress max="'+run.ids.length+'" value="'+(run.idx+(done?1:0))+'" aria-label="התקדמות בסבב"></progress><h2 tabindex="-1" id="question">'+safe(q.q)+'</h2><div class="answers" tabindex="-1" role="group" aria-label="'+(done?'התשובה הנכונה היא '+letters[q.k]:'אפשרויות התשובה')+'">'+q.a.map((a,i)=>{
    const correct=done&&i===q.k,chosen=done&&i===selected;
    return '<button type="button" class="answer '+(correct?'correct':chosen?'incorrect':'')+'" '+(done?'disabled':'')+' data-answer="'+i+'"><b>'+letters[i]+'</b><span>'+safe(a)+(correct||chosen?'<small>'+(correct?'תשובה נכונה':'')+(correct&&chosen?' · ':'')+(chosen?'הבחירה שלך':'')+'</small>':'')+'</span></button>';
  }).join('')+'</div>'+hint+(done?'<p class="verdict '+(selected===q.k?'ok':'no')+'" role="status">'+(selected===q.k?'נכון!':'לא נכון. התשובה הנכונה היא '+letters[q.k]+'.')+'</p>'+feedback(q)+'<button class="primary" id="next">'+(run.idx+1===run.ids.length?'לסיכום הסבב':'לשאלה הבאה')+' ←</button>':'')+'</section>';
  stage.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answer(Number(b.dataset.answer)));
  stage.querySelector('#quit').onclick=()=>{
    if(run.idx>0&&!confirm('לצאת מהסבב? התשובות שכבר נתת נשמרות בהתקדמות.'))return;
    state.runs[activeTopic]=null;save();practice();
  };
  if(done)stage.querySelector('#next').onclick=()=>{run.idx++;run.t=Date.now();save();practice();focusQuestion();};
}
document.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  const target=event.target instanceof Element?event.target:document.body;
  if(target.closest('select,input,textarea'))return;
  const stage=document.getElementById('practice');
  if(!stage)return;
  const n=Number(event.key);
  const buttons=[...stage.querySelectorAll('[data-answer]:not(:disabled)')];
  if(buttons.length&&n>=1&&n<=buttons.length){event.preventDefault();buttons[n-1].click();return;}
  const next=stage.querySelector('#next');
  if(next&&event.key==='Enter'&&!target.closest('button,a')){event.preventDefault();next.click();}
});
function normalize(t){return String(t).toLowerCase().replace(/[\u0591-\u05C7]/g,'').replace(/[״"׳'־\-]/g,' ').replace(/\s+/g,' ');}
function snippet(text,terms){
  text=String(text).replace(/\*\*/g,'').replace(/(^|\s)(- |### |! )/g,'$1').replace(/^\||\|$/g,'').replace(/\|/g,' · ');
  const n=normalize(text);let at=-1;
  for(const term of terms){const i=n.indexOf(term);if(i>=0&&(at<0||i<at))at=i;}
  const start=Math.max(0,at-60),raw=text.slice(start,start+220);
  let html=safe((start>0?'…':'')+raw+(start+220<text.length?'…':''));
  for(const term of terms){if(term.length<2)continue;const re=new RegExp('('+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');html=html.replace(re,'<mark>$1</mark>');}
  return html;
}
function searchPage(query){
  activeTopic='search';
  const q=decodeURIComponent(query||'');
  main.innerHTML='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><h1>חיפוש</h1></header><form class="search-form" role="search"><label for="search-input" class="visually-hidden">חיפוש בסיכומים ובשאלות</label><input id="search-input" type="search" name="q" value="'+safe(q)+'" placeholder="מילה או מונח" autocomplete="off"><button class="primary" type="submit">חיפוש</button></form><div id="results" aria-live="polite"></div>';
  const form=main.querySelector('form'),input=form.q,results=main.querySelector('#results');
  function run(text){
    const terms=normalize(text).trim().split(' ').filter(t=>t.length>1);
    if(!terms.length){results.innerHTML='<p class="muted">הקלידו לפחות מילה אחת של שתי אותיות.</p>';return;}
    const match=t=>{const n=normalize(t);return terms.every(term=>n.includes(term));};
    const sections=[];
    for(const [id,title] of topics){
      const ch=chapters[id];
      (keyPointsData[id]||[]).forEach(p=>{if(match(p))sections.push({id,sid:'keypoints',title,stitle:'נקודות מפתח',text:p});});
      for(const [sid,stitle,paragraphs] of ch.sections){
        const text=paragraphs.join(' ');
        if(match(stitle+' '+text))sections.push({id,sid,title,stitle,text:match(text)?paragraphs.find(p=>terms.some(t=>normalize(p).includes(t)))||text:text});
      }
    }
    const qs=questions.filter(x=>match(x.q+' '+x.a.join(' ')+' '+x.e));
    const ps=papersData.filter(p=>match([p.title,p.titleHe,p.authors,p.question,p.findings,(p.terms||[]).flat().join(' ')].join(' ')));
    const gs=glossaryData.filter(([t,d])=>match(t+' '+d));
    const secHtml=sections.slice(0,40).map(r=>'<li><a href="#topic/'+r.id+'/read/'+r.sid+'"><strong>'+safe(r.title)+' · '+safe(r.stitle)+'</strong></a><p>'+snippet(r.text,terms)+'</p></li>').join('');
    const qHtml=qs.slice(0,40).map(x=>'<li><details><summary>'+snippet(x.q,terms)+' <small>('+safe(scopeTitle(x.topic))+')</small></summary><p><strong>תשובה: '+letters[x.k]+'. '+safe(x.a[x.k])+'</strong></p><p>'+safe(x.e)+'</p></details></li>').join('');
    const extra=(ps.length?'<h2>במאמרים ('+ps.length+')</h2><ul class="results">'+ps.map(p=>'<li><a href="#papers/'+p.id+'"><strong>'+safe(p.titleHe||p.title)+'</strong></a></li>').join('')+'</ul>':'')+(gs.length?'<h2>במילון ('+gs.length+')</h2><ul class="results">'+gs.slice(0,30).map(([t,d])=>'<li><strong>'+safe(t)+'</strong><p>'+safe(d)+'</p></li>').join('')+'</ul>':'');
    results.innerHTML=(sections.length||qs.length||ps.length||gs.length?'':'<p class="muted">לא נמצאו תוצאות. נסו מילה אחרת או כתיב אחר (למשל באנגלית).</p>')+(sections.length?'<h2>בסיכומים ('+sections.length+')</h2><ul class="results">'+secHtml+'</ul>':'')+(qs.length?'<h2>בשאלות ('+qs.length+')</h2><ul class="results">'+qHtml+'</ul>':'')+extra;
  }
  form.onsubmit=e=>{e.preventDefault();history.replaceState(null,'','#search/'+encodeURIComponent(input.value.trim()));run(input.value);};
  let timer;input.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>run(input.value),200);};
  if(q)run(q);
  input.focus();
}

// ===== מודול מאמרים: papers = [{id, title, titleHe, authors, year, journal, chapter, url, lang, question, method, findings, implications, critique, terms:[[מונח, הסבר]], summary:[בלוקים בפורמט הסיכום]}]
function papersPage(id){
  activeTopic='papers';
  const p=papersData.find(x=>x.id===id);
  if(p){
    const row=(t,v)=>v?'<section><h2>'+t+'</h2>'+(Array.isArray(v)?sectionBody(v):'<p>'+inline(v)+'</p>')+'</section>':'';
    main.innerHTML='<a class="back" href="#papers">חזרה למאמרים</a><header class="chapter-header"><p class="eyebrow">'+safe([p.authors,p.year,p.journal].filter(Boolean).join(' · '))+'</p><h1>'+safe(p.titleHe||p.title)+'</h1>'+(p.titleHe&&p.title?'<p class="original-title" dir="auto">'+safe(p.title)+'</p>':'')+(p.chapter&&scopeTitle(p.chapter)?'<p><a href="#topic/'+p.chapter+'">פרק: '+safe(scopeTitle(p.chapter))+'</a></p>':'')+'</header><article class="paper">'+(p.tldr?'<p class="remember"><strong>בשורה אחת:</strong> '+inline(p.tldr)+'</p>':'')+row('שאלת המחקר',p.question)+row('שיטה',p.method)+row('ממצאים עיקריים',p.findings)+row('משמעות ומסקנות',p.implications)+row('ביקורת ומגבלות',p.critique)+(p.summary?'<section><h2>סיכום מורחב</h2>'+sectionBody(p.summary)+'</section>':'')+(p.terms?.length?'<section><h2>מונחים מהמאמר</h2><dl class="terms">'+p.terms.map(([t,d])=>'<div><dt dir="auto">'+safe(t)+'</dt><dd>'+safe(d)+'</dd></div>').join('')+'</dl></section>':'')+(p.url?'<p class="source"><a href="'+safe(p.url)+'" target="_blank" rel="noopener">המאמר המקורי</a>'+(p.lang&&p.lang!=='he'?' <small>(בשפת המקור)</small>':'')+'</p>':'')+'</article>';
    return;
  }
  const groups=[...new Set(papersData.map(x=>x.chapter||''))];
  main.innerHTML='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><h1>מאמרים</h1><p>'+safe(SITE.papersBlurb||'כל מאמר מתורגם ומסוכם בעברית: שאלת המחקר, השיטה, הממצאים והמשמעות.')+'</p></header>'+groups.map(g=>'<section>'+(g&&scopeTitle(g)?'<h2>'+safe(scopeTitle(g))+'</h2>':'')+'<ul class="paper-list">'+papersData.filter(x=>(x.chapter||'')===g).map(x=>'<li><a href="#papers/'+x.id+'"><strong>'+safe(x.titleHe||x.title)+'</strong><small>'+safe([x.authors,x.year].filter(Boolean).join(' · '))+'</small>'+(x.tldr?'<span>'+safe(x.tldr)+'</span>':'')+'</a></li>').join('')+'</ul></section>').join('');
}
// ===== מודול מילון מונחים: glossary = [[מונח, הסבר, מזהה פרק (אופציונלי)]]
function glossaryPage(){
  activeTopic='glossary';
  const sorted=[...glossaryData].sort((a,b)=>a[0].localeCompare(b[0],'he'));
  main.innerHTML='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><h1>מילון מונחים</h1><p>'+sorted.length+' מונחים. הקלידו כדי לסנן.</p></header><form class="search-form" role="search" onsubmit="return false"><label for="gq" class="visually-hidden">סינון מונחים</label><input id="gq" type="search" placeholder="סינון מונחים" autocomplete="off"></form><dl class="terms glossary" id="glist"></dl>';
  const list=main.querySelector('#glist'),input=main.querySelector('#gq');
  const draw=()=>{const t=normalize(input.value).trim();list.innerHTML=sorted.filter(([a,b])=>!t||normalize(a+' '+b).includes(t)).map(([a,b,c])=>'<div><dt dir="auto">'+safe(a)+'</dt><dd>'+safe(b)+(c&&scopeTitle(c)?' <a href="#topic/'+c+'">('+safe(scopeTitle(c))+')</a>':'')+'</dd></div>').join('')||'<p class="muted">לא נמצאו מונחים.</p>';};
  input.oninput=draw;draw();
}
// ===== מודול מקרים: cases = [{id, title, chapter, stem, steps:[{q, a:[], k, e}]}] — שלב נחשף אחרי תשובה
function casesPage(id){
  activeTopic='cases';
  const c=casesData.find(x=>x.id===id);
  if(!c){
    main.innerHTML='<a class="back" href="#home">חזרה לנושאים</a><header class="chapter-header"><h1>מקרים</h1><p>מקרים קליניים או יישומיים, שלב אחרי שלב.</p></header><ul class="paper-list">'+casesData.map(x=>'<li><a href="#cases/'+x.id+'"><strong>'+safe(x.title)+'</strong>'+(x.chapter&&scopeTitle(x.chapter)?'<small>'+safe(scopeTitle(x.chapter))+'</small>':'')+'</a></li>').join('')+'</ul>';
    return;
  }
  let step=0;const picks=[];
  const draw=()=>{
    main.innerHTML='<a class="back" href="#cases">חזרה למקרים</a><header class="chapter-header"><h1>'+safe(c.title)+'</h1></header><article class="case"><p class="lede">'+inline(c.stem)+'</p>'+c.steps.slice(0,step+1).map((s,i)=>{
      const done=Number.isInteger(picks[i]);
      return '<section class="quiz"><h2>שלב '+(i+1)+'</h2><p>'+inline(s.q)+'</p><div class="answers">'+s.a.map((a,j)=>'<button type="button" class="answer '+(done&&j===s.k?'correct':done&&j===picks[i]?'incorrect':'')+'" '+(done?'disabled':'')+' data-step="'+i+'" data-answer="'+j+'"><b>'+letters[j]+'</b><span>'+safe(a)+'</span></button>').join('')+'</div>'+(done?'<p class="explanation">'+inline(s.e)+'</p>':'')+'</section>';
    }).join('')+(Number.isInteger(picks[step])?(step+1<c.steps.length?'<button class="primary" id="next-step">לשלב הבא ←</button>':'<p class="remember"><strong>סוף המקרה.</strong> '+inline(c.takeaway||'')+'</p>'):'')+'</article>';
    main.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{picks[Number(b.dataset.step)]=Number(b.dataset.answer);draw();});
    const n=main.querySelector('#next-step');if(n)n.onclick=()=>{step++;draw();};
  };
  draw();
}
function render(){
  const [page,id,tab,extra]=location.hash.slice(1).split('/');
  const navTarget=['exams','practice','search','papers','glossary','cases'].includes(page)?'#'+page:'#home';
  for(const link of document.querySelectorAll('.site-header nav a')){
    if(link.hash===navTarget)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  }
  if(page==='topic'){
    topic(id,tab==='practice');
    if(tab==='read'&&extra){const s=document.getElementById(extra);if(s){s.scrollIntoView({block:'start'});s.focus({preventScroll:true});s.classList.add('flash');}}
  }
  else if(page==='exams')exams(id);
  else if(page==='practice')mixedPage(id);
  else if(page==='search')searchPage(id);
  else if(page==='papers')papersPage(id);
  else if(page==='glossary')glossaryPage();
  else if(page==='cases')casesPage(id);
  else home();
  const title=page==='topic'?scopeTitle(id):page==='exams'&&id?scopeTitle(id):page==='exams'?'שחזורי בחינות':page==='practice'?'תרגול מעורב':page==='search'?'חיפוש':page==='papers'?'מאמרים':page==='glossary'?'מילון מונחים':page==='cases'?'מקרים':'';
  document.title=(title?title+' | ':'')+SITE.shortTitle;
}
// ניווט, כותרת וכותרת תחתונה לפי SITE
(function buildChrome(){
  const nav=document.querySelector('.site-header nav');
  const links=[['chapters','#home','נושאים'],['practice','#practice','תרגול'],['exams','#exams','שחזורים'],['papers','#papers','מאמרים'],['glossary','#glossary','מונחים'],['cases','#cases','מקרים']]
    .filter(([m])=>has(m)&&(m!=='exams'||reconstructionSets.length)&&(m!=='papers'||papersData.length)&&(m!=='glossary'||glossaryData.length)&&(m!=='cases'||casesData.length));
  nav.insertAdjacentHTML('afterbegin',links.map(([,h,t])=>'<a href="'+h+'">'+t+'</a>').join(''));
  if(!has('search'))nav.querySelector('.nav-search')?.remove();
  document.querySelector('.wordmark').innerHTML='<span>'+safe(SITE.shortTitle)+'</span> '+safe(SITE.wordmark||'');
  const f=document.querySelector('.site-footer span');if(f&&SITE.footer)f.textContent=SITE.footer;
})();
// מעבר בין מצב בהיר לכהה. ברירת המחדל: לפי הגדרת המכשיר. בחירה ידנית נשמרת בדפדפן.
const themeButton=document.getElementById('theme-toggle');
const sunIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const moonIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
const isDark=()=>document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
function paintThemeButton(){
  const dark=isDark();
  themeButton.innerHTML=dark?sunIcon:moonIcon;
  themeButton.setAttribute('aria-label',dark?'מעבר למצב בהיר':'מעבר למצב כהה');
  themeButton.title=themeButton.getAttribute('aria-label');
}
themeButton.onclick=()=>{
  const next=isDark()?'light':'dark';
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem(key+'-theme',next);}catch{}
  paintThemeButton();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',paintThemeButton);
paintThemeButton();
document.querySelector('.skip').addEventListener('click',event=>{
  event.preventDefault();main.focus();main.scrollIntoView({block:'start'});
});
window.addEventListener('hashchange',()=>{
  const deep=/^#topic\/[^/]+\/read\//.test(location.hash);
  if(!deep)window.scrollTo(0,0);
  render();
  if(!deep&&!location.hash.startsWith('#search'))main.focus({preventScroll:true});
});
render();
