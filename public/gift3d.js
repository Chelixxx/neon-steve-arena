(()=>{'use strict';
const $=id=>document.getElementById(id);
const viewer=$('gift3dViewer'),stage=$('gift3dStage'),obj=$('gift3dObject'),face=$('gift3dEmoji'),zoom=$('gift3dZoom'),name=$('gift3dName'),rarity=$('gift3dRarity'),particles=$('gift3dParticles');
if(!viewer||!stage||!obj)return;
let rx=-12,ry=-20,scale=1,drag=false,pid=null,lastX=0,lastY=0,pinchStart=0,pinchScale=1;
const render=()=>{obj.style.transform='rotateX('+rx+'deg) rotateY('+ry+'deg) scale('+scale+')';zoom.value=String(Math.round(scale*100));};
function openGift(data){face.textContent=data.emoji||'🎁';name.textContent=data.name||'Подарок';rarity.textContent=data.rarity||'3D осмотр';viewer.classList.remove('hidden');document.body.classList.add('gift3d-open');rx=-12;ry=-20;scale=1;render();}
function close(){viewer.classList.add('hidden');document.body.classList.remove('gift3d-open');drag=false;pid=null;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-gift-inspect]');if(!b)return;const card=b.closest('.gift-card');openGift({emoji:b.dataset.emoji||card?.querySelector('.gift-layer-main')?.textContent,name:b.dataset.name||card?.querySelector('b')?.textContent,rarity:b.dataset.rarity||card?.querySelector('small')?.textContent});});
$('gift3dClose').addEventListener('click',close);viewer.addEventListener('click',e=>{if(e.target===viewer)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.classList.contains('hidden'))close()});
stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.isPrimary===false)return;drag=true;pid=e.pointerId;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture?.(pid);stage.classList.add('dragging');e.preventDefault()});
stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pid)return;ry+=(e.clientX-lastX)*.8;rx-=(e.clientY-lastY)*.7;rx=Math.max(-80,Math.min(80,rx));lastX=e.clientX;lastY=e.clientY;render()});
const stop=e=>{if(e.pointerId!==pid)return;drag=false;pid=null;stage.classList.remove('dragging')};stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);
stage.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.7,Math.min(1.8,scale+(e.deltaY<0?.08:-.08)));render()},{passive:false});
zoom.addEventListener('input',()=>{scale=Number(zoom.value)/100;render()});$('gift3dZoomIn').onclick=()=>{scale=Math.min(1.8,scale+.12);render()};$('gift3dZoomOut').onclick=()=>{scale=Math.max(.7,scale-.12);render()};
let initialDistance=0,initialScale=1;stage.addEventListener('touchstart',e=>{if(e.touches.length===2){initialDistance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);initialScale=scale}},{passive:true});stage.addEventListener('touchmove',e=>{if(e.touches.length===2&&initialDistance){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);scale=Math.max(.7,Math.min(1.8,initialScale*d/initialDistance));render();e.preventDefault()}},{passive:false});
for(let i=0;i<18;i++){const p=document.createElement('span');p.className='gift3d-particle';p.textContent=['✦','✧','⚡','✦'][i%4];p.style.setProperty('--angle',i*20+'deg');p.style.setProperty('--delay',(-Math.random()*4)+'s');p.style.setProperty('--distance',(90+Math.random()*110)+'px');particles.appendChild(p)}
})();