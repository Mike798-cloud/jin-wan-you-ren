(() => {
'use strict';

const SAVE_KEY='tonight_someone_was_here_v2';
const OLD_SAVE_KEY='tonight_someone_was_here_v1';
const META_KEY='tonight_someone_was_here_meta';
const $=s=>document.querySelector(s);

function readJSON(key,fallback={}){
  try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(e){return fallback}
}
function state(){return readJSON(SAVE_KEY,{flags:{},clues:[],optional:[]})}
function meta(){return readJSON(META_KEY,{endingsSeen:[],completed:false})}
function hasSave(){return !!localStorage.getItem(SAVE_KEY)||!!localStorage.getItem(OLD_SAVE_KEY)}
function showToast(text){
  const el=$('#toast');if(!el)return;
  el.textContent=text;el.classList.remove('hidden');
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.add('hidden'),2100);
}
function byText(root,selector,needle){return [...root.querySelectorAll(selector)].find(el=>(el.textContent||'').includes(needle))}

function polishIntro(root){
  const ps=[...root.querySelectorAll(':scope > p')];
  const door=ps.find(p=>p.textContent.includes('七楼电梯口摸到钥匙'));
  const doorText='你在七楼电梯口摸到钥匙，走到705门前。门锁和门框都没有撬痕。钥匙转开后，门能完全推开；防盗链垂在门侧。';
  if(door&&door.textContent!==doorText)door.textContent=doorText;
  const tutorial=ps.find(p=>p.classList.contains('muted'));
  const tutorialText='可调查位置不会高亮。先从真正让你觉得反常的地方开始。';
  if(tutorial&&tutorial.textContent!==tutorialText)tutorial.textContent=tutorialText;
}
function polishChain(root){
  const p=root.querySelector('p');if(!p)return;
  const html='你再次检查入户门。<br><br><b>防盗链现在扣上了。</b><br><br>回家时门能完全推开，链条还垂在门侧；从进门到现在，你没有碰过它。也就是说，有人在你进屋之后从屋内动过这条链。如果那个人已经离开，就不可能只经过正门。';
  if(p.innerHTML!==html)p.innerHTML=html;
}
function polishMap(root){
  const arrow=root.querySelector('.route-arrow');if(!arrow)return;
  const s=state(),known=(s.clues||[]).includes('shaftNotice');
  if(known){
    arrow.textContent='704旧检修竖井 ⇄ 705柜体后方';
    arrow.classList.remove('logic-unverified-route');
  }else{
    arrow.textContent='704 与 705 相邻 · 建筑内部结构尚未核实';
    arrow.classList.add('logic-unverified-route');
  }
}
function polishMemory(root){
  const p=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('照片没有拍到'));
  if(p)p.remove();
}
function polishTimeline(root){
  const p=root.querySelector(':scope > p');
  const text='按你已经看过的原件，把五条记录从早到晚排进时间轴。';if(p&&p.textContent!==text)p.textContent=text;
}
function polishContact(root){
  const intro=root.querySelector(':scope > p');
  const introText='你把问题拆成三件能分别核实的事：今天有没有进过705、备用钥匙在哪里、704正在做什么维修。';if(intro&&intro.textContent!==introText)intro.textContent=introText;
  const msg=byText(root,'.message.them','共用检修井');
  if(msg)msg.textContent='周先生：704一直空着。物业这阵子在改旧管线，七楼旧房型以前也有封板松动的问题；具体结构你得看现场的维修通知。';
}
function polishNotes(root){
  [...root.querySelectorAll('.optional-group .clue small')].forEach(x=>x.remove());
  const t=root.querySelector('.optional-group .clue-group-title');
  if(t&&!t.dataset.logic){t.dataset.logic='1';const node=[...t.childNodes].find(n=>n.nodeType===3);if(node)node.textContent='额外观察 · 不单独定性';}
  const chain=byText(root,'.clue','防盗链在你进门后仍从屋内扣着');
  if(chain)chain.textContent='回家时垂下的防盗链，后来被人从屋内扣上';
}
function polishNeighbor(root){
  const s=state(),q=(s.flags&&s.flags.neighborTopics)||[];
  const timeBtn=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__neighborAsk('time')"));
  if(timeBtn&&!q.includes('people')){
    timeBtn.disabled=true;timeBtn.title='先问清她看到的是谁';
  }
  const intro=root.querySelector(':scope > p');
  const introText='陈阿姨没有主动下结论。你需要把“看见谁、听见什么、什么时候见过”分开问。';if(intro&&intro.textContent!==introText)intro.textContent=introText;
}
function polishIdentity(root){
  const s=state(),clues=s.clues||[];
  [...root.querySelectorAll('.person-card')].forEach(card=>{
    const name=card.querySelector('b')?.textContent.trim(),desc=card.querySelector('span');if(!desc)return;
    if(name==='徐洲'&&desc.textContent!=='同事 · 你认识的人')desc.textContent='同事 · 你认识的人';
    if(name==='房东周先生'&&desc.textContent!=='房东 · 持有备用钥匙')desc.textContent='房东 · 持有备用钥匙';
    if(name==='物业旧工程员'&&desc.textContent!=='可能熟悉旧楼结构 · 身份未明')desc.textContent='可能熟悉旧楼结构 · 身份未明';
  });
  const old=byText(root,'.evidence-btn','旧聊天：');
  if(old&&!clues.includes('oldChat')){
    old.textContent='旧聊天：尚未核对';old.disabled=true;old.classList.add('logic-locked-evidence');
  }
  const warn=root.querySelector('.result-warn');
  const warnHtml='<p>还缺一条能确认“帮你搬家的人是谁”的关系信息。先回到你已经拥有的记录里找来源。</p>';if(warn&&!clues.includes('oldChat')&&warn.innerHTML!==warnHtml)warn.innerHTML=warnHtml;
}
function polishArchive(root){
  const m=meta(),seen=m.endingsSeen||[],secretSeen=seen.includes('secret');
  const h=root.querySelector('h2');if(h){const normal=seen.filter(x=>x!=='secret').length;const text=`结局档案 · 普通结局 ${normal}/3${secretSeen?' · 另有隐藏记录':''}`;if(h.textContent!==text)h.textContent=text;}
  const cards=[...root.querySelectorAll('.archive-card')];
  if(!secretSeen&&cards.length>3)cards.slice(3).forEach(c=>c.remove());
}
function polishEnding(root){
  const m=meta(),seen=m.endingsSeen||[],secretSeen=seen.includes('secret');
  const progress=[...root.querySelectorAll('p')].find(p=>p.textContent.includes('已解锁结局：'));
  if(progress){const normal=seen.filter(x=>x!=='secret').length;progress.textContent=`结局档案已更新：普通结局 ${normal}/3${secretSeen?'，另有一条隐藏记录已归档':''}。通关后仍可从中段快速复盘。`;}
  const secretText=[...root.querySelectorAll('p')].find(p=>p.innerHTML.includes('三个月前，是徐洲主动把这套'));
  if(secretText)secretText.innerHTML=secretText.innerHTML.replace('三个月前，是徐洲主动把这套“刚空出来、很便宜”的房源发给你的。','三个月前，徐洲已经知道这套房、熟悉七楼，还主动来帮你搬家。');
}
function polishPaywall(){
  const overlay=$('#paywall-overlay');if(!overlay)return;
  const body=overlay.querySelector('.paywall-msg-body');
  const bodyHtml='这段调查从生活里的小异常，一点点走到更具体的证据。<br>如果你觉得这个夜晚值得，愿意留下 <strong>1元</strong> 自愿支持，会直接变成我继续做下一部网页悬疑的动力。';if(body&&body.innerHTML!==bodyHtml)body.innerHTML=bodyHtml;
  const last=overlay.querySelector('.paywall-msg-warm2');
  const lastText='不支持也完全没关系。所有剧情、三级提示、结局和二周目内容都不会因此受影响。';if(last&&last.textContent!==lastText)last.textContent=lastText;
}
function polishModal(){
  const root=$('#modalContent');if(!root||!root.children.length)return;
  const title=root.querySelector('h2')?.textContent.trim()||'';
  if(title==='22:48')polishIntro(root);
  if(title==='防盗链')polishChain(root);
  if(title==='位置')polishMap(root);
  if(title==='07:12 · 记忆核对')polishMemory(root);
  if(title==='时间线 · 第一步')polishTimeline(root);
  if(title==='房东周先生 · 电话')polishContact(root);
  if(title==='随手记下的事')polishNotes(root);
  if(title==='703 · 陈阿姨')polishNeighbor(root);
  if(title==='身份交叉')polishIdentity(root);
  if(title.startsWith('结局档案'))polishArchive(root);
  if(root.querySelector('.ending'))polishEnding(root);
}

