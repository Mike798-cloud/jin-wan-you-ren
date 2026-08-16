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
  else if(clues.includes('shaftNotice'))setText(note,'维修通知：704 与 705 之间有旧管线检修夹道。');
  else setText(note,'七楼走廊');
}

function polishIntro(root){
  const ps=[...root.querySelectorAll(':scope > p')];
  const door=ps.find(p=>p.textContent.includes('七楼电梯口摸到钥匙'));
  setText(door,'你在七楼电梯口摸到钥匙，走到705门前。锁舌和门框没有明显损伤。钥匙转开后，门能完全推开；防盗链垂在门侧。');
  const shoe=ps.find(p=>p.textContent.includes('它们的位置不对'));
  setHTML(shoe,'左脚朝里，右脚压在鞋柜边。');
  const tutorial=ps.find(p=>p.classList.contains('muted'));
  setText(tutorial,'画面不会标出可调查点。按自己的顺序看看房间。');
}
function polishInspection(root,title){
  const s=state(),st=Number(s.stage)||0,p=root.querySelector(':scope > p');if(!p)return;
  const text={
    '玄关的拖鞋':'左脚朝里，右脚压在鞋柜边。你记得早上扫地时，把两只拖鞋并排推到了柜子下面。',
    '冰箱':'你拉开冰箱。最上层多了一瓶你从不买的普通矿泉水，瓶盖已经拧开过；你平时只买苏打水。',
    '入户门':'锁舌、门框和猫眼都没有明显撬动痕迹。你刚才用自己的机械钥匙开的门。',
    '餐桌边':'碗、杯垫和纸巾都在桌边。',
    '客厅角落':'你蹲下来拨了拨小垃圾桶。上面是纸巾团和快递塑料袋。',
    '茶几和沙发':'你把靠垫拿起来翻到背面。拉链面朝外；你平时会把这一面压在里侧。',
    '客厅窗边':'你扣了两下窗锁。锁扣仍咬合，窗框没有新鲜擦痕；窗外墙面也没有平台或外接踏脚。',
    '沙发':'你拿起靠垫看了一眼背面。拉链朝外；你平时会把拉链面压到里侧。',
    '床头插座':'你弯腰看床头柜后面。充电线插在右侧墙插，插头被柜角挤着。你一直用左侧插口，因为右侧会被柜体压住。',
    '衣柜':'你拉开柜门。衣服、纸箱和收纳袋都在柜里。',
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
    setHTML(p,'你把牙杯拿到灯下。里面有两支牙刷。<br><br>蓝色旧牙刷是你今天早上换下来、收进洗手台下方柜子里的那支。');return;
  }
  if(title==='手巾'&&st>=STAGE.CHECK){
    setText(p,'你把手巾取下来。布面留下三道等距折线，重新挂回去时能看出它被折成三折；你平时只对折一次。');return;
  }
  if(title==='镜子'&&st>=STAGE.CHECK){
    setHTML(p,'你靠近镜面。边缘有散开的水汽印，旁边残留淡淡的薄荷漱口水味。<br><br>你不用漱口水。');return;
  }
  if(title==='床头相框'){
    setHTML(p,'你把搬家合照从书下面抽出来。徐洲站在你身后，钥匙圈上挂着一枚绿色硬塑料牌。夹道里那枚也是相近的绿色硬塑料牌。');return;
  }
  if(text[title])setText(p,text[title]);
}
function polishChain(root){
  const p=root.querySelector(':scope > p');if(!p)return;
  setHTML(p,'你把门拉开一道缝，链条立刻绷紧。<br><br><b>防盗链现在扣着。</b><br><br>回家时门能完全推开，链条当时垂在门侧。从进门到现在，你没有碰过它。');
  const go=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__goHall'));
  setText(go,'取下链条，拿上手机和钥匙，到公共走廊');
}
function polishHallInspection(root,title){
  const p=root.querySelector(':scope > p');if(!p)return;
  if(title==='704房门')setHTML(p,'你蹲下看封条边缘。右下角胶面起皱，有揭开后重新按压的痕迹。<br><br>门框内侧靠锁舌的位置还有几道颜色较亮的划痕。');
  if(title==='维修通知')setHTML(p,'七楼管线改造图贴在电表旁。图上标着：<b>704 与 705 之间保留一段旧管线检修夹道</b>。<br><br>两户卧室柜体后方各有一处封板检修口。');
}
function polishMap(root){
  const s=state(),clues=isArr(s.clues)?s.clues:[],stage=Number(s.stage)||0;
  const cells=[...root.querySelectorAll('.floor-line > div')];
  if(cells[0])cells[0].innerHTML=`703<br><span class="muted">${clues.includes('neighbor')?'陈阿姨':'邻户'}</span>`;
  if(cells[1])cells[1].innerHTML=`704<br><span class="muted">${clues.includes('maintenanceCall')||stage>=STAGE.HALL?'空置维修':'邻户'}</span>`;
  if(cells[2])cells[2].innerHTML='705<br><span class="muted">你在这里</span>';
  const arrow=root.querySelector('.route-arrow');
  if(arrow){
    if(clues.includes('shaftNotice')){arrow.hidden=false;setText(arrow,'维修通知：704 与 705 之间有旧管线检修夹道');arrow.classList.remove('logic-unverified-route')}
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
  return clues.includes('delivery')||clues.includes('oldChat');
}
function polishPhone(root){
  const recent=byText(root,'.message.them.old','徐洲 · 上周四');
  if(recent)setText(recent,'徐洲 · 上周四\n周五那版表我替你收尾。附件我放群里了，明早再看。');
  const historyBtn=byText(root,'.evidence-btn','徐洲 · 三个月前')||byText(root,'.evidence-btn','搜索：徐洲');
  if(historyBtn){
    const h=historyBtn.previousElementSibling;
    const d=h&&h.previousElementSibling;
    if(!xuHistoryUnlocked()){
      historyBtn.classList.add('logic-history-locked');
      if(h&&h.tagName==='H3')h.classList.add('logic-history-locked');
      if(d&&d.classList.contains('divider'))d.classList.add('logic-history-locked');
    }else{
      historyBtn.classList.remove('logic-history-locked');
      setText(historyBtn,hasClue('oldChat')?'搜索：徐洲（已核对）':'搜索：徐洲');
      if(h&&h.tagName==='H3'){h.classList.remove('logic-history-locked');setText(h,'搜索聊天')}
      if(d)d.classList.remove('logic-history-locked');
    }
  }
  root.querySelector('.logic-phone-context')?.remove();
}
function hasClue(id){const s=state();return isArr(s.clues)&&s.clues.includes(id)}
function polishOldChat(root){
  if(root.dataset.logicOldChat==='1')return;
  root.dataset.logicOldChat='1';
  setHTML(root,`<h2>徐洲 · 三个月前</h2>
    <div class="phone-screen">
      <div class="message them old">徐洲：七楼那套还在，房租比你现在低。楼旧一点，不过晚上挺安静。</div>
      <div class="message me old">你怎么知道？</div>
      <div class="message them old">徐洲：我换到现在这家公司前，在那片物业做过一阵短期工程协助。七楼上去过几次。</div>
      <div class="message me old">我周末搬，东西不多。</div>
      <div class="message them old">徐洲：我去帮你。你一个人折腾也麻烦。</div>
      <div class="message them old">徐洲：你最近还是十点多下班？搬过去一个人住，晚了到家发个消息。门链也别总忘。</div>
      <div class="message me old">差不多。行。</div>
    </div>
    <button class="modal-action" onclick="window.__phone('messages')">返回消息</button>`);
}
function polishNotes(root){
  [...root.querySelectorAll('.optional-group .clue small')].forEach(x=>x.remove());
  const groupNames=new Map([['生活异常','生活细节'],['客观记录','时间与外部记录'],['建筑与入口','建筑与通道'],['人物与停留','人物与现场'],['证据边界','最后判断']]);
  [...root.querySelectorAll('.clue-group-title')].forEach(g=>{const node=[...g.childNodes].find(n=>n.nodeType===3);if(node&&groupNames.has(node.textContent.trim()))node.textContent=groupNames.get(node.textContent.trim())});
  const t=root.querySelector('.optional-group .clue-group-title');
  if(t&&!t.dataset.logic){t.dataset.logic='1';const node=[...t.childNodes].find(n=>n.nodeType===3);if(node)node.textContent='额外观察';}
  const optionalReplace=new Map([
    ['搬家合照里，徐洲腰间挂着同款绿色工程牌','搬家合照里，徐洲钥匙圈上挂着一枚相近的绿色硬塑料牌'],
    ['夹层里有与你床头同型号但颜色不同的旧充电线','检修夹道里有一根与床头接口规格相同、线皮颜色不同的旧充电线']
  ]);
  [...root.querySelectorAll('.optional-group .clue')].forEach(el=>{const tx=el.textContent.trim();if(optionalReplace.has(tx))setText(el,optionalReplace.get(tx))});
  const empty=[...root.querySelectorAll('p.muted')].find(x=>x.textContent.includes('还没有确认任何有效信息'));if(empty)setText(empty,'还没有记下任何内容。');
  const replacements=new Map([
    ['防盗链在你进门后仍从屋内扣着','回家时垂下的防盗链，后来处于扣合状态'],
    ['21:36屋内痕迹与22:18仍在公司形成时间矛盾','21:36便利店小票后来出现在705垃圾袋里；22:18你才离开公司'],
    ['卫生间地垫在深夜仍是新鲜潮湿','卫生间地垫中间有两处彼此分开的潮湿区域'],
    ['早上扔掉的旧牙刷重新出现在牙杯里','早上收进洗手台柜里的旧牙刷重新回到牙杯'],
    ['维修通知确认704与705共用旧检修竖井','维修通知标明704与705之间保留一段旧管线检修夹道'],
    ['现有证据更支持“704→检修竖井→705柜体后方”','优先回705核对与旧管线检修夹道相邻的柜体一侧'],
    ['衣柜背板后确实连着维修夹层','衣柜背板后实际连通一段横向旧管线检修夹道'],
    ['夹层内有绿色物业工程钥匙牌','检修夹道内有一枚印着旧物业工程编号的绿色钥匙牌'],
    ['夹层废纸的收件人写着“徐洲”','检修夹道里的收件纸写着“徐洲”'],
    ['夹层里有薄毯、水和充电线，说明有人停留过','检修夹道里有薄毯、水和充电设备；旁边便签写着“705”和几个夜间时段'],
    ['旧聊天确认徐洲帮你搬过家，也知道你的工作作息','旧聊天确认徐洲帮你搬过家；他提过曾在这片物业做短期工程协助，也问过你通常几点下班'],
    ['邻居、旧聊天与夹层废纸共同把徐洲和704路线连起来','邻居、旧聊天与检修夹道收件纸共同把徐洲和704行动连起来']
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
  const p=root.querySelector(':scope > p');
  setHTML(p,'目前哪条路线<b>最值得优先验证</b>？先选一个候选方向，再从已有记录中选三条与它直接相关的事实。');
  const h3=[...root.querySelectorAll('h3')].find(x=>x.textContent.includes('一、路线'));setText(h3,'一、最值得优先验证的路线');
  const route=[...root.querySelectorAll('button')].find(b=>b.textContent.includes('704')&&b.textContent.includes('柜体后方'));
  setText(route,'704 → 旧管线检修夹道 → 705柜体后方（待核实）');
  const fact=[...root.querySelectorAll('.evidence-btn')].find(b=>b.textContent.includes('维修通知写明704与705'));
  setText(fact,'维修通知标明704与705之间保留旧管线检修夹道');
  [...root.querySelectorAll('.evidence-btn')].forEach(btn=>{
    const click=btn.getAttribute('onclick')||'';
    if(click.includes("__routeFact('door')"))setText(btn,'703邻居最近见过帮你搬家的男人从704出来');
    if(click.includes("__routeFact('seal')"))setText(btn,'704封条有揭开重贴痕迹，门框锁舌处有新划痕');
    if(click.includes("__routeFact('key')"))setText(btn,'房东说备用钥匙仍在自己手里');
  });
  const check=[...root.querySelectorAll('button')].find(b=>b.textContent.trim()==='检查推理');setText(check,'确定优先验证方向');
}
function polishGap(root){
  const s=state(),doneIds=(s.flags&&isArr(s.flags.gapInspected))?s.flags.gapInspected:[];
  const p=root.querySelector(':scope > p');
  setText(p,'陈阿姨把703的门开着，人在走廊。705入户门也没有关。你只从卧室这一侧检查背板。');
  const result=root.querySelector('.result-warn p');
  if(result)setText(result,'背板后不是实墙，而是一段横向旧管线检修夹道，宽度只够成年人侧身通过。你留在卧室这一侧，不把身体探进去；陈阿姨还在门外。');
  const tag=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('绿色工程钥匙牌'));
  if(tag){setText(tag.querySelector('b'),'旧物业绿色钥匙牌');setText(tag.querySelector('p'),'表面印着已经磨旧的物业工程编号')}
  const cable=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('旧充电线'));
  if(cable)setText(cable.querySelector('p'),'接口规格和你床头那根相同，线皮颜色不同');
  const nest=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('薄毯、水瓶和充电宝'));
  if(nest){
    const np=nest.querySelector('p');setText(np,'旁边压着一张折过几次的小便签');
  }
  const paper=[...root.querySelectorAll('.gap-item')].find(b=>b.textContent.includes('揉皱的快递/收件纸'));
  if(paper){
    const pp=paper.querySelector('p');setText(pp,'从快递外包装撕下的收件联，收件人栏还在');
  }
  if(doneIds.includes('nest')&&!root.querySelector('.logic-schedule-note')){
    const note=document.createElement('div');note.className='logic-schedule-note';
    note.innerHTML='<b>薄毯旁的便签</b><p>纸上只有几行：<br><span>705　周一 22:40后</span><br><span>周三 22:30后</span><br><span>周五　不定</span></p>';
    const board=nest?.closest('.gap-board');if(board)board.insertAdjacentElement('afterend',note);
  }
  const close=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('__closeGap'));
  setText(close,'退出卧室，到走廊整理记录');
}
function polishIdentity(root){
  const s=state(),clues=isArr(s.clues)?s.clues:[];
  const p=root.querySelector(':scope > p');setHTML(p,'选一个人物，再从已有记录里选<b>三条</b>同时与这个人和七楼行动有关的信息。');
  [...root.querySelectorAll('.person-card')].forEach(card=>{
    const name=card.querySelector('b')?.textContent.trim(),desc=card.querySelector('span');if(!desc)return;
    if(name==='徐洲')setText(desc,'同事 · 你认识的人');
    if(name==='房东周先生')setText(desc,'房东 · 持有备用钥匙');
    if(name==='物业旧工程员')setText(desc,'物业旧工程员 · 具体身份未知');
  });
  [...root.querySelectorAll('.evidence-btn')].forEach(btn=>{
    const click=btn.getAttribute('onclick')||'';
    if(click.includes("__identityFact('neighbor')"))setText(btn,'邻居：最近见过帮你搬家的男人从704出来');
    if(click.includes("__identityFact('delivery')"))setText(btn,'检修夹道收件联：收件人写着“徐洲”');
    if(click.includes("__identityFact('tag')"))setText(btn,'检修夹道：旧物业工程编号绿色钥匙牌');
    if(click.includes("__identityFact('key')"))setText(btn,'房东：备用钥匙仍在自己手里');
    if(click.includes("__identityFact('receipt')"))setText(btn,'21:36便利店小票后来出现在705垃圾袋里');
  });
  const old=byText(root,'.evidence-btn','旧聊天：');
  if(old&&clues.includes('oldChat'))setText(old,'旧聊天：徐洲帮过你搬家，也提到曾在这片物业做短期工程协助');
  if(old&&!clues.includes('oldChat')){setText(old,'旧聊天：尚未核对');old.disabled=true;old.classList.add('logic-locked-evidence')}
  const warn=root.querySelector('.result-warn');
  if(warn&&!clues.includes('oldChat'))setHTML(warn,'<p>人物关系还有一处没有闭合。你可以先退出，继续翻已经拥有的记录。</p>');
}

