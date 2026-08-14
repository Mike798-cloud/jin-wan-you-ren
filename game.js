(() => {
'use strict';

const SAVE_KEY='tonight_someone_was_here_v2';
const OLD_SAVE_KEY='tonight_someone_was_here_v1';
const META_KEY='tonight_someone_was_here_meta';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

const els={
  title:$('#titleScreen'),game:$('#game'),start:$('#startBtn'),cont:$('#continueBtn'),review:$('#reviewBtn'),archive:$('#endingArchiveBtn'),
  sceneName:$('#sceneName'),clock:$('#clock'),stageLabel:$('#stageLabel'),img:$('#sceneImage'),hotspots:$('#hotspots'),event:$('#eventLayer'),
  objective:$('#objective'),objectiveSide:$('#objectiveSide'),clueCount:$('#clueCount'),danger:$('#dangerText'),nav:$('#quickNav'),
  progressBar:$('#progressBar'),progressText:$('#progressText'),modal:$('#modal'),modalContent:$('#modalContent'),modalClose:$('#modalClose'),toast:$('#toast')
};

const SCENES={
  entry:{name:'玄关 / 厨房',img:'assets/img/kitchen.webp'},
  living:{name:'客厅',img:'assets/img/living.webp'},
  bedroom:{name:'卧室',img:'assets/img/bedroom.webp'},
  bathroom:{name:'卫生间',img:'assets/img/bathroom.webp'},
  hallway:{name:'七楼走廊',img:'assets/img/hallway.webp'}
};

const STAGE={HOME:0,MEMORY:1,CONTACT:2,CHECK:3,TIMELINE:4,CHAIN:5,HALL:6,ROUTE:7,GAP:8,IDENTITY:9,FINAL:10,END:11};
const STAGE_INFO={
  [STAGE.HOME]:['第一段 · 回家','刚刚回家'],
  [STAGE.MEMORY]:['第二段 · 记忆','核对早晨'],
  [STAGE.CONTACT]:['第三段 · 谁来过','确认钥匙与维修'],
  [STAGE.CHECK]:['第四段 · 二次排查','把“巧合”一件件排除'],
  [STAGE.TIMELINE]:['第五段 · 时间','重建今晚的空档'],
  [STAGE.CHAIN]:['第六段 · 门','判断门锁之外的可能'],
  [STAGE.HALL]:['第七段 · 七楼','调查704与邻居'],
  [STAGE.ROUTE]:['第八段 · 入口','把进入路线拼出来'],
  [STAGE.GAP]:['第九段 · 墙后','分层检查维修夹层'],
  [STAGE.IDENTITY]:['第十段 · 名字','把“认识的人”与证据连起来'],
  [STAGE.FINAL]:['第十一段 · 今晚','只做证据允许的判断'],
  [STAGE.END]:['结束','今晚暂时结束']
};

const objectives={
  [STAGE.HOME]:'先检查最不对劲的三处细节，不要急着给它们下结论。',
  [STAGE.MEMORY]:'用早晨留下的客观记录，确认自己有没有记错。',
  [STAGE.CONTACT]:'问清备用钥匙、房东行踪和704维修，不要只问“有人来过吗”。',
  [STAGE.CHECK]:'重新检查客厅、卧室和卫生间，寻找能互相印证的异常。',
  [STAGE.TIMELINE]:'打开手机“记录”，把今晚的时间线排清楚，再找出真正矛盾的两条。',
  [STAGE.CHAIN]:'回到入户门。门锁没坏，不代表门就是唯一入口。',
  [STAGE.HALL]:'检查704、维修通知和703邻居。三处都问清楚再作判断。',
  [STAGE.ROUTE]:'打开“记事”，用现有事实拼出最合理的进入路线。',
  [STAGE.GAP]:'回卧室检查衣柜背板。先看痕迹，再决定要不要动它。',
  [STAGE.IDENTITY]:'名字出现了，但名字不是结论。把徐洲和704/夹层真正连起来。',
  [STAGE.FINAL]:'查看徐洲的新消息，并区分“已经证明”与“只是害怕”。',
  [STAGE.END]:'今晚结束了。你可以回看结局档案，或从中段快速复盘。'
};

const clueDefs={
  shoes:'拖鞋位置和早晨不一致',bottle:'冰箱里多出一瓶开过的矿泉水',wetmat:'卫生间地垫在深夜仍是新鲜潮湿',photoBaseline:'07:12照片确认了早晨的玄关基线',
  landlordVisit:'房东确认今天没有进入705',landlordKey:'备用钥匙一直在房东手里',maintenanceCall:'704今天确实处于空置维修状态',
  twoCups:'垃圾桶里有两个同款一次性咖啡杯',toothbrush:'早上扔掉的旧牙刷重新出现在牙杯里',curtain:'卧室窗帘和早晨状态不一致',charger:'床头充电线被换到了你从不用的插座',towel:'卫生间手巾的折法被改变',
  timeline:'21:36屋内痕迹与22:18仍在公司形成时间矛盾',chain:'防盗链在你进门后仍从屋内扣着',
  maintenance:'704封条被重新粘过',shaftNotice:'维修通知确认704与705共用旧检修竖井',neighbor:'703邻居见过帮你搬家的男人从704出来',route:'现有证据更支持“704→检修竖井→705柜体后方”',
  freshScrew:'衣柜背板两颗螺丝有新鲜金属刮痕',fiber:'柜体下沿有不属于你家的灰色纤维和鞋底尘',gap:'衣柜背板后确实连着维修夹层',tag:'夹层内有绿色物业工程钥匙牌',delivery:'夹层废纸的收件人写着“徐洲”',nest:'夹层里有薄毯、水和充电线，说明有人停留过',
  oldChat:'旧聊天确认徐洲帮你搬过家，也知道你的工作作息',identity:'邻居、旧聊天与夹层废纸共同把徐洲和704路线连起来',finalBoundary:'你确认了徐洲具备进入条件，但没有把“他此刻还在屋里”当成已证事实'
};

const optDefs={
  receipt:'垃圾袋里有21:36便利店小票；那时你仍在公司',movingPhoto:'搬家合照里，徐洲腰间挂着同款绿色工程牌',scratch:'704门框内侧有反复顶锁留下的新划痕',scent:'镜面附近残留你从不用的薄荷漱口水味',chargerCable:'夹层里有与你床头同型号但颜色不同的旧充电线',cushion:'客厅靠垫被翻到你平时不用的一面'
};

const requiredCheck=['twoCups','toothbrush','curtain','charger','towel'];
const hiddenEndingOpts=['receipt','movingPhoto','scratch','scent'];

function defaultState(){return {
  version:2,stage:STAGE.HOME,scene:'entry',time:'22:48',clues:[],optional:[],visited:['entry'],ending:null,
  flags:{ambient:true,introSeen:false,reviewMode:false,memorySelected:[],landlordQuestions:[],timelineSeq:[],timelinePhase:1,timelineSolved:false,neighborTopics:[],routeChoice:null,routeFacts:[],routeSolved:false,gapInspected:[],gapPanelOpen:false,identityPerson:null,identityFacts:[],identitySolved:false,finalMessageRead:false,finalInference:false},
  hints:{},startedAt:Date.now()
};}
function defaultMeta(){return {endingsSeen:[],completed:false};}
let state=defaultState();
let meta=loadMeta();
let audioCtx=null,ambientNodes=[],ambientTimer=null;

function loadMeta(){try{return {...defaultMeta(),...JSON.parse(localStorage.getItem(META_KEY)||'{}')}}catch(e){return defaultMeta()}}
function saveMeta(){try{localStorage.setItem(META_KEY,JSON.stringify(meta))}catch(e){}}
function safeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(e){}}
function clearSave(){try{localStorage.removeItem(SAVE_KEY);localStorage.removeItem(OLD_SAVE_KEY)}catch(e){}}
function has(id){return state.clues.includes(id)}
function hasOpt(id){return state.optional.includes(id)}
function addUnique(arr,id){if(!arr.includes(id))arr.push(id)}

function migrateOld(old){
  const s=defaultState();
  if(old&&Array.isArray(old.clues)) s.clues=old.clues.filter(id=>clueDefs[id]);
  if(old&&Array.isArray(old.optional)) s.optional=old.optional.filter(id=>optDefs[id]);
  if(old&&SCENES[old.scene]) s.scene=old.scene;
  if(old&&old.flags&&old.flags.ambient===false) s.flags.ambient=false;
  const st=Number(old&&old.stage)||0;
  if(st>=1){s.stage=STAGE.MEMORY;s.time='22:56'}
  if(st>=2){['photoBaseline','landlordVisit','landlordKey','maintenanceCall'].forEach(x=>addUnique(s.clues,x));s.flags.landlordQuestions=['visit','key','maintenance'];s.stage=STAGE.CHECK;s.time='23:08'}
  if(st>=3){requiredCheck.forEach(x=>addUnique(s.clues,x));addUnique(s.optional,'receipt');addUnique(s.clues,'timeline');s.flags.timelineSolved=true;s.stage=STAGE.CHAIN;s.time='23:24'}
  if(st>=4){addUnique(s.clues,'chain');s.stage=STAGE.HALL;s.scene='hallway';s.time='23:31'}
  if(st>=5){['maintenance','shaftNotice','neighbor','route'].forEach(x=>addUnique(s.clues,x));addUnique(s.optional,'scratch');s.flags.routeSolved=true;s.stage=STAGE.GAP;s.scene='bedroom';s.time='23:42'}
  if(st>=6){['freshScrew','fiber','gap','tag','delivery','nest','oldChat','identity','finalBoundary'].forEach(x=>addUnique(s.clues,x));s.flags.gapPanelOpen=true;s.flags.identitySolved=true;s.flags.finalInference=true;s.stage=STAGE.FINAL;s.time='23:52'}
  if(st>=7){s.stage=STAGE.END;s.ending=old.ending||'leave'}
  return s;
}
function load(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(raw){state={...defaultState(),...JSON.parse(raw)};state.flags={...defaultState().flags,...(state.flags||{})};state.hints=state.hints||{};return true}
    const oldRaw=localStorage.getItem(OLD_SAVE_KEY);
    if(oldRaw){state=migrateOld(JSON.parse(oldRaw));safeSave();try{localStorage.removeItem(OLD_SAVE_KEY)}catch(e){}return true}
  }catch(e){}
  return false;
}

