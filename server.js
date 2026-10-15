'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const ROOT=path.join(__dirname,'public'),UPLOADS=path.join(ROOT,'uploads'),PORT=process.env.PORT||8080;
fs.mkdirSync(UPLOADS,{recursive:true});
const clients=new Map(),history=new Map(),MAX_UPLOAD=25*1024*1024;
const clean=s=>String(s||'User').replace(/[^\p{L}\p{N}_ .-]/gu,'').trim().slice(0,24)||'User';
const pair=(a,b)=>[a,b].sort().join(':');
function roomKey(a,b){return b?'dm:'+pair(a,b):'global'}
function send(c,m){if(c?.ws?.readyState===1&&c.ws.bufferedAmount<1e6)c.ws.send(JSON.stringify(m))}
function broadcast(m){for(const c of clients.values())send(c,m)}
function users(){return [...clients.values()].map(c=>({id:c.id,name:c.name,online:true}))}
function store(k,m){const h=history.get(k)||[];h.push(m);history.set(k,h.slice(-150))}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.pdf':'application/pdf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{
 let u;try{u=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}
 if(u.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,app:'Pulse Messenger',online:clients.size}))}
 if(req.method==='POST'&&u.pathname==='/upload'){
  const rawName=String(u.searchParams.get('name')||'file').split(/[\\/]/).pop().slice(0,180);
  const ext=path.extname(rawName).toLowerCase();
  const allowed=['.png','.jpg','.jpeg','.webp','.gif','.bmp','.svg','.mp4','.webm','.mov','.m4v','.avi','.mp3','.m4a','.ogg','.wav','.aac','.flac','.pdf','.txt','.md','.csv','.json','.zip','.7z','.rar','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.rtf'];
  if(!allowed.includes(ext)){res.writeHead(415,{'content-type':'text/plain; charset=utf-8'});return res.end('Этот формат файла пока не поддерживается: '+(ext||'без расширения'))}
  const declared=Number(req.headers['content-length']||0);
  if(declared>MAX_UPLOAD){res.writeHead(413,{'content-type':'text/plain; charset=utf-8'});return res.end('Файл больше 25 МБ')}
  const id=crypto.randomBytes(12).toString('hex')+ext,file=path.join(UPLOADS,id),chunks=[];let size=0,failed=false;
  req.on('data',chunk=>{if(failed)return;size+=chunk.length;if(size>MAX_UPLOAD){failed=true;chunks.length=0;res.writeHead(413,{'content-type':'text/plain; charset=utf-8'});res.end('Файл больше 25 МБ');req.resume();return}chunks.push(chunk)});
  req.on('error',()=>{failed=true});
  req.on('end',()=>{if(failed)return;fs.writeFile(file,Buffer.concat(chunks),{flag:'wx'},err=>{if(err){if(!res.headersSent){res.writeHead(500,{'content-type':'text/plain; charset=utf-8'});res.end('Не удалось сохранить файл')}return}
    if(res.writableEnded)return;
    res.writeHead(201,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
    res.end(JSON.stringify({url:'/uploads/'+id,name:rawName,size,mime:req.headers['content-type']||mime[ext]||'application/octet-stream'}));
  })});return
 }
 if(req.method==='OPTIONS'&&u.pathname==='/upload'){res.writeHead(204,{'access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type'});return res.end()}
 const requested=u.pathname==='/'?'/index.html':u.pathname;
 let file;try{file=path.resolve(ROOT,'.'+decodeURIComponent(requested))}catch{res.writeHead(400);return res.end()}
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end('Forbidden')}
 fs.stat(file,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff'});fs.createReadStream(file).pipe(res)})
});
const wss=new WebSocketServer({server,path:'/ws',perMessageDeflate:false,maxPayload:2*1024*1024});
wss.on('connection',ws=>{
 let c=null;
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.t!=='string')return;
  if(m.t==='join'&&!c){c={id:crypto.randomUUID(),ws,name:clean(m.name),joined:Date.now()};clients.set(c.id,c);send(c,{t:'welcome',id:c.id,users:users(),history:history.get('global')||[]});broadcast({t:'presence',users:users()});return}
  if(!c)return;
  if(m.t==='message'){
   const text=String(m.text||'').slice(0,4000),to=typeof m.to==='string'&&clients.has(m.to)?m.to:null,attachment=m.attachment&&typeof m.attachment.url==='string'?{url:m.attachment.url,name:clean(m.attachment.name),mime:String(m.attachment.mime||'').slice(0,100),size:Math.min(Number(m.attachment.size)||0,MAX_UPLOAD)}:null;
   if(!text.trim()&&!attachment)return;
   const msg={id:crypto.randomUUID(),from:c.id,name:c.name,to,text,attachment,at:Date.now()},key=roomKey(c.id,to);
   store(key,msg);if(to){send(c,{t:'message',message:msg});const other=clients.get(to);if(other){store(roomKey(to,c.id),msg);send(other,{t:'message',message:msg})}}else{for(const q of clients.values())send(q,{t:'message',message:msg})}return
  }
  if(m.t==='typing'){const to=typeof m.to==='string'?m.to:null;if(to)send(clients.get(to),{t:'typing',from:c.id,name:c.name});else for(const q of clients.values())if(q.id!==c.id)send(q,{t:'typing',from:c.id,name:c.name});return}
  if(['call-offer','call-answer','ice','call-end','call-reject'].includes(m.t)){const target=clients.get(String(m.to||''));if(target)send(target,{...m,from:c.id,fromName:c.name});else send(c,{t:'call-error',message:'Пользователь уже не в сети'});return}
  if(m.t==='history'){const to=typeof m.to==='string'&&clients.has(m.to)?m.to:null;send(c,{t:'history',to,items:history.get(roomKey(c.id,to))||[]})}
 });
 ws.on('close',()=>{if(c){clients.delete(c.id);broadcast({t:'presence',users:users()});for(const q of clients.values())send(q,{t:'call-end',from:c.id,reason:'offline'})}});
 ws.on('error',()=>{});
});
server.listen(PORT,'0.0.0.0',()=>console.log('Pulse Messenger listening on '+PORT));