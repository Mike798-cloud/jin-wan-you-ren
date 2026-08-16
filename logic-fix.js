(() => {
'use strict';

const SAVE_KEY='tonight_someone_was_here_v2';
const OLD_SAVE_KEY='tonight_someone_was_here_v1';
const META_KEY='tonight_someone_was_here_meta';
const STAGE={HOME:0,MEMORY:1,CONTACT:2,CHECK:3,TIMELINE:4,CHAIN:5,HALL:6,ROUTE:7,GAP:8,IDENTITY:9,FINAL:10,END:11};
const LOGIC_FIX_VERSION='20260817g';
const QA_MODE=new URLSearchParams(location.search).get('qa')==='1';
window.__LOGIC_FIX_VERSION__=LOGIC_FIX_VERSION;
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
  const validEndings=['leave','ask','trap','secret'];
  if(raw.ending!=null&&!validEndings.includes(raw.ending)){raw.ending=null;changed=true}
  if(raw.ending&&raw.stage!==STAGE.END){raw.stage=STAGE.END;changed=true}
  if(!raw.ending&&raw.stage===STAGE.END){raw.stage=STAGE.FINAL;raw.time='23:52';changed=true}
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
    7:'把七楼看到的几条记录放在一起。',
    8:'回卧室核对衣柜这一面墙。',
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

function polishHotspots(){
  const labels={shoes:'玄关门内侧',fridge:'冰箱',door:'入户门',bin:'垃圾桶',curtain:'窗帘',bedside:'床头',wardrobe:'衣柜背板',mat:'地垫',sink:'洗手台',towels:'手巾',mirror:'镜子','704':'704房门',notice:'维修通知',neighbor:'703邻居房门'};
  Object.entries(labels).forEach(([id,label])=>{const el=document.querySelector(`[data-hotspot="${id}"]`);if(el){el.setAttribute('aria-label',label);el.setAttribute('title','')}});
}
function polishHUD(){
  const s=state(),st=Math.max(0,Math.min(11,Number(s.stage)||0));
  setText($('#objective'),HUD.objective[st]);
  setText($('#objectiveSide'),HUD.objective[st]);
  setText($('#stageLabel'),HUD.stage[st]);
  setText($('#progressText'),HUD.progress[st]);
  setText($('#dangerText'),'记录会自动保存在这台设备上。');
  const evCard=$('.evidence-card');if(evCard){setText(evCard.querySelector('.label'),'已记录');const ep=evCard.querySelector('p');if(ep){[...ep.childNodes].filter(n=>n.nodeType===3).forEach(n=>{if(n.nodeValue.includes('条有效信息'))n.nodeValue=n.nodeValue.replace('条有效信息','条记录')})}}
  const caption=$('.scene-caption > span');
  setText(caption,'画面不会标出可调查点。');
  polishTitleButtons();
  ensureSidebarMap();
  updateSidebarMap();
  polishHotspots();
}

function polishTitleButtons(){
  const c=$('#continueBtn');if(c)c.classList.toggle('hidden',!hasUnfinishedSave());
  const lead=document.querySelector('#titleScreen .title-card .lead');
  setHTML(lead,'门锁没有明显损坏。你正常打开了门。<br>屋里有几处细节，让你停下来重新看了一遍。');
}
function sidebarMapHTML(){
  return `<span class="label">705室 · 位置（非比例示意）</span>
  <div class="logic-plan" aria-label="705室二维位置示意">
    <div class="logic-room bedroom" data-room="bedroom"><span>卧室</span><i></i></div>
    <div class="logic-room living" data-room="living"><span>客厅</span><i></i></div>
    <div class="logic-room bathroom" data-room="bathroom"><span>卫生间</span><i></i></div>
    <div class="logic-room entry" data-room="entry"><span>玄关 / 厨房</span><i></i></div>
  </div>
  <div class="logic-hall-row" aria-label="七楼走廊示意"><span data-flat="705">705</span><span data-flat="704">704</span><span data-flat="703">703</span></div>
  <div class="logic-hall-current" aria-live="polite"></div>
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
  card.querySelectorAll('.logic-room').forEach(el=>el.classList.toggle('current',el.dataset.room===scene&&scene!=='hallway'));
  const hall=card.querySelector('.logic-hall-row');
  if(hall){hall.classList.toggle('shown',stage>=STAGE.HALL);hall.querySelectorAll('span').forEach(x=>x.classList.remove('current'))}
  const hallCurrent=card.querySelector('.logic-hall-current');
  if(hallCurrent){hallCurrent.classList.toggle('shown',stage>=STAGE.HALL&&scene==='hallway');setText(hallCurrent,stage>=STAGE.HALL&&scene==='hallway'?'● 当前：七楼公共走廊':'')}
  const note=card.querySelector('.logic-map-note');
  if(stage<STAGE.HALL)setText(note,'');
  else if(clues.includes('shaftNotice'))setText(note,'维修通知：705 与 704 之间保留旧设备检修夹道。');
  else setText(note,'七楼走廊 · 从左到右：705 / 704 / 703');
}
function polishIntro(root){
  const ps=[...root.querySelectorAll(':scope > p')];
  const door=ps.find(p=>p.textContent.includes('七楼电梯口摸到钥匙'));
  setText(door,'你在七楼电梯口摸到钥匙，走到705门前。门锁和门框没有明显损伤。你正常解锁，门能完全推开；防盗链垂在门侧。');
  const shoe=ps.find(p=>p.textContent.includes('它们的位置不对'))||ps.find(p=>p.textContent.includes('玄关的拖鞋'));
  if(shoe)setHTML(shoe,'你在门内侧停了一下。鞋柜下方的浅色地砖边缘，有一道刚被鞋底带开的湿灰痕。');
  const tutorial=ps.find(p=>p.classList.contains('muted'));
  setText(tutorial,'画面不会标出可调查点。按自己的顺序看看房间。');
}
function polishInspection(root,title){
  const s=state(),st=Number(s.stage)||0,p=root.querySelector(':scope > p');if(!p)return;
  const h=root.querySelector('h2');
  if(title==='玄关的拖鞋'){
    setText(h,'玄关门内侧');
    setHTML(p,'你蹲下看门槛和鞋柜下方。浅色地砖边缘有一道湿灰痕，像鞋底从门口带进来后擦过去留下的；痕迹比你现在脚上的鞋底更宽一点。');
    return;
  }
  const text={
    '冰箱':'你拉开冰箱。最上层多了一瓶你从不买的普通矿泉水，瓶盖已经拧开过；你平时只买苏打水。',
    '入户门':'锁舌、门框和猫眼都没有明显撬动痕迹。你刚才是正常解锁进门的。',
    '餐桌边':'碗、杯垫和纸巾都在桌边。',
    '客厅角落':'你蹲下来拨了拨小垃圾桶。上面是纸巾团和快递塑料袋。',
    '茶几和沙发':'你把靠垫拿起来翻到背面。拉链面朝外；你平时会把这一面压在里侧。',
    '客厅窗边':'你扣了两下窗锁。锁扣仍咬合，窗框没有新鲜擦痕；窗外墙面也没有平台或外接踏脚。',
    '沙发':'你拿起靠垫看了一眼背面。拉链朝外；你平时会把拉链面压到里侧。',
    '床头插座':'你弯腰看床头柜后面。充电线插在右侧墙插，插头被柜角挤着。你一直用左侧插口，因为右侧会被柜体压住。床头抽屉里那部换下来的旧手机还在。',
    '衣柜':'你拉开柜门。衣服、纸箱和收纳袋都在柜里。',
    '地垫':'你蹲下按了按地垫。中间有两处彼此分开的潮湿区域，摸上去还有凉意。',
    '洗手台':'你靠近看了一眼。台面都是你自己的常用洗漱用品：牙杯、牙膏、洁面用品、洗手液和那支平时使用的小型理容器。',
    '手巾':'手巾挂在架上。',
    '镜子':'镜面上有几处普通水点，已经干得差不多。'
  };
  if(title==='窗帘'||title==='卧室窗帘'){
    if(st>=STAGE.CHECK)setText(p,'你走到窗边，沿轨道把帘布捋了一遍。右侧已经推到轨道尽头。你早上给窗边植物留光时，只收到大约半扇窗宽的位置。');
    else setText(p,'两侧帘布都收在窗边，窗户大半露着。右侧帘布堆在轨道末端。');
    return;
  }
  if(title==='垃圾桶'){
    setHTML(p,'你蹲下来，把上层纸巾拨开。下面压着两个同款一次性咖啡杯：一个杯壁已经干透，另一个杯底还留着一点冷掉的咖啡；你今天没有买咖啡回家。<br><br>再往下是一张揉皱的小票：<b>21:36 · 小区东门便利店 · 美式咖啡×1 / 矿泉水×1</b>。');return;
  }
  if(title==='牙杯'){
    setHTML(p,'你把牙杯拿到灯下。里面一直是一新一旧两支牙刷；这次你认出了蓝色旧牙刷。<br><br>它是你今天早上换下来、收进洗手台下方柜子里的那支。');return;
  }
  if(title==='手巾'&&st>=STAGE.CHECK){
    setText(p,'你把左侧浅色手巾取下来。布面留下三道等距折线，重新挂回去时能看出它被折成三折；你平时只对折一次。');return;
  }
  if(title==='镜子'&&st>=STAGE.CHECK){
    setHTML(p,'你靠近洗手台和镜柜。镜面边缘有散开的水汽印，空气里还留着很淡的薄荷味。<br><br>你家里没有这种味道的漱口水。');return;
  }
  if(title==='床头相框'){
    setHTML(p,'你把搬家合照从书下面抽出来。徐洲站在你身后，钥匙圈上挂着一枚绿色硬塑料标签。夹道里那枚旧物业工程标签的颜色和外形相近；照片看不清编号。');return;
  }
  if(text[title])setText(p,text[title]);
}
function polishChain(root){
  const p=root.querySelector(':scope > p');if(!p)return;
  setHTML(p,'你回到玄关，把门拉开一道缝，链条立刻绷紧。<br><br><b>防盗链现在扣着。</b><br><br>回家时门能完全推开，链条当时垂在门侧。刚才整理时间记录时你不在门边，而且从进门到现在，你没有碰过它。');
  const go=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__goHall'));
  setText(go,'取下链条，拿上手机和钥匙，到公共走廊');
}
function polishHallInspection(root,title){
  const p=root.querySelector(':scope > p');if(!p)return;
  if(title==='704房门')setHTML(p,'你蹲下看704门的锁舌一侧。门框金属边缘有几道颜色发亮的新擦痕；门底积灰也被一道鞋底宽的痕迹切开。');
  if(title==='维修通知')setHTML(p,'电表箱旁压着一张七楼旧管线整改示意。图上标着：<b>705 与 704 之间保留一段旧设备检修夹道</b>。<br><br>两户卧室柜体后方各有一处封板检修口。');
}
function polishMap(root){
  const s=state(),clues=isArr(s.clues)?s.clues:[],stage=Number(s.stage)||0;
  const cells=[...root.querySelectorAll('.floor-line > div')];
  cells.forEach(c=>c.classList.remove('you','empty'));
  if(cells[0]){cells[0].classList.add('you');cells[0].innerHTML='705<br><span class="muted">你住这里</span>'}
  if(cells[1]){cells[1].classList.add('empty');cells[1].innerHTML=`704<br><span class="muted">${clues.includes('maintenanceCall')||stage>=STAGE.HALL?'空置等整改':'邻户'}</span>`}
  if(cells[2])cells[2].innerHTML=`703<br><span class="muted">${clues.includes('neighbor')?'陈阿姨':'邻户'}</span>`;
  const arrow=root.querySelector('.route-arrow');
  if(arrow){
    if(clues.includes('shaftNotice')){arrow.hidden=false;setText(arrow,'维修通知：705 与 704 之间保留旧设备检修夹道');arrow.classList.remove('logic-unverified-route')}
    else{arrow.hidden=true;arrow.textContent=''}
  }
  const heading=root.querySelector('h2');if(heading)setText(heading,'位置 · 非比例示意');
  [...root.querySelectorAll('.map-room')].forEach(room=>{if(room.textContent.includes('七楼走廊')&&stage<STAGE.HALL)room.style.display='none'});
}
function polishMemory(root){
  const p=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('照片没有拍到'));if(p)p.remove();
  const card=root.closest('.modal-card');if(card)card.classList.add('logic-memory-card');
  const shots=[...root.querySelectorAll('.compare-shot')];if(shots.length>1)shots.slice(1).forEach(x=>x.remove());
  const layout=root.querySelector('.compare-layout');if(layout)layout.classList.add('logic-single-memory');
  const firstLabel=root.querySelector('.compare-shot .shot-label');setText(firstLabel,'今早 07:12 · 相册原图');
  const intro=root.querySelector(':scope > p:not(.muted)');
  setHTML(intro,'只看07:12这张照片，选出<b>两条</b>能由照片本身直接确认的事实。');
  [...root.querySelectorAll('.choice-grid button')].forEach(btn=>{
    if(btn.textContent.includes('两只拖鞋当时并排收在鞋柜下'))setText(btn,'照片边缘能确认：07:12时两只拖鞋并排收在鞋柜下。');
  });
}
function polishTimeline(root,title){
  const p=root.querySelector(':scope > p');if(!p)return;
  const relabel=()=>{
    [...root.querySelectorAll('.timeline-row')].forEach(row=>{
      const time=row.querySelector('time'),span=row.querySelector('span');if(!time||!span)return;
      if(time.textContent.trim()==='21:36')setText(span,'小区东门便利店小票（美式咖啡×1 / 矿泉水×1；后来在705垃圾袋找到）');
      if(time.textContent.trim()==='22:18'){setText(time,'21:28–22:18');setText(span,'办公区门禁无离场记录，电脑持续有操作；22:18刷卡离开办公区')}
      if(time.textContent.trim()==='22:31')setText(span,'打车软件：公司北门上车');
      if(time.textContent.trim()==='22:47')setText(span,'705门锁：22:47正常开锁记录');
    });
    [...root.querySelectorAll('.timeline-records button')].forEach(btn=>{
      if(btn.textContent.includes('你家垃圾袋里的便利店小票'))setText(btn,'小区东门便利店小票（美式咖啡×1 / 矿泉水×1；后来在705垃圾袋找到）');
      if(btn.textContent.includes('公司门禁：你刷卡离开办公区'))setText(btn,'21:28–22:18 办公区无离场记录、电脑持续有操作；22:18刷卡离开');
      if(btn.textContent.includes('打车软件：车辆接到你'))setText(btn,'打车软件：公司北门上车');
      if(btn.textContent.includes('705门锁：你的机械钥匙开门'))setText(btn,'705门锁：22:47正常开锁记录');
    });
  };
  if(title==='时间线 · 第一步')setText(p,'你坐到客厅茶几边，把手机里的记录和那张小票放在一起。把五条记录按时间先后点进时间轴。');
  if(title==='时间线 · 第二步'){
    setHTML(p,'哪两条记录放在一起，最能证明<b>21:36这张小区东门小票不可能由你本人购买</b>？');
    const pair=[...root.querySelectorAll('.choice-grid button')].find(b=>b.textContent.includes('21:36小票'));
    if(pair)setText(pair,'21:36小区东门小票 ＋ 21:28–22:18公司在场记录');
  }
  relabel();
}
function polishContact(root){
  const intro=root.querySelector(':scope > p');
  setText(intro,'周先生接得很快。背景里有电视新闻和家人说话的声音。');
  const msg=byText(root,'.message.them','704一直空着');
  if(msg)setText(msg,'周先生：704一直空着等整改，工程不是每天都进屋。今天物业白天只在七楼公共电表箱和走廊管线处做了半天，704室内没人施工。');
  const done=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__finishContact'));
  setText(done,'挂断电话');
}
function xuHistoryUnlocked(){
  const s=state(),clues=isArr(s.clues)?s.clues:[];
  return clues.includes('delivery')||clues.includes('oldChat');
}
function chatSearchHTML(){
  return `<h2>搜索聊天记录</h2><p>手机里有不少旧消息。输入姓名或关键词。</p><div class="logic-chat-search"><input id="logicChatSearchInput" type="search" autocomplete="off" placeholder="姓名 / 关键词" aria-label="搜索聊天记录"><button class="modal-action" onclick="window.__logicSearchChat()">搜索</button></div><p class="muted">这只是你自己的聊天记录，什么时候搜索由你决定。</p>`;
}
function polishPhone(root){
  const recent=byText(root,'.message.them.old','徐洲 · 上周四');
  if(recent)setText(recent,'徐洲 · 上周四\n周五那版表我替你收尾。附件我放群里了，明早再看。');
  const historyBtn=byText(root,'.evidence-btn','徐洲 · 三个月前')||byText(root,'.evidence-btn','搜索：徐洲')||byText(root,'.evidence-btn','搜索旧聊天');
  if(historyBtn){
    const h=historyBtn.previousElementSibling;if(h&&h.tagName==='H3')setText(h,'搜索聊天');
    historyBtn.classList.remove('logic-history-locked');
    setText(historyBtn,xuHistoryUnlocked()?(hasClue('oldChat')?'搜索：徐洲（已核对）':'搜索：徐洲'):'搜索旧聊天');
  }
  const rows=[...root.querySelectorAll('.timeline-row')];
  rows.forEach(row=>{
    const time=row.querySelector('time'),span=row.querySelector('span');if(!time||!span)return;
    const t=time.textContent.trim();
    if(t==='22:18'){setText(time,'21:28–22:18');setText(span,'办公区门禁无离场记录，电脑持续有操作；22:18刷卡离开办公区')}
    if(t==='22:31')setText(span,'打车软件：公司北门上车');
    if(t==='22:47')setText(span,'705门锁：22:47正常开锁记录');
  });
  root.querySelector('.logic-phone-context')?.remove();
}
function polishChatSearch(root){
  const input=root.querySelector('#logicChatSearchInput');if(input&&!input.dataset.logicFocus){input.dataset.logicFocus='1';setTimeout(()=>input.focus(),40)}
}
function polishOldChat(root){
  if(root.dataset.logicOldChat==='1')return;
  root.dataset.logicOldChat='1';
  setHTML(root,`<h2>徐洲 · 三个月前</h2>
    <div class="phone-screen">
      <div class="message them old">徐洲：群里有人转了套七楼的房源，离公司近，价格也还行。你不是在找房吗？</div>
      <div class="message me old">你：我周末去看看。</div>
      <div class="message them old">徐洲：行。真定了搬家叫我一声，我去搭把手。</div>
      <div class="message me old">你：东西不多，欠你顿饭。</div>
      <div class="message them old">徐洲：成交。</div>
    </div>
    <p class="muted">这段聊天只能确认两件事：房源链接是徐洲发来的，搬家时他来帮过忙。</p>
    <button class="modal-action" onclick="window.__phone('messages')">返回消息</button>`);
}
function hasClue(id){const s=state();return isArr(s.clues)&&s.clues.includes(id)}
function polishNotes(root){
  [...root.querySelectorAll('.optional-group .clue small')].forEach(x=>x.remove());
  const groupNames=new Map([['生活异常','生活细节'],['客观记录','时间与外部记录'],['建筑与入口','建筑与通道'],['人物与停留','人物与现场'],['证据边界','最后判断']]);
  [...root.querySelectorAll('.clue-group-title')].forEach(g=>{const node=[...g.childNodes].find(n=>n.nodeType===3);if(node&&groupNames.has(node.textContent.trim()))node.textContent=groupNames.get(node.textContent.trim())});
  const t=root.querySelector('.optional-group .clue-group-title');if(t&&!t.dataset.logic){t.dataset.logic='1';const node=[...t.childNodes].find(n=>n.nodeType===3);if(node)node.textContent='额外观察';}
  const replacements=new Map([
    ['拖鞋位置和早晨不一致','玄关门内侧出现一道新鲜湿灰鞋底痕'],
    ['07:12照片确认了早晨的玄关基线','07:12照片固定了早晨玄关状态，其中两只拖鞋并排收在鞋柜下'],
    ['防盗链在你进门后仍从屋内扣着','回家时垂下的防盗链，后来在你不在门边时变成扣合状态'],
    ['垃圾桶里有两个同款一次性咖啡杯','垃圾袋里有两个同款一次性咖啡杯；一个已经干透，另一个杯底仍有少量冷咖啡'],
    ['房东确认今天没有进入705','房东称自己今天没有进入705'],
    ['备用钥匙一直在房东手里','房东称备用钥匙仍在自己手里'],
    ['704今天确实处于空置维修状态','房东称704目前空置等整改；今天施工只在七楼公共区域，没有进入704室内'],
    ['703邻居见过帮你搬家的男人从704出来','703邻居称最近见过一个她认作“帮你搬家的男人”的人从704出来'],
    ['21:36屋内痕迹与22:18仍在公司形成时间矛盾','21:36小区东门便利店小票后来出现在705；21:28–22:18办公区无离场记录且电脑持续有操作'],
    ['卫生间地垫在深夜仍是新鲜潮湿','卫生间地垫中间有两处彼此分开的潮湿区域'],
    ['早上扔掉的旧牙刷重新出现在牙杯里','早上收进洗手台柜里的旧牙刷重新回到牙杯'],
    ['704封条被重新粘过','704门框锁舌处有新鲜亮擦痕，门底积灰也有近期被鞋底切开的痕迹'],
    ['维修通知确认704与705共用旧检修竖井','维修通知标明705与704之间保留一段旧设备检修夹道'],
    ['现有证据更支持“704→检修竖井→705柜体后方”','优先回705核对与旧设备检修夹道相邻的柜体一侧'],
    ['衣柜背板后确实连着维修夹层','衣柜背板后实际连通一段横向旧设备检修夹道'],
    ['夹层内有绿色物业工程钥匙牌','检修夹道内有一枚印着旧物业工程编号的绿色钥匙标签'],
    ['夹层废纸的收件人写着“徐洲”','检修夹道里的收件纸写着“徐洲”'],
    ['夹层里有薄毯、水和充电线，说明有人停留过','检修夹道的检修凹位里有折叠坐垫、水和充电设备；旁边便签写着“705”和几个夜间时段'],
    ['旧聊天确认徐洲帮你搬过家，也知道你的工作作息','旧聊天只确认徐洲发过这套房源链接，并在搬家时来帮过忙'],
    ['邻居、旧聊天与夹层废纸共同把徐洲和704路线连起来','邻居对“帮你搬家的男人”的描述、旧聊天中的搬家关系和检修夹道收件纸共同指向徐洲'],
    ['搬家合照里，徐洲腰间挂着同款绿色工程牌','搬家合照里，徐洲钥匙圈上有一枚与夹道旧物业标签外观相近的绿色硬塑料牌；编号看不清'],
    ['704门框内侧有反复顶锁留下的新划痕','704门框锁舌一侧有几道近期形成的亮擦痕'],
    ['垃圾袋里有21:36便利店小票；那时你仍在公司','垃圾袋里有21:36小区东门便利店小票（美式咖啡×1、矿泉水×1）；21:28–22:18办公区无离场记录且电脑持续有操作'],
    ['夹层里有与你床头同型号但颜色不同的旧充电线','检修夹道里有一根与床头接口规格相同、线皮颜色不同的旧充电线']
  ]);
  [...root.querySelectorAll('.clue')].forEach(el=>{const tx=el.textContent.trim();if(replacements.has(tx))setText(el,replacements.get(tx))});
  const empty=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('还没有确认任何有效信息'));if(empty)setText(empty,'还没有记下任何内容。');
}
function polishNeighbor(root){
  const s=state(),q=(s.flags&&isArr(s.flags.neighborTopics))?s.flags.neighborTopics:[];
  const timeBtn=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__neighborAsk('time')"));
  if(timeBtn&&!q.includes('people')){timeBtn.disabled=true;timeBtn.title='先把前一个问题问完'}
  const intro=root.querySelector(':scope > p');setText(intro,'陈阿姨先问你是不是丢东西了。她隔着防盗门跟你说话，屋里的电视声有点大。');
  [...root.querySelectorAll('.modal-note')].forEach(note=>{
    if(note.textContent.includes('你搬家那天我还借过你们一卷胶带'))setText(note,'“搬家那天我还借过你们一卷胶带。前几天我看见一个人从704出来，身形和穿着很像那天帮你搬东西的那个小伙子。我隔着走廊，脸没看清。”');
  });
}
function polishRoute(root){
  const p=root.querySelector(':scope > p');
  setHTML(p,'目前哪条路线<b>最值得优先验证</b>？先选一个候选方向，再从已有记录中选三条与它直接相关的事实。');
  const h3=[...root.querySelectorAll('h3')].find(x=>x.textContent.includes('一、路线'));setText(h3,'一、最值得优先验证的路线');
  const route=[...root.querySelectorAll('button')].find(b=>b.textContent.includes('704')&&b.textContent.includes('柜体后方'));
  setText(route,'704 → 旧设备检修夹道 → 705柜体后方（待核实）');
  [...root.querySelectorAll('.evidence-btn')].forEach(btn=>{
    const click=btn.getAttribute('onclick')||'';
    if(click.includes("__routeFact('door')"))setText(btn,'703邻居称最近见过她认作“帮你搬家的男人”的人从704出来');
    if(click.includes("__routeFact('shaft')"))setText(btn,'维修通知标明705与704之间保留旧设备检修夹道');
    if(click.includes("__routeFact('seal')"))setText(btn,'704门框锁舌处有新亮擦痕，门底积灰也有近期使用痕迹');
    if(click.includes("__routeFact('key')"))setText(btn,'房东称备用钥匙仍在自己手里');
  });
  const check=[...root.querySelectorAll('button')].find(b=>b.textContent.trim()==='检查推理');setText(check,'确定优先验证方向');
}
function polishGap(root){
  const s=state(),doneIds=(s.flags&&isArr(s.flags.gapInspected))?s.flags.gapInspected:[];
  const p=root.querySelector(':scope > p');
  setText(p,'陈阿姨把703的门开着，站在走廊。你让她在705门外等着，入户门保持敞开；你把床头那部旧手机打开录像，靠在床头柜边缘，镜头朝向衣柜。你只检查柜体这一侧，不进入夹道。');
  const result=root.querySelector('.result-warn p');
  if(result)setText(result,'背板只向外松开几厘米。手电光从缝里照进去：后面不是实墙，而是一段横向旧设备检修夹道。大部分位置只够成年人侧身通过，靠管线检修口的位置向内凹出一小块能蹲坐的空间。你留在卧室这一侧；陈阿姨还在门外。');
  const screw=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('固定螺丝'));
  if(screw){setText(screw.querySelector('b'),'一字槽固定螺丝');setText(screw.querySelector('p'),'两颗螺丝都没有完全坐紧；看螺丝头和板边是否有近期摩擦痕迹')}
  const tap=[...root.querySelectorAll('.gap-item')].find(b=>(b.getAttribute('onclick')||'').includes("__gapInspect('tap')"));
  if(tap){setText(tap.querySelector('b'),'松开一条缝');setText(tap.querySelector('p'),doneIds.includes('screws')&&doneIds.includes('dust')?'用钥匙边转松已经松动的一字槽固定件，只把背板向外移开几厘米':'先看固定件和积灰边缘')}
  const tag=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('绿色工程钥匙牌'));
  if(tag){setText(tag.querySelector('b'),'旧物业工程钥匙标签');setText(tag.querySelector('p'),'绿色硬塑料标签，表面印着已经磨旧的物业工程编号；这里只能确认标签本身')}
  const cable=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('旧充电线'));
  if(cable)setText(cable.querySelector('p'),'接口规格和你床头那根相同，线皮颜色不同');
  const nest=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('薄毯、水瓶和充电宝')||b.textContent.includes('折叠坐垫'));
  if(nest){setText(nest.querySelector('b'),'折叠坐垫、水瓶和充电宝');setText(nest.querySelector('p'),'放在管线旁稍宽一点的检修凹位里；坐垫下面压着一张折过几次的小便签')}
  const paper=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('揉皱的快递/收件纸'));
  if(paper)setText(paper.querySelector('p'),'从快递外包装撕下的收件联，收件人栏还在');
  if(doneIds.includes('nest')&&!root.querySelector('.logic-schedule-note')){
    const note=document.createElement('div');note.className='logic-schedule-note';
    note.innerHTML='<b>折叠坐垫下面的便签</b><p>纸上只有几行：<br><span>705　周一 22:40后</span><br><span>周三 22:30后</span><br><span>周五　不定</span></p>';
    const board=nest?.closest('.gap-board');if(board)board.insertAdjacentElement('afterend',note);
  }
  const close=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__closeGap'));
  setText(close,'关上背板，退到卧室门口');
}
function polishIdentity(root){
  const s=state(),clues=isArr(s.clues)?s.clues:[];
  const p=root.querySelector(':scope > p');setHTML(p,'选一个人物，再从已有记录里选<b>三条</b>同时与这个人和七楼行动有关的信息。');
  [...root.querySelectorAll('.person-card')].forEach(card=>{
    const name=card.querySelector('b')?.textContent.trim(),desc=card.querySelector('span');if(!desc)return;
    if(name==='徐洲')setText(desc,'同事 · 你认识的人');
    if(name==='房东周先生')setText(desc,'房东 · 持有备用钥匙');
    if(name==='物业旧工程员')setText(desc,'物业旧工程人员 · 具体身份未知');
  });
  [...root.querySelectorAll('.evidence-btn')].forEach(btn=>{
    const click=btn.getAttribute('onclick')||'';
    if(click.includes("__identityFact('neighbor')"))setText(btn,'邻居：称最近见过她认作“帮你搬家的男人”的人从704出来');
    if(click.includes("__identityFact('delivery')"))setText(btn,'检修夹道收件联：收件人写着“徐洲”');
    if(click.includes("__identityFact('tag')"))setText(btn,'检修夹道：印有旧物业工程编号的绿色钥匙标签');
    if(click.includes("__identityFact('key')"))setText(btn,'房东：称备用钥匙仍在自己手里');
    if(click.includes("__identityFact('receipt')"))setText(btn,'21:36小区东门便利店小票后来出现在705垃圾袋里');
  });
  const old=byText(root,'.evidence-btn','旧聊天：');
  if(old&&clues.includes('oldChat'))setText(old,'旧聊天：确认徐洲发过房源链接，并在搬家时来帮过忙');
  if(old&&!clues.includes('oldChat')){setText(old,'旧聊天：尚未核对');old.disabled=true;old.classList.add('logic-locked-evidence')}
  const warn=root.querySelector('.result-warn');
  if(warn&&!clues.includes('oldChat'))setHTML(warn,'<p>邻居说的是“帮你搬家的男人”。还需要用你自己的聊天记录确认这个人物关系。</p><button class="modal-action" onclick="window.__phone(\'messages\')">回手机搜索旧聊天</button>');
}
function polishHint(root,title){
  if(!title.startsWith('当前页提示'))return;
  const s=state(),st=Number(s.stage)||0;
  const steps=[...root.querySelectorAll('.hint-box > .hint-step')];
  const replaceHints=(hints)=>steps.forEach((el,i)=>{if(!hints[i])return;el.innerHTML='';const nb=document.createElement('b');nb.textContent=String(i+1);el.appendChild(nb);el.appendChild(document.createTextNode('　'+hints[i]))});
  if(st===STAGE.HOME)replaceHints(['先看玄关门内侧、冰箱，再去卫生间。','玄关靠门槛的位置有一处近看才明显的痕迹；冰箱里也多了东西。','第三处在卫生间地垫。']);
  if(st===STAGE.TIMELINE)replaceHints(['21:36的小票来自小区东门便利店。','公司记录显示21:28到22:18办公区没有离场记录，同时电脑持续有操作。','把这两条放在一起：21:36那笔消费不可能由你本人完成。']);
  if(st===STAGE.ROUTE)replaceHints(['把“有人在705停留过”和“从哪里进入”分开。','最直接的三条是：邻居看到疑似搬家男人从704出来、704门有近期使用痕迹、维修通知标出705与704之间的检修夹道。','先选“704 → 旧设备检修夹道 → 705柜体后方（待核实）”，再选上面三条。']);
  [...root.querySelectorAll('.hint-history .hint-step')].forEach(el=>{
    const tx=el.textContent||'';
    if(tx.includes('玄关鞋柜、冰箱')){const b=el.querySelector('b');el.textContent='';if(b){const nb=document.createElement('b');nb.textContent=b.textContent;el.appendChild(nb)}el.appendChild(document.createTextNode('　玄关门内侧和冰箱各有一处细节，第三处在卫生间地垫。'))}
    if(tx.includes('小票发生在你离开公司之前')){const b=el.querySelector('b');el.textContent='';if(b){const nb=document.createElement('b');nb.textContent=b.textContent;el.appendChild(nb)}el.appendChild(document.createTextNode('　21:36小区东门小票与21:28–22:18公司连续在场记录是关键锚点。'))}
    if(tx.includes('优先挑直接涉及“正门、建筑结构、704本身”')){const b=el.querySelector('b');el.textContent='';if(b){const nb=document.createElement('b');nb.textContent=b.textContent;el.appendChild(nb)}el.appendChild(document.createTextNode('　优先看邻居目击、704近期使用痕迹和705/704之间的检修夹道。'))}
  });
}
function polishEndingChoice(root){
  const p=root.querySelector(':scope > p');setText(p,'23:54。手机、钥匙和证件都在身上。你已经回到公共走廊，陈阿姨站在703门口；705入户门仍保持敞开。');
  const leave=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__end('leave')"));
  const ask=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__end('ask')"));
  const trap=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__end('trap')"));
  if(leave){setText(leave.querySelector('b'),'先离开，再报警');setText(leave.querySelector('.muted'),'和陈阿姨一起下楼，到明亮处报警。')}
  if(ask){setText(ask.querySelector('b'),'离开后再质问');setText(ask.querySelector('.muted'),'先下楼，再把绿色标签和收件纸照片发给徐洲。')}
  if(trap){setText(trap.querySelector('b'),'保留卧室录像');setText(trap.querySelector('.muted'),'不再回705，让已经放好的旧手机继续录像。')}
  const secret=[...root.querySelectorAll('button')].find(b=>b.textContent.includes('隐藏选择'));
  if(secret){setText(secret.querySelector('b'),'隐藏选择 · 今晚不再回705');setText(secret.querySelector('.muted'),'把五条额外记录和夹道里的“705”便签一起带走。')}
}
function polishArchive(root){
  const m=meta(),seen=isArr(m.endingsSeen)?m.endingsSeen:[],secretSeen=seen.includes('secret');
  const h=root.querySelector('h2');if(h){const normal=seen.filter(x=>x!=='secret').length;setText(h,`结局档案 · 普通结局 ${normal}/3${secretSeen?' · 另有隐藏记录':''}`)}
  const cards=[...root.querySelectorAll('.archive-card')];if(!secretSeen&&cards.length>3)cards.slice(3).forEach(c=>c.remove());
  [...root.querySelectorAll('.archive-card.locked p')].forEach(p=>setText(p,'尚未记录。'));
  cards.forEach(card=>{
    const code=card.querySelector('.archive-code');
    if(code&&code.textContent.trim()==='YOU WERE CHOSEN'){setText(code,'THE ROUTINE');setText(card.querySelector('h3'),'隐藏结局 · 作息表')}
  });
}
function polishEnding(root){
  const m=meta(),seen=isArr(m.endingsSeen)?m.endingsSeen:[],secretSeen=seen.includes('secret');
  const progress=[...root.querySelectorAll('p')].find(p=>p.textContent.includes('已解锁结局：'));
  if(progress){const normal=seen.filter(x=>x!=='secret').length;setText(progress,`结局档案已更新：普通结局 ${normal}/3${secretSeen?'，另有一条隐藏记录已归档':''}。`)}
  const ending=root.querySelector('.ending');if(!ending)return;
  const code=ending.querySelector('.ending-code'),title=ending.querySelector('.ending-title');
  const ps=[...ending.querySelectorAll(':scope > p')],body=ps[2],c=code?.textContent.trim();
  if(c==='THE SAFE DISTANCE'){
    setHTML(body,'23:58，你和陈阿姨一起下到一楼，在两条街外的24小时便利店里报警。<br><br>警察和物业进入704后，在旧设备检修夹道的检修凹位里找到折叠坐垫、水瓶、充电宝、一次性杯子、旧物业工程标签，以及那张写着“705”和几个夜间时段的便签。<br><br>徐洲的手机关机。第二天公司说他没有来上班。');
  }else if(c==='THE QUESTION'){
    setHTML(body,'你先和陈阿姨下了楼。到了便利店门口，你才把绿色标签和收件纸拍给徐洲。<br><br>对方显示“正在输入”很久。<br><br>最后只来了一句：<br><b>“门锁没坏吧？”</b><br><br>你没有回复，把聊天截图和今晚的记录一起交给接警员。');
  }else if(c==='THE RECORDING'){
    setHTML(body,'你和陈阿姨直接下楼。旧手机在你刚才核对衣柜背板时已经留在床头柜上，镜头始终朝向衣柜。<br><br>凌晨01:17，录像里的衣柜背板从里面慢慢推开。一个人只露出半边肩膀，停了很久。<br><br>他似乎在听。走廊远处的电梯提示音响了一声，那个人很快退回黑暗。<br><br>录像没有拍清脸，却完整拍到了进入方式。第二天，705与704之间的旧设备检修夹道被警方封存。');
  }else if(c==='YOU WERE CHOSEN'||c==='THE ROUTINE'){
    setText(code,'THE ROUTINE');setText(title,'隐藏结局 · 作息表');
    setHTML(body,'你和陈阿姨先下了楼，把今晚拍下的照片、聊天记录和时间记录一起交给警方。你没有再回705收拾。<br><br>等候时，你重新翻了一遍另外几条细节：21:36的小区东门便利店小票、搬家照里徐洲钥匙圈上的绿色硬塑料标签、704门框的新擦痕、卫生间陌生的薄荷味、夹道里的旧充电线，以及那张只写着“705”和几个夜间时段的便签。<br><br>三个月前，徐洲发过这套房源链接，也来帮过你搬家。旧聊天本身很普通；真正改变含义的是后来出现的物业标签、704使用痕迹、夹道物品和作息记录。<br><br>今晚没有贵重物品丢失。被碰过的却是窗帘、牙刷、手巾、充电线和日常杯子。<br><br>你不知道这一切究竟从什么时候开始，也没有证据替他解释原因。你只把能确认的事实留给警方。<br><br>第二天，在物业和警方陪同下，你搬离705，换了号码，也申请了调岗。<br><br>两周后，新办公室前台收到一个没有寄件人的纸箱。<br><br>里面是一双和705玄关同款、同尺码的新拖鞋。<br><br>左右并排摆得整整齐齐。');
  }
}
function polishPaywall(){
  const overlay=$('#paywall-overlay');if(!overlay)return;
  const body=overlay.querySelector('.paywall-msg-body');
  if(body)setHTML(body,'如果你玩到这里觉得还不错，愿意留下 <strong>1元</strong> 自愿支持，我会把它继续用在网页悬疑的素材、测试和后续更新上。');
  const last=overlay.querySelector('.paywall-msg-warm2');setText(last,'不支持也完全没关系。剧情、提示、结局和二周目都不会受影响。');
}
function polishStructureTerms(root){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const p=n.parentElement;if(!p||['SCRIPT','STYLE'].includes(p.tagName))return;
    let t=n.nodeValue;
    t=t.replaceAll('共用旧检修竖井','旧设备检修夹道')
       .replaceAll('旧检修竖井','旧设备检修夹道')
       .replaceAll('检修竖井','检修夹道')
       .replaceAll('旧管线检修夹道','旧设备检修夹道');
    if(t!==n.nodeValue)n.nodeValue=t;
  });
}

function polishModal(){
  const root=$('#modalContent');if(!root||!root.children.length)return;
  const card=root.closest('.modal-card');if(card)card.classList.remove('logic-memory-card');
  const title=root.querySelector('h2')?.textContent.trim()||'';
  if(title==='22:48')polishIntro(root);
  if(['玄关的拖鞋','冰箱','入户门','餐桌边','客厅角落','垃圾桶','茶几和沙发','客厅窗边','沙发','窗帘','卧室窗帘','床头插座','床头相框','衣柜','地垫','洗手台','牙杯','手巾','镜子'].includes(title))polishInspection(root,title);
  if(title==='防盗链')polishChain(root);
  if(['704房门','维修通知'].includes(title))polishHallInspection(root,title);
  if(title==='位置')polishMap(root);
  if(title==='07:12 · 记忆核对')polishMemory(root);
  if(title==='时间线 · 第一步'||title==='时间线 · 第二步')polishTimeline(root,title);
  if(title==='房东周先生 · 电话')polishContact(root);
  if(title==='手机')polishPhone(root);
  if(title==='搜索聊天记录')polishChatSearch(root);
  if(title==='徐洲 · 三个月前')polishOldChat(root);
  if(title==='随手记下的事')polishNotes(root);
  if(title==='703 · 陈阿姨')polishNeighbor(root);
  if(title==='入口路径推理')polishRoute(root);
  if(title==='衣柜背板')polishGap(root);
  if(title==='身份交叉')polishIdentity(root);
  if(title.startsWith('当前页提示'))polishHint(root,title);
  if(title==='23:54 · 你怎么过今晚')polishEndingChoice(root);
  if(title.startsWith('结局档案'))polishArchive(root);
  if(root.querySelector('.ending'))polishEnding(root);
  polishStructureTerms(root);
}

function polishEvent(){
  const layer=$('#eventLayer');if(!layer)return;const el=layer.querySelector('.event-text');if(!el)return;const t=el.textContent||'';
  if(t.includes('房东的回答排除了最简单的解释'))setHTML(el,'23:08。通话结束。<br>周先生说自己今天没有进入705，备用钥匙仍在他手里；704目前空置等整改，今天施工只在公共区域。');
  else if(t.includes('三处细节都可以单独解释'))setText(el,'22:57。你想起早上出门前，手机里留过一张随手拍的照片。');
  else if(t.includes('你需要停止继续翻东西'))setText(el,'23:20。手机屏幕亮了一下。公司电脑登录、门禁、打车和门锁记录都还留着。');
  else if(t.includes('三处信息开始互相咬合'))setText(el,'23:37。你把刚才在七楼记下的几条内容重新翻了一遍。');
  else if(t.includes('夹层里第一次出现了一个具体名字'))setText(el,'23:47。揉皱的收件纸上写着：徐洲。');
  else if(t.includes('21:36，一张来自你家里的小票已经存在')){
    setHTML(el,'21:36，小区东门便利店打印了那张小票。<br>21:28–22:18，办公区没有你的离场记录，同时你的电脑持续有操作；22:18你才刷卡离开办公区。<br><br>那张21:36的小票后来出现在705垃圾袋里。<br><br>玄关方向传来一声很轻的金属碰响。');
  }
  else if(t.includes('这条路线至少在结构上成立'))setHTML(el,'23:42。陈阿姨把703的门开着，站在走廊。<br>你让她在705门外等着，入户门保持敞开；你只进卧室核对柜体这一侧。');
  else if(t.includes('纸上出现了“徐洲”'))setHTML(el,'23:47。废纸的收件人栏写着：徐洲。<br>陈阿姨还在705门外，你已经退到卧室门口。');
  else if(t.includes('手机在口袋里震了两下'))setHTML(el,'23:52。你已经回到703门口。<br>手机在口袋里震了两下。<br>徐洲：到家了吗？');
  else if(t.includes('坐在沙发上其实看不见卧室门口'))layer.innerHTML='';
}
function polishToast(){
  const el=$('#toast');if(!el||el.classList.contains('hidden'))return;const t=el.textContent||'';
  const map={
    '704门和维修通知还没有都看清':'走廊里还有东西没看完。',
    '现在还没有充分理由去敲邻居和查704':'你暂时没有出去。',
    '还缺“谁帮你搬家”这条关系信息':'人物关系还没有闭合。',
    '路线或支持事实里还有越界/弱证据':'这组候选路线和材料还对不上。',
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
    const wrapped=function(){if(!xuHistoryUnlocked()){const mc=$('#modalContent');if(mc){mc.innerHTML=chatSearchHTML();const modal=$('#modal');modal?.classList.remove('hidden');polishModal()}return}return read()};wrapped.__logicWrapped=true;wrapped.__logicOriginal=read;window.__readXuHistory=wrapped;
  }
  window.__logicSearchChat=function(){const input=$('#logicChatSearchInput');const q=(input?.value||'').trim().replace(/\s+/g,'');if(!q){showToast('输入一个姓名或关键词。');return}if(q.includes('徐洲')||q.toLowerCase()==='xu'){const fn=window.__readXuHistory?.__logicOriginal;if(typeof fn==='function')return fn();}showToast('没有找到匹配的旧聊天。')};
}
function wrapNeighborFlow(){
  const ask=window.__neighborAsk,finish=window.__finishNeighbor;
  if(typeof ask==='function'&&!ask.__logicWrapped){const wrapped=function(id){const q=((state().flags||{}).neighborTopics)||[];if(id==='time'&&!q.includes('people')){showToast('先把前一个问题问完。');return}return ask(id)};wrapped.__logicWrapped=true;window.__neighborAsk=wrapped}
  if(typeof finish==='function'&&!finish.__logicWrapped){const wrapped=function(){const q=((state().flags||{}).neighborTopics)||[];if(!q.includes('people')||!(q.includes('noise')||q.includes('time'))){showToast('还少一条邻居亲眼或亲耳确认的细节。');return}return finish()};wrapped.__logicWrapped=true;window.__finishNeighbor=wrapped}
}
function navigateByLabel(label){
  const btn=[...document.querySelectorAll('#quickNav button')].find(b=>(b.textContent||'').includes(label));
  if(btn&&!btn.disabled){btn.click();return true}return false;
}
function wrapTimelineFlow(){
  const open=window.__timeline;if(typeof open==='function'&&!open.__logicWrapped){
    const wrapped=function(){const s=state();if(!QA_MODE&&(s.scene||$('#game')?.dataset.scene)!=='living')navigateByLabel('客厅');return open.apply(this,arguments)};
    wrapped.__logicWrapped=true;window.__timeline=wrapped;
  }
}
function wrapGapExit(){
  const close=window.__closeGap;if(typeof close==='function'&&!close.__logicWrapped){
    const wrapped=function(){return close.apply(this,arguments)};
    wrapped.__logicWrapped=true;window.__closeGap=wrapped;
  }
}
function wrapIdentityFlow(){
  const check=window.__identityCheck;if(typeof check==='function'&&!check.__logicWrapped){
    const wrapped=function(){const r=check.apply(this,arguments);if(!QA_MODE)afterPaint(()=>{const s=state();if(Number(s.stage)===STAGE.FINAL)navigateByLabel('七楼走廊')});return r};
    wrapped.__logicWrapped=true;window.__identityCheck=wrapped;
  }
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
    timelineWrapped:!!window.__timeline?.__logicWrapped,gapExitWrapped:!!window.__closeGap?.__logicWrapped,identityWrapped:!!window.__identityCheck?.__logicWrapped,
    sidebarMap:!!$('#logicSidebarMap'),modalPresent:!!$('#modalContent'),gameQaPresent:!!window.__GAME_QA__,routeCandidate:typeof polishRoute==='function',scheduleNote:typeof polishGap==='function',endingMotive:typeof polishEnding==='function'
  };
  window.__LOGIC_FIX_QA__={version:LOGIC_FIX_VERSION,checks,pass:Object.values(checks).every(Boolean),state:()=>state(),hasUnfinishedSave};
}
function init(){
  normalizeStoredSave();wrapNeighborFlow();wrapMemoryFlow();wrapXuHistory();wrapTimelineFlow();wrapGapExit();wrapIdentityFlow();wrapSaveActions();ensureSidebarMap();installObservers();polishHUD();polishModal();polishEvent();polishPaywall();polishTitleButtons();selfCheck();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
