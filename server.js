'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||8000,ROOT=path.join(__dirname,'public'),players=new Map(),rooms=new Map(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clean=s=>String(s||'Player').replace(/[^\p{L}\p{N}_ -]/gu,'').trim().slice(0,16)||'Player';
const maps=[
{id:'dust',name:'DUST DISTRICT',blocks:[[-18,-10,8,16],[18,10,8,16],[0,-25,20,4],[0,25,20,4],[-35,20,8,8],[35,-20,8,8],[-5,8,7,4],[30,0,4,13]]},
{id:'ice',name:'FROST BASE',blocks:[[-25,0,5,30],[25,0,5,30],[0,-30,24,5],[0,30,24,5],[-10,15,10,5],[15,-15,10,5],[-35,-20,7,7],[35,20,7,7]]},
{id:'yard',name:'CONTAINER YARD',blocks:[[-30,-20,18,5],[-30,-10,18,5],[30,20,18,5],[30,10,18,5],[0,0,10,10],[0,35,24,5],[-15,-35,12,5],[22,-34,6,12]]}
];
function roomFor(name,map){const key=name+'|'+map;if(!rooms.has(key))rooms.set(key,{key,name,map,players:new Set(),chat:[]});return rooms.get(key)}
function blocked(map,x,z){return map.blocks.some(([bx,bz,w,d])=>x>bx-w/2-.8&&x<bx+w/2+.8&&z>bz-d/2-.8&&z<bz+d/2+.8)}
function spawn(p){const map=maps.find(v=>v.id===p.map);let x=0,z=0;for(let i=0;i<80;i++){x=(Math.random()-.5)*82;z=(Math.random()-.5)*82;if(!blocked(map,x,z))break}p.x=x;p.z=z;p.y=0;p.vy=0;p.grounded=true;p.hp=100;p.yaw=Math.random()*Math.PI*2;p.respawnAt=0}
function send(p,m){if(p.ws&&p.ws.readyState===1&&p.ws.bufferedAmount<65536)p.ws.send(JSON.stringify(m))}
function pub(p){return {id:p.id,name:p.name,x:p.x,y:p.y||0,z:p.z,yaw:p.yaw,pitch:p.pitch||0,hp:p.hp,kills:p.kills,deaths:p.deaths,weapon:p.weapon,skin:p.skin,room:p.room,bot:!!p.bot}}
function broadcast(r,m){const text=JSON.stringify(m);for(const id of r.players){const p=players.get(id);if(p&&p.ws&&p.ws.readyState===1&&p.ws.bufferedAmount<65536)p.ws.send(text)}}
function hit(a,b){const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d>70||d<.01)return false;const aim=Math.atan2(-dx,-dz),diff=Math.atan2(Math.sin(a.yaw-aim),Math.cos(a.yaw-aim));return Math.abs(diff)<.065}
function damage(a,b,n){b.hp=Math.max(0,b.hp-n);if(!b.hp){b.deaths++;a.kills++;b.respawnAt=Date.now()+1600;broadcast(roomFor(a.room,a.map),{t:'kill',killer:a.name,victim:b.name,weapon:a.weapon})}broadcast(roomFor(a.room,a.map),{t:'update',player:pub(b),killer:pub(a)})}
function ensureBots(r){if([...r.players].some(id=>{const p=players.get(id);return p&&p.bot}))return;for(const name of ['FlickBot','QuickScope','Ghost']){const p={id:'bot_'+crypto.randomUUID().slice(0,8),ws:{readyState:3},name,room:r.name,map:r.map,x:0,y:0,z:0,yaw:0,pitch:0,hp:100,kills:0,deaths:0,weapon:'sniper',skin:'standard',mx:0,mz:0,lastShot:0,respawnAt:0,vy:0,grounded:true,bot:true,thinkAt:0};spawn(p);players.set(p.id,p);r.players.add(p.id)}}
const server=http.createServer((req,res)=>{let u;try{u=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end()}if(u.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,game:'SNIPER ARENA',players:players.size,rooms:rooms.size,uptime:Math.round(process.uptime())}))}const p=u.pathname==='/'?'/index.html':u.pathname,f=path.resolve(ROOT,'.'+decodeURIComponent(p));if(!f.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end()}fs.stat(f,(e,s)=>{if(e||!s.isFile()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(res)})});
const wss=new WebSocketServer({server,path:'/ws',perMessageDeflate:false,maxPayload:2048});
wss.on('connection',ws=>{let p=null;ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.t!=='string')return;
if(m.t==='join'&&!p){const map=maps.some(v=>v.id===m.map)?m.map:'dust',name=clean(m.room||'QUICK MATCH').toUpperCase().slice(0,20),r=roomFor(name,map);ensureBots(r);p={id:crypto.randomUUID(),ws,name:clean(m.name),room:name,map,x:0,y:0,z:0,yaw:0,pitch:0,hp:100,kills:0,deaths:0,weapon:'sniper',skin:'standard',mx:0,mz:0,lastShot:0,respawnAt:0,vy:0,grounded:true,bot:false};spawn(p);players.set(p.id,p);r.players.add(p.id);
const bots=[...r.players].map(id=>players.get(id)).filter(q=>q&&q.bot);
for(let i=0;i<bots.length;i++){const b=bots[i],ang=(Math.PI*2*i/bots.length)+Math.PI/4;let placed=false;for(let k=0;k<24;k++){const a=ang+k*.37,rad=10+(k%4)*2,x=clamp(p.x+Math.cos(a)*rad,-43,43),z=clamp(p.z+Math.sin(a)*rad,-43,43);if(!blocked(maps.find(v=>v.id===p.map),x,z)&&Math.hypot(x-p.x,z-p.z)>7){b.x=x;b.z=z;b.y=0;b.yaw=Math.atan2(-(p.x-x),-(p.z-z));placed=true;break}}if(!placed)spawn(b)}
send(p,{t:'welcome',id:p.id,map:maps.find(v=>v.id===map),players:[...r.players].map(id=>players.get(id)).filter(Boolean).map(pub),chat:r.chat.slice(-25)});broadcast(r,{t:'join',player:pub(p)});return}
if(!p)return;
if(m.t==='clock'){send(p,{t:'pong',sent:m.sent,serverTime:Date.now()});return}
if(m.t==='ping'){send(p,{t:'pong',serverTime:Date.now()});return}
if(m.t==='input'){p.mx=clamp(Number(m.mx)||0,-1,1);p.mz=clamp(Number(m.mz)||0,-1,1);if(Number.isFinite(Number(m.yaw)))p.yaw=Number(m.yaw);p.pitch=clamp(Number(m.pitch)||0,-1.25,1.25);if(['sniper','knife'].includes(m.weapon))p.weapon=m.weapon;if(m.jump&&p.grounded){p.vy=7.4;p.grounded=false}}
if(m.t==='shoot'){const now=Date.now(),cd=p.weapon==='knife'?500:850;if(now-p.lastShot<cd||p.hp<=0)return;p.lastShot=now;const r=roomFor(p.room,p.map);if(p.weapon==='knife'){for(const id of r.players){const q=players.get(id);if(q&&q.id!==p.id&&q.hp>0&&Math.hypot(q.x-p.x,q.z-p.z)<3.5&&hit(p,q)){damage(p,q,100);break}}}else{let best=null,dist=Infinity;for(const id of r.players){const q=players.get(id);if(!q||q.id===p.id||q.hp<=0||!hit(p,q))continue;const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<dist){dist=d;best=q}}if(best)damage(p,best,100)}broadcast(r,{t:'shot',id:p.id,weapon:p.weapon,at:now})}
if(m.t==='change'){if(['sniper','knife'].includes(m.weapon))p.weapon=m.weapon;if(['standard','ember','frost','toxic','gold'].includes(m.skin))p.skin=m.skin}
if(m.t==='chat'){const text=String(m.text||'').replace(/[<>]/g,'').trim().slice(0,180);if(text){const r=roomFor(p.room,p.map),item={name:p.name,text,at:Date.now()};r.chat.push(item);r.chat=r.chat.slice(-50);broadcast(r,{t:'chat',item})}}
});ws.on('close',()=>{if(p){const r=roomFor(p.room,p.map);r.players.delete(p.id);players.delete(p.id);broadcast(r,{t:'leave',id:p.id})}});ws.on('error',()=>{})});
let last=Date.now();setInterval(()=>{const now=Date.now(),dt=Math.min((now-last)/1000,.05);last=now;
for(const r of rooms.values()){const map=maps.find(v=>v.id===r.map),humans=[...r.players].map(id=>players.get(id)).filter(p=>p&&!p.bot&&p.hp>0);
for(const id of r.players){const p=players.get(id);if(!p)continue;if(p.hp<=0){if(now>=p.respawnAt){spawn(p);send(p,{t:'respawned'})}continue}
if(p.bot){const target=humans.reduce((best,q)=>!best||Math.hypot(q.x-p.x,q.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)?q:best,null);if(target){const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);p.yaw=Math.atan2(-dx,-dz);p.mx=d>16?clamp(-dx/(d||1),-1,1):Math.cos(now/950+(p.name.length))*0.55;p.mz=d>16?clamp(-dz/(d||1),-1,1):Math.sin(now/950+(p.name.length))*0.55;if(d<42&&now-p.lastShot>1450&&Math.random()<.05){p.lastShot=now;if(Math.random()<.45&&hit(p,target))damage(p,target,100);broadcast(r,{t:'shot',id:p.id,weapon:'sniper',at:now})}}}
let mx=p.mx,mz=p.mz,l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l}const speed=p.weapon==='knife'?8.5:6.8,nx=clamp(p.x+mx*speed*dt,-48,48),nz=clamp(p.z+mz*speed*dt,-48,48);
if(p.y<2.15){if(!blocked(map,nx,p.z))p.x=nx;if(!blocked(map,p.x,nz))p.z=nz}else{p.x=nx;p.z=nz}
p.vy-=19*dt;p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0;p.grounded=true}
}
const snapshot=JSON.stringify({t:'state',time:now,players:[...r.players].map(id=>players.get(id)).filter(Boolean).map(pub)});for(const id of r.players){const p=players.get(id);if(p&&p.ws&&p.ws.readyState===1&&p.ws.bufferedAmount<65536)p.ws.send(snapshot)}
}},50);
server.listen(PORT,'0.0.0.0',()=>console.log('SNIPER ARENA listening on '+PORT));