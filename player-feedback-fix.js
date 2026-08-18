(() => {
'use strict';

const VERSION='20260818a';
const META_KEY='tonight_someone_was_here_meta';
const MODAL_ID='modalContent';
const TEASER_ID='playerArchiveTeaser';
const NORMAL_ENDINGS=['leave','ask','trap'];

function $(s){return document.querySelector(s)}
function readMeta(){
  try{
    const raw=JSON.parse(localStorage.getItem(META_KEY)||'{}');
    return raw&&typeof raw==='object'?raw:{};
  }catch(e){return {}}
}
function endingState(){
  const seen=Array.isArray(readMeta().endingsSeen)?readMeta().endingsSeen:[];
  const unique=[...new Set(seen.filter(x=>typeof x==='string'))];
  return {
    normal:NORMAL_ENDINGS.filter(x=>unique.includes(x)).length,
    secret:unique.includes('secret')
  };
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}

function fixIntroDuplicate(root){
  const title=root.querySelector('h2')?.textContent.trim();
  if(title!=='22:48')return false;
  const ps=[...root.querySelectorAll(':scope > p')];
  const matches=ps.filter(p=>(p.textContent||'').trim().startsWith('你在门内侧停了一下。鞋柜下方的浅色地砖边缘'));
  if(matches.length<2)return false;
  matches.forEach((p,i)=>{
    if(i===0){p.hidden=false;p.removeAttribute('aria-hidden')}
    else{p.hidden=true;p.setAttribute('aria-hidden','true')}
  });
  return true;
}

function clearArchiveTeaser(){
  const old=document.getElementById(TEASER_ID);
  if(old)old.remove();
}
function ensureArchiveTeaser(root){
  clearArchiveTeaser();
  const title=root.querySelector('h2')?.textContent.trim()||'';
  if(!title.startsWith('结局档案'))return false;
  const progress=endingState();
  if(progress.normal!==3||progress.secret)return false;

  const h=root.querySelector('h2');
  setText(h,'结局档案 · 普通结局 3/3 · 未归档 1');

  const card=root.closest('.modal-card');
  if(!card)return false;
  const teaser=document.createElement('section');
  teaser.id=TEASER_ID;
  teaser.setAttribute('aria-label','未归档结局提示');
  teaser.innerHTML=`
    <div class="player-archive-unfiled">
      <div class="archive-code">UNFILED</div>
      <h3>??? · 未归档</h3>
      <p>三个普通结局都已经记录，但这份档案还没有闭合。</p>
      <p>它不是第四个“最后选择”。只有在<strong>同一轮调查</strong>里留下足够的主线外观察，终局才会出现新的处理方式。</p>
      <details>
        <summary>需要一点无剧透方向？</summary>
        <p>二周目不要只沿主线赶进度。留意记事里的“额外观察”；到了后半程拿到人物和夹层信息后，再回看一次此前调查过的生活物件。</p>
        <p class="muted">结局档案会跨周目保留，但额外观察不会跨周目自动带入。</p>
      </details>
    </div>`;
  card.insertBefore(teaser,root.nextSibling);
  return true;
}

function fixEndingProgress(root){
  if(!root.querySelector('.ending'))return false;
  const progress=endingState();
  if(progress.normal!==3||progress.secret)return false;
  const p=[...root.querySelectorAll('p')].find(el=>{
    const t=el.textContent||'';
    return t.includes('结局档案已更新：')||t.includes('已解锁结局：');
  });
  if(!p)return false;
  setText(p,'结局档案已更新：普通结局 3/3。档案里仍有一条未归档记录；它并不是由最后一个按钮直接决定的。');
  return true;
}

function polishTitleGuidance(){
  const progress=endingState();
  const review=$('#reviewBtn');
  const archive=$('#endingArchiveBtn');
  if(progress.normal===3&&!progress.secret){
    if(review){setText(review,'快速复盘（继续查漏）');review.title='三个普通结局已完成；复盘时可以继续寻找未归档记录。'}
    if(archive)archive.title='普通结局已完成 3/3，仍有 1 条未归档记录。';
  }else{
    if(review&&review.textContent==='快速复盘（继续查漏）')setText(review,'快速复盘（二周目）');
    if(review)review.removeAttribute('title');
    if(archive)archive.removeAttribute('title');
  }
}

function applyModalFixes(){
  const root=document.getElementById(MODAL_ID);
  if(!root)return;
  if(!root.children.length){clearArchiveTeaser();polishTitleGuidance();return}
  fixIntroDuplicate(root);
  fixEndingProgress(root);
  ensureArchiveTeaser(root);
  polishTitleGuidance();
}

let scheduled=false;
function scheduleFix(){
  if(scheduled)return;
  scheduled=true;
  const first=()=>{
    const second=()=>{scheduled=false;applyModalFixes()};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(second);else setTimeout(second,0);
  };
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(first);else setTimeout(first,0);
}

function install(){
  const root=document.getElementById(MODAL_ID);
  if(root){
    const ob=new MutationObserver(scheduleFix);
    ob.observe(root,{childList:true,subtree:true});
  }
  const modal=$('#modal');
  if(modal){
    const ob=new MutationObserver(scheduleFix);
    ob.observe(modal,{attributes:true,attributeFilter:['class']});
  }
  scheduleFix();
  window.__PLAYER_FEEDBACK_FIX_QA__={
    version:VERSION,
    endingState,
    run:()=>{applyModalFixes();return {
      introDuplicates:[...document.querySelectorAll('#modalContent > p')].filter(p=>!p.hidden&&(p.textContent||'').trim().startsWith('你在门内侧停了一下。鞋柜下方的浅色地砖边缘')).length,
      archiveTeaser:!!document.getElementById(TEASER_ID),
      progress:endingState()
    }}
  };
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