function wrapNeighborFlow(){
  const ask=window.__neighborAsk,finish=window.__finishNeighbor;
  if(typeof ask==='function'&&!ask.__logicWrapped){
    const wrapped=function(id){
      const q=((state().flags||{}).neighborTopics)||[];
      if(id==='time'&&!q.includes('people')){showToast('先问清她看到的是谁，再追问出现时间');return;}
      return ask(id);
    };wrapped.__logicWrapped=true;window.__neighborAsk=wrapped;
  }
  if(typeof finish==='function'&&!finish.__logicWrapped){
    const wrapped=function(){
      const q=((state().flags||{}).neighborTopics)||[];
      if(!q.includes('people')||!(q.includes('noise')||q.includes('time'))){showToast('先确认她见到的是谁，再补问一条细节');return;}
      return finish();
    };wrapped.__logicWrapped=true;window.__finishNeighbor=wrapped;
  }
}
function wrapSaveActions(){
  const start=$('#startBtn');
  if(start&&typeof start.onclick==='function'&&!start.dataset.logicWrapped){
    const orig=start.onclick;start.dataset.logicWrapped='1';start.onclick=function(e){if(hasSave()&&!confirm('已有未结束的调查存档。确定从22:48重新开始并覆盖它吗？'))return;return orig.call(this,e)};
  }
  const review=$('#reviewBtn');
  if(review&&typeof review.onclick==='function'&&!review.dataset.logicWrapped){
    const orig=review.onclick;review.dataset.logicWrapped='1';review.onclick=function(e){if(hasSave()&&!confirm('快速复盘会覆盖当前调查存档。确定继续吗？'))return;return orig.call(this,e)};
  }
  const restart=window.__restart;
  if(typeof restart==='function'&&!restart.__logicWrapped){
    const wrapped=function(){const s=state();if(!s.ending&&hasSave()&&!confirm('确定清除当前调查进度并回到标题吗？'))return;return restart()};wrapped.__logicWrapped=true;window.__restart=wrapped;
  }
}
function installObservers(){
  const root=$('#modalContent');
  if(root){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;polishModal()})}).observe(root,{childList:true,subtree:true,characterData:true});}
  new MutationObserver(()=>polishPaywall()).observe(document.body,{childList:true,subtree:true});
}
function selfCheck(){
  const checks={
    saveKey:typeof SAVE_KEY==='string',neighborWrapped:!!window.__finishNeighbor?.__logicWrapped,
    restartWrapped:!!window.__restart?.__logicWrapped,modalPresent:!!$('#modalContent'),
    gameQaPresent:!!window.__GAME_QA__,paywallIndependent:typeof window.Paywall==='object'
  };
  window.__LOGIC_FIX_QA__={checks,pass:Object.values(checks).every(Boolean),state:()=>state()};
}
function init(){
  wrapNeighborFlow();wrapSaveActions();installObservers();polishModal();polishPaywall();selfCheck();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