function toast(msg){els.toast.textContent=msg;els.toast.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.add('hidden'),1900)}
function openModal(html,closable=true,wide=false){els.modalContent.innerHTML=html;els.modal.classList.remove('hidden');els.modalClose.style.display=closable?'block':'none';els.modal.dataset.closable=closable?'1':'0';els.modal.querySelector('.modal-card').classList.toggle('wide',!!wide);setTimeout(()=>{const h=els.modalContent.querySelector('h2');if(h&&!h.id)h.id='modalTitle'},0)}
function closeModal(force=false){if(!force&&els.modal.dataset.closable==='0')return;els.modal.classList.add('hidden');els.modalContent.innerHTML='';els.modal.querySelector('.modal-card').classList.remove('wide')}
els.modalClose.onclick=()=>closeModal();els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
function eventText(text,duration=4700){els.event.innerHTML=`<div class="event-text">${text}</div>`;clearTimeout(eventText.t);eventText.t=setTimeout(()=>els.event.innerHTML='',duration)}

function ensureAudio(){
  if(state.flags.ambient===false)return null;
  try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch(e){return null}
}
function startAmbient(){
  if(state.flags.ambient===false||ambientNodes.length)return;
  const ctx=ensureAudio();if(!ctx)return;
  const master=ctx.createGain();master.gain.value=.035;master.connect(ctx.destination);
  const low=ctx.createOscillator();low.type='sine';low.frequency.value=46;const lowG=ctx.createGain();lowG.gain.value=.09;low.connect(lowG).connect(master);low.start();
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.17;
  const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;const ng=ctx.createGain();ng.gain.value=.035;noise.connect(filter).connect(ng).connect(master);noise.start();
  ambientNodes=[low,lowG,noise,filter,ng,master];
  ambientTimer=setInterval(()=>{if(els.game.classList.contains('hidden')||state.flags.ambient===false)return;const r=Math.random();if(r<.34)playPipe();else if(r<.52&&state.stage>=STAGE.CHECK)playMetal(false)},26000);
}
function stopAmbient(){clearInterval(ambientTimer);ambientTimer=null;try{ambientNodes.forEach(n=>{if(n.stop)n.stop();if(n.disconnect)n.disconnect()})}catch(e){}ambientNodes=[]}
function playTone(freq=180,dur=.15,type='sine',gain=.025,delay=0){const ctx=ensureAudio();if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,ctx.currentTime+delay);g.gain.linearRampToValueAtTime(gain,ctx.currentTime+delay+.01);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+dur);o.connect(g).connect(ctx.destination);o.start(ctx.currentTime+delay);o.stop(ctx.currentTime+delay+dur+.03)}
function playPipe(){playTone(112,.2,'sine',.012);playTone(83,.28,'sine',.008,.11)}
function playMetal(strong=true){playTone(920,.08,'triangle',strong?.032:.012);playTone(610,.12,'triangle',strong?.023:.008,.06)}
function playBuzz(){playTone(146,.09,'square',.018);playTone(146,.09,'square',.018,.15)}

function addClue(id,optional=false,silent=false){
  const arr=optional?state.optional:state.clues;if(arr.includes(id))return false;arr.push(id);if(!silent)toast(optional?'发现额外信息':'记住了一条有效信息');safeSave();renderUI();checkAutoAdvance();return true;
}
function setStage(stage,time){if(stage>state.stage)state.stage=stage;if(time)state.time=time;safeSave();renderUI()}
function checkAutoAdvance(){
  if(state.stage===STAGE.HOME&&['shoes','bottle','wetmat'].every(has)){
    setStage(STAGE.MEMORY,'22:57');setTimeout(()=>eventText('三处细节都可以单独解释。<br>真正让你不舒服的是：它们同时出现了。'),180);
  }
  if(state.stage===STAGE.CHECK&&requiredCheck.every(has)){
    setStage(STAGE.TIMELINE,'23:20');setTimeout(()=>{playBuzz();eventText('你需要停止继续翻东西。<br>先把今晚的时间排清楚。手机里有公司签退、打车和门锁记录。')},220);
  }
  if(state.stage===STAGE.HALL&&['maintenance','shaftNotice','neighbor'].every(has)){
    setStage(STAGE.ROUTE,'23:37');setTimeout(()=>eventText('三处信息开始指向同一个方向。<br>但在拆衣柜之前，你需要先证明“另一条入口”真的比复制钥匙更合理。'),220);
  }
  if(state.stage===STAGE.GAP&&['tag','delivery','nest'].every(has)){
    setStage(STAGE.IDENTITY,'23:47');setTimeout(()=>eventText('夹层里出现了一个名字。<br>但名字不是结论——你还需要证明这个名字和“帮你搬家的人”是同一个人。'),220);
  }
}

