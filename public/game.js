(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let width=innerWidth,height=innerHeight,dpr=1,ws=null,myId=null,worldW=2600,worldH=1800,players=[],gems=[],playing=false,score=0,camX=0,camY=0;
const keys=new Set(),joy={x:0,y:0},particles=[];
function resize(){width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
const rand=(a,b)=>Math.random()*(b-a)+a;
function connect(){if(ws)ws.close();$('error').textContent='';$('status').textContent='● подключение...';
 ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');
 ws.onopen=()=>{ws.send(JSON.stringify({t:'join',name:$('nick').value}));playing=true;$('menu').style.display='none';$('joystick').classList.add('active');$('status').textContent='● онлайн';};
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.t==='hello'){myId=m.id;worldW=m.w;worldH=m.h;}if(m.t==='state'){players=m.p;gems=m.g;const me=players.find(p=>p.id===myId);if(me){score=me.score;$('score').textContent=score;}const rank=[...players].sort((a,b)=>b.score-a.score).slice(0,7);$('leaders').replaceChildren(...rank.map((p,i)=>{const div=document.createElement('div');div.className='leader';const name=document.createElement('span');name.textContent=`${i+1}. ${p.name}${p.id===myId?' ★':''}`;const points=document.createElement('b');points.textContent=p.score;div.append(name,points);return div;}));}};
 ws.onclose=()=>{playing=false;$('menu').style.display='grid';$('joystick').classList.remove('active');$('status').textContent='● отключено';$('error').textContent='Соединение потеряно. Нажми «Играть», чтобы вернуться.'};
 ws.onerror=()=>{$('error').textContent='Не удалось подключиться к серверу. Проверь адрес и HTTPS.'};
}
$('play').onclick=connect;$('nick').onkeydown=e=>{if(e.key==='Enter')connect()};
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.add(e.key.toLowerCase())});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
const stick=$('joystick'),knob=$('knob');let pointer=null;
function moveStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy),radius=45;joy.x=l?dx/Math.max(radius,l):0;joy.y=l?dy/Math.max(radius,l):0;knob.style.transform=`translate(${joy.x*radius}px,${joy.y*radius}px)`;}
stick.addEventListener('pointerdown',e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);moveStick(e)});stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)moveStick(e)});function stopStick(e){if(e.pointerId!==pointer)return;pointer=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
setInterval(()=>{if(!playing||!ws||ws.readyState!==1)return;let x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x,y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.y;ws.send(JSON.stringify({t:'input',x,y}));},50);
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function draw(t){requestAnimationFrame(draw);ctx.clearRect(0,0,width,height);ctx.fillStyle='#07091c';ctx.fillRect(0,0,width,height);
 const me=players.find(p=>p.id===myId);if(me){camX+=(me.x-width/2-camX)*.15;camY+=(me.y-height/2-camY)*.15;}else{camX=worldW/2-width/2;camY=worldH/2-height/2;}
 ctx.save();ctx.translate(-camX,-camY);
 ctx.fillStyle='#0b1030';ctx.fillRect(0,0,worldW,worldH);
 const grid=80;ctx.lineWidth=1;ctx.strokeStyle='#27356460';for(let x=0;x<=worldW;x+=grid){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,worldH);ctx.stroke()}for(let y=0;y<=worldH;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke()}
 ctx.lineWidth=8;ctx.strokeStyle='#39edff';ctx.shadowColor='#00e5ff';ctx.shadowBlur=18;ctx.strokeRect(4,4,worldW-8,worldH-8);ctx.shadowBlur=0;
 for(const g of gems){if(g.x<camX-30||g.x>camX+width+30||g.y<camY-30||g.y>camY+height+30)continue;const r=g.v===5?11:7,phase=Math.sin(t*.003+g.x)*2;ctx.save();ctx.translate(g.x,g.y+phase);ctx.rotate(Math.PI/4);ctx.fillStyle=g.v===5?'#ff5ce9':'#27eaff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=16;ctx.fillRect(-r/2,-r/2,r,r);ctx.restore();}
 for(const p of players){const own=p.id===myId,scale=1+Math.min(p.score/450,0.7),r=16*scale;ctx.save();ctx.translate(p.x,p.y);ctx.shadowColor=`hsl(${p.color} 100% 60%)`;ctx.shadowBlur=own?30:17;ctx.fillStyle=`hsl(${p.color} 92% 55%)`;roundRect(-r,-r,r*2,r*2,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#07132a';ctx.fillRect(-r*.48,-r*.24,r*.36,r*.36);ctx.fillRect(r*.15,-r*.24,r*.36,r*.36);ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(p.name,0,-r-12);ctx.fillStyle='#b3ecff';ctx.font='10px system-ui';ctx.fillText('💎 '+p.score,0,r+17);if(own){ctx.strokeStyle='#fff';ctx.lineWidth=2;roundRect(-r-3,-r-3,r*2+6,r*2+6,9);ctx.stroke()}ctx.restore();}
 ctx.restore();ctx.fillStyle='#d5faffaa';ctx.font='12px system-ui';ctx.fillText('NEON STEVE ARENA • '+players.length+' онлайн',15,height-14);
}requestAnimationFrame(draw);
})();