function polishHint(root,title){
  if(!title.startsWith('当前页提示'))return;
  const s=state(),st=Number(s.stage)||0;
  if(st===STAGE.ROUTE){
    const steps=[...root.querySelectorAll('.hint-step')];
    const hints=[
      '把“705正门”“704使用痕迹”和“楼内相邻结构”分开看。',
      '最直接的三条是：邻居看见熟人从704出来、704封条/门框有近期使用痕迹、维修通知标出704与705之间的检修夹道。',
      '路线选择“704 → 旧管线检修夹道 → 705柜体后方（待核实）”，再选上面三条。'
    ];
    steps.forEach((el,i)=>{if(hints[i]){const b=el.querySelector('b');el.innerHTML='';if(b){const nb=document.createElement('b');nb.textContent=String(i+1);el.appendChild(nb);el.appendChild(document.createTextNode('　'+hints[i]))}else el.textContent=hints[i]}});
  }
}

function polishEndingChoice(root){
  const p=root.querySelector(':scope > p');setText(p,'23:54。手机、钥匙和证件都在身上。705的门保持敞开，陈阿姨站在703门口。');
  const leave=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__end('leave')"));
  const ask=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__end('ask')"));
  const trap=[...root.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("__end('trap')"));
  if(leave){const span=leave.querySelector('.muted');setText(span,'和陈阿姨一起下楼，到明亮处报警。')}
  if(ask){const span=ask.querySelector('.muted');setText(span,'先下楼，再把工程牌和收件纸照片发给他。')}
  if(trap){const span=trap.querySelector('.muted');setText(span,'只回卧室几十秒放好旧手机，随后立刻离开。')}
  const secret=[...root.querySelectorAll('button')].find(b=>b.textContent.includes('隐藏选择'));
  if(secret){
    const b=secret.querySelector('b');setText(b,'隐藏选择 · 今晚不再回705');
    const span=secret.querySelector('.muted');setText(span,'把五条额外记录和夹道里的“705”便签一起带走。');
  }
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
  const ps=[...ending.querySelectorAll(':scope > p')];
  const body=ps[2];
  const c=code?.textContent.trim();
  if(c==='THE SAFE DISTANCE'){
    setHTML(body,'23:58，你和陈阿姨一起下到一楼，在两条街外的24小时便利店里报警。<br><br>警察和物业进入704后，在旧管线检修夹道里找到薄毯、充电宝、一次性杯子、旧工程钥匙，以及那张写着“705”和几个夜间时段的便签。<br><br>徐洲的手机关机。第二天公司说他没有来上班。');
  }else if(c==='THE QUESTION'){
    setHTML(body,'你先和陈阿姨下了楼。到了便利店门口，你才把工程牌和收件纸拍给徐洲。<br><br>对方显示“正在输入”很久。<br><br>最后只来了一句：<br><b>“门锁没坏吧？”</b><br><br>你没有回复，把聊天截图和今晚的记录一起交给接警员。');
  }else if(c==='THE RECORDING'){
    setHTML(body,'陈阿姨站在705门口替你看着走廊。你只回卧室几十秒，把旧手机架在书架上，镜头朝向衣柜，然后和她一起下楼。<br><br>凌晨01:17，录像里的衣柜背板从里面慢慢推开。一个人只露出半边肩膀，停了很久。<br><br>他似乎在听。<br><br>镜头外的旧闹钟突然响起，那个人立刻退回黑暗。<br><br>录像没有拍清脸，却完整拍到了进入方式。第二天，704和705之间的旧管线检修夹道被警方封存。');
  }else if(c==='YOU WERE CHOSEN'||c==='THE ROUTINE'){
    setText(code,'THE ROUTINE');setText(title,'隐藏结局 · 作息表');
    setHTML(body,'你和陈阿姨先下了楼，把今晚拍下的照片、聊天记录和时间记录一起交给警方。你没有再回705收拾。<br><br>等候时，你重新翻了一遍另外几条细节：21:36的小票、搬家照里徐洲钥匙圈上的绿色硬塑料牌、704门框的新划痕、卫生间陌生的薄荷味、夹道里的旧充电线，以及那张只写着“705”和几个夜间时段的便签。<br><br>三个月前，徐洲把这套房源发给你，也来帮过你搬家。旧聊天里，他提过自己以前在这片物业做过短期工程协助，还问过你通常几点下班。那些话当时都很普通。<br><br>今晚没有贵重物品丢失。被动过的却是拖鞋、窗帘、牙刷、手巾、充电线这些日常东西。<br><br>你不知道这一切究竟从什么时候开始，也没有证据替他解释原因。你只把能确认的事实留给警方。<br><br>第二天，在物业和警方陪同下，你搬离705，换了号码，也申请了调岗。<br><br>两周后，新办公室前台收到一个没有寄件人的纸箱。<br><br>里面是一双和705玄关同款、同尺码的新拖鞋。<br><br>左右并排摆得整整齐齐。');
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
    t=t.replaceAll('共用旧检修竖井','旧管线检修夹道')
       .replaceAll('旧检修竖井','旧管线检修夹道')
       .replaceAll('检修竖井','检修夹道');
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
  if(t.includes('房东的回答排除了最简单的解释'))setHTML(el,'23:08。通话结束。<br>周先生说自己今天没有进入705，备用钥匙仍在他手里；704白天有人施工。');
  else if(t.includes('三处细节都可以单独解释'))setText(el,'22:57。你想起早上出门前，手机里留过一张随手拍的照片。');
  else if(t.includes('你需要停止继续翻东西'))setText(el,'23:20。手机屏幕亮了一下。公司门禁、打车和门锁记录还留在“记录”里。');
  else if(t.includes('三处信息开始互相咬合'))setText(el,'23:37。你把刚才在七楼记下的几条内容重新翻了一遍。');
  else if(t.includes('夹层里第一次出现了一个具体名字'))setText(el,'23:47。揉皱的收件纸上写着：徐洲。');
  else if(t.includes('21:36，一张来自你家里的小票已经存在')){const where=(state().scene||$('#game')?.dataset.scene||'entry')==='entry'?'':'<br><br>屋里某处传来一声很轻的金属碰响。';setHTML(el,'21:36，那张便利店小票已经打印。<br>22:18，你才刷卡离开公司。<br><br>这张小票后来出现在705的垃圾袋里。'+where)}
  else if(t.includes('这条路线至少在结构上成立'))setHTML(el,'23:42。陈阿姨把703的门开着，人在走廊。<br>你没有把705的门关上，只回卧室检查柜体外侧。');
  else if(t.includes('纸上出现了“徐洲”'))setHTML(el,'23:47。<br>废纸的收件人栏写着：徐洲。');
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
    const wrapped=function(){if(!xuHistoryUnlocked()){showToast('当前没有明确的搜索关键词。');return}return read()};wrapped.__logicWrapped=true;window.__readXuHistory=wrapped;
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
    sidebarMap:!!$('#logicSidebarMap'),modalPresent:!!$('#modalContent'),gameQaPresent:!!window.__GAME_QA__,routeCandidate:typeof polishRoute==='function',scheduleNote:typeof polishGap==='function',endingMotive:typeof polishEnding==='function'
  };
  window.__LOGIC_FIX_QA__={checks,pass:Object.values(checks).every(Boolean),state:()=>state(),hasUnfinishedSave};
}
function init(){
  normalizeStoredSave();wrapNeighborFlow();wrapMemoryFlow();wrapXuHistory();wrapSaveActions();ensureSidebarMap();installObservers();polishHUD();polishModal();polishEvent();polishPaywall();polishTitleButtons();selfCheck();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
