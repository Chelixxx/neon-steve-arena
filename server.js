'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {WebSocketServer}=require('ws');
const PORT=Number(process.env.PORT||8000),ROOT=path.join(__dirname,'public');
const W=2600,H=1800,MAX_GEMS=210,SPEED=250;
const players=new Map(),gems=new Map();
const rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cleanName=s=>String(s||'Player').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,16)||'Player';
const newGem=()=>{const id=crypto.randomUUID();gems.set(id,{id,x:rand(35,W-35),y:rand(35,H-35),v:Math.random()<.1?5:1});};
for(let i=0;i<MAX_GEMS;i++)newGem();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end();}
  if(pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,players:players.size}));}
  const file=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!(file===ROOT||file.startsWith(ROOT+path.sep))){res.writeHead(403);return res.end();}
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
  });
});
const wss=new WebSocketServer({server,path:'/ws',maxPayload:2048});
function send(ws,data){if(ws.readyState===1)ws.send(JSON.stringify(data));}
function snapshot(){const state=JSON.stringify({t:'state',p:[...players.values()].map(({id,name,x,y,score,color})=>({id,name,x:Math.round(x),y:Math.round(y),score,color})),g:[...gems.values()]});for(const ws of wss.clients)if(ws.readyState===1&&ws.bufferedAmount<200000)ws.send(state);}
wss.on('connection',ws=>{
 const id=crypto.randomUUID(),color=Math.floor(rand(0,360));
 const p={id,name:'Player',x:rand(80,W-80),y:rand(80,H-80),score:0,color,dx:0,dy:0};
 players.set(id,p);send(ws,{t:'hello',id,w:W,h:H});
 ws.on('message',raw=>{let msg;try{msg=JSON.parse(raw)}catch{return;}if(!msg||typeof msg!=='object')return;
  if(msg.t==='join')p.name=cleanName(msg.name);
  if(msg.t==='input'){let dx=Number(msg.x),dy=Number(msg.y);if(!Number.isFinite(dx)||!Number.isFinite(dy))return;let l=Math.hypot(dx,dy);p.dx=l?clamp(dx/l,-1,1):0;p.dy=l?clamp(dy/l,-1,1):0;}
 });
 ws.on('close',()=>players.delete(id));ws.on('error',()=>{});
});
let last=Date.now();setInterval(()=>{
 const now=Date.now(),dt=Math.min((now-last)/1000,.07);last=now;
 for(const p of players.values()){
  const speed=SPEED*(1+Math.min(p.score,250)/1000);
  p.x=clamp(p.x+p.dx*speed*dt,20,W-20);p.y=clamp(p.y+p.dy*speed*dt,20,H-20);
  for(const [id,g] of gems)if(Math.hypot(p.x-g.x,p.y-g.y)<27){p.score+=g.v;gems.delete(id);newGem();}
 }
},1000/30);
setInterval(snapshot,100);
server.listen(PORT,'0.0.0.0',()=>console.log(`NEON STEVE ARENA http://localhost:${PORT}`));