function renderUI(){
  const scene=SCENES[state.scene]||SCENES.entry;els.sceneName.textContent=scene.name;els.clock.textContent=state.time;els.objective.textContent=objectives[state.stage]||'';els.objectiveSide.textContent=objectives[state.stage]||'';els.clueCount.textContent=state.clues.length;
  const si=STAGE_INFO[state.stage]||['调查',''];els.stageLabel.textContent=si[0];const pct=Math.max(2,Math.min(100,Math.round((state.stage/STAGE.END)*100)));els.progressBar.style.width=`${pct}%`;els.progressText.textContent=si[1];
  const n=state.clues.length;els.danger.textContent=n<4?'也许只是你记错了。':n<9?'越来越难解释成巧合。':n<15?'这个家现在并不安全。':'不要再假设你掌握了全部情况。';
  renderNav();renderScene();updateTitleButtons();
}
function go(scene){if(scene==='hallway'&&state.stage<STAGE.HALL){toast('现在还没有充分理由去敲邻居和查704');return}state.scene=scene;if(!state.visited.includes(scene))state.visited.push(scene);safeSave();renderUI()}
function renderNav(){const order=['entry','living','bedroom','bathroom','hallway'];els.nav.innerHTML='';order.forEach(id=>{const b=document.createElement('button');const locked=id==='hallway'&&state.stage<STAGE.HALL;b.textContent=SCENES[id].name;b.className=(id===state.scene?'current ':'')+(locked?'locked':'');b.disabled=locked;b.onclick=()=>go(id);els.nav.appendChild(b)})}
function hs(id,x,y,w,h,fn,label){const b=document.createElement('button');b.className='hotspot';b.dataset.hotspot=id;b.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`;b.setAttribute('aria-label',label||'调查');b.onclick=fn;els.hotspots.appendChild(b)}
function inspect(title,text,actions=''){openModal(`<h2>${title}</h2><p>${text}</p>${actions}`)}
function renderScene(){const scene=SCENES[state.scene]||SCENES.entry;els.img.src=scene.img;els.img.alt=scene.name;els.hotspots.innerHTML='';els.event.innerHTML='';if(state.scene==='entry')renderEntry();if(state.scene==='living')renderLiving();if(state.scene==='bedroom')renderBedroom();if(state.scene==='bathroom')renderBathroom();if(state.scene==='hallway')renderHallway()}

function renderEntry(){
  hs('shoes',73,68,23,29,()=>{addClue('shoes');inspect('玄关的拖鞋','左脚朝里，右脚压在鞋柜边。你记得早上扫地时把两只都并排推到了柜子下面。<br><br>现在先把它记下来，不要急着相信记忆。')},'玄关鞋柜');
  hs('fridge',33,27,18,39,()=>{addClue('bottle');inspect('冰箱','最上层多了一瓶你从不买的常温矿泉水，瓶盖已经拧开过。<br><br>你平时只买苏打水。')},'冰箱');
  hs('door',77,25,20,46,()=>{
    if(state.stage<STAGE.CHAIN){inspect('入户门','锁舌、门框和猫眼都正常。没有撬痕。<br><br>你用自己的钥匙开门进来——至少这一点很清楚。');return}
    addClue('chain');playMetal(true);
    inspect('防盗链','你把门拉开一道缝，链条立刻绷紧。<br><br><b>它从屋内扣着。</b><br><br>你进门后没有碰过它。如果这件事和其他异常属于同一个人，那么“正门钥匙”可能根本不是重点。',`<button class="modal-action" onclick="window.__goHall()">取下链条，带上钥匙去七楼走廊</button>`);
  },'入户门');
  hs('counter',48,55,18,24,()=>{if(state.stage>=STAGE.CONTACT)inspect('餐桌边','碗、杯垫、纸巾都在。你强迫自己看了一遍正常的东西。<br><br>至少这里没有新的异常。');else inspect('餐桌边','和早上差不多。你现在更在意玄关和冰箱。')},'餐桌');
}
function renderLiving(){
  hs('bin',1,55,23,38,()=>{if(state.stage<STAGE.CHECK){inspect('客厅角落','纸袋、外卖包装、旧报纸。现在看不出什么。')}else{addClue('twoCups');addClue('receipt',true);inspect('垃圾桶','最上面压着两个同款一次性咖啡杯。你今天没有买咖啡回家。<br><br>下面还有一张揉皱的便利店小票：<b>21:36</b>。而你22点以后还在公司。')}} ,'垃圾桶');
  hs('table',56,55,28,30,()=>{if(state.stage===STAGE.MEMORY){inspect('茶几','手机就在这里。相册里有今早07:12的照片。',`<button class="modal-action" onclick="window.__memoryPuzzle()">打开早晨照片核对</button>`)}else if(state.stage>=STAGE.CHECK){addClue('cushion',true);inspect('茶几和沙发','遥控器、书、充电线都在。旁边的靠垫却翻到了你平时从不用的那一面。<br><br>它本身不能证明什么，只能作为额外细节记下。')}else inspect('茶几','手机、充电线、昨晚没看完的书。')},'茶几');
  hs('window',73,8,26,52,()=>{if(state.stage>=STAGE.CHECK){inspect('客厅窗边','窗锁没有动过，窗外也没有可攀爬的平台。<br><br>这条路线可以先排除。')}else inspect('窗边','窗户锁着。城市的灯从窗帘边缘透进来。')},'窗边');
  hs('sofa',64,52,35,42,()=>{if(state.stage>=STAGE.CHECK){addClue('cushion',true);inspect('沙发','靠垫的拉链朝外。你每次坐下都会把拉链面压到里侧。<br><br>这只是弱异常，不值得单独下结论。')}else inspect('沙发','你本来只想坐五分钟。现在完全没有困意。')},'沙发');
}
function renderBedroom(){
  hs('curtain',75,1,24,58,()=>{if(state.stage>=STAGE.CHECK){addClue('curtain');inspect('卧室窗帘','右侧帘布被完全拉到轨道尽头。你早上为了让植物晒太阳，留了大约半扇窗的空隙。')}else inspect('窗帘','拉得很严。你暂时不想把任何细节都当成异常。')},'窗帘');
  hs('bedside',2,28,23,36,()=>{
    if(state.stage>=STAGE.IDENTITY&&!hasOpt('movingPhoto')){addClue('movingPhoto',true);inspect('床头相框','搬家那天的合照压在书下面。徐洲站在你身后，腰侧挂着一个绿色塑料工程牌。<br><br>它和夹层里那枚牌的颜色、形状都很接近。');return}
    if(state.stage>=STAGE.CHECK&&!has('charger')){addClue('charger');inspect('床头插座','你的充电线被插在右侧墙插。你从来不用这个口，因为床头柜会压住插头。<br><br>线没有坏，只是位置不对。');return}
    inspect('床头','相框、充电线、一本没读完的书。');
  },'床头');
  hs('wardrobe',0,3,26,92,()=>{
    if(state.stage<STAGE.GAP){inspect('衣柜','衣服和纸箱都在。你把能看到的位置都扫了一遍，没有人。<br><br>现在没有理由拆柜体。');return}
    openModal(gapHTML(),true,true);
  },'衣柜');
}
function renderBathroom(){
  hs('mat',39,69,48,28,()=>{addClue('wetmat');inspect('地垫','中间是湿的。不是整块返潮，而是两个分开的脚掌形潮痕。<br><br>你早上七点洗的澡，现在已经接近十一点。')},'地垫');
  hs('sink',49,33,42,39,()=>{if(state.stage<STAGE.CHECK){inspect('洗手台','牙杯、洗面奶、剃须刀。乍看都在平常的位置。')}else{addClue('toothbrush');inspect('牙杯','杯子里有两支牙刷。<br><br>蓝色旧牙刷是你今天早上亲手扔进楼下垃圾桶的。')}} ,'洗手台');
  hs('towels',66,65,30,30,()=>{if(state.stage>=STAGE.CHECK){addClue('towel');inspect('手巾','你习惯把手巾对折挂在架上。现在它被折成了三折，边角压得很平。<br><br>这种细节很小，却很难解释成风。')}else inspect('手巾','看上去很普通。')},'手巾');
  hs('mirror',0,5,45,42,()=>{if(state.stage>=STAGE.CHECK){addClue('scent',true);inspect('镜子','镜面边缘有淡淡的水汽痕。凑近以后能闻到薄荷漱口水味。<br><br>你不用漱口水。')}else inspect('镜子','镜面上有一点已经散开的水汽。')},'镜子');
}
function renderHallway(){
  hs('704',8,18,34,65,()=>{addClue('maintenance');addClue('scratch',true);inspect('704房门','门上贴着“空置维修，请勿进入”。封条的右下角明显被揭开又压回去。<br><br>门框内侧还有几道新划痕，像有人反复用硬物顶过锁舌。')},'704房门');
  hs('notice',51,10,28,40,()=>{addClue('shaftNotice');inspect('维修通知','七楼管线改造图写着：<b>704 与 705 共用一条旧检修竖井</b>。<br><br>竖井在两户卧室柜体后方封板处各有一个检修口。')},'维修通知');
  hs('neighbor',73,49,26,45,()=>openModal(neighborHTML()),'703邻居房门');
  hs('elevator',42,47,20,40,()=>inspect('电梯口','监控摄像头正对电梯门，但拍不到704和705门前。物业夜班电话一直占线。'),'电梯口');
}

function memoryPuzzleHTML(){
  const selected=state.flags.memorySelected||[];
  const opts=[
    ['time','照片时间是07:12，早于你今天出门上班。'],
    ['shoes','照片边缘能确认：两只拖鞋当时并排收在鞋柜下。'],
    ['xu','照片能证明徐洲今晚没有来过。'],
    ['bottle','照片能证明冰箱里当时没有那瓶矿泉水。']
  ];
  return `<h2>07:12 · 记忆核对</h2><div class="compare-layout"><div class="compare-shot"><img src="assets/img/morning_memory.webp" alt="今早07:12照片"><div class="shot-label">今早 · 相册原图</div></div><div class="compare-shot"><img src="assets/img/kitchen.webp" alt="今晚玄关厨房"><div class="shot-label">今晚 · 当前视线</div></div></div><p>照片只能证明它真正拍到的内容。请选择<b>两条</b>可以直接用这张照片确认的事实：</p><div class="choice-grid">${opts.map(([id,t])=>`<button class="${selected.includes(id)?'selected':''}" onclick="window.__memoryToggle('${id}')">${t}</button>`).join('')}</div><button class="modal-action" onclick="window.__memoryCheck()">确认这两条</button><p class="muted">不要把照片没有拍到的东西，当成照片已经证明的东西。</p>`;
}
function contactHTML(){
  const q=state.flags.landlordQuestions||[];
  const row=(id,label)=>`<button ${q.includes(id)?'disabled':''} onclick="window.__askLandlord('${id}')">${q.includes(id)?'已问：':''}${label}</button>`;
  return `<h2>和房东通话</h2><p>房东接得很快。你决定把问题拆开问，避免一句“你今天来过吗”得到一个模糊回答。</p><div class="choice-grid">${row('visit','今天有没有进过705？')}${row('key','备用钥匙现在在哪里？')}${row('maintenance','704今天具体在修什么？')}</div>${q.length?`<div class="divider"></div><div class="phone-screen">${q.includes('visit')?'<div class="message them">房东：没有。我下午在城南，没去你那边。</div>':''}${q.includes('key')?'<div class="message them">房东：备用钥匙在我抽屉里。你搬进去以后我没借给过别人。</div>':''}${q.includes('maintenance')?'<div class="message them">房东：704空着，物业最近在改旧管线。听说七楼以前有共用检修井。</div>':''}</div>`:''}${q.length===3?'<button class="modal-action" onclick="window.__finishContact()">先不报警，继续确认屋内异常</button>':''}`;
}

const timelineEvents={
  receipt:{time:'21:36',label:'你家垃圾袋里的便利店小票'},office:{time:'22:18',label:'公司门禁：你刷卡离开办公区'},ride:{time:'22:31',label:'打车软件：车辆接到你'},lock:{time:'22:47',label:'705门锁：你的机械钥匙开门'},home:{time:'22:48',label:'你进屋、开灯、放下包'}
};
const timelineCorrect=['receipt','office','ride','lock','home'];
function timelineHTML(){
  const seq=state.flags.timelineSeq||[];
  if(state.flags.timelinePhase===2){return `<h2>时间线 · 第二步</h2><div class="timeline-records">${timelineCorrect.map(id=>`<div class="timeline-row"><time>${timelineEvents[id].time}</time><span>${timelineEvents[id].label}</span></div>`).join('')}</div><p>哪两条记录放在一起，最能证明<b>21:36出现在你家里的那个人不是你</b>？</p><div class="choice-grid"><button onclick="window.__timelinePair('receipt_office')">21:36小票 ＋ 22:18公司门禁</button><button onclick="window.__timelinePair('ride_lock')">22:31打车 ＋ 22:47开门</button><button onclick="window.__timelinePair('photo_home')">07:12照片 ＋ 22:48回家</button></div>`}
  const shuffled=['lock','receipt','home','office','ride'];
  return `<h2>时间线 · 第一步</h2><p>不要凭感觉。把下面五条记录按实际时间从早到晚点进时间轴。</p><div class="timeline-records">${shuffled.map(id=>`<button class="evidence-btn" ${seq.includes(id)?'disabled':''} onclick="window.__timelineAdd('${id}')"><b>${timelineEvents[id].time}</b>　${timelineEvents[id].label}</button>`).join('')}</div><div class="sequence-tray">${seq.length?seq.map(id=>`<span class="sequence-chip">${timelineEvents[id].time} · ${timelineEvents[id].label}</span>`).join(''):'<span class="muted">时间轴还是空的</span>'}</div><div><button class="modal-action" onclick="window.__timelineReset()">重排</button> <button class="modal-action" onclick="window.__timelineCheck()">检查顺序</button></div>`;
}

function neighborHTML(){
  const q=state.flags.neighborTopics||[];
  const btn=(id,text)=>`<button ${q.includes(id)?'disabled':''} onclick="window.__neighborAsk('${id}')">${q.includes(id)?'已问：':''}${text}</button>`;
  const answers=[];
  if(q.includes('people'))answers.push('“陌生人没见过。倒是你搬家那天那个男的，前几天从704出来过。”');
  if(q.includes('noise'))answers.push('“晚上偶尔听到墙里有拖东西的声儿。我还以为是维修。”');
  if(q.includes('time'))answers.push('“大概这周一和昨天吧。不是一次。”');
  return `<h2>703邻居</h2><p>邻居没有立刻说“陌生人”。你换了几个更具体的问题。</p><div class="choice-grid">${btn('people','这几天见过谁从704出来？')}${btn('noise','晚上听见过墙里的声音吗？')}${btn('time','你见到那个人是今天第一次吗？')}</div>${answers.length?`<div class="divider"></div>${answers.map(a=>`<p class="modal-note">${a}</p>`).join('')}`:''}${q.length>=2?'<button class="modal-action" onclick="window.__finishNeighbor()">记下邻居证词</button>':''}`;
}

function routeHTML(){
  const choice=state.flags.routeChoice;const facts=state.flags.routeFacts||[];
  const routeBtn=(id,text)=>`<button class="${choice===id?'selected':''}" onclick="window.__routeChoose('${id}')">${text}</button>`;
  const factList=[['door','705门锁和门框没有强行进入痕迹'],['shaft','维修通知写明704与705共用旧检修竖井'],['seal','704封条被揭开重贴、门框有新划痕'],['wet','卫生间地垫是湿的'],['cups','垃圾桶里有两个咖啡杯'],['key','房东说备用钥匙仍在自己手里']];
  return `<h2>入口路径推理</h2><p>先选最可能的路线，再选<b>三条最直接支持这条路线</b>的事实。</p><h3>一、路线</h3><div class="choice-grid">${routeBtn('duplicate','复制钥匙 → 705正门')}${routeBtn('window','外墙/窗户 → 客厅')}${routeBtn('shaft','704 → 共用检修竖井 → 705柜体后方')}${routeBtn('vent','公共风管 → 卫生间')}</div><h3>二、支持事实（选3条）</h3><div class="fact-grid">${factList.map(([id,t])=>`<button class="evidence-btn ${facts.includes(id)?'selected':''}" onclick="window.__routeFact('${id}')">${t}</button>`).join('')}</div><button class="modal-action" onclick="window.__routeCheck()">检查推理</button>`;
}

function gapHTML(){
  const done=state.flags.gapInspected||[];const panel=state.flags.gapPanelOpen;
  const card=(id,title,text)=>`<button class="gap-item ${done.includes(id)?'done':''}" onclick="window.__gapInspect('${id}')"><b>${done.includes(id)?'✓ ':''}${title}</b><p>${text}</p></button>`;
  let html=`<h2>衣柜背板</h2><p>你没有直接把板子掰开。先看它有没有被近期动过。</p><div class="gap-board">${card('screws','固定螺丝','观察螺丝头和木板边缘')}${card('dust','柜体下沿','看灰尘、纤维和鞋底痕迹')}${card('tap','轻推背板',done.includes('screws')&&done.includes('dust')?'确认板后是否为空腔':'先完成前两项再动背板')}</div>`;
  if(panel){html+=`<div class="divider"></div><div class="result-warn"><b>背板松开了。</b><p>后面不是实墙，而是一条只够成年人侧身通过的维修夹层。你站在卧室外侧，不把身体探进去。</p></div><h3>夹层里能看到的东西</h3><div class="gap-board">${card('tag','绿色工程钥匙牌','挂在一根旧扎带上')}${card('paper','揉皱的快递/收件纸','能看见收件人栏')}${card('nest','薄毯、水瓶和充电宝','不像施工遗留')}${card('cable','旧充电线','接口和你床头那根相同')}</div>`}
  if(['tag','paper','nest'].every(x=>done.includes(x)))html+=`<button class="modal-action" onclick="window.__closeGap()">先退出卧室，整理“徐洲”这个名字</button>`;
  return html;
}

function identityHTML(){
  const p=state.flags.identityPerson;const facts=state.flags.identityFacts||[];
  const people=[['xu','徐洲','同事 · 给过你房源链接 · 搬家时来过'],['landlord','房东周先生','有备用钥匙 · 否认今天来过'],['worker','物业旧工程员','可能熟悉竖井 · 身份不明']];
  const ev=[['neighbor','邻居：帮你搬家的男人最近从704出来过'],['oldchat','旧聊天：徐洲确实帮你搬家，也问过你下班时间'],['delivery','夹层废纸：收件人写着“徐洲”'],['tag','夹层里有绿色工程钥匙牌'],['key','房东备用钥匙仍在房东手里'],['receipt','21:36小票出现在你家垃圾袋里']];
  return `<h2>身份交叉</h2><p>选择目前证据最能指向的人，再选<b>三条真正把“人”和“704/夹层路线”连起来</b>的信息。</p>${!has('oldChat')?'<div class="result-warn"><p>你还缺一条关键关系信息：邻居说的是“帮你搬家的男人”。手机旧聊天里可能能确认谁帮你搬过家。</p><button class="modal-action" onclick="window.__phone(\'messages\')">回手机看旧聊天</button></div>':''}<div class="identity-grid">${people.map(([id,n,d])=>`<button class="person-card ${p===id?'selected':''}" onclick="window.__identityPerson('${id}')"><b>${n}</b><span>${d}</span></button>`).join('')}</div><div class="evidence-board">${ev.map(([id,t])=>`<button class="evidence-btn ${facts.includes(id)?'selected':''}" onclick="window.__identityFact('${id}')">${t}</button>`).join('')}</div><button class="modal-action" onclick="window.__identityCheck()">确认这条身份链</button>`;
}

function finalInferenceHTML(){
  return `<h2>最后一次判断</h2><p>徐洲在23:52发来：“到家了吗？”</p><div class="phone-screen"><div class="message them">徐洲 23:52<br>到家了吗？</div></div><p>哪句话最符合你现在<b>真正已经证明</b>的程度？</p><div class="choice-grid"><button onclick="window.__finalInfer('inside')">徐洲此刻一定还藏在衣柜后面。</button><button onclick="window.__finalInfer('route')">徐洲与704/夹层有多条交叉证据，具备进入705的条件；但是否此刻仍在屋内不能确认。</button><button onclick="window.__finalInfer('landlord')">房东把备用钥匙交给了徐洲，所以他从正门进来。</button></div>`;
}

function phoneHTML(tab='messages'){
  const tabs=`<div class="phone-tabs"><button class="tab-btn ${tab==='messages'?'active':''}" onclick="window.__phone('messages')">消息${state.stage>=STAGE.FINAL&&!state.flags.finalMessageRead?'<i class="unread-dot"></i>':''}</button><button class="tab-btn ${tab==='photos'?'active':''}" onclick="window.__phone('photos')">相册</button><button class="tab-btn ${tab==='records'?'active':''}" onclick="window.__phone('records')">记录</button></div>`;
  let body='';
  if(tab==='messages'){
    body=`<div class="phone-screen"><div class="message them old">房东 · 上周<br>下个月房租还是原账户。</div>${state.flags.landlordQuestions.includes('visit')?'<div class="message them">房东：我今天没去705。</div>':''}${state.flags.landlordQuestions.includes('key')?'<div class="message them">房东：备用钥匙一直在我这里。</div>':''}${state.stage>=STAGE.FINAL?'<div class="message them">徐洲 23:52<br>到家了吗？</div>':''}</div>`;
    body+=`<div class="divider"></div><h3>旧聊天</h3><button class="evidence-btn" onclick="window.__readXuHistory()">徐洲 · 三个月前 ${has('oldChat')?'（已看）':'（未读）'}</button>`;
    if(state.stage===STAGE.CONTACT)body+=`<button class="modal-action" onclick="window.__contact()">继续问房东三个具体问题</button>`;
    if(state.stage>=STAGE.FINAL)body+=`<button class="modal-action" onclick="window.__openFinalInference()">处理徐洲的新消息</button>`;
  }
  if(tab==='photos'){
    body=`<div class="photo-card"><img src="assets/img/morning_memory.webp" alt="07:12早晨照片"></div><p>07:12 · 早餐随手拍。画面边缘保留了玄关当时的状态。</p>`;
    if(state.stage===STAGE.MEMORY)body+=`<button class="modal-action" onclick="window.__memoryPuzzle()">开始记忆核对</button>`;
    if(hasOpt('movingPhoto'))body+=`<div class="divider"></div><p>搬家合照：徐洲腰间有绿色工程牌。</p>`;
  }
  if(tab==='records'){
    body=`<div class="timeline-records"><div class="timeline-row"><time>22:18</time><span>公司门禁：离开办公区</span></div><div class="timeline-row"><time>22:31</time><span>打车软件：车辆接到你</span></div><div class="timeline-row"><time>22:47</time><span>705门锁：机械钥匙开门</span></div></div>`;
    if(state.stage===STAGE.TIMELINE)body+=`<button class="modal-action" onclick="window.__timeline()">把现有记录排成时间线</button>`;
  }
  return `<h2>手机</h2>${tabs}${body}`;
}

function notesHTML(){
  const items=state.clues.map(id=>`<div class="clue">${clueDefs[id]||id}</div>`).join('')||'<p class="muted">你还没有确认任何有效信息。</p>';
  const opts=state.optional.map(id=>`<div class="clue optional">${optDefs[id]||id}<small>额外信息：不是推进主线的唯一条件</small></div>`).join('');
  let action='';if(state.stage===STAGE.ROUTE)action='<button class="modal-action" onclick="window.__route()">整理入口路径</button>';if(state.stage===STAGE.IDENTITY)action='<button class="modal-action" onclick="window.__identity()">整理人物身份链</button>';
  return `<h2>随手记下的事</h2><div class="clue-list">${items}${opts}</div>${action}`;
}
function mapHTML(){
  const ids=['entry','living','bedroom','bathroom','hallway'];
  return `<h2>位置</h2><div class="floor-plan"><div class="floor-line"><div>703<br><span class="muted">邻居</span></div><div class="empty">704<br><span class="muted">空置维修</span></div><div class="you">705<br><span class="muted">你住这里</span></div></div><div class="route-arrow">704旧检修竖井 ⇄ 705柜体后方（只有查到维修通知后才算事实）</div></div><div class="map-grid">${ids.map(id=>`<div class="map-room ${state.visited.includes(id)?'open':''}">${SCENES[id].name}<br><span class="muted">${state.visited.includes(id)?'已查看':'未查看'}</span></div>`).join('')}</div>`;
}
function hintKey(){return `${state.stage}:${state.scene}`}
function hintListFor(stage,scene){
  const table={
    [`${STAGE.HOME}:entry`]:['先别把门锁当成唯一问题。先确认玄关和冰箱。','玄关鞋柜、冰箱都各有一个细节。第三处不在这个房间。','还需要去卫生间看地垫。'],
    [`${STAGE.HOME}:bathroom`]:['潮湿能告诉你“最近有人用过水”，但不能告诉你是谁。','看地面最容易留下时间感的东西。','检查地垫。'],
    [`${STAGE.MEMORY}:living`]:['你需要一份早晨留下的客观记录。','手机相册有07:12照片。','打开手机→相册，做“记忆核对”。'],
    [`${STAGE.MEMORY}:entry`]:['不要继续凭记忆争论。','去客厅拿手机，找早晨照片。','手机→相册→记忆核对。'],
    [`${STAGE.CONTACT}:entry`]:['不要只问房东“有人来过吗”。拆开问。','备用钥匙、房东今天行踪、704维修都要分别确认。','手机→消息→继续问房东三个具体问题。'],
    [`${STAGE.CHECK}:living`]:['有人停留过，最容易留下的是一次性消耗物。','垃圾桶值得仔细看；沙发也可能有弱异常。','检查垃圾桶。'],
    [`${STAGE.CHECK}:bedroom`]:['先找你每天都会形成固定习惯的位置。','窗帘和床头插座都能形成“你的习惯基线”。','检查窗帘和床头。'],
    [`${STAGE.CHECK}:bathroom`]:['卫生间里除了地垫，还有两处能说明“有人使用过”。','看牙杯和手巾。','检查洗手台和手巾。'],
    [`${STAGE.TIMELINE}:entry`]:['现在不需要继续搜屋子。先把时间排清楚。','手机“记录”里有三条系统记录，垃圾袋里还有21:36小票。','手机→记录→时间线。顺序是按分钟排，不需要猜。'],
    [`${STAGE.CHAIN}:entry`]:['现在回到“门是怎么回事”这个问题。','真正需要看的不是锁舌，而是只能从屋内操作的部件。','检查防盗链。'],
    [`${STAGE.HALL}:hallway`]:['不要只问邻居。先把704本身和维修通知都看一遍。','需要：704门、维修通知、邻居至少两个问题。','三处都完成后才会进入“入口路径推理”，邻居不能直接跳关。'],
    [`${STAGE.ROUTE}:hallway`]:['把“存在异常”和“支持路线”分开。','最直接的三条是：正门无撬痕、共用检修竖井、704封条/门框异常。','打开记事→整理入口路径，选择“704→竖井→705柜体后方”。'],
    [`${STAGE.GAP}:bedroom`]:['别直接钻进去。先确认背板最近是否被动过。','先看螺丝和柜体下沿，再轻推背板。','夹层打开后，工程牌、收件纸、停留物都需要分别检查。'],
    [`${STAGE.IDENTITY}:bedroom`]:['名字出现在纸上还不够。邻居说的是“帮你搬家的男人”。','你需要确认谁帮你搬过家，再把他和夹层纸张连起来。','手机看徐洲旧聊天；随后记事→人物身份链。'],
    [`${STAGE.IDENTITY}:entry`]:['回忆邻居原话：“帮你搬家的那个男的”。','旧聊天能确认徐洲帮你搬过家。','手机→消息→徐洲三个月前旧聊天，然后记事→人物身份链。'],
    [`${STAGE.FINAL}:entry`]:['最后一步不是猜“他现在在哪”，而是控制结论范围。','徐洲和路线的关系已经很强，但你没有实时看到他。','手机→消息→处理新消息，选择“具备进入条件，但无法确认此刻仍在屋内”。']
  };
  return table[`${stage}:${scene}`]||table[`${stage}:entry`]||['回到当前目标，先找它要求你确认的那类事实。','打开“记事”看你已经确认了什么，再找缺口。','如果仍卡住，换一个房间；主线不会要求像素级扫图。'];
}
function hintHTML(){
  const key=hintKey(),arr=hintListFor(state.stage,state.scene);const now=Math.min((state.hints[key]||0)+1,arr.length);state.hints[key]=now;safeSave();
  const history=Object.entries(state.hints).filter(([,n])=>n>0).map(([k,n])=>{const [st,sc]=k.split(':');const list=hintListFor(Number(st),sc);const label=`${STAGE_INFO[Number(st)]?.[0]||'阶段'} · ${SCENES[sc]?.name||sc}`;return `<details ${k===key?'open':''}><summary>${label} · 已解锁 ${n}/${list.length}</summary>${list.slice(0,n).map((t,i)=>`<div class="hint-step"><b>${i+1}</b>　${t}</div>`).join('')}</details>`}).join('');
  return `<h2>当前页提示 ${now}/${arr.length}</h2><div class="hint-box">${arr.slice(0,now).map((t,i)=>`<div class="hint-step"><b>${i+1}</b>　${t}</div>`).join('')}</div><p class="muted">提示按“阶段 + 当前页面”分别记录。已解锁内容不会消失。</p><div class="hint-history"><h3>回看已解锁提示</h3>${history}</div>`;
}
function settingsHTML(){return `<h2>设置</h2><div class="choice-grid"><button onclick="window.__toggleAmbient()">${state.flags.ambient===false?'开启':'关闭'} 环境音</button><button onclick="window.__restart()">重新开始</button></div><div class="divider"></div><p class="credits">环境声由浏览器实时合成，不需要额外音频文件。摄影素材授权见 LICENSES.md。进度保存在浏览器本地。</p>`}

$$('[data-panel]').forEach(b=>b.onclick=()=>{const p=b.dataset.panel;if(p==='phone')openModal(phoneHTML());if(p==='notes')openModal(notesHTML());if(p==='map')openModal(mapHTML());if(p==='hint')openModal(hintHTML());if(p==='settings')openModal(settingsHTML())});

window.__phone=(tab='messages')=>openModal(phoneHTML(tab),true,tab==='photos');
window.__memoryPuzzle=()=>openModal(memoryPuzzleHTML(),true,true);
window.__memoryToggle=id=>{let arr=state.flags.memorySelected||[];if(arr.includes(id))arr=arr.filter(x=>x!==id);else if(arr.length<2)arr.push(id);else{toast('只选两条');return}state.flags.memorySelected=arr;safeSave();openModal(memoryPuzzleHTML(),true,true)};
window.__memoryCheck=()=>{const a=[...(state.flags.memorySelected||[])].sort().join(',');if(a!=='shoes,time'){toast('有一条超出了照片能证明的范围');return}addClue('photoBaseline');setStage(STAGE.CONTACT,'23:01');openModal(contactHTML())};
window.__contact=()=>openModal(contactHTML());
window.__askLandlord=id=>{const q=state.flags.landlordQuestions||[];addUnique(q,id);state.flags.landlordQuestions=q;if(id==='visit')addClue('landlordVisit',false,true);if(id==='key')addClue('landlordKey',false,true);if(id==='maintenance')addClue('maintenanceCall',false,true);safeSave();openModal(contactHTML())};
window.__finishContact=()=>{if((state.flags.landlordQuestions||[]).length<3){toast('还有一个问题没问清');return}setStage(STAGE.CHECK,'23:08');closeModal(true);eventText('房东的回答排除了最简单的解释。<br>现在要重新检查屋里：如果真的有人停留过，不会只留下三处细节。')};
window.__readXuHistory=()=>{addClue('oldChat');openModal(`<h2>徐洲 · 三个月前</h2><div class="phone-screen"><div class="message them old">徐洲：那套房我看过，七楼安静，价格也低。</div><div class="message me old">我周末搬，东西不多。</div><div class="message them old">徐洲：我去帮你。那楼我以前跟物业工程的人去过几次，找门不难。</div><div class="message them old">徐洲：你最近还是十点多下班？搬过去以后一个人住注意安全。</div><div class="message me old">差不多。谢谢。</div></div><p class="muted">当时看起来只是同事之间的关心。现在你第一次注意到，他不仅知道房子，也知道你的作息。</p><button class="modal-action" onclick="window.__phone('messages')">返回消息</button>`)};

window.__timeline=()=>openModal(timelineHTML(),true,true);
window.__timelineAdd=id=>{const seq=state.flags.timelineSeq||[];if(!seq.includes(id))seq.push(id);state.flags.timelineSeq=seq;safeSave();openModal(timelineHTML(),true,true)};
window.__timelineReset=()=>{state.flags.timelineSeq=[];safeSave();openModal(timelineHTML(),true,true)};
window.__timelineCheck=()=>{const seq=state.flags.timelineSeq||[];if(seq.join(',')!==timelineCorrect.join(',')){toast('顺序里至少有一处不对');return}state.flags.timelinePhase=2;safeSave();openModal(timelineHTML(),true,true)};
window.__timelinePair=id=>{if(id!=='receipt_office'){toast('这两条只能说明你的回家过程，不能解释21:36');return}state.flags.timelineSolved=true;addClue('timeline');setStage(STAGE.CHAIN,'23:24');closeModal(true);eventText('21:36，一张来自你家里的小票已经存在。<br>22:18，你才离开公司。<br><br>“有人来过”不再只是感觉。')};

window.__goHall=()=>{if(!has('chain')){toast('先确认防盗链');return}setStage(STAGE.HALL,'23:31');closeModal(true);go('hallway');setTimeout(()=>playPipe(),700)};
window.__neighborAsk=id=>{const q=state.flags.neighborTopics||[];addUnique(q,id);state.flags.neighborTopics=q;safeSave();openModal(neighborHTML())};
window.__finishNeighbor=()=>{if((state.flags.neighborTopics||[]).length<2){toast('至少问两个具体问题');return}addClue('neighbor');closeModal(true);if(state.stage===STAGE.HALL)toast('704门和维修通知还没有都看清')};

window.__route=()=>openModal(routeHTML(),true,true);
window.__routeChoose=id=>{state.flags.routeChoice=id;safeSave();openModal(routeHTML(),true,true)};
window.__routeFact=id=>{let arr=state.flags.routeFacts||[];if(arr.includes(id))arr=arr.filter(x=>x!==id);else if(arr.length<3)arr.push(id);else{toast('只选三条最直接的');return}state.flags.routeFacts=arr;safeSave();openModal(routeHTML(),true,true)};
window.__routeCheck=()=>{const facts=[...(state.flags.routeFacts||[])].sort().join(',');if(state.flags.routeChoice!=='shaft'||facts!==['door','seal','shaft'].sort().join(',')){toast('路线或支持事实里还有越界/弱证据');return}state.flags.routeSolved=true;addClue('route');setStage(STAGE.GAP,'23:42');closeModal(true);go('bedroom');eventText('如果维修图没有错，705这一侧的检修口就在卧室柜体后方。<br>现在你终于有理由检查背板。')};

window.__gapInspect=id=>{
  const done=state.flags.gapInspected||[];
  if(id==='tap'&&!(done.includes('screws')&&done.includes('dust'))){toast('先看螺丝和柜体下沿');return}
  addUnique(done,id);state.flags.gapInspected=done;
  if(id==='screws')addClue('freshScrew',false,true);
  if(id==='dust')addClue('fiber',false,true);
  if(id==='tap'){state.flags.gapPanelOpen=true;addClue('gap',false,true);playMetal(false)}
  if(id==='tag')addClue('tag',false,true);
  if(id==='paper')addClue('delivery',false,true);
  if(id==='nest')addClue('nest',false,true);
  if(id==='cable')addClue('chargerCable',true,true);
  safeSave();openModal(gapHTML(),true,true);checkAutoAdvance();
};
window.__closeGap=()=>{closeModal(true);if(state.stage<STAGE.IDENTITY)setStage(STAGE.IDENTITY,'23:47');eventText('夹层里有“徐洲”这个名字。<br>先别让恐惧替你完成推理。你需要把他和邻居说的“帮你搬家的男人”连起来。')};

window.__identity=()=>openModal(identityHTML(),true,true);
window.__identityPerson=id=>{state.flags.identityPerson=id;safeSave();openModal(identityHTML(),true,true)};
window.__identityFact=id=>{let arr=state.flags.identityFacts||[];if(arr.includes(id))arr=arr.filter(x=>x!==id);else if(arr.length<3)arr.push(id);else{toast('只选三条最直接的');return}state.flags.identityFacts=arr;safeSave();openModal(identityHTML(),true,true)};
window.__identityCheck=()=>{if(!has('oldChat')){toast('还缺“谁帮你搬家”这条关系信息');return}const facts=[...(state.flags.identityFacts||[])].sort().join(',');if(state.flags.identityPerson!=='xu'||facts!==['delivery','neighbor','oldchat'].sort().join(',')){toast('至少有一条证据没有把“人”和路线直接连起来');return}state.flags.identitySolved=true;addClue('identity');setStage(STAGE.FINAL,'23:52');playBuzz();closeModal(true);go('entry');eventText('手机在口袋里震了两下。<br>徐洲：到家了吗？')};

window.__openFinalInference=()=>{state.flags.finalMessageRead=true;safeSave();openModal(finalInferenceHTML())};
window.__finalInfer=id=>{if(id!=='route'){toast(id==='inside'?'你没有实时看到他，不能把恐惧当成事实':'现有证据不支持备用钥匙被转交');return}state.flags.finalInference=true;addClue('finalBoundary');openModal(endingChoiceHTML(),false)};
function endingChoiceHTML(){const secret=hiddenEndingOpts.every(hasOpt);return `<h2>23:54 · 你怎么过今晚</h2><p>现在最重要的不是再往黑暗里走一步，而是决定如何把自己放到安全的位置。</p><div class="choice-grid"><button onclick="window.__end('leave')"><b>先离开，再报警</b><br><span class="muted">带证件和手机，从消防楼梯离开。</span></button><button onclick="window.__end('ask')"><b>发照片质问徐洲</b><br><span class="muted">把绿色工程牌和收件纸拍给他。</span></button><button onclick="window.__end('trap')"><b>留旧手机录像</b><br><span class="muted">自己离开，把旧手机朝向衣柜。</span></button>${secret?`<button onclick="window.__end('secret')"><b>隐藏选择 · 直接换住处</b><br><span class="muted">你把四条额外信息连起来，意识到问题可能从“选房”那天就开始了。</span></button>`:''}</div>`}

const endingText={
  leave:{title:'结局一 · 楼下',code:'THE SAFE DISTANCE',body:'23:58，你坐在两条街外的24小时便利店里报警。<br><br>警察和物业进入704后，在维修夹层里找到薄毯、充电宝、一次性杯子、旧工程钥匙，以及一张写着七楼住户作息的便签。<br><br>徐洲的手机关机。第二天公司说他没有来上班。<br><br>你第一次真正明白：离开现场不是“输”，而是把风险交给更适合处理它的人。'},
  ask:{title:'结局二 · 门锁',code:'THE QUESTION',body:'你把工程牌和收件纸拍给徐洲。<br><br>对方显示“正在输入”很久。<br><br>最后只来了一句：<br><b>“门锁没坏吧？”</b><br><br>你抬头看向入户门。走廊里传来一声很轻的金属碰撞。<br><br>这一次你没有去猫眼前看。你拿上手机，从消防楼梯下楼。'},
  trap:{title:'结局三 · 01:17',code:'THE RECORDING',body:'你把旧手机架在卧室书架上，屏幕朝向衣柜，自己从消防楼梯离开。<br><br>凌晨01:17，录像里的衣柜背板从里面慢慢推开。一个人只露出半边肩膀，停了很久。<br><br>他似乎在听。<br><br>镜头外的旧闹钟突然响起，那个人立刻退回黑暗。<br><br>录像没有拍清脸，却完整拍到了进入方式。第二天，704和705的维修夹层被警方封存。'},
  secret:{title:'隐藏结局 · 房源链接',code:'YOU WERE CHOSEN',body:'你没有继续留在楼里。出租车开出去以后，你把四条额外信息重新看了一遍：21:36小票、搬家合照的工程牌、704新划痕、卫生间陌生的薄荷味。<br><br>三个月前，是徐洲主动把这套“刚空出来、很便宜”的房源发给你的。<br><br>你换了住处、手机号，也申请了调岗。<br><br>两周后，新办公室前台收到一个没有寄件人的纸箱。<br><br>里面只有那双拖鞋。<br><br>摆得整整齐齐。'}
};
window.__end=id=>{if(!endingText[id])return;state.ending=id;state.stage=STAGE.END;safeSave();if(!meta.endingsSeen.includes(id))meta.endingsSeen.push(id);meta.completed=true;saveMeta();updateTitleButtons();const e=endingText[id];openModal(`<div class="ending"><p class="ending-code">${e.code}</p><p class="ending-title">${e.title}</p><p>${e.body}</p><div class="divider"></div><p>已解锁结局：${meta.endingsSeen.length}/4。二周目可以从“快速复盘”进入中段，不必重复前半段。</p><div class="choice-grid two"><button onclick="window.__showArchive()">查看结局档案</button><button onclick="window.__restart()">回到标题</button></div><div class="divider"></div><p class="muted">如果你准备正式加入自愿支持入口，请在上线前配置你自己的收款方式；当前版本不会用占位按钮假装已经收款。</p></div>`,false)};

function archiveHTML(){const order=['leave','ask','trap','secret'];return `<h2>结局档案 · ${meta.endingsSeen.length}/4</h2><div class="archive-grid">${order.map(id=>{const e=endingText[id],open=meta.endingsSeen.includes(id);return `<div class="archive-card ${open?'':'locked'}"><div class="archive-code">${open?e.code:'LOCKED'}</div><h3>${open?e.title:'尚未解锁'}</h3><p>${open?'这个结局已经记录。':'继续调查额外信息或做不同决定。'}</p></div>`}).join('')}</div>`}
window.__showArchive=()=>openModal(archiveHTML());
window.__toggleAmbient=()=>{state.flags.ambient=state.flags.ambient===false?true:false;if(state.flags.ambient===false)stopAmbient();else startAmbient();safeSave();toast(state.flags.ambient===false?'环境音已关闭':'环境音已开启')};
window.__restart=()=>{stopAmbient();state=defaultState();clearSave();closeModal(true);els.title.classList.remove('hidden');els.game.classList.add('hidden');updateTitleButtons()};

function begin(useSave=false,review=false){
  if(!useSave){state=defaultState();if(review){state.flags.reviewMode=true;['shoes','bottle','wetmat','photoBaseline','landlordVisit','landlordKey','maintenanceCall'].forEach(x=>addUnique(state.clues,x));state.flags.landlordQuestions=['visit','key','maintenance'];state.stage=STAGE.CHECK;state.scene='living';state.time='23:08';state.visited=['entry','living','bedroom','bathroom'];}}
  startAmbient();els.title.classList.add('hidden');els.game.classList.remove('hidden');safeSave();renderUI();
  if(!useSave&&!review){openModal(`<h2>22:48</h2><p>今天加班到很晚。</p><p>你在七楼电梯口摸到钥匙，走到705门前。门锁完好，没有撬痕。</p><p>开门、开灯、把包放下。</p><p>然后你看见玄关的拖鞋。</p><p><b>它们的位置不对。</b></p><p class="muted">这不是一个需要“把每个角落都点一遍”的游戏。先调查你认为真正反常的地方。</p><button class="modal-action" onclick="window.__closeIntro()">先看看家里</button>`,false)}
  if(review)eventText('复盘模式从“二次排查”开始。<br>前半段基础事实已经自动记入，但中后段谜题、额外线索和结局仍由你完成。');
}
window.__closeIntro=()=>{state.flags.introSeen=true;safeSave();closeModal(true)};

function updateTitleButtons(){
  const hasSave=!!localStorage.getItem(SAVE_KEY)||!!localStorage.getItem(OLD_SAVE_KEY);els.cont.classList.toggle('hidden',!hasSave);els.review.classList.toggle('hidden',!meta.completed);els.archive.classList.toggle('hidden',meta.endingsSeen.length===0);
}
els.start.onclick=()=>begin(false,false);els.cont.onclick=()=>{if(load())begin(true,false)};els.review.onclick=()=>begin(false,true);els.archive.onclick=()=>openModal(archiveHTML());

window.__GAME_QA__={
  STAGE,SCENES,snapshot:()=>JSON.parse(JSON.stringify(state)),meta:()=>JSON.parse(JSON.stringify(meta)),
  reset:()=>{state=defaultState();safeSave();return true},
  assertStatic:()=>({
    stages:Object.keys(STAGE).length===12,
    oldSaveMigration:typeof migrateOld==='function',
    hintHistory:!!state.hints,
    finalBoundary:clueDefs.finalBoundary.includes('没有'),
    hallwayGate:objectives[STAGE.HALL].includes('三处'),
    releaseBuild:true
  })
};

async function runSelfQA(){
  const report={checks:[],overflow:null,assets:[]};
  const check=(name,cond)=>{report.checks.push([name,!!cond]);if(!cond)throw new Error('QA:'+name)};
  const clickHot=id=>{const e=document.querySelector(`[data-hotspot="${id}"]`);if(!e)throw new Error('QA:missing hotspot '+id);e.click();closeModal(true)};
  try{
    localStorage.clear();state=defaultState();meta=defaultMeta();begin(false,false);closeModal(true);
    hintHTML();check('hint-entry',state.hints['0:entry']===1);
    clickHot('shoes');clickHot('fridge');go('bathroom');clickHot('mat');check('home-memory',state.stage===STAGE.MEMORY);
    hintHTML();check('hint-page',state.hints['1:bathroom']===1);
    go('living');window.__memoryPuzzle();window.__memoryToggle('time');window.__memoryToggle('shoes');window.__memoryCheck();check('memory-contact',state.stage===STAGE.CONTACT);
    ['visit','key','maintenance'].forEach(x=>window.__askLandlord(x));window.__finishContact();check('contact-check',state.stage===STAGE.CHECK);
    go('living');clickHot('bin');go('bedroom');clickHot('curtain');clickHot('bedside');go('bathroom');clickHot('sink');clickHot('towels');clickHot('mirror');check('check-timeline',state.stage===STAGE.TIMELINE);
    window.__timeline();['receipt','office','ride','lock','home'].forEach(x=>window.__timelineAdd(x));window.__timelineCheck();check('timeline-phase2',state.flags.timelinePhase===2);window.__timelinePair('receipt_office');check('timeline-chain',state.stage===STAGE.CHAIN);
    go('entry');clickHot('door');window.__goHall();check('chain-hall',state.stage===STAGE.HALL);
    document.querySelector('[data-hotspot="neighbor"]').click();window.__neighborAsk('people');window.__neighborAsk('noise');window.__finishNeighbor();check('neighbor-no-skip',state.stage===STAGE.HALL);
    clickHot('notice');check('notice-no-skip',state.stage===STAGE.HALL);clickHot('704');check('hall-route',state.stage===STAGE.ROUTE);
    window.__route();window.__routeChoose('shaft');['door','shaft','seal'].forEach(x=>window.__routeFact(x));window.__routeCheck();check('route-gap',state.stage===STAGE.GAP&&state.scene==='bedroom');
    document.querySelector('[data-hotspot="wardrobe"]').click();['screws','dust','tap','tag','paper','nest','cable'].forEach(x=>window.__gapInspect(x));check('gap-identity',state.stage===STAGE.IDENTITY);window.__closeGap();
    clickHot('bedside');check('moving-photo',hasOpt('movingPhoto'));window.__readXuHistory();closeModal(true);window.__identity();window.__identityPerson('xu');['neighbor','oldchat','delivery'].forEach(x=>window.__identityFact(x));window.__identityCheck();check('identity-final',state.stage===STAGE.FINAL);
    window.__openFinalInference();window.__finalInfer('route');check('secret-unlocked',!![...document.querySelectorAll('.choice-grid button')].find(b=>b.textContent.includes('隐藏选择')));window.__end('secret');check('end-secret',state.stage===STAGE.END&&state.ending==='secret'&&meta.endingsSeen.includes('secret'));
    const stat=window.__GAME_QA__.assertStatic();check('static',Object.values(stat).every(Boolean));
    const old={stage:5,scene:'hallway',clues:['shoes','bottle','wetmat','chain','maintenance'],optional:['scratch'],flags:{ambient:false}};const mig=migrateOld(old);check('migration',mig.stage===STAGE.GAP&&mig.scene==='bedroom');
    const names=['kitchen.webp','living.webp','bedroom.webp','bathroom.webp','hallway.webp','morning_memory.webp'];
    report.assets=await Promise.all(names.map(n=>new Promise(r=>{const i=new Image();i.onload=()=>r([n,i.naturalWidth,i.naturalHeight]);i.onerror=()=>r([n,0,0]);i.src='assets/img/'+n+'?qa=1'})));check('assets',report.assets.every(x=>x[1]>0));
    report.overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth;check('no-overflow',report.overflow<=1);
    document.body.dataset.qa='PASS';const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify(report);pre.style.display='none';document.body.appendChild(pre);
  }catch(err){document.body.dataset.qa='FAIL';const pre=document.createElement('pre');pre.id='qaResult';pre.textContent=JSON.stringify({...report,error:String(err&&err.stack||err)});pre.style.display='none';document.body.appendChild(pre);console.error(err)}
}

load();updateTitleButtons();
if(new URLSearchParams(location.search).get('qa')==='1')setTimeout(runSelfQA,0);
})();
