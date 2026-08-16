(() => {
'use strict';

const SAVE_KEY='tonight_someone_was_here_v2';
const OLD_SAVE_KEY='tonight_someone_was_here_v1';
const META_KEY='tonight_someone_was_here_meta';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const VALID_SCENES=['entry','living','bedroom','bathroom','hallway'];
const SCENE_LABELS={entry:'玄关 / 厨房',living:'客厅',bedroom:'卧室',bathroom:'卫生间',hallway:'七楼走廊'};

function readJSON(key,fallback={}){
  try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(e){return fallback}
}
function state(){return readJSON(SAVE_KEY,{flags:{},clues:[],optional:[],visited:[]})}
function meta(){return readJSON(META_KEY,{endingsSeen:[],completed:false})}
function hasSave(){return !!localStorage.getItem(SAVE_KEY)||!!localStorage.getItem(OLD_SAVE_KEY)}
function hasActiveSave(){const s=state();return hasSave()&&!s.ending&&Number(s.stage)<11}
function showToast(text){
  const el=$('#toast');if(!el)return;
  el.textContent=text;el.classList.remove('hidden');
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.add('hidden'),2100);
}
function byText(root,selector,needle){return [...root.querySelectorAll(selector)].find(el=>(el.textContent||'').includes(needle))}

function repairStoredState(){
  let s;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){return}
  if(!s||typeof s!=='object'||Array.isArray(s))return;
  let changed=false;
  const ensureArray=(obj,key)=>{if(!Array.isArray(obj[key])){obj[key]=[];changed=true}};
  ['clues','optional','visited'].forEach(k=>ensureArray(s,k));
  if(!s.flags||typeof s.flags!=='object'||Array.isArray(s.flags)){s.flags={};changed=true}
  ['memorySelected','landlordQuestions','timelineSeq','neighborTopics','routeFacts','gapInspected','identityFacts'].forEach(k=>ensureArray(s.flags,k));
  if(!s.hints||typeof s.hints!=='object'||Array.isArray(s.hints)){s.hints={};changed=true}
  if(!VALID_SCENES.includes(s.scene)){s.scene='entry';changed=true}
  const st=Number(s.stage);if(!Number.isFinite(st)||st<0||st>11){s.stage=0;changed=true}
  if(!Array.isArray(s.visited)||!s.visited.includes(s.scene)){if(!Array.isArray(s.visited))s.visited=[];s.visited.push(s.scene);changed=true}
  if(changed){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch(e){}}
}

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
  const arrow=root.querySelector('.route-arrow');
  const s=state(),known=(s.clues||[]).includes('shaftNotice');
  if(arrow){
    if(known){arrow.textContent='704旧检修竖井 ⇄ 705柜体后方';arrow.classList.remove('logic-unverified-route')}
    else{arrow.textContent='704 与 705 相邻 · 建筑内部结构尚未核实';arrow.classList.add('logic-unverified-route')}
  }
  const you=root.querySelector('.floor-line .you');
  if(you)you.innerHTML='705<br><span class="muted">你的住处</span>';
  const current=SCENE_LABELS[s.scene]||'';
  [...root.querySelectorAll('.map-room')].forEach(room=>room.classList.toggle('logic-map-current',(room.textContent||'').trim().startsWith(current)));
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
  if(timeBtn&&!q.includes('people')){timeBtn.disabled=true;timeBtn.title='先问清她看到的是谁'}
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
  if(old&&!clues.includes('oldChat')){old.textContent='旧聊天：尚未核对';old.disabled=true;old.classList.add('logic-locked-evidence')}
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

function setFirstParagraph(root,html){const p=root.querySelector(':scope > p');if(p&&p.innerHTML!==html)p.innerHTML=html}
function polishSceneConsistency(root,title){
  const s=state();
  if(title==='窗帘')setFirstParagraph(root,'两侧帘布都收在窗边，整扇窗露着。你只是停下来多看了一眼；在没有早晨参照前，这本身还不能算异常。');
  if(title==='卧室窗帘')setFirstParagraph(root,'两侧帘布今晚都被收到窗边，右侧已经推到轨道尽头。你记得早上为了让植物晒太阳，只留了大约半扇窗宽的空隙。<br><br>现在开的幅度明显更大。');
  if(title==='窗边')setFirstParagraph(root,'窗帘收在两侧，窗户锁着。城市灯光直接落进客厅。');
  if(title==='客厅窗边')setFirstParagraph(root,'你走到窗边重新检查。窗帘收在两侧，窗锁没有被动过；外墙下方也没有能让人落脚的平台。<br><br>这条路线可以先排除。');
  if(title==='地垫')setFirstParagraph(root,'地垫中央有一块颜色比边缘更深。你蹲下用指背碰了碰：那一块还带着潮气，像是不久前有人踩着湿脚停过。<br><br>你早上七点洗的澡，不该到接近十一点还留下这么集中的湿痕。');
  if(title==='手巾')setFirstParagraph(root,'远看它只是挂在架上。你拿起来才发现两道很整齐的折痕——你习惯对折，它却像被三折后重新挂回去。<br><br>这个细节在房间远景里不明显，拿在手里却很清楚。');
  if(title==='床头插座')setFirstParagraph(root,'你弯下腰看床头柜后方，才发现充电线插在右侧墙插。你从来不用这个口，因为床头柜会压住插头。<br><br>线没有坏，只是位置不对。');
  if(title==='沙发')setFirstParagraph(root,'你把靠垫拿起来翻过一面，拉链正朝外。你每次坐下都会把拉链面压到里侧。<br><br>这是弱异常，只值得记下，不值得单独下结论。');
  if(title==='茶几和沙发')setFirstParagraph(root,'遥控器、纸巾和杯垫都在。你顺手把旁边的靠垫拿起来，才看到它被翻到了平时不用的那一面。<br><br>它本身不能证明什么，只作为额外细节记下。');
  if(title==='玄关的拖鞋')setFirstParagraph(root,'你蹲下来才看清：一只拖鞋斜着朝里，另一只抵在鞋柜边。你记得早上扫地时把两只并排推到了柜子下面。<br><br>先把差异记下来，不急着相信记忆。');
  if(title==='冰箱')setFirstParagraph(root,'你拉开冰箱门。最上层多了一瓶你从不买的常温矿泉水，瓶盖已经拧开过。<br><br>你平时只买苏打水。');
  if(title==='垃圾桶')setFirstParagraph(root,'你拨开上面的纸巾和快递袋，下面压着两个同款一次性咖啡杯。你今天没有买咖啡回家。<br><br>再往下是一张揉皱的便利店小票：<b>21:36</b>。而你22点以后还在公司。');
  if(title==='镜子'&&Number(s.stage)>=3)setFirstParagraph(root,'镜面边缘留着一圈已经快散掉的水汽痕。你凑近查看时，还闻到很淡的薄荷漱口水味。<br><br>你不用漱口水。');
  if(title==='704房门')setFirstParagraph(root,'走近以后你才看清：门边“空置维修，请勿进入”的封条右下角被揭开过，又重新压了回去。<br><br>门框内侧还有几道新划痕，像有人反复用硬物顶过锁舌。');
  if(title==='维修通知')setFirstParagraph(root,'电表旁压着一张卷边的七楼管线改造通知。上面写着：<b>704 与 705 共用一条旧检修竖井</b>。<br><br>竖井在两户卧室柜体后方封板处各有一个检修口。');
}

function miniMapMarkup(){
  return `<div class="live-map-head"><span class="label">705 · 房间示意</span><span id="liveMapStatus">玄关 / 厨房</span></div>
  <div class="mini-plan" role="img" aria-label="705房间位置示意图，圆点表示当前位置">
    <div class="mini-room mini-bedroom" data-map-room="bedroom"><span>卧室</span></div>
    <div class="mini-room mini-living" data-map-room="living"><span>客厅</span></div>
    <div class="mini-room mini-bathroom" data-map-room="bathroom"><span>卫生间</span></div>
    <div class="mini-room mini-entry" data-map-room="entry"><span>玄关 / 厨房</span></div>
  </div>
  <div class="mini-hall" data-map-room="hallway"><span id="liveMapHallLabel">门外走廊</span></div>
  <small id="liveMapNote" class="mini-map-note">圆点表示你现在的位置</small>`;
}
function installMiniMap(){
  const sidebar=$('#desktopSidebar');if(!sidebar||$('#liveMapCard'))return;
  const card=document.createElement('div');card.id='liveMapCard';card.className='sidebar-card live-map-card';card.innerHTML=miniMapMarkup();sidebar.appendChild(card);updateMiniMap();
}
function updateMiniMap(){
  const card=$('#liveMapCard');if(!card)return;
  const s=state(),scene=VALID_SCENES.includes(s.scene)?s.scene:($('#game')?.dataset.scene||'entry');
  card.dataset.current=scene;card.dataset.stage=String(Number(s.stage)||0);
  card.querySelectorAll('[data-map-room]').forEach(el=>el.classList.toggle('current',el.dataset.mapRoom===scene));
  const status=$('#liveMapStatus');if(status)status.textContent=SCENE_LABELS[scene]||'705';
  const knownHall=Number(s.stage)>=6||(s.visited||[]).includes('hallway');
  card.classList.toggle('hall-known',knownHall);
  const hall=$('#liveMapHallLabel');if(hall)hall.textContent=knownHall?'703 · 704 · 705':'门外走廊';
  const note=$('#liveMapNote'),clues=s.clues||[];
  if(note){
    if(clues.includes('shaftNotice'))note.textContent='已确认：704 与 705 共用旧检修竖井';
    else if(scene==='hallway')note.textContent='你现在在七楼公共走廊';
    else note.textContent='圆点表示你现在的位置 · 平面仅作方向示意';
  }
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
  polishSceneConsistency(root,title);
}
function wrapNeighborFlow(){
  const ask=window.__neighborAsk,finish=window.__finishNeighbor;
  if(typeof ask==='function'&&!ask.__logicWrapped){
    const wrapped=function(id){const q=((state().flags||{}).neighborTopics)||[];if(id==='time'&&!q.includes('people')){showToast('先问清她看到的是谁，再追问出现时间');return}return ask(id)};wrapped.__logicWrapped=true;window.__neighborAsk=wrapped;
  }
  if(typeof finish==='function'&&!finish.__logicWrapped){
    const wrapped=function(){const q=((state().flags||{}).neighborTopics)||[];if(!q.includes('people')||!(q.includes('noise')||q.includes('time'))){showToast('先确认她见到的是谁，再补问一条细节');return}return finish()};wrapped.__logicWrapped=true;window.__finishNeighbor=wrapped;
  }
}
function wrapSaveActions(){
  const start=$('#startBtn');
  if(start&&typeof start.onclick==='function'&&!start.dataset.logicWrapped){const orig=start.onclick;start.dataset.logicWrapped='1';start.onclick=function(e){if(hasActiveSave()&&!confirm('已有未结束的调查存档。确定从22:48重新开始并覆盖它吗？'))return;return orig.call(this,e)}}
  const review=$('#reviewBtn');
  if(review&&typeof review.onclick==='function'&&!review.dataset.logicWrapped){const orig=review.onclick;review.dataset.logicWrapped='1';review.onclick=function(e){if(hasActiveSave()&&!confirm('快速复盘会覆盖当前调查存档。确定继续吗？'))return;return orig.call(this,e)}}
  const cont=$('#continueBtn');
  if(cont&&typeof cont.onclick==='function'&&!cont.dataset.logicWrapped){const orig=cont.onclick;cont.dataset.logicWrapped='1';cont.onclick=function(e){const s=state();if(s.ending||Number(s.stage)>=11){if(typeof window.__showArchive==='function')window.__showArchive();else showToast('这份调查已经结束，请查看结局档案');return}return orig.call(this,e)}}
  const restart=window.__restart;
  if(typeof restart==='function'&&!restart.__logicWrapped){const wrapped=function(){const s=state();if(!s.ending&&hasSave()&&!confirm('确定清除当前调查进度并回到标题吗？'))return;return restart()};wrapped.__logicWrapped=true;window.__restart=wrapped}
}
function syncTitleButtons(){
  const cont=$('#continueBtn'),archive=$('#endingArchiveBtn'),s=state();
  if(cont&&(s.ending||Number(s.stage)>=11)){cont.classList.add('hidden');if(archive&&(meta().endingsSeen||[]).length)archive.classList.remove('hidden')}
}
function installObservers(){
  const root=$('#modalContent');
  if(root){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;polishModal()})}).observe(root,{childList:true,subtree:true,characterData:true})}
  new MutationObserver(()=>polishPaywall()).observe(document.body,{childList:true,subtree:true});
  const game=$('#game');if(game)new MutationObserver(()=>updateMiniMap()).observe(game,{attributes:true,attributeFilter:['data-scene']});
  ['#sceneName','#stageLabel','#clueCount','#progressText'].forEach(sel=>{const el=$(sel);if(el)new MutationObserver(()=>{updateMiniMap();syncTitleButtons()}).observe(el,{childList:true,subtree:true,characterData:true})});
}
function selfCheck(){
  const s=state(),checks={
    saveKey:typeof SAVE_KEY==='string',neighborWrapped:!!window.__finishNeighbor?.__logicWrapped,restartWrapped:!!window.__restart?.__logicWrapped,
    modalPresent:!!$('#modalContent'),gameQaPresent:!!window.__GAME_QA__,paywallIndependent:typeof window.Paywall==='object',
    miniMapPresent:!!$('#liveMapCard'),validScene:VALID_SCENES.includes(s.scene||'entry'),visualConsistency:typeof polishSceneConsistency==='function'
  };
  window.__LOGIC_FIX_QA__={checks,pass:Object.values(checks).every(Boolean),state:()=>state(),refreshMap:updateMiniMap};
}
function init(){
  repairStoredState();wrapNeighborFlow();wrapSaveActions();installMiniMap();installObservers();polishModal();polishPaywall();updateMiniMap();syncTitleButtons();selfCheck();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
