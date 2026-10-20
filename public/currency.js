(()=>{'use strict';
const viewer=document.getElementById('voltCoinViewer'),coin=document.getElementById('voltCoinLarge'),scene=document.getElementById('voltViewerScene'),sparks=document.getElementById('voltViewerSparks'),close=document.getElementById('voltViewerClose');
if(!viewer||!coin||!scene||!sparks||!close)return;
let rx=-12,ry=-22,drag=false,lastX=0,lastY=0,pointerId=null;
const paint=()=>{coin.style.transform='rotateX('+rx+'deg) rotateY('+ry+'deg)';};
function open(){viewer.classList.remove('hidden');document.body.classList.add('volt-viewer-open');rx=-12;ry=-22;paint();close.focus({preventScroll:true});}
function shut(){viewer.classList.add('hidden');document.body.classList.remove('volt-viewer-open');drag=false;pointerId=null;}
document.addEventListener('click',e=>{const target=e.target.closest('.volt-coin');if(target){e.preventDefault();e.stopPropagation();open();}});
close.addEventListener('click',shut);
viewer.addEventListener('click',e=>{if(e.target===viewer)shut();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.classList.contains('hidden'))shut();});
scene.addEventListener('pointerdown',e=>{if(e.target.closest('#voltViewerSparks'))return;drag=true;pointerId=e.pointerId;lastX=e.clientX;lastY=e.clientY;scene.setPointerCapture?.(pointerId);scene.classList.add('is-dragging');e.preventDefault();});
scene.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pointerId)return;ry+=(e.clientX-lastX)*.9;rx-=(e.clientY-lastY)*.75;rx=Math.max(-75,Math.min(75,rx));lastX=e.clientX;lastY=e.clientY;paint();});
const stop=e=>{if(e.pointerId!==pointerId)return;drag=false;pointerId=null;scene.classList.remove('is-dragging');};
scene.addEventListener('pointerup',stop);scene.addEventListener('pointercancel',stop);scene.addEventListener('lostpointercapture',()=>{drag=false;pointerId=null;scene.classList.remove('is-dragging')});
const bolts=['ϟ','⚡','ϟ','✦'];
for(let n=0;n<22;n++){const s=document.createElement('span');s.className='volt-spark';s.textContent=bolts[n%bolts.length];s.style.setProperty('--angle',(n*360/22)+'deg');s.style.setProperty('--delay',(-Math.random()*3)+'s');s.style.setProperty('--duration',(2.2+Math.random()*2.2)+'s');s.style.setProperty('--distance',(105+Math.random()*100)+'px');s.style.setProperty('--size',(12+Math.random()*18)+'px');sparks.appendChild(s);}
})();