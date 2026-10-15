'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||8080,ROOT=path.join(__dirname,'public'),DATA=process.env.DATA_DIR||'/data',UPLOADS=path.join(DATA,'uploads'),DB=path.join(DATA,'pulse-store.json'),SECRET_FILE=path.join(DATA,'.pulse-secret'),MAX_UPLOAD=25*1024*1024;
fs.mkdirSync(UPLOADS,{recursive:true});
if(!fs.existsSync(SECRET_FILE))fs.writeFileSync(SECRET_FILE,crypto.randomBytes(48),{mode:0o600,flag:'wx'});
const SECRET=fs.readFileSync(SECRET_FILE);
let store={users:[],messages:[]};
try{const raw=JSON.parse(fs.readFileSync(DB,'utf8'));if(Array.isArray(raw.users)&&Array.isArray(raw.messages))store=raw}catch{}
function save(){const tmp=DB+'.tmp';fs.writeFileSync(tmp,JSON.stringify(store));fs.renameSync(tmp,DB)}
const cleanName=s=>String(s||'').normalize('NFKC').replace(/[^\p{L}\p{N}_. -]/gu,'').trim().slice(0,24);
const publicUser=u=>({id:u.id,name:u.name,online:(clients.get(u.id)?.size||0)>0});
const clients=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.m4v':'video/mp4','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.wav':'audio/wav','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json','.zip':'application/zip','.7z':'application/x-7z-compressed','.rar':'application/vnd.rar','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.rtf':'application/rtf','.aac':'audio/aac','.flac':'audio/flac'};
function sign(uid){const payload=Buffer.from(JSON.stringify({uid,exp:Date.now()+30*864e5})).toString('base64url');return payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')}
function verifyToken(token){try{const [p,s]=String(token||'').split('.');const sig=crypto.createHmac('sha256',SECRET).update(p).digest('base64url');if(!p||!s||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(s)))return null;const d=JSON.parse(Buffer.from(p,'base64url').toString());return d.exp>Date.now()&&store.users.some(u=>u.id===d.uid)?d.uid:null}catch{return null}}
function cookieToken(req){const v=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pulse_session='));return v?decodeURIComponent(v.slice(14)):''}
function setCookie(res,uid){res.setHeader('set-cookie','pulse_session='+encodeURIComponent(sign(uid))+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000')}
function clearCookie(res){res.setHeader('set-cookie','pulse_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')}
const pendingRegistrations=new Map();
function normalizeEmail(v){return String(v||'').trim().toLowerCase()}
function normalizePhone(v){return String(v||'').replace(/[\\s().-]/g,'')}
function validEmail(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)&&v.length<=254}
async function twilioVerify(path,params){
 const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN,service=process.env.TWILIO_VERIFY_SERVICE_SID;
 if(!sid||!token||!service)throw Object.assign(new Error('SMS-подтверждение пока не настроено: администратору нужно добавить Twilio credentials в Railway Variables.'),{status:503});
 const form=new URLSearchParams(params);const r=await fetch('https://verify.twilio.com/v2/Services/'+encodeURIComponent(service)+path,{method:'POST',headers:{authorization:'Basic '+Buffer.from(sid+':'+token).toString('base64'),'content-type':'application/x-www-form-urlencoded'},body:form});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.message||'Не удалось выполнить SMS-подтверждение'),{status:r.status===429?429:400});return data;
}
function userById(id){return store.users.find(u=>u.id===id)}
function userByName(name){return store.users.find(u=>u.name.toLowerCase()===name.toLowerCase())}
function send(ws,m){if(ws?.readyState===1&&ws.bufferedAmount<1e6)ws.send(JSON.stringify(m))}
function sendUser(uid,m){for(const ws of clients.get(uid)||[])send(ws,m)}
function broadcast(m){for(const set of clients.values())for(const ws of set)send(ws,m)}
function onlineUsers(){return store.users.map(publicUser)}
function parseBody(req,limit=32000){return new Promise((resolve,reject)=>{let b='',size=0;req.on('data',c=>{size+=c.length;if(size>limit){reject(Object.assign(new Error('Слишком большой запрос'),{status:413}));req.destroy();return}b+=c.toString('utf8')});req.on('end',()=>{try{resolve(JSON.parse(b||'{}'))}catch{reject(Object.assign(new Error('Некорректный JSON'),{status:400}))}});req.on('error',reject)})}
function json(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))}
function passwordHash(password,salt){return crypto.scryptSync(password,salt,64).toString('hex')}
function directHistory(uid,other){return store.messages.filter(m=>(m.to===other&&m.from===uid)||(m.to===uid&&m.from===other)).slice(-250)}
function chatHistory(uid,to){return to?directHistory(uid,to):store.messages.filter(m=>!m.to).slice(-250)}
function unreadFor(uid){const counts={};for(const m of store.messages){if(m.to===uid&&m.from!==uid&&!m.readBy.includes(uid))counts['dm:'+m.from]=(counts['dm:'+m.from]||0)+1}return counts}
function online(id){return (clients.get(id)?.size||0)>0}
function markRead(uid,ids){const touched=[];for(const m of store.messages){if(ids.includes(m.id)&&m.to===uid&&m.from!==uid&&!m.readBy.includes(uid)){m.readBy.push(uid);touched.push(m)}}if(touched.length){save();for(const m of touched)sendUser(m.from,{t:'read-receipt',ids:touched.filter(x=>x.from===m.from).map(x=>x.id),reader:uid})}}
const server=http.createServer(async(req,res)=>{
 let u;try{u=new URL(req.url,'http://localhost')}catch{return json(res,400,{error:'Bad request'})}
 if(u.pathname==='/health')return json(res,200,{ok:true,app:'Pulse Messenger',accounts:store.users.length,online:clients.size,messages:store.messages.length});
 if(req.method==='POST'&&u.pathname==='/api/register/start'){
  try{
   const b=await parseBody(req),name=cleanName(b.name),password=String(b.password||''),email=normalizeEmail(b.email),phone=normalizePhone(b.phone);
   if(name.length<3||name.length>24)return json(res,400,{error:'Ник должен содержать от 3 до 24 символов'});
   if(password.length<8||password.length>200)return json(res,400,{error:'Пароль должен быть не короче 8 символов'});
   if(!validEmail(email))return json(res,400,{error:'Укажи корректную электронную почту'});
   if(!/^\\+[1-9]\\d{7,14}$/.test(phone))return json(res,400,{error:'Номер нужен в международном формате, например +4915123456789'});
   if(userByName(name))return json(res,409,{error:'Этот ник уже занят'});
   if(store.users.some(x=>x.email&&x.email===email))return json(res,409,{error:'Эта электронная почта уже используется'});
   if(store.users.some(x=>x.phone&&x.phone===phone))return json(res,409,{error:'Этот номер уже используется'});
   for(const [key,p] of pendingRegistrations)if(p.expires<Date.now())pendingRegistrations.delete(key);
   const recent=[...pendingRegistrations.values()].filter(p=>p.phone===phone&&Date.now()-p.createdAt<60000);if(recent.length)return json(res,429,{error:'Подожди минуту перед повторной отправкой кода'});
   const salt=crypto.randomBytes(16).toString('hex');const id=crypto.randomUUID();
   await twilioVerify('/Verifications',{To:phone,Channel:'sms'});
   pendingRegistrations.set(id,{name,passwordHash:passwordHash(password,salt),salt,email,phone,createdAt:Date.now(),expires:Date.now()+10*60*1000});
   return json(res,200,{ok:true,registrationId:id,message:'SMS-код отправлен. Он действует 10 минут.'});
  }catch(e){return json(res,e.status||400,{error:e.message||'Не удалось начать регистрацию'})}
 }
 if(req.method==='POST'&&u.pathname==='/api/register/verify'){
  try{
   const b=await parseBody(req),id=String(b.registrationId||''),code=String(b.code||'').trim(),pending=pendingRegistrations.get(id);
   if(!pending||pending.expires<Date.now()){pendingRegistrations.delete(id);return json(res,400,{error:'Заявка истекла. Начни регистрацию заново.'})}
   if(!/^\\d{4,10}$/.test(code))return json(res,400,{error:'Введи код из SMS'});
   const check=await twilioVerify('/VerificationCheck',{To:pending.phone,Code:code});
   if(check.status!=='approved')return json(res,400,{error:'Код неверный или уже истёк'});
   if(userByName(pending.name)||store.users.some(x=>x.email===pending.email||x.phone===pending.phone)){pendingRegistrations.delete(id);return json(res,409,{error:'Ник, почта или номер уже используются. Начни заново.'})}
   const user={id:crypto.randomUUID(),name:pending.name,salt:pending.salt,hash:pending.passwordHash,email:pending.email,phone:pending.phone,phoneVerified:true,createdAt:Date.now()};
   store.users.push(user);save();pendingRegistrations.delete(id);setCookie(res,user.id);return json(res,200,{user:{id:user.id,name:user.name,email:user.email,phone:user.phone}});
  }catch(e){return json(res,e.status||400,{error:e.message||'Не удалось подтвердить номер'})}
 }
 if(req.method==='POST'&&['/api/register','/api/login'].includes(u.pathname)){
  try{const b=await parseBody(req),name=cleanName(b.name),password=String(b.password||'');
   if(name.length<3||name.length>24)return json(res,400,{error:'Ник должен содержать от 3 до 24 символов'});
   if(password.length<8||password.length>200)return json(res,400,{error:'Пароль должен быть не короче 8 символов'});
   let user=userByName(name);
   if(u.pathname==='/api/register'){
    if(user)return json(res,409,{error:'Этот ник уже занят'});
    const salt=crypto.randomBytes(16).toString('hex');user={id:crypto.randomUUID(),name,salt,hash:passwordHash(password,salt),createdAt:Date.now()};store.users.push(user);save();
   }else{
    if(!user)return json(res,401,{error:'Неверный ник или пароль'});
    const actual=Buffer.from(passwordHash(password,user.salt),'hex'),expected=Buffer.from(user.hash,'hex');
    if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return json(res,401,{error:'Неверный ник или пароль'});
   }
   setCookie(res,user.id);return json(res,200,{user:{id:user.id,name:user.name}})
  }catch(e){return json(res,e.status||400,{error:e.message||'Ошибка запроса'})}
 }
 if(req.method==='GET'&&u.pathname==='/api/me'){const uid=verifyToken(cookieToken(req));const user=uid&&userById(uid);return user?json(res,200,{user:{id:user.id,name:user.name}}):json(res,401,{error:'Не авторизован'})}
 if(req.method==='POST'&&u.pathname==='/api/logout'){clearCookie(res);return json(res,200,{ok:true})}
 if(req.method==='POST'&&u.pathname==='/upload'){
  const uid=verifyToken(cookieToken(req));if(!uid)return json(res,401,{error:'Войди в аккаунт, чтобы отправлять файлы'});
  const rawName=String(u.searchParams.get('name')||'file').split(/[\\/]/).pop().slice(0,180),ext=path.extname(rawName).toLowerCase();
  const allowed=Object.keys(mime).filter(x=>!['.html','.js','.css','.webmanifest','.svg'].includes(x));
  if(!allowed.includes(ext))return json(res,415,{error:'Этот формат файла пока не поддерживается'});
  const declared=Number(req.headers['content-length']||0);if(declared>MAX_UPLOAD)return json(res,413,{error:'Файл больше 25 МБ'});
  const id=crypto.randomBytes(16).toString('hex')+ext,file=path.join(UPLOADS,id),chunks=[];let size=0,failed=false;
  req.on('data',c=>{size+=c.length;if(size>MAX_UPLOAD){failed=true;chunks.length=0;if(!res.headersSent)json(res,413,{error:'Файл больше 25 МБ'});req.resume()}else if(!failed)chunks.push(c)});
  req.on('end',()=>{if(failed)return;fs.writeFile(file,Buffer.concat(chunks),{flag:'wx'},err=>{if(err)return json(res,500,{error:'Не удалось сохранить файл'});json(res,201,{url:'/uploads/'+id,name:rawName,size,mime:req.headers['content-type']||mime[ext]||'application/octet-stream'})})});
  req.on('error',()=>{failed=true});return
 }
 if(u.pathname.startsWith('/uploads/')){if(!verifyToken(cookieToken(req)))return json(res,401,{error:'Войди в аккаунт, чтобы открыть файл'});const id=path.basename(u.pathname),file=path.join(UPLOADS,id);return fs.stat(file,(e,st)=>{if(e||!st.isFile())return res.writeHead(404).end('Not found');res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','content-length':st.size,'cache-control':'private, max-age=86400','x-content-type-options':'nosniff','content-disposition':'inline; filename="'+id.replace(/["\\]/g,'')+'"'});fs.createReadStream(file).pipe(res)})}
 const requested=u.pathname==='/'?'/index.html':u.pathname;let file;try{file=path.resolve(ROOT,'.'+decodeURIComponent(requested))}catch{return json(res,400,{error:'Bad path'})}
 if(!file.startsWith(ROOT+path.sep))return res.writeHead(403).end('Forbidden');
 fs.stat(file,(e,st)=>{if(e||!st.isFile())return res.writeHead(404).end('Not found');res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600','x-content-type-options':'nosniff'});fs.createReadStream(file).pipe(res)})
});
const wss=new WebSocketServer({server,path:'/ws',perMessageDeflate:false,maxPayload:2*1024*1024});
wss.on('connection',(ws,req)=>{
 const uid=verifyToken(cookieToken(req)),user=uid&&userById(uid);if(!user){send(ws,{t:'auth-required'});ws.close(1008,'Login required');return}
 ws.uid=uid;let set=clients.get(uid);if(!set){set=new Set();clients.set(uid,set)}set.add(ws);
 send(ws,{t:'welcome',id:uid,user:{id:uid,name:user.name},users:onlineUsers(),history:chatHistory(uid,null),unread:unreadFor(uid)});
 broadcast({t:'presence',users:onlineUsers()});
 ws.on('message',raw=>{
  let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m.t!=='string')return;
  if(m.t==='message'){
   const text=String(m.text||'').slice(0,4000),to=typeof m.to==='string'&&m.to!==uid&&userById(m.to)?m.to:null;
   const a=m.attachment&&typeof m.attachment.url==='string'&&/^\/uploads\/[a-f0-9]+\.[a-z0-9]+$/i.test(m.attachment.url)?{url:m.attachment.url,name:String(m.attachment.name||'file').slice(0,180),mime:String(m.attachment.mime||'').slice(0,120),size:Math.min(Number(m.attachment.size)||0,MAX_UPLOAD)}:null;
   if(!text.trim()&&!a)return;
   const msg={id:crypto.randomUUID(),from:uid,name:user.name,to,text,attachment:a,at:Date.now(),readBy:[],deliveredTo:[]};
   store.messages.push(msg);if(store.messages.length>20000)store.messages=store.messages.slice(-20000);
   if(to){if(online(to))msg.deliveredTo.push(to);save();sendUser(uid,{t:'message',message:msg});sendUser(to,{t:'message',message:msg});if(online(to))sendUser(uid,{t:'delivery-receipt',ids:[msg.id],reader:to})}
   else{save();broadcast({t:'message',message:msg})}return
  }
  if(m.t==='history'){const to=typeof m.to==='string'&&userById(m.to)&&m.to!==uid?m.to:null;send(ws,{t:'history',to,items:chatHistory(uid,to)});return}
  if(m.t==='read'){if(Array.isArray(m.ids))markRead(uid,m.ids.filter(x=>typeof x==='string').slice(0,300));return}
  if(m.t==='typing'){const to=typeof m.to==='string'?m.to:null;if(to)sendUser(to,{t:'typing',from:uid,name:user.name});else for(const [id,set2] of clients)if(id!==uid)for(const q of set2)send(q,{t:'typing',from:uid,name:user.name});return}
  if(['call-offer','call-answer','ice','call-end','call-reject'].includes(m.t)){const to=String(m.to||'');if(userById(to)&&online(to))sendUser(to,{...m,from:uid,fromName:user.name});else send(ws,{t:'call-error',message:'Пользователь уже не в сети'});return}
 });
 ws.on('close',()=>{const s=clients.get(uid);s?.delete(ws);if(s&&!s.size){clients.delete(uid);broadcast({t:'presence',users:onlineUsers()});for(const set2 of clients.values())for(const q of set2)send(q,{t:'call-end',from:uid,reason:'offline'})}});
 ws.on('error',()=>{});
});
server.listen(PORT,'0.0.0.0',()=>console.log('Pulse Messenger listening on '+PORT+'; persistent data at '+DATA));