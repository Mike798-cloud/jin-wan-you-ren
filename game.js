(() => {
'use strict';
const SAVE_KEY='tonight_someone_was_here_v1';
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const els={title:$('#titleScreen'),game:$('#game'),start:$('#startBtn'),cont:$('#continueBtn'),sceneName:$('#sceneName'),clock:$('#clock'),img:$('#sceneImage'),hotspots:$('#hotspots'),event:$('#eventLayer'),objective:$('#objective'),objectiveSide:$('#objectiveSide'),clueCount:$('#clueCount'),danger:$('#dangerText'),nav:$('#quickNav'),modal:$('#modal'),modalContent:$('#modalContent'),modalClose:$('#modalClose'),toast:$('#toast')};

const SCENES={
 entry:{name:'玄关 / 厨房',img:'assets/img/kitchen.webp'}, living:{name:'客厅',img:'assets/img/living.webp'}, bedroom:{name:'卧室',img:'assets/img/bedroom.webp'}, bathroom:{name:'卫生间',img:'assets/img/bathroom.webp'}, hallway:{name:'七楼走廊',img:'assets/img/hallway.webp'}
};
const STAGE={HOME:0,MEMORY:1,CHECK:2,CHAIN:3,HALL:4,GAP:5,FINAL:6,END:7};
const defaultState=()=>({stage:STAGE.HOME,scene:'entry',time:'22:48',clues:[],optional:[],visited:['entry'],flags:{},hintLevel:0,ending:null});
let state=defaultState();
let audioCtx=null, ambientNodes=[];
function startAmbient(){
  if(state.flags.ambient===false || ambientNodes.length) return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    [46,93].forEach((freq,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=i?0.0025:0.004;o.connect(g).connect(audioCtx.destination);o.start();ambientNodes.push(o,g);});
    if(audioCtx.state==='suspended') audioCtx.resume();
  }catch(e){}
}
function stopAmbient(){try{ambientNodes.forEach(n=>{if(n.stop)n.stop();if(n.disconnect)n.disconnect()});}catch(e){} ambientNodes=[];}

const has=id=>state.clues.includes(id); const hasOpt=id=>state.optional.includes(id);
const clueDefs={
 shoes:'拖鞋的位置变了', bottle:'冰箱里多出一瓶你从不买的矿泉水', wetmat:'卫生间地垫是湿的', twoCups:'垃圾桶里有两个一次性杯子', toothbrush:'早上扔掉的旧牙刷又回到了杯子里', curtain:'卧室窗帘被人重新拉过', chain:'防盗链从屋内被挂上', maintenance:'隔壁704正在空置维修', gap:'衣柜后面藏着一条维修夹层', tag:'夹层里有一枚物业工程钥匙牌', delivery:'废纸上的收件人是徐洲——给你房源链接的同事'
};
const optDefs={
 receipt:'垃圾袋里有今晚21:36的便利店小票，你那时还在公司', movingPhoto:'搬家照片里，徐洲腰间挂着同款绿色工程钥匙牌', scratch:'704门框内侧有反复撬动留下的新划痕'
};
const objectives={
 [STAGE.HOME]:'回家，洗漱，尽量别把自己吓到。',
 [STAGE.MEMORY]:'确认拖鞋到底是不是你记错了。',
 [STAGE.CHECK]:'检查屋里还有没有别的异常。',
 [STAGE.CHAIN]:'先弄清楚防盗链为什么从里面挂上了。',
 [STAGE.HALL]:'去楼道看看。也许入口根本不在你家。',
 [STAGE.GAP]:'回卧室检查衣柜后面。',
 [STAGE.FINAL]:'你已经知道是谁能进来。现在决定今晚怎么做。',
 [STAGE.END]:'今晚结束了。至少暂时结束了。'
};
const hintText={
 [STAGE.HOME]:['先检查最让你不舒服的地方。','玄关、冰箱和卫生间都值得看一眼。','点玄关下方鞋柜附近、厨房冰箱区域、卫生间地垫附近。'],
 [STAGE.MEMORY]:['不要只相信记忆，找一份早上留下的东西。','手机里早上拍过一张照片。','打开“手机”，查看今早 07:12 的照片。'],
 [STAGE.CHECK]:['如果真有人来过，他很难只动一件东西。','客厅垃圾桶、卧室和卫生间再检查一次。','找到两个杯子、窗帘变化和那支不该出现的旧牙刷。'],
 [STAGE.CHAIN]:['从里面才能完成的动作，比物品位置更重要。','回玄关看看门。','点击玄关右侧入户门的防盗链位置。'],
 [STAGE.HALL]:['如果门锁没有破坏，可能有另一条进入路径。','重点看空置的隔壁房和维修公告。','查看704门、墙上的维修通知，再听邻居怎么说。'],
 [STAGE.GAP]:['维修通道通常沿着管线或柜体后方走。','回卧室，检查靠墙的大衣柜。','点击卧室右侧柜体/推拉门附近。'],
 [STAGE.FINAL]:['证据已经够了。你的目标不是逞强，而是做决定。','手机里出现了一条新消息。','打开手机，查看徐洲的消息并选择处理方式。']
};
function safeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){}}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw){state={...defaultState(),...JSON.parse(raw)};return true}}catch(e){}return false}
function clearSave(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}}
function addClue(id,optional=false){
  const arr=optional?state.optional:state.clues;
  if(arr.includes(id)) return;
  arr.push(id);
  toast(optional?'发现额外信息':'记住了一处异常');
  state.hintLevel=0;
  let advanced='';
  if(!optional && state.stage===STAGE.HOME && has('shoes')&&has('bottle')&&has('wetmat')){
    state.stage=STAGE.MEMORY; state.time='22:56'; advanced='三个细节都能解释。<br>问题是，你真的会同时记错三件事吗？';
  }
  if(!optional && state.stage===STAGE.CHECK && has('twoCups')&&has('toothbrush')&&has('curtain')){
    state.stage=STAGE.CHAIN; state.time='23:17'; advanced='你已经确认了太多异常。<br>回玄关看看那扇门。';
  }
  safeSave(); renderUI();
  if(advanced) setTimeout(()=>eventText(advanced),180);
}
function toast(msg){els.toast.textContent=msg;els.toast.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.add('hidden'),1800)}
function setStage(s,time){if(s>state.stage)state.stage=s;if(time)state.time=time;state.hintLevel=0;safeSave();renderUI()}
function openModal(html,closable=true){els.modalContent.innerHTML=html;els.modal.classList.remove('hidden');els.modalClose.style.display=closable?'block':'none';els.modal.dataset.closable=closable?'1':'0'}
function closeModal(){if(els.modal.dataset.closable==='0')return;els.modal.classList.add('hidden');els.modalContent.innerHTML=''}
els.modalClose.onclick=closeModal;els.modal.addEventListener('click',e=>{if(e.target===els.modal&&els.modal.dataset.closable!=='0')closeModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&els.modal.dataset.closable!=='0')closeModal()});

function eventText(text){els.event.innerHTML=`<div class="event-text">${text}</div>`;clearTimeout(eventText.t);eventText.t=setTimeout(()=>els.event.innerHTML='',4200)}
function renderUI(){
 els.sceneName.textContent=SCENES[state.scene].name;els.clock.textContent=state.time;els.objective.textContent=objectives[state.stage]||'';els.objectiveSide.textContent=objectives[state.stage]||'';els.clueCount.textContent=state.clues.length;
 const n=state.clues.length;els.danger.textContent=n<2?'也许只是你记错了。':n<5?'越来越难解释成巧合。':n<8?'这个家现在并不安全。':'不要再假设你是一个人。';
 renderNav();renderScene();
}
function go(scene){if(scene==='hallway'&&state.stage<STAGE.HALL){toast('你现在还没有理由出去');return}state.scene=scene;if(!state.visited.includes(scene))state.visited.push(scene);safeSave();renderUI()}
function renderNav(){const order=['entry','living','bedroom','bathroom','hallway'];els.nav.innerHTML='';order.forEach(id=>{const b=document.createElement('button');b.textContent=SCENES[id].name;b.className=(id===state.scene?'current ':'')+(id==='hallway'&&state.stage<STAGE.HALL?'locked':'');b.disabled=id==='hallway'&&state.stage<STAGE.HALL;b.onclick=()=>go(id);els.nav.appendChild(b)})}
function hs(id,x,y,w,h,fn,label){const b=document.createElement('button');b.className='hotspot';b.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%`;b.setAttribute('aria-label',label||'调查');b.onclick=fn;els.hotspots.appendChild(b)}
function inspect(title,text,actions=''){openModal(`<h2>${title}</h2><p>${text}</p>${actions}`)}

function renderScene(){els.img.src=SCENES[state.scene].img;els.img.alt=SCENES[state.scene].name;els.hotspots.innerHTML='';els.event.innerHTML='';
 if(state.scene==='entry')renderEntry();if(state.scene==='living')renderLiving();if(state.scene==='bedroom')renderBedroom();if(state.scene==='bathroom')renderBathroom();if(state.scene==='hallway')renderHallway();
}
function renderEntry(){
  hs('shoes',75,72,20,24,()=>{
    addClue('shoes');
    inspect('玄关的拖鞋','左脚朝里，右脚压在鞋柜边。你早上出门时为了扫地，明明把两只都并排推到了柜子下面。<br><br>门锁没有撬痕，钥匙也一直在你身上。');
  },'玄关鞋柜');
  hs('fridge',34,28,17,35,()=>{
    addClue('bottle');
    inspect('冰箱','最上层多了一瓶常温款矿泉水。你只买同一个牌子的苏打水，而且这瓶的瓶盖已经拧开过。');
  },'冰箱');
  hs('door',78,28,18,40,()=>{
    if(state.stage<STAGE.CHAIN){
      inspect('入户门','锁舌、门框和猫眼都正常。没有强行进入的痕迹。');
    }else{
      addClue('chain');
      inspect('防盗链','链条现在扣在门框上。<br><br><b>你非常确定，进门以后没有碰过它。</b><br><br>而且这条链只能从屋里挂上。',`<button class="modal-action" onclick="window.__goHall()">把链条取下，去楼道</button>`);
      if(state.stage===STAGE.CHAIN){
        setTimeout(()=>eventText('你第一次认真地想到：也许屋里不是“来过”人。<br>也许那个人还没有离开。'),200);
      }
    }
  },'入户门');
}
function renderLiving(){
 hs('bin',4,58,20,32,()=>{if(state.stage<STAGE.CHECK){inspect('客厅角落','普通的纸袋和外卖包装。你暂时没发现值得在意的东西。')}else{addClue('twoCups');addClue('receipt',true);inspect('垃圾桶','最上面压着两个同款一次性咖啡杯。你今天一整天都在公司。<br><br>其中一张揉皱的小票时间是 <b>21:36</b>——那时你还在加班。')}} ,'垃圾桶');
 hs('table',58,60,23,23,()=>{if(state.stage>=STAGE.MEMORY&&!hasOpt('movingPhoto')){inspect('茶几','手机就放在这里。屏幕上还有早上拍早餐时留下的照片缩略图。你忽然想起：那张照片刚好拍到了玄关。',`<button class="modal-action" onclick="window.__openPhonePhoto()">查看今早照片</button>`)}else inspect('茶几','充电线、遥控器、昨晚没看完的书。暂时没有别的异常。')},'茶几');
 hs('window',76,15,22,47,()=>{if(state.stage>=STAGE.CHECK){inspect('窗边','窗锁没有动过。窗帘却比你早上离开时合得更紧。可这扇窗没有风能吹进来。')}else inspect('窗边','窗户锁着。城市的灯从帘缝里照进来。')},'窗边');
}
function renderBedroom(){
 hs('curtain',72,4,26,55,()=>{if(state.stage>=STAGE.CHECK){addClue('curtain');inspect('卧室窗帘','右侧帘布被完全拉到了轨道尽头。你早上为了让植物晒太阳，明明留了大约半扇窗的空隙。')}else inspect('窗帘','拉得很严。你今天太累了，暂时不想多想。')},'窗帘');
 hs('wardrobe',0,5,23,83,()=>{if(state.stage<STAGE.GAP){inspect('衣柜','衣服都在。你甚至把最下面两个纸箱拖出来看了，里面没人。')}else{addClue('gap');addClue('tag');addClue('delivery');setStage(STAGE.FINAL,'23:39');inspect('衣柜后面','柜体与墙之间不是实墙。你推开背板，后面露出一条仅够一个成年人侧身通过的维修夹层。<br><br>里面有一枚绿色物业工程钥匙牌，以及一团废纸。展开以后，收件人一栏写着：<b>徐洲</b>。<br><br>徐洲——三个月前把这套房源链接发给你的同事。',`<button class="modal-action" onclick="window.__finishGap()">拿出手机</button>`) }},'衣柜');
 hs('bedside',24,26,19,29,()=>{if(state.stage>=STAGE.HALL&&!hasOpt('movingPhoto')){addClue('movingPhoto',true);inspect('床头相框','搬家那天的合照被你压在一本书下面。徐洲站在你身后，腰侧挂着一个绿色塑料牌。<br><br>和你刚才在夹层看到的工程钥匙牌，颜色、形状都一样。')}else inspect('床头','旧相框、一本没读完的书。')},'床头');
}
function renderBathroom(){
 hs('mat',45,70,38,25,()=>{addClue('wetmat');inspect('地垫','中间是湿的。不是潮气，是有人刚踩过水后留下的那种潮湿。<br><br>你早上七点洗的澡。现在已经快十一点。')},'地垫');
 hs('sink',25,28,43,35,()=>{if(state.stage<STAGE.CHECK){inspect('洗手台','牙杯、洗面奶、剃须刀。都在平常的位置。')}else{addClue('toothbrush');inspect('牙杯','杯子里有两支牙刷。<br><br>蓝色那支旧牙刷你昨晚刷毛开叉，今天早上已经扔进楼下垃圾桶。')}} ,'洗手台');
 hs('mirror',5,8,34,34,()=>inspect('镜子','镜面上有很轻的水汽痕。你凑近时，甚至能闻到一点并不属于你的薄荷漱口水味。'),'镜子');
}
function renderHallway(){
 hs('704',15,24,23,55,()=>{addClue('maintenance');addClue('scratch',true);inspect('704','门上贴着“空置维修，请勿进入”。封条却是重新粘过的。<br><br>门框内侧有几道很新的划痕，像有人反复用硬物顶开过锁舌。')},'704房门');
 hs('notice',58,15,25,34,()=>{addClue('maintenance');inspect('维修通知','七楼管线改造记录显示：704 与你家共用一条旧检修竖井。<br><br>施工方一栏很模糊，只能看清“原物业外包工程组”。')},'维修通知');
 hs('neighbor',76,55,18,30,()=>{inspect('703邻居','你敲门问最近有没有见过陌生人。<br><br>邻居皱了皱眉：<br>“陌生人？没有啊。就是上次帮你搬家的那个男的。前几天我还看见他从704出来。我以为你让他过来修东西。”',`<button class="modal-action" onclick="window.__backBedroom()">回卧室检查衣柜</button>`);if(has('maintenance'))setStage(STAGE.GAP,'23:31')},'邻居房门');
}

function phoneHTML(){
 let msgs=`<div class="message them">房东：下午？我今天没过去。备用钥匙也一直在我这里。</div>`;
 if(state.stage>=STAGE.CHAIN)msgs+=`<div class="message me">我家里的防盗链自己挂上了。</div><div class="message them">房东：先出去。别一个人待在里面。</div>`;
 if(state.stage>=STAGE.FINAL)msgs+=`<div class="message them">徐洲 23:41：到家了吗？</div>`;
 return `<h2>手机</h2><div class="phone-screen">${msgs}</div>${state.stage===STAGE.MEMORY?`<div class="divider"></div><button class="modal-action" onclick="window.__openPhonePhoto()">查看今早 07:12 的照片</button>`:''}${state.stage>=STAGE.FINAL?`<div class="divider"></div><button class="modal-action" onclick="window.__endingChoice()">处理徐洲的消息</button>`:''}`;
}
function notesHTML(){let items=state.clues.map(id=>`<div class="clue">${clueDefs[id]||id}</div>`).join('')||'<p class="muted">你还没有确认任何异常。</p>';let opts=state.optional.map(id=>`<div class="clue optional">${optDefs[id]||id}</div>`).join('');return `<h2>随手记下的事</h2><div class="clue-list">${items}${opts}</div>`}
function mapHTML(){const ids=['entry','living','bedroom','bathroom','hallway'];return `<h2>位置</h2><div class="map-grid">${ids.map(id=>`<div class="map-room ${state.visited.includes(id)?'open':''}">${SCENES[id].name}<br><span class="muted">${state.visited.includes(id)?'去过':'未查看'}</span></div>`).join('')}</div><p class="muted">你住在 705。704 当前空置维修。</p>`}
function hintHTML(){const arr=hintText[state.stage]||['现在没有更多提示。'];state.hintLevel=Math.min((state.hintLevel||0)+1,arr.length);safeSave();return `<h2>提示 ${state.hintLevel}/${arr.length}</h2><div class="hint-box"><p>${arr[state.hintLevel-1]}</p></div><p class="muted">提示只在你主动打开时出现，场景热点本身不会高亮。</p>`}
function settingsHTML(){return `<h2>设置</h2><div class="choice-grid"><button onclick="window.__toggleAmbient()">${state.flags.ambient===false?'开启':'关闭'} 环境音</button><button onclick="window.__restart()">重新开始案件</button></div><div class="divider"></div><p class="credits">摄影素材授权说明见包内 LICENSES.md。游戏会把进度保存在浏览器本地。</p>`}
$$('[data-panel]').forEach(b=>b.onclick=()=>{const p=b.dataset.panel;if(p==='phone')openModal(phoneHTML());if(p==='notes')openModal(notesHTML());if(p==='map')openModal(mapHTML());if(p==='hint')openModal(hintHTML());if(p==='settings')openModal(settingsHTML())});

window.__openPhonePhoto=()=>{openModal(`<h2>今早 07:12</h2><div class="photo-card"><img src="assets/img/morning_memory.webp" alt="今早拍下的客厅照片"></div><p>你拍的是早餐。但玄关刚好落在画面边缘。</p><p><b>两只拖鞋整齐地并排塞在鞋柜下面。</b></p><p>不是你记错了。</p><button class="modal-action" onclick="window.__afterMemory()">给房东发消息</button>`,false)};
window.__afterMemory=()=>{addClue('shoes');setStage(STAGE.CHECK,'23:04');els.modal.dataset.closable='1';closeModal();eventText('房东很快回复：<br>“我今天没去。备用钥匙也在我这里。”')};
window.__goHall=()=>{setStage(STAGE.HALL,'23:24');els.modal.dataset.closable='1';closeModal();go('hallway')};
window.__backBedroom=()=>{setStage(STAGE.GAP,'23:31');els.modal.dataset.closable='1';closeModal();go('bedroom')};
window.__finishGap=()=>{els.modal.dataset.closable='1';closeModal();openModal(phoneHTML());};
window.__endingChoice=()=>{const secret=state.optional.length>=3;openModal(`<h2>23:43</h2><p>屏幕上只有徐洲的一句话：</p><div class="phone-screen"><div class="message them">到家了吗？</div></div><p>他没有理由知道你今晚几点回来。</p><div class="choice-grid"><button onclick="window.__end('leave')"><b>先离开</b><br><span class="muted">拿上证件和手机，从消防楼梯下楼，再报警。</span></button><button onclick="window.__end('ask')"><b>问他</b><br><span class="muted">直接发照片质问徐洲。</span></button><button onclick="window.__end('trap')"><b>不回复</b><br><span class="muted">把旧手机留在屋里录像，自己离开。</span></button>${secret?`<button onclick="window.__end('secret')"><b>什么都不带</b><br><span class="muted">你忽然意识到，连这套房都是他推荐给你的。</span></button>`:''}</div>`,false)};
const endingText={
 leave:{title:'结局一 · 楼下',code:'THE SAFE DISTANCE',body:'你没有继续证明自己有多勇敢。<br><br>23:56，你坐在便利店靠窗的位置报警。警察和物业进入704后，在维修夹层里找到了一床薄毯、充电宝、几瓶水，以及一串可以打开七楼检修门的旧钥匙。<br><br>徐洲的电话从那之后再也没有打通。<br><br>第二天，你第一次觉得“先离开”也是一种答案。'},
 ask:{title:'结局二 · 门锁',code:'THE QUESTION',body:'你把绿色钥匙牌的照片发给徐洲。<br><br>对方显示“正在输入”很久。<br><br>最后只来了一句：<br><b>“门锁没坏吧？”</b><br><br>你抬头看向入户门。下一秒，走廊里传来很轻的一声金属碰撞。你没有再等第二条消息。'},
 trap:{title:'结局三 · 01:17',code:'THE RECORDING',body:'你把旧手机架在卧室书架上，屏幕朝着衣柜。然后关灯，从消防楼梯离开。<br><br>凌晨01:17，录像里的衣柜背板从里面慢慢向外推开。一个人只露出半边肩膀，停了很久。<br><br>他似乎在听。<br><br>然后镜头外传来你故意留下的手机闹钟。那个人立刻退回黑暗里。<br><br>这段录像后来成了最重要的证据。'},
 secret:{title:'隐藏结局 · 房源链接',code:'YOU WERE CHOSEN',body:'你没有报警，也没有收拾。你直接下楼，打车去了24小时酒店。<br><br>因为你突然把三件事连了起来：搬家照片里的工程钥匙牌、21:36的小票、704反复被撬开的门框。<br><br>三个月前，是徐洲主动把这套“刚空出来、很便宜”的房源发给你的。<br><br>第二天你换了住处、号码和公司。<br><br>两周后，新前台递给你一个没有寄件人信息的小纸箱。<br><br>里面只有那双拖鞋。<br><br>摆得整整齐齐。'}
};
window.__end=(id)=>{state.ending=id;state.stage=STAGE.END;safeSave();const e=endingText[id];openModal(`<div class="ending"><p class="ending-code">${e.code}</p><p class="ending-title">${e.title}</p><p>${e.body}</p><div class="divider"></div><p>如果这个普通人的夜晚让你觉得值得，可以自愿支持作者继续做下一部。</p><div class="support-row"><button onclick="window.__support(1)">¥1 支持</button><button onclick="window.__support(3)">¥3 很喜欢</button><button onclick="window.__support(6)">¥6 等下一部</button></div><p class="muted">当前包未内置真实收款码，请替换后再上线。</p><button class="modal-action" onclick="window.__restart()">重新体验</button></div>`,false)};
window.__support=n=>toast(`支持入口 ¥${n}：请在上线前配置你的收款方式`);
window.__restart=()=>{stopAmbient();state=defaultState();clearSave();els.modal.dataset.closable='1';els.modal.classList.add('hidden');els.title.classList.remove('hidden');els.game.classList.add('hidden');els.cont.classList.add('hidden');};
window.__toggleAmbient=()=>{state.flags.ambient=state.flags.ambient===false?true:false;if(state.flags.ambient===false)stopAmbient();else startAmbient();safeSave();toast(state.flags.ambient===false?'环境音已关闭':'环境音已开启')};

function begin(useSave=false){if(!useSave)state=defaultState();startAmbient();els.title.classList.add('hidden');els.game.classList.remove('hidden');safeSave();renderUI();if(!useSave){openModal(`<h2>22:48</h2><p>今天加班到很晚。</p><p>你在七楼电梯口摸到钥匙，走到705门前。门锁完好，没有撬痕。</p><p>你开门、开灯、把包放下。</p><p>然后看见玄关的拖鞋。</p><p><b>它们的位置不对。</b></p><button class="modal-action" onclick="document.querySelector('#modal').dataset.closable='1';document.querySelector('#modal').classList.add('hidden')">先看看家里</button>`,false)}}
els.start.onclick=()=>begin(false);if(load()){els.cont.classList.remove('hidden');els.cont.onclick=()=>begin(true)}
})();
