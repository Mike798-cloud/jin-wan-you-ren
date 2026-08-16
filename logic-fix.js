(() => {
'use strict';

const SAVE_KEY='tonight_someone_was_here_v2';
const OLD_SAVE_KEY='tonight_someone_was_here_v1';
const META_KEY='tonight_someone_was_here_meta';
const STAGE={HOME:0,MEMORY:1,CONTACT:2,CHECK:3,TIMELINE:4,CHAIN:5,HALL:6,ROUTE:7,GAP:8,IDENTITY:9,FINAL:10,END:11};
const SCENES=['entry','living','bedroom','bathroom','hallway'];
const $=s=>document.querySelector(s);

function readJSON(key,fallback={}){
  try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch(e){return fallback}
}
function state(){return readJSON(SAVE_KEY,{stage:0,scene:'entry',ending:null,flags:{},clues:[],optional:[],visited:['entry'],hints:{}})}
function meta(){return readJSON(META_KEY,{endingsSeen:[],completed:false})}
function showToast(text){
  const el=$('#toast');if(!el)return;
  el.textContent=text;el.classList.remove('hidden');
  clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.add('hidden'),2100);
}
function byText(root,selector,needle){return [...root.querySelectorAll(selector)].find(el=>(el.textContent||'').includes(needle))}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function setHTML(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html}
function isArr(v){return Array.isArray(v)}

function normalizeStoredSave(){
  let raw;try{raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')}catch(e){raw=null}
  if(!raw||typeof raw!=='object')return;
  let changed=false;
  const fixArray=(obj,key,fallback=[])=>{if(!isArr(obj[key])){obj[key]=[...fallback];changed=true}};
  fixArray(raw,'clues');fixArray(raw,'optional');fixArray(raw,'visited',['entry']);
  if(!raw.flags||typeof raw.flags!=='object'){raw.flags={};changed=true}
  ['memorySelected','landlordQuestions','timelineSeq','neighborTopics','routeFacts','gapInspected','identityFacts'].forEach(k=>fixArray(raw.flags,k));
  if(!raw.hints||typeof raw.hints!=='object'||Array.isArray(raw.hints)){raw.hints={};changed=true}
  if(!SCENES.includes(raw.scene)){raw.scene='entry';changed=true}
  if(!Number.isFinite(Number(raw.stage))){raw.stage=0;changed=true}else{
    const n=Math.max(0,Math.min(STAGE.END,Number(raw.stage)));if(n!==raw.stage){raw.stage=n;changed=true}
  }
  if(!raw.visited.includes('entry')){raw.visited.unshift('entry');changed=true}
  raw.visited=raw.visited.filter((v,i,a)=>SCENES.includes(v)&&a.indexOf(v)===i);
  raw.clues=raw.clues.filter((v,i,a)=>typeof v==='string'&&a.indexOf(v)===i);
  raw.optional=raw.optional.filter((v,i,a)=>typeof v==='string'&&a.indexOf(v)===i);
  if(changed){try{localStorage.setItem(SAVE_KEY,JSON.stringify(raw))}catch(e){}}
}
function hasUnfinishedSave(){
  try{
    const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(raw&&typeof raw==='object')return !raw.ending&&Number(raw.stage)!==STAGE.END;
    const old=JSON.parse(localStorage.getItem(OLD_SAVE_KEY)||'null');
    if(old&&typeof old==='object')return !old.ending&&Number(old.stage)<7;
  }catch(e){}
  return false;
}

const HUD={
  objective:{
    0:'按自己的顺序看看房间。',
    1:'翻翻今天早晨留下的记录。',
    2:'给房东打个电话。',
    3:'重新走一遍几个房间。',
    4:'把已经出现的时间记录排在一起。',
    5:'再看一次入户门。',
    6:'到七楼走廊看看。',
    7:'整理刚刚记下的入口信息。',
    8:'回卧室看看衣柜这一面墙。',
    9:'把夹层、邻居和联系人记录放在一起。',
    10:'处理23:52收到的新消息。',
    11:'今晚结束。'
  },
  stage:{
    0:'第一段 · 回家',1:'第二段 · 早晨',2:'第三段 · 电话',3:'第四段 · 再看一遍',4:'第五段 · 时间',5:'第六段 · 门',
    6:'第七段 · 走廊',7:'第八段 · 记录',8:'第九段 · 墙后',9:'第十段 · 交叉',10:'第十一段 · 23:52',11:'结束'
  },
  progress:{
    0:'22:48',1:'22:57',2:'23:01',3:'23:08',4:'23:20',5:'23:24',6:'23:31',7:'23:37',8:'23:42',9:'23:47',10:'23:52',11:'已归档'
  }
};

function polishHUD(){
  const s=state(),st=Math.max(0,Math.min(11,Number(s.stage)||0));
  setText($('#objective'),HUD.objective[st]);
  setText($('#objectiveSide'),HUD.objective[st]);
  setText($('#stageLabel'),HUD.stage[st]);
  setText($('#progressText'),HUD.progress[st]);
  setText($('#dangerText'),'记录会自动保存在这台设备上。');
  const caption=$('.scene-caption > span');
  setText(caption,'画面不会标出可调查点。');
  polishTitleButtons();
  ensureSidebarMap();
  updateSidebarMap();
}

function polishTitleButtons(){
  const c=$('#continueBtn');if(c)c.classList.toggle('hidden',!hasUnfinishedSave());
}

function sidebarMapHTML(){
  return `<span class="label">705室 · 位置</span>
  <div class="logic-plan" aria-label="705室二维位置示意">
    <div class="logic-room bedroom" data-room="bedroom"><span>卧室</span><i></i></div>
    <div class="logic-room living" data-room="living"><span>客厅</span><i></i></div>
    <div class="logic-room bathroom" data-room="bathroom"><span>卫生间</span><i></i></div>
    <div class="logic-room entry" data-room="entry"><span>玄关 / 厨房</span><i></i></div>
  </div>
  <div class="logic-hall-row" aria-label="七楼走廊示意"><span data-flat="703">703</span><span data-flat="704">704</span><span data-flat="705">705</span></div>
  <p class="logic-map-note"></p>`;
}
function ensureSidebarMap(){
  const aside=$('#desktopSidebar');if(!aside)return;
  let card=$('#logicSidebarMap');
  if(!card){card=document.createElement('div');card.id='logicSidebarMap';card.className='sidebar-card logic-map-card';card.innerHTML=sidebarMapHTML();aside.appendChild(card)}
}
function updateSidebarMap(){
  const card=$('#logicSidebarMap');if(!card)return;
  const s=state(),scene=$('#game')?.dataset.scene||s.scene||'entry',stage=Number(s.stage)||0,clues=isArr(s.clues)?s.clues:[];
  card.querySelectorAll('.logic-room').forEach(el=>el.classList.toggle('current',el.dataset.room===scene));
  const hall=card.querySelector('.logic-hall-row');
  if(hall){hall.classList.toggle('shown',stage>=STAGE.HALL);hall.querySelectorAll('span').forEach(x=>x.classList.remove('current'));if(scene==='hallway')hall.querySelector('[data-flat="705"]')?.classList.add('current')}
  const note=card.querySelector('.logic-map-note');
  if(stage<STAGE.HALL)setText(note,'');
  else if(clues.includes('shaftNotice'))setText(note,'维修通知：704 与 705 之间有旧检修竖井。');
  else setText(note,'七楼走廊');
}

function polishIntro(root){
  const ps=[...root.querySelectorAll(':scope > p')];
  const door=ps.find(p=>p.textContent.includes('七楼电梯口摸到钥匙'));
  setText(door,'你在七楼电梯口摸到钥匙，走到705门前。锁舌和门框没有明显损伤。钥匙转开后，门能完全推开；防盗链垂在门侧。');
  const tutorial=ps.find(p=>p.classList.contains('muted'));
  setText(tutorial,'画面不会标出可调查点。按自己的顺序看看房间。');
}
function polishInspection(root,title){
  const s=state(),st=Number(s.stage)||0,p=root.querySelector(':scope > p');if(!p)return;
  const text={
    '玄关的拖鞋':'左脚朝里，右脚压在鞋柜边。你记得早上扫地时，把两只拖鞋并排推到了柜子下面。',
    '入户门':'锁舌、门框和猫眼都没有明显撬动痕迹。你刚才用自己的机械钥匙开的门。',
    '餐桌边':'碗、杯垫和纸巾都在桌边。',
    '客厅角落':'你蹲下来拨了拨小垃圾桶。上面是纸巾团和快递塑料袋。',
    '茶几和沙发':'你把靠垫拿起来翻到背面。拉链面朝外；你平时会把这一面压在里侧。',
    '客厅窗边':'你扣了两下窗锁。锁扣仍咬合，窗框没有新鲜擦痕；窗外墙面也没有平台或外接踏脚。',
    '沙发':'你拿起靠垫看了一眼背面。拉链朝外；你平时会把拉链面压到里侧。',
    '床头插座':'你弯腰看床头柜后面。充电线插在右侧墙插，插头被柜角挤着。你一直用左侧插口，因为右侧会被柜体压住。',
    '衣柜':'你拉开柜门。衣服和纸箱都在，柜体背板被衣物挡住大半。',
    '地垫':'你蹲下按了按地垫。中间有两处彼此分开的潮湿区域，摸上去还有凉意。',
    '洗手台':'牙杯、洗面奶和剃须刀摆在台面上。',
    '手巾':'手巾挂在架上。',
    '镜子':'镜面边缘有一点已经散开的水汽。'
  };
  if(title==='窗帘'||title==='卧室窗帘'){
    if(st>=STAGE.CHECK)setText(p,'你走到窗边，沿轨道把帘布捋了一遍。右侧已经推到轨道尽头。你早上给植物留光时，只会收到大约半扇窗宽的位置。');
    else setText(p,'两侧帘布都收在窗边，窗户大半露着。右侧帘布堆在轨道末端。');
    return;
  }
  if(title==='垃圾桶'){
    setHTML(p,'你蹲下来，把上层纸巾拨开。下面压着两个同款一次性咖啡杯；你今天没有买咖啡回家。<br><br>再往下是一张揉皱的便利店小票：<b>21:36</b>。');return;
  }
  if(title==='牙杯'){
    setHTML(p,'你把牙杯拿到灯下。里面有两支牙刷。<br><br>蓝色旧牙刷是你今天早上扔进楼下垃圾桶的那支。');return;
  }
  if(title==='手巾'&&st>=STAGE.CHECK){
    setText(p,'你把手巾取下来。布面留下三道等距折线，重新挂回去时能看出它被折成三折；你平时只对折一次。');return;
  }
  if(title==='镜子'&&st>=STAGE.CHECK){
    setHTML(p,'你靠近镜面。边缘有散开的水汽印，旁边残留淡淡的薄荷漱口水味。<br><br>你不用漱口水。');return;
  }
  if(title==='床头相框'){
    setHTML(p,'你把搬家合照从书下面抽出来。徐洲站在你身后，腰侧挂着一个绿色塑料工程牌。夹层里那枚也是绿色硬塑料方牌。');return;
  }
  if(text[title])setText(p,text[title]);
}
function polishChain(root){
  const p=root.querySelector(':scope > p');if(!p)return;
  setHTML(p,'你把门拉开一道缝，链条立刻绷紧。<br><br><b>防盗链现在扣着。</b><br><br>回家时门能完全推开，链条当时垂在门侧。从进门到现在，你没有碰过它。');
}
function polishHallInspection(root,title){
  const p=root.querySelector(':scope > p');if(!p)return;
  if(title==='704房门')setHTML(p,'你蹲下看封条边缘。右下角胶面起皱，有揭开后重新按压的痕迹。<br><br>门框内侧靠锁舌的位置还有几道颜色较亮的划痕。');
  if(title==='维修通知')setHTML(p,'七楼管线改造图贴在电表旁。图上标着：<b>704 与 705 共用一条旧检修竖井</b>。<br><br>两个检修口分别位于两户卧室柜体后方的封板处。');
}
function polishMap(root){
  const s=state(),clues=isArr(s.clues)?s.clues:[],stage=Number(s.stage)||0;
  const cells=[...root.querySelectorAll('.floor-line > div')];
  if(cells[0])cells[0].innerHTML=`703<br><span class="muted">${clues.includes('neighbor')?'陈阿姨':'邻户'}</span>`;
  if(cells[1])cells[1].innerHTML=`704<br><span class="muted">${clues.includes('maintenanceCall')||stage>=STAGE.HALL?'空置维修':'邻户'}</span>`;
  if(cells[2])cells[2].innerHTML='705<br><span class="muted">你在这里</span>';
  const arrow=root.querySelector('.route-arrow');
  if(arrow){
    if(clues.includes('shaftNotice')){arrow.hidden=false;setText(arrow,'维修通知：704 与 705 共用旧检修竖井');arrow.classList.remove('logic-unverified-route')}
    else{arrow.hidden=true;arrow.textContent=''}
  }
  [...root.querySelectorAll('.map-room')].forEach(room=>{if(room.textContent.includes('七楼走廊')&&stage<STAGE.HALL)room.style.display='none'});
}
function polishMemory(root){
  const p=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('照片没有拍到'));
  if(p)p.remove();
  const card=root.closest('.modal-card');if(card)card.classList.add('logic-memory-card');
  const intro=root.querySelector(':scope > p:not(.muted)');
  setHTML(intro,'看两张画面，选出<b>两条</b>能直接从07:12照片里确认的事实。');
}
function polishTimeline(root,title){
  const p=root.querySelector(':scope > p');if(!p)return;
  if(title==='时间线 · 第一步')setText(p,'把五条已经出现过的记录按时间先后点进时间轴。需要时可以关掉窗口回看手机和记事。');
  if(title==='时间线 · 第二步')setHTML(p,'哪两条记录放在一起，最能证明<b>21:36这张小票不可能由你本人购买</b>？');
}
function polishContact(root){
  const intro=root.querySelector(':scope > p');
  setText(intro,'周先生接得很快。背景里有电视新闻和家人说话的声音。');
  const msg=byText(root,'.message.them','704一直空着');
  if(msg)setText(msg,'周先生：704一直空着。物业这阵子在改旧管线，白天有人上七楼施工。具体改哪里我没问。');
  const done=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__finishContact'));
  setText(done,'挂断电话');
}
function xuHistoryUnlocked(){
  const s=state(),clues=isArr(s.clues)?s.clues:[];
  return clues.includes('delivery')||Number(s.stage)>=STAGE.IDENTITY;
}
function polishPhone(root){
  const recent=byText(root,'.message.them.old','徐洲 · 上周四');
  if(recent)setText(recent,'徐洲 · 上周四\n周五那版表我替你收尾。附件我放群里了，明早再看。');
  const historyBtn=byText(root,'.evidence-btn','徐洲 · 三个月前');
  if(historyBtn&&!xuHistoryUnlocked()){
    historyBtn.classList.add('logic-history-locked');
    const h=historyBtn.previousElementSibling;if(h&&h.tagName==='H3')h.classList.add('logic-history-locked');
    const d=h&&h.previousElementSibling;if(d&&d.classList.contains('divider'))d.classList.add('logic-history-locked');
  }
  root.querySelector('.logic-phone-context')?.remove();
}
function polishOldChat(root){
  const p=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('三个细节')||x.textContent.includes('普通的熟人叮嘱'));
  if(p)p.remove();
}
function polishNotes(root){
  [...root.querySelectorAll('.optional-group .clue small')].forEach(x=>x.remove());
  const t=root.querySelector('.optional-group .clue-group-title');
  if(t&&!t.dataset.logic){t.dataset.logic='1';const node=[...t.childNodes].find(n=>n.nodeType===3);if(node)node.textContent='额外观察';}
  const empty=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('还没有确认任何有效信息'));if(empty)setText(empty,'还没有记下任何内容。');
  const replacements=new Map([
    ['防盗链在你进门后仍从屋内扣着','回家时垂下的防盗链，后来处于扣合状态'],
    ['21:36屋内痕迹与22:18仍在公司形成时间矛盾','21:36便利店小票后来出现在705垃圾袋里；22:18你才离开公司'],
    ['卫生间地垫在深夜仍是新鲜潮湿','卫生间地垫中间有两处彼此分开的潮湿区域']
  ]);
  [...root.querySelectorAll('.clue')].forEach(el=>{const t=el.textContent.trim();if(replacements.has(t))setText(el,replacements.get(t))});
}
function polishNeighbor(root){
  const s=state(),q=(s.flags&&isArr(s.flags.neighborTopics))?s.flags.neighborTopics:[];
  const timeBtn=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__neighborAsk('time')"));
  if(timeBtn&&!q.includes('people')){timeBtn.disabled=true;timeBtn.title='先把前一个问题问完'}
  const intro=root.querySelector(':scope > p');setText(intro,'陈阿姨先问你是不是丢东西了。她隔着防盗门跟你说话，屋里的电视声有点大。');
}
function polishRoute(root){
  const p=root.querySelector(':scope > p');setHTML(p,'选一条入口路线，再从已有记录中选<b>三条</b>直接支持它的事实。');
}
function polishGap(root){
  const p=root.querySelector(':scope > p');setText(p,'背板由几颗螺丝固定，板边积着一层灰。');
  const done=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__closeGap'));
  setText(done,'退出卧室');
}
function polishIdentity(root){
  const s=state(),clues=isArr(s.clues)?s.clues:[];
  const p=root.querySelector(':scope > p');setHTML(p,'选一个人物，再从已有记录里选<b>三条</b>同时与这个人和七楼行动有关的信息。');
  [...root.querySelectorAll('.person-card')].forEach(card=>{
    const name=card.querySelector('b')?.textContent.trim(),desc=card.querySelector('span');if(!desc)return;
    if(name==='徐洲')setText(desc,'同事 · 你认识的人');
    if(name==='房东周先生')setText(desc,'房东 · 持有备用钥匙');
    if(name==='物业旧工程员')setText(desc,'可能熟悉旧楼结构 · 身份未明');
  });
  const old=byText(root,'.evidence-btn','旧聊天：');
  if(old&&!clues.includes('oldChat')){setText(old,'旧聊天：尚未核对');old.disabled=true;old.classList.add('logic-locked-evidence')}
  const warn=root.querySelector('.result-warn');
  if(warn&&!clues.includes('oldChat'))setHTML(warn,'<p>人物关系还有一处没有闭合。你可以先退出，继续翻已经拥有的记录。</p>');
}
function polishEndingChoice(root){
  const p=root.querySelector(':scope > p');setText(p,'23:54。手机还有电，证件在玄关，消防楼梯就在门外。');
  const secret=[...root.querySelectorAll('button')].find(b=>b.textContent.includes('隐藏选择'));
  if(secret){const span=secret.querySelector('.muted');setText(span,'你不准备再回705取任何东西。')}
}
function polishArchive(root){
  const m=meta(),seen=isArr(m.endingsSeen)?m.endingsSeen:[],secretSeen=seen.includes('secret');
  const h=root.querySelector('h2');if(h){const normal=seen.filter(x=>x!=='secret').length;setText(h,`结局档案 · 普通结局 ${normal}/3${secretSeen?' · 另有隐藏记录':''}`)}
  const cards=[...root.querySelectorAll('.archive-card')];if(!secretSeen&&cards.length>3)cards.slice(3).forEach(c=>c.remove());
  [...root.querySelectorAll('.archive-card.locked p')].forEach(p=>setText(p,'尚未记录。'));
}
function polishEnding(root){
  const m=meta(),seen=isArr(m.endingsSeen)?m.endingsSeen:[],secretSeen=seen.includes('secret');
  const progress=[...root.querySelectorAll('p')].find(p=>p.textContent.includes('已解锁结局：'));
  if(progress){const normal=seen.filter(x=>x!=='secret').length;setText(progress,`结局档案已更新：普通结局 ${normal}/3${secretSeen?'，另有一条隐藏记录已归档':''}。`)}
  const body=[...root.querySelectorAll('p')].find(p=>p.innerHTML.includes('你第一次真正明白：离开现场不是'));
  if(body)setHTML(body,body.innerHTML.replace(/<br><br>你第一次真正明白：离开现场不是“输”，而是把风险交给更适合处理它的人。?/,'').replace(/你第一次真正明白：离开现场不是“输”，而是把风险交给更适合处理它的人。?/,''));
  const secretText=[...root.querySelectorAll('p')].find(p=>p.innerHTML.includes('三个月前，是徐洲主动把这套'));
  if(secretText)setHTML(secretText,secretText.innerHTML.replace('三个月前，是徐洲主动把这套“刚空出来、很便宜”的房源发给你的。','三个月前，徐洲已经知道这套房、熟悉七楼，还主动来帮你搬家。'));
}
function polishPaywall(){
  const overlay=$('#paywall-overlay');if(!overlay)return;
  const body=overlay.querySelector('.paywall-msg-body');
  if(body)setHTML(body,'如果你玩到这里觉得还不错，愿意留下 <strong>1元</strong> 自愿支持，我会把它继续用在网页悬疑的素材、测试和后续更新上。');
  const last=overlay.querySelector('.paywall-msg-warm2');setText(last,'不支持也完全没关系。剧情、提示、结局和二周目都不会受影响。');
}
function polishModal(){
  const root=$('#modalContent');if(!root||!root.children.length)return;
  const card=root.closest('.modal-card');if(card)card.classList.remove('logic-memory-card');
  const title=root.querySelector('h2')?.textContent.trim()||'';
  if(title==='22:48')polishIntro(root);
  if(['玄关的拖鞋','入户门','餐桌边','客厅角落','垃圾桶','茶几和沙发','客厅窗边','沙发','窗帘','卧室窗帘','床头插座','床头相框','衣柜','地垫','洗手台','牙杯','手巾','镜子'].includes(title))polishInspection(root,title);
  if(title==='防盗链')polishChain(root);
  if(['704房门','维修通知'].includes(title))polishHallInspection(root,title);
  if(title==='位置')polishMap(root);
  if(title==='07:12 · 记忆核对')polishMemory(root);
  if(title==='时间线 · 第一步'||title==='时间线 · 第二步')polishTimeline(root,title);
  if(title==='房东周先生 · 电话')polishContact(root);
  if(title==='手机')polishPhone(root);
  if(title==='徐洲 · 三个月前')polishOldChat(root);
  if(title==='随手记下的事')polishNotes(root);
  if(title==='703 · 陈阿姨')polishNeighbor(root);
  if(title==='入口路径推理')polishRoute(root);
  if(title==='衣柜背板')polishGap(root);
  if(title==='身份交叉')polishIdentity(root);
  if(title==='23:54 · 你怎么过今晚')polishEndingChoice(root);
  if(title.startsWith('结局档案'))polishArchive(root);
  if(root.querySelector('.ending'))polishEnding(root);
}

