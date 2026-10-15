'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||8080,ROOT=path.join(__dirname,'public'),DATA=process.env.DATA_DIR||'/data',UPLOADS=path.join(DATA,'uploads'),DB=path.join(DATA,'pulse-store.json'),SECRET_FILE=path.join(DATA,'.pulse-secret'),MAX_UPLOAD=25*1024*1024;
fs.mkdirSync(UPLOADS,{recursive:true});
if(!fs.existsSync(SECRET_FILE))fs.writeFileSync(SECRET_FILE,crypto.randomBytes(48),{mode:0o600,flag:'wx'});
const SECRET=fs.readFileSync(SECRET_FILE);
let store={users:[],messages:[],channels:[],posts:[]};
try{const raw=JSON.parse(fs.readFileSync(DB,'utf8'));if(Array.isArray(raw.users)&&Array.isArray(raw.messages))store={...store,...raw,channels:Array.isArray(raw.channels)?raw.channels:[],posts:Array.isArray(raw.posts)?raw.posts:[]}}catch{}
function save(){const tmp=DB+'.tmp';fs.writeFileSync(tmp,JSON.stringify(store));fs.renameSync(tmp,DB)}
const cleanName=s=>String(s||'').normalize('NFKC').replace(/[^\p{L}\p{N}_. -]/gu,'').trim().slice(0,24);
const publicUser=u=>({id:u.id,name:u.name,online:(clients.get(u.id)?.size||0)>0,bio:u.bio||'',avatar:u.avatar||''});
const clients=new Map();
if(!store.channels.length){store.channels.push({id:'pulse-news',name:'Pulse News',description:'Новости Pulse',type:'channel',owner:'system',members:[],createdAt:Date.now()})}
if(!store.posts.some(p=>p.id==='pulse-welcome'))store.posts.push({id:'pulse-welcome',title:'Добро пожаловать в наш мессенджер!',body:'Добро пожаловать в Pulse Messenger — место для общения, идей и новых знакомств! 💜\n\nПроект создан @Chelixxx при помощи @ChatGPT. @Chelixxx — автор и создатель Pulse, а @ChatGPT помогал придумывать функции, продумывать интерфейс и писать код. Главная идея Pulse — удобное общение и развитие вместе с вами.\n\nСпасибо, что вы с нами. Это только начало! 🚀',link:'',author:'@Chelixxx × @ChatGPT',at:Date.now()});
if(!store.messages.some(m=>m.id==='pulse-welcome-message'))store.messages.push({id:'pulse-welcome-message',from:'system',name:'Pulse News',to:null,channelId:'pulse-news',text:'Добро пожаловать в наш мессенджер!\n\nПроект создан @Chelixxx при помощи @ChatGPT. @Chelixxx — автор и создатель Pulse, а @ChatGPT помогал с идеями, интерфейсом и разработкой. Спасибо, что вы с нами! 💜',at:Date.now(),readBy:[],deliveredTo:[]});
save();
const publicChannel=c=>({id:c.id,name:c.name,description:c.description||'',type:c.type,owner:c.owner,createdAt:c.createdAt});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.m4v':'video/mp4','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.wav':'audio/wav','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json','.zip':'application/zip','.7z':'application/x-7z-compressed','.rar':'application/vnd.rar','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.ppt':'application/vnd.ms-powerpoint','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.rtf':'application/rtf','.aac':'audio/aac','.flac':'audio/flac'};
function sign(uid){const payload=Buffer.from(JSON.stringify({uid,exp:Date.now()+30*864e5})).toString('base64url');return payload+'.'+crypto.createHmac('sha256',SECRET).update(payload).digest('base64url')}
function verifyToken(token){try{const [p,s]=String(token||'').split('.');const sig=crypto.createHmac('sha256',SECRET).update(p).digest('base64url');if(!p||!s||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(s)))return null;const d=JSON.parse(Buffer.from(p,'base64url').toString());return d.exp>Date.now()&&store.users.some(u=>u.id===d.uid)?d.uid:null}catch{return null}}
function cookieToken(req){const v=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pulse_session='));return v?decodeURIComponent(v.slice(14)):''}
function setCookie(res,uid){res.setHeader('set-cookie','pulse_session='+encodeURIComponent(sign(uid))+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000')}
function clearCookie(res){res.setHeader('set-cookie','pulse_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')}
const pendingRegistrations=new Map();
function normalizeEmail(v){return String(v||'').trim().toLowerCase()}
function normalizePhone(v){return String(v||'').replace(/[\s().-]/g,'')}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254}
async function twilioVerify(path,params){
 const sid=process.env.TWILIO_ACCOUNT_SID,token=process.env.TWILIO_AUTH_TOKEN,service=process.env.TWILIO_VERIFY_SERVICE_SID;
 if(!sid||!token||!service)throw Object.assign(new Error('SMS-подтверждение пока не настроено: администратору нужно добавить Twilio credentials в Railway Variables.'),{status:503});
 const form=new URLSearchParams(params);const r=await fetch('https://verify.twilio.com/v2/Services/'+encodeURIComponent(service)+path,{method:'POST',headers:{authorization:'Basic '+Buffer.from(sid+':'+token).toString('base64'),'content-type':'application/x-www-form-urlencoded'},body:form});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data.message||'Не удалось выполнить SMS-подтверждение'),{status:r.status===429?429:400});return data;
}
async function sendEmailCode(to,code){
 const host=process.env.SMTP_HOST,user=process.env.SMTP_USER,pass=process.env.SMTP_PASS,from=process.env.SMTP_FROM||user;
 if(!host||!user||!pass||!from)throw Object.assign(new Error('Подтверждение по email пока не настроено. Администратору нужно добавить SMTP_HOST, SMTP_USER, SMTP_PASS и SMTP_FROM в Railway Variables.'),{status:503});
 const nodemailer=require('nodemailer');
 const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',auth:{user,pass}});
 await transport.sendMail({from,to,subject:'Код подтверждения Pulse Messenger',text:'Твой код Pulse: '+code+'\nКод действует 10 минут. Никому его не сообщай.',html:'<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#10121f;color:#f6f7ff;border-radius:18px"><h1 style="color:#8d7bff">PULSE</h1><p>Твой код подтверждения:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:18px;background:#1d2034;border-radius:12px;text-align:center">'+code+'</div><p>Код действует 10 минут. Никому его не сообщай.</p></div>'});
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
function chatHistory(uid,to,channelId){if(channelId)return store.messages.filter(m=>m.channelId===channelId).slice(-250);return to?directHistory(uid,to):store.messages.filter(m=>!m.to&&!m.channelId).slice(-250)}
function unreadFor(uid){const counts={};for(const m of store.messages){if(m.to===uid&&m.from!==uid&&!m.readBy.includes(uid))counts['dm:'+m.from]=(counts['dm:'+m.from]||0)+1}return counts}
function online(id){return (clients.get(id)?.size||0)>0}
function markRead(uid,ids){const touched=[];for(const m of store.messages){if(ids.includes(m.id)&&m.to===uid&&m.from!==uid&&!m.readBy.includes(uid)){m.readBy.push(uid);touched.push(m)}}if(touched.length){save();for(const m of touched)sendUser(m.from,{t:'read-receipt',ids:touched.filter(x=>x.from===m.from).map(x=>x.id),reader:uid})}}
const server=http.createServer(async(req,res)=>{
 let u;try{u=new URL(req.url,'http://localhost')}catch{return json(res,400,{error:'Bad request'})}
 if(u.pathname==='/health')return json(res,200,{ok:true,app:'Pulse Messenger',accounts:store.users.length,online:clients.size,messages:store.messages.length});
 if(req.method==='POST'&&u.pathname==='/api/register/start'){
  try{
   const b=await parseBody(req),name=cleanName(b.name),password=String(b.password||''),method=b.method==='phone'?'phone':'email',email=normalizeEmail(b.email),phone=normalizePhone(b.phone);
   if(name.length<3||name.length>24)return json(res,400,{error:'Ник должен содержать от 3 до 24 символов'});
   if(password.length<8||password.length>200)return json(res,400,{error:'Пароль должен быть не короче 8 символов'});
   if(userByName(name))return json(res,409,{error:'Этот ник уже занят'});
   if(method==='email'&&!validEmail(email))return json(res,400,{error:'Укажи корректную электронную почту'});
   if(method==='phone'&&!/^\+[1-9]\d{7,14}$/.test(phone))return json(res,400,{error:'Номер нужен в международном формате, например +4915123456789'});
   const contact=method==='email'?email:phone;
   if(store.users.some(x=>method==='email'?x.email&&x.email===email:x.phone&&x.phone===phone))return json(res,409,{error:method==='email'?'Эта электронная почта уже используется':'Этот номер уже используется'});
   for(const [key,p] of pendingRegistrations)if(p.expires<Date.now())pendingRegistrations.delete(key);
   const recent=[...pendingRegistrations.values()].filter(p=>p.method===method&&p.contact===contact&&Date.now()-p.createdAt<60000);if(recent.length)return json(res,429,{error:'Подожди минуту перед повторной отправкой кода'});
   const salt=crypto.randomBytes(16).toString('hex'),id=crypto.randomUUID();
   const pending={name,passwordHash:passwordHash(password,salt),salt,email:method==='email'?email:'',phone:method==='phone'?phone:'',method,contact,createdAt:Date.now(),expires:Date.now()+10*60*1000,attempts:0};
   if(method==='phone'){await twilioVerify('/Verifications',{To:phone,Channel:'sms'});}
   else{const code=String(crypto.randomInt(100000,1000000));pending.codeHash=crypto.createHash('sha256').update(id+':'+code).digest('hex');await sendEmailCode(email,code);}
   pendingRegistrations.set(id,pending);
   return json(res,200,{ok:true,registrationId:id,method,message:method==='phone'?'SMS-код отправлен. Он действует 10 минут.':'Код отправлен на email. Он действует 10 минут.'});
  }catch(e){return json(res,e.status||400,{error:e.message||'Не удалось начать регистрацию'})}
 }
 if(req.method==='POST'&&u.pathname==='/api/register/verify'){
  try{
   const b=await parseBody(req),id=String(b.registrationId||''),code=String(b.code||'').trim(),pending=pendingRegistrations.get(id);
   if(!pending||pending.expires<Date.now()){pendingRegistrations.delete(id);return json(res,400,{error:'Заявка истекла. Начни регистрацию заново.'})}
   if(!/^\d{6}$/.test(code))return json(res,400,{error:'Введи шестизначный код подтверждения'});
   if(++pending.attempts>5){pendingRegistrations.delete(id);return json(res,429,{error:'Слишком много попыток. Начни регистрацию заново.'})}
   if(pending.method==='phone'){
    const check=await twilioVerify('/VerificationCheck',{To:pending.phone,Code:code});
    if(check.status!=='approved')return json(res,400,{error:'Код неверный или уже истёк'});
   }else{
    const hash=crypto.createHash('sha256').update(id+':'+code).digest('hex');
    if(hash!==pending.codeHash)return json(res,400,{error:'Код неверный или уже истёк'});
   }
   if(userByName(pending.name)||store.users.some(x=>(pending.email&&x.email===pending.email)||(pending.phone&&x.phone===pending.phone))){pendingRegistrations.delete(id);return json(res,409,{error:'Ник, почта или номер уже используются. Начни заново.'})}
   const user={id:crypto.randomUUID(),name:pending.name,salt:pending.salt,hash:pending.passwordHash,email:pending.email||undefined,phone:pending.phone||undefined,emailVerified:pending.method==='email',phoneVerified:pending.method==='phone',createdAt:Date.now()};
   store.users.push(user);save();pendingRegistrations.delete(id);setCookie(res,user.id);return json(res,200,{user:{id:user.id,name:user.name,email:user.email||'',phone:user.phone||''}});
  }catch(e){return json(res,e.status||400,{error:e.message||'Не удалось подтвердить контакт'})}
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
 if(req.method==='GET'&&u.pathname==='/api/community'){ const uid=verifyToken(cookieToken(req)); if(!uid)return json(res,401,{error:'Не авторизован'}); return json(res,200,{channels:store.channels.map(publicChannel),posts:store.posts.slice(-100).reverse(),bots:[{id:'pulse-verify',name:'Pulse Verify',description:'Подтверждение номера SMS',configured:!!(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_VERIFY_SERVICE_SID)},{id:'pulse-news',name:'Pulse News',description:'Новости в канале и общей ленте',active:true}],profile:(()=>{const x=userById(uid);return {name:x.name,email:x.email||'',phone:x.phone||'',bio:x.bio||'',avatar:x.avatar||''}})()}); }
 if(req.method==='POST'&&u.pathname==='/api/profile'){ const uid=verifyToken(cookieToken(req)); if(!uid)return json(res,401,{error:'Не авторизован'}); try{const b=await parseBody(req,1500000),user=userById(uid),name=cleanName(b.name||user.name),bio=String(b.bio||'').slice(0,240),avatar=String(b.avatar||''); if(name.length<3)return json(res,400,{error:'Ник должен содержать от 3 до 24 символов'}); if(store.users.some(x=>x.id!==uid&&x.name.toLowerCase()===name.toLowerCase()))return json(res,409,{error:'Этот ник уже занят'}); if(avatar&&(!avatar.startsWith('data:image/')||avatar.length>1100000))return json(res,400,{error:'Аватар должен быть изображением до 800 КБ'}); user.name=name;user.bio=bio;if(avatar)user.avatar=avatar;save();broadcast({t:'presence',users:onlineUsers()});return json(res,200,{profile:{name:user.name,bio:user.bio,avatar:user.avatar||''}})}catch(e){return json(res,e.status||400,{error:e.message||'Ошибка профиля'})} }
 if(req.method==='POST'&&u.pathname==='/api/channels'){ const uid=verifyToken(cookieToken(req)); if(!uid)return json(res,401,{error:'Не авторизован'}); try{const b=await parseBody(req),name=String(b.name||'').trim().slice(0,40),description=String(b.description||'').trim().slice(0,240),type=b.type==='group'?'group':'channel';if(name.length<2)return json(res,400,{error:'Название должно быть не короче 2 символов'});const c={id:crypto.randomUUID(),name,description,type,owner:uid,members:[uid],createdAt:Date.now()};store.channels.push(c);save();broadcast({t:'channels',channels:store.channels.map(publicChannel)});return json(res,201,{channel:publicChannel(c)})}catch(e){return json(res,e.status||400,{error:e.message||'Не удалось создать канал'})} }
 if(req.method==='POST'&&u.pathname==='/api/news'){ const uid=verifyToken(cookieToken(req)); if(!uid)return json(res,401,{error:'Не авторизован'});const token=String(req.headers['x-pulse-admin-token']||'');if(!process.env.PULSE_ADMIN_TOKEN||token!==process.env.PULSE_ADMIN_TOKEN)return json(res,403,{error:'Нужен админ-токен Pulse для публикации новостей'});try{const b=await parseBody(req),title=String(b.title||'').trim().slice(0,120),body=String(b.body||'').trim().slice(0,5000),link=String(b.link||'').trim().slice(0,500);if(title.length<3||body.length<3)return json(res,400,{error:'Заполни заголовок и текст новости'});const post={id:crypto.randomUUID(),title,body,link,author:userById(uid).name,at:Date.now()};store.posts.push(post);if(store.posts.length>1000)store.posts=store.posts.slice(-1000);let c=store.channels.find(x=>x.id==='pulse-news');if(!c){c={id:'pulse-news',name:'Pulse News',description:'Новости Pulse',type:'channel',owner:'system',members:[],createdAt:Date.now()};store.channels.unshift(c)}const msg={id:crypto.randomUUID(),from:uid,name:'Pulse News',to:null,channelId:c.id,text:title+'\\n\\n'+body+(link?'\\n\\n'+link:''),at:Date.now(),readBy:[],deliveredTo:[],newsPostId:post.id};store.messages.push(msg);save();broadcast({t:'message',message:msg});broadcast({t:'news-post',post});return json(res,201,{post})}catch(e){return json(res,e.status||400,{error:e.message||'Не удалось опубликовать новость'})} }
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
   const text=String(m.text||'').slice(0,4000),to=typeof m.to==='string'&&m.to!==uid&&userById(m.to)?m.to:null,channelId=typeof m.channelId==='string'&&store.channels.some(c=>c.id===m.channelId)?m.channelId:null;
   if(channelId){const ch=store.channels.find(c=>c.id===channelId);if(ch.type==='channel'&&ch.owner!=='system'&&ch.owner!==uid){send(ws,{t:'error',message:'Публиковать в этом канале может только владелец'});return}if(ch.type==='group'&&!ch.members.includes(uid)){send(ws,{t:'error',message:'Сначала нужно вступить в группу'});return}}
   const a=m.attachment&&typeof m.attachment.url==='string'&&/^\/uploads\/[a-f0-9]+\.[a-z0-9]+$/i.test(m.attachment.url)?{url:m.attachment.url,name:String(m.attachment.name||'file').slice(0,180),mime:String(m.attachment.mime||'').slice(0,120),size:Math.min(Number(m.attachment.size)||0,MAX_UPLOAD)}:null;
   if(!text.trim()&&!a)return;
   const msg={id:crypto.randomUUID(),from:uid,name:user.name,to,channelId,text,attachment:a,at:Date.now(),readBy:[],deliveredTo:[]};
   store.messages.push(msg);if(store.messages.length>20000)store.messages=store.messages.slice(-20000);
   if(to){if(online(to))msg.deliveredTo.push(to);save();sendUser(uid,{t:'message',message:msg});sendUser(to,{t:'message',message:msg});if(online(to))sendUser(uid,{t:'delivery-receipt',ids:[msg.id],reader:to})}
   else{save();broadcast({t:'message',message:msg})}return
  }
  if(m.t==='history'){const to=typeof m.to==='string'&&userById(m.to)&&m.to!==uid?m.to:null,channelId=typeof m.channelId==='string'&&store.channels.some(c=>c.id===m.channelId)?m.channelId:null;send(ws,{t:'history',to,channelId,items:chatHistory(uid,to,channelId)});return}
  if(m.t==='read'){if(Array.isArray(m.ids))markRead(uid,m.ids.filter(x=>typeof x==='string').slice(0,300));return}
  if(m.t==='typing'){const to=typeof m.to==='string'?m.to:null;if(to)sendUser(to,{t:'typing',from:uid,name:user.name});else for(const [id,set2] of clients)if(id!==uid)for(const q of set2)send(q,{t:'typing',from:uid,name:user.name});return}
  if(['call-offer','call-answer','ice','call-end','call-reject'].includes(m.t)){const to=String(m.to||'');if(userById(to)&&online(to))sendUser(to,{...m,from:uid,fromName:user.name});else send(ws,{t:'call-error',message:'Пользователь уже не в сети'});return}
 });
 ws.on('close',()=>{const s=clients.get(uid);s?.delete(ws);if(s&&!s.size){clients.delete(uid);broadcast({t:'presence',users:onlineUsers()});for(const set2 of clients.values())for(const q of set2)send(q,{t:'call-end',from:uid,reason:'offline'})}});
 ws.on('error',()=>{});
});
server.listen(PORT,'0.0.0.0',()=>console.log('Pulse Messenger listening on '+PORT+'; persistent data at '+DATA));