function polishEvent(){
  const layer=$('#eventLayer');if(!layer)return;const el=layer.querySelector('.event-text');if(!el)return;const t=el.textContent||'';
  if(t.includes('三处细节都可以单独解释'))setText(el,'22:57。你想起早上出门前，手机里留过一张随手拍的照片。');
  else if(t.includes('你需要停止继续翻东西'))setText(el,'23:20。手机屏幕亮了一下。公司门禁、打车和门锁记录还留在“记录”里。');
  else if(t.includes('三处信息开始互相咬合'))setText(el,'23:37。你把刚才在七楼记下的几条内容重新翻了一遍。');
  else if(t.includes('夹层里第一次出现了一个具体名字'))setText(el,'23:47。揉皱的收件纸上写着：徐洲。');
  else if(t.includes('21:36，一张来自你家里的小票已经存在'))setHTML(el,'21:36，那张便利店小票已经打印。<br>22:18，你才刷卡离开公司。<br><br>这张小票后来出现在705的垃圾袋里。');
  else if(t.includes('这条路线至少在结构上成立'))setHTML(el,'23:42。你回到705。<br>卧室衣柜贴着与704共用竖井的那面墙。');
  else if(t.includes('纸上出现了“徐洲”'))setHTML(el,'23:47。<br>废纸的收件人栏写着：徐洲。');
  else if(t.includes('坐在沙发上其实看不见卧室门口'))layer.innerHTML='';
}
function polishToast(){
  const el=$('#toast');if(!el||el.classList.contains('hidden'))return;const t=el.textContent||'';
  const map={
    '704门和维修通知还没有都看清':'走廊里还有东西没看完。',
    '现在还没有充分理由去敲邻居和查704':'你暂时没有出去。',
    '还缺“谁帮你搬家”这条关系信息':'人物关系还没有闭合。',
    '路线或支持事实里还有越界/弱证据':'这组路线和材料还对不上。',
    '记住了一条有效信息':'已经记下。',
    '发现额外信息':'已经记下。'
  };
  if(map[t])setText(el,map[t]);
}

function afterPaint(fn){if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(fn));else setTimeout(fn,0)}
function wrapMemoryFlow(){
  const toggle=window.__memoryToggle;if(typeof toggle==='function'&&!toggle.__logicWrapped){
    const wrapped=function(id){const card=document.querySelector('.modal-card'),y=card?card.scrollTop:0;const result=toggle(id);const now=document.querySelector('.modal-card');if(now)now.scrollTop=y;afterPaint(()=>{const next=document.querySelector('.modal-card');if(next)next.scrollTop=y});return result};
    wrapped.__logicWrapped=true;window.__memoryToggle=wrapped;
  }
}
function wrapXuHistory(){
  const read=window.__readXuHistory;if(typeof read==='function'&&!read.__logicWrapped){
    const wrapped=function(){if(!xuHistoryUnlocked()){showToast('旧消息很多，你没有继续往前翻。');return}return read()};wrapped.__logicWrapped=true;window.__readXuHistory=wrapped;
  }
}
function wrapNeighborFlow(){
  const ask=window.__neighborAsk,finish=window.__finishNeighbor;
  if(typeof ask==='function'&&!ask.__logicWrapped){const wrapped=function(id){const q=((state().flags||{}).neighborTopics)||[];if(id==='time'&&!q.includes('people')){showToast('先把前一个问题问完。');return}return ask(id)};wrapped.__logicWrapped=true;window.__neighborAsk=wrapped}
  if(typeof finish==='function'&&!finish.__logicWrapped){const wrapped=function(){const q=((state().flags||{}).neighborTopics)||[];if(!q.includes('people')||!(q.includes('noise')||q.includes('time'))){showToast('还少一条邻居亲眼或亲耳确认的细节。');return}return finish()};wrapped.__logicWrapped=true;window.__finishNeighbor=wrapped}
}
function wrapSaveActions(){
  normalizeStoredSave();
  const start=$('#startBtn');if(start&&typeof start.onclick==='function'&&!start.dataset.logicWrapped){const orig=start.onclick;start.dataset.logicWrapped='1';start.onclick=function(e){if(hasUnfinishedSave()&&!confirm('已有未结束的调查存档。确定从22:48重新开始并覆盖它吗？'))return;return orig.call(this,e)}}
  const cont=$('#continueBtn');if(cont&&typeof cont.onclick==='function'&&!cont.dataset.logicWrapped){const orig=cont.onclick;cont.dataset.logicWrapped='1';cont.onclick=function(e){normalizeStoredSave();return orig.call(this,e)}}
  const review=$('#reviewBtn');if(review&&typeof review.onclick==='function'&&!review.dataset.logicWrapped){const orig=review.onclick;review.dataset.logicWrapped='1';review.onclick=function(e){if(hasUnfinishedSave()&&!confirm('快速复盘会覆盖当前调查存档。确定继续吗？'))return;return orig.call(this,e)}}
  const restart=window.__restart;if(typeof restart==='function'&&!restart.__logicWrapped){const wrapped=function(){const s=state();if(!s.ending&&hasUnfinishedSave()&&!confirm('确定清除当前调查进度并回到标题吗？'))return;return restart()};wrapped.__logicWrapped=true;window.__restart=wrapped}
}
function installObservers(){
  const root=$('#modalContent');if(root){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;polishModal()})}).observe(root,{childList:true,subtree:true,characterData:true})}
  const event=$('#eventLayer');if(event)new MutationObserver(polishEvent).observe(event,{childList:true,subtree:true,characterData:true});
  const toast=$('#toast');if(toast)new MutationObserver(polishToast).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  const game=$('#game');if(game)new MutationObserver(()=>queueMicrotask(polishHUD)).observe(game,{attributes:true,attributeFilter:['data-scene','class'],childList:true,subtree:true,characterData:true});
  const title=$('#titleScreen');if(title)new MutationObserver(polishTitleButtons).observe(title,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>polishPaywall()).observe(document.body,{childList:true,subtree:true});
}
function selfCheck(){
  const checks={
    saveRepair:typeof normalizeStoredSave==='function',unfinishedSave:typeof hasUnfinishedSave==='function',
    neighborWrapped:!!window.__finishNeighbor?.__logicWrapped,memoryWrapped:!!window.__memoryToggle?.__logicWrapped,
    xuHistoryWrapped:!!window.__readXuHistory?.__logicWrapped,restartWrapped:!!window.__restart?.__logicWrapped,
    sidebarMap:!!$('#logicSidebarMap'),modalPresent:!!$('#modalContent'),gameQaPresent:!!window.__GAME_QA__
  };
  window.__LOGIC_FIX_QA__={checks,pass:Object.values(checks).every(Boolean),state:()=>state(),hasUnfinishedSave};
}
function init(){
  normalizeStoredSave();wrapNeighborFlow();wrapMemoryFlow();wrapXuHistory();wrapSaveActions();ensureSidebarMap();installObservers();polishHUD();polishModal();polishEvent();polishPaywall();polishTitleButtons();selfCheck();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
