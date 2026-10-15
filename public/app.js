(()=>{'use strict';
const $=id=>document.getElementById(id);let ws=null,myId=null,myName='',activeId=null,tab='chats',users=[],messagesByChat=new Map(),typingTimer=null,toastTimer=null,mediaRecorder=null,recordChunks=[],localStream=null,pc=null,callPeer=null,callType='audio',callInitiator=false,micMuted=false,cameraOff=false,pendingCandidates=[];
const globalKey='global',dmKey=id=>'dm:'+id;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function avatar(name){return esc((name||'?').trim().slice(0,1).toUpperCase())}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function send(m){if(ws&&ws.readyState===1)ws.send(JSON.stringify(m))}
function isDM(){return activeId!==globalKey}
function currentKey(){return activeId===globalKey?globalKey:dmKey(activeId)}
function labelFor(id){if(id===globalKey)return 'Общий чат';return users.find(u=>u.id===id)?.name||'Пользователь'}
function init(){
 $('loginForm').onsubmit=e=>{e.preventDefault();myName=$('nickname').value.trim().slice(0,24);if(!myName)return;connect()};
 $('newChat').onclick=()=>{tab='people';renderTabs();$('search').focus();renderList()};
 $('profileBtn').onclick=()=>toast('Твой профиль: '+myName);
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;renderTabs();renderList()});
 $('search').oninput=renderList;
 $('composer').onsubmit=e=>{e.preventDefault();submitMessage()};
 $('messageInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitMessage()}else send({t:'typing',to:isDM()?activeId:null})};
 $('messageInput').oninput=()=>{const el=$('messageInput');el.style.height='auto';el.style.height=Math.min(el.scrollHeight,130)+'px'};
 $('attach').onclick=()=>$('fileInput').click();
 $('fileInput').onchange=async()=>{const file=$('fileInput').files?.[0];if(file)await uploadFile(file);$('fileInput').value=''};
 $('record').onclick=toggleRecord;
 $('voiceCall').onclick=()=>startCall('audio');
 $('videoCall').onclick=()=>startCall('video');
 $('endCall').onclick=()=>endCall(true);
 $('closeCall').onclick=()=>endCall(true);
 $('muteCall').onclick=toggleMute;
 $('cameraCall').onclick=toggleCamera;
 $('back').onclick=()=>{$('app').classList.remove('chat-open');activeId=null;showEmpty()};
 $('more').onclick=()=>toast(isDM()?'Личные сообщения шифруются при передаче только транспортом WebRTC/HTTPS в этой версии.':'Общий чат виден всем подключённым пользователям.');
 window.addEventListener('beforeunload',()=>{try{send({t:'call-end',to:callPeer})}catch{}if(localStream)localStream.getTracks().forEach(t=>t.stop())});
}
function connect(){
 $('loginError').textContent='Подключаемся…';
 const proto=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(proto+'//'+location.host+'/ws');
 ws.onopen=()=>send({t:'join',name:myName});
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}handle(m)};
 ws.onerror=()=>{$('loginError').textContent='Не удалось подключиться. Обнови страницу и попробуй снова.'};
 ws.onclose=()=>{$('connection').textContent='нет связи';if(myId){toast('Соединение потеряно. Обнови страницу для входа снова.')}};
}
function handle(m){
 if(m.t==='welcome'){myId=m.id;users=m.users||[];$('login').classList.add('hidden');$('app').classList.remove('hidden');$('myName').textContent=myName;$('myAvatar').textContent=avatar(myName);$('connection').textContent='подключено';(m.history||[]).forEach(x=>pushMessage(globalKey,x,false));activeId=globalKey;openChat(globalKey);renderList();return}
 if(m.t==='presence'){users=m.users||[];$('peopleCount').textContent=users.filter(u=>u.id!==myId).length;$('connection').textContent='подключено';renderList();if(isDM()){$('peerStatus').textContent=users.some(u=>u.id===activeId)?'В сети':'Не в сети'}return}
 if(m.t==='message'){const msg=m.message,key=msg.to?dmKey(msg.from===myId?msg.to:msg.from):globalKey;pushMessage(key,msg,key===currentKey());renderList();if(key===currentKey())renderMessages();return}
 if(m.t==='typing'){if(m.from===activeId){$('typing').textContent=m.name+' печатает…';$('typing').classList.remove('hidden');clearTimeout(typingTimer);typingTimer=setTimeout(()=>$('typing').classList.add('hidden'),1500)}return}
 if(m.t==='history'){(m.items||[]).forEach(x=>pushMessage(m.to?dmKey(m.to):globalKey,x,false));renderMessages();return}
 if(m.t==='call-offer'){incomingCall(m);return}
 if(m.t==='call-answer'){answerCall(m);return}
 if(m.t==='ice'){if(m.candidate){if(pc&&pc.remoteDescription)pc.addIceCandidate(new RTCIceCandidate(m.candidate)).catch(()=>{});else pendingCandidates.push(m.candidate)}return}
 if(m.t==='call-end'||m.t==='call-reject'){closeCallUI(m.reason||'Звонок завершён');return}
 if(m.t==='call-error'){toast(m.message||'Не удалось позвонить');closeCallUI(m.message);return}
}
function pushMessage(key,msg,rerender=true){const list=messagesByChat.get(key)||[];if(!list.some(x=>x.id===msg.id))list.push(msg);messagesByChat.set(key,list.slice(-300));if(rerender)renderMessages()}
function renderTabs(){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab))}
function renderList(){
 const q=$('search').value.trim().toLowerCase(),el=$('chatList');el.innerHTML='';
 if(tab==='chats'){
  const all=[{id:globalKey,name:'Общий чат',subtitle:'Общение со всеми пользователями',group:true}];
  users.filter(u=>u.id!==myId).forEach(u=>{const has=messagesByChat.has(dmKey(u.id));if(has||u.name.toLowerCase().includes(q))all.push({id:u.id,name:u.name,subtitle:has?lastText(messagesByChat.get(dmKey(u.id)).at(-1)):'Начать переписку'})});
  all.filter(x=>x.name.toLowerCase().includes(q)||String(x.subtitle).toLowerCase().includes(q)).forEach(x=>el.append(makeListItem(x)));
 }else{
  const found=users.filter(u=>u.id!==myId&&u.name.toLowerCase().includes(q));if(!found.length)el.innerHTML='<div class="muted" style="padding:16px">Пока никого не найдено. Попроси друга открыть Pulse.</div>';found.forEach(u=>el.append(makeListItem({id:u.id,name:u.name,subtitle:'● '+(u.online?'В сети':'Не в сети')})));
 }
}
function lastText(m){if(!m)return'Пока нет сообщений';return m.text||((m.attachment?.mime||'').startsWith('image/')?'📷 Фото':(m.attachment?.mime||'').startsWith('video/')?'🎬 Видео':'📎 Файл')}
function makeListItem(x){const b=document.createElement('div');b.className='chat-item'+(activeId===x.id?' active':'');b.innerHTML='<div class="avatar">'+(x.group?'✦':avatar(x.name))+'</div><div class="chat-preview"><b>'+esc(x.name)+'</b><small>'+esc(x.subtitle)+'</small></div>';b.onclick=()=>openChat(x.id);return b}
function showEmpty(){$('welcome').classList.remove('hidden');$('messages').classList.add('hidden');$('composer').classList.add('hidden');$('peerName').textContent='Выбери чат';$('peerStatus').textContent='Твои сообщения — здесь';$('peerAvatar').textContent='P';renderList()}
function openChat(id){activeId=id;$('app').classList.add('chat-open');$('welcome').classList.add('hidden');$('messages').classList.remove('hidden');$('composer').classList.remove('hidden');$('peerName').textContent=labelFor(id);$('peerAvatar').textContent=id===globalKey?'✦':avatar(labelFor(id));$('peerStatus').textContent=id===globalKey?'Общий чат · все пользователи':(users.some(u=>u.id===id)?'В сети':'Не в сети');$('typing').classList.add('hidden');renderList();renderMessages();if(id!==globalKey)send({t:'history',to:id})}
function attachmentHTML(a){if(!a)return'';const url=esc(a.url),name=esc(a.name),type=a.mime||'',isImage=type.startsWith('image/'),isVideo=type.startsWith('video/'),isAudio=type.startsWith('audio/');if(isImage)return '<a href="'+url+'" target="_blank" rel="noopener"><img class="attachment" loading="lazy" src="'+url+'" alt="'+name+'"></a>';if(isVideo)return '<video class="attachment" controls preload="metadata" src="'+url+'"></video>';if(isAudio)return '<audio class="attachment" controls src="'+url+'"></audio>';return '<a class="file-card" href="'+url+'" target="_blank" rel="noopener" download="'+name+'"><span>📎</span><div>'+name+'<small>'+Math.max(1,Math.round((a.size||0)/1024))+' KB</small></div></a>'}
function renderMessages(){const el=$('messages'),list=messagesByChat.get(currentKey())||[];el.innerHTML='';if(!list.length){el.innerHTML='<div class="day-label">Начало переписки · отправь первое сообщение ✨</div>';return}let day='';for(const m of list){const d=new Date(m.at||Date.now()).toLocaleDateString();if(d!==day){day=d;const label=document.createElement('div');label.className='day-label';label.textContent=d;el.append(label)}const mine=m.from===myId,node=document.createElement('div');node.className='message'+(mine?' mine':'');node.innerHTML=(!mine&&currentKey()===globalKey?'<div class="msg-name">'+esc(m.name)+'</div>':'')+'<div class="bubble">'+(m.text?esc(m.text):'')+attachmentHTML(m.attachment)+'</div><div class="msg-time">'+new Date(m.at||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div>';el.append(node)}el.scrollTop=el.scrollHeight}
function submitMessage(){const input=$('messageInput'),text=input.value.trim();if(!text)return;send({t:'message',text,to:isDM()?activeId:null});input.value='';input.style.height='auto';input.focus()}
async function uploadFile(file){
 if(!file)return;
 if(file.size>25*1024*1024){toast('Максимальный размер файла — 25 МБ');return}
 if(!ws||ws.readyState!==1){toast('Нет соединения с сервером — перезайди в Pulse');return}
 const ext=(file.name.match(/\.[^.]+$/)||[''])[0].toLowerCase();
 const supported=['.png','.jpg','.jpeg','.webp','.gif','.bmp','.svg','.mp4','.webm','.mov','.m4v','.avi','.mp3','.m4a','.ogg','.wav','.aac','.flac','.pdf','.txt','.md','.csv','.json','.zip','.7z','.rar','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.rtf'];
 if(!supported.includes(ext)){toast('Формат '+(ext||'без расширения')+' пока не поддерживается');return}
 $('uploadStatus').textContent='Загружаем '+file.name+'…';$('attach').disabled=true;
 try{
  const res=await fetch('/upload?name='+encodeURIComponent(file.name),{method:'POST',headers:{'content-type':file.type||'application/octet-stream'},body:file});
  if(!res.ok){let reason='HTTP '+res.status;try{reason=await res.text()}catch{}throw new Error(reason)}
  const a=await res.json();
  if(!ws||ws.readyState!==1)throw new Error('Файл загружен, но соединение чата потеряно. Перезайди и отправь его снова.');
  send({t:'message',text:'',to:isDM()?activeId:null,attachment:{...a,mime:file.type||a.mime}});
  $('uploadStatus').textContent='Файл отправлен ✓';toast('Файл отправлен');
 }catch(e){toast('Не удалось отправить файл: '+(e.message||'ошибка сети'));$('uploadStatus').textContent='Ошибка отправки'}
 finally{$('attach').disabled=false;setTimeout(()=>$('uploadStatus').textContent='',3500)}
}
async function toggleRecord(){if(mediaRecorder&&mediaRecorder.state==='recording'){mediaRecorder.stop();$('record').textContent='🎙';$('record').style.color='';return}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Запись голоса не поддерживается этим браузером');return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordChunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>{if(e.data.size)recordChunks.push(e.data)};mediaRecorder.onstop=async()=>{const blob=new Blob(recordChunks,{type:mediaRecorder.mimeType||'audio/webm'}),ext=blob.type.includes('ogg')?'.ogg':blob.type.includes('mp4')?'.mp4':'.webm',file=new File([blob],'voice-message'+ext,{type:blob.type});stream.getTracks().forEach(t=>t.stop());await uploadFile(file)};mediaRecorder.start();$('record').textContent='■';$('record').style.color='#ff6685';toast('Запись идёт — нажми ■, чтобы отправить')}catch(e){toast('Разреши доступ к микрофону в браузере')}} 
async function startCall(type){if(!isDM()){toast('Для звонка выбери человека во вкладке «Люди»');return}const target=users.find(u=>u.id===activeId);if(!target){toast('Этот человек сейчас не в сети');return}callPeer=target.id;callType=type;callInitiator=true;micMuted=false;cameraOff=false;$('callName').textContent=target.name;$('callAvatar').textContent=avatar(target.name);$('callState').textContent='Запрашиваем доступ к '+(type==='video'?'камере и микрофону':'микрофону')+'…';$('callOverlay').classList.remove('hidden');try{localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'});$('localVideo').srcObject=localStream;$('localVideo').classList.toggle('hidden',type!=='video');pc=createPeer();for(const track of localStream.getTracks())pc.addTrack(track,localStream);const offer=await pc.createOffer();await pc.setLocalDescription(offer);send({t:'call-offer',to:callPeer,offer:offer,type});$('callState').textContent='Звоним…'}catch(e){toast('Не удалось начать звонок: '+e.message);closeCallUI('Не удалось начать звонок')}}
function createPeer(){const peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});peer.onicecandidate=e=>{if(e.candidate)send({t:'ice',to:callPeer,candidate:e.candidate})};peer.ontrack=e=>{const stream=e.streams[0];$('remoteVideo').srcObject=stream;$('remoteVideoWrap').classList.remove('hidden');$('callState').textContent='Соединение установлено'};peer.onconnectionstatechange=()=>{if(peer.connectionState==='connected')$('callState').textContent='На связи';if(['failed','disconnected'].includes(peer.connectionState))$('callState').textContent='Связь нестабильна'};return peer}
async function incomingCall(m){if(callPeer){send({t:'call-reject',to:m.from,reason:'busy'});return}callPeer=m.from;callType=m.type||'audio';callInitiator=false;window.incomingOffer=m.offer;$('callName').textContent=m.fromName||'Входящий звонок';$('callAvatar').textContent=avatar(m.fromName);$('callState').textContent='Входящий '+(callType==='video'?'видеозвонок':'голосовой звонок');$('callOverlay').classList.remove('hidden');$('endCall').textContent='✕';$('endCall').onclick=()=>{send({t:'call-reject',to:callPeer});closeCallUI('Вызов отклонён')};$('closeCall').onclick=()=>{send({t:'call-reject',to:callPeer});closeCallUI('Вызов отклонён')};$('muteCall').textContent='✓ Принять';$('muteCall').style.width='auto';$('muteCall').style.borderRadius='18px';$('muteCall').style.padding='0 16px';$('cameraCall').classList.add('hidden');}
async function answerCall(m){if(!pc||!callInitiator)return;try{await pc.setRemoteDescription(new RTCSessionDescription(m.answer));for(const c of pendingCandidates)await pc.addIceCandidate(new RTCIceCandidate(c));pendingCandidates=[]}catch(e){toast('Ошибка установки соединения: '+e.message)}}
async function toggleMute(){if(!callInitiator&&callPeer&&!pc){try{localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:callType==='video'});$('localVideo').srcObject=localStream;$('localVideo').classList.toggle('hidden',callType!=='video');pc=createPeer();for(const t of localStream.getTracks())pc.addTrack(t,localStream);await pc.setRemoteDescription(new RTCSessionDescription(window.incomingOffer));for(const c of pendingCandidates)await pc.addIceCandidate(new RTCIceCandidate(c));pendingCandidates=[];const answer=await pc.createAnswer();await pc.setLocalDescription(answer);send({t:'call-answer',to:callPeer,answer});callInitiator=true;$('callState').textContent='Подключаемся…';$('muteCall').textContent='🎙';$('muteCall').style.width='53px';$('muteCall').style.borderRadius='50%';$('muteCall').style.padding='0';$('cameraCall').classList.toggle('hidden',callType!=='video');$('endCall').textContent='☎';$('endCall').onclick=()=>endCall(true);$('closeCall').onclick=()=>endCall(true);return}catch(e){toast('Не удалось принять звонок: '+e.message);closeCallUI('Ошибка подключения');return}}micMuted=!micMuted;localStream?.getAudioTracks().forEach(t=>t.enabled=!micMuted);$('muteCall').textContent=micMuted?'🔇':'🎙'}
function toggleCamera(){cameraOff=!cameraOff;localStream?.getVideoTracks().forEach(t=>t.enabled=!cameraOff);$('cameraCall').textContent=cameraOff?'🚫':'📷'}
function endCall(notifyPeer){if(notifyPeer&&callPeer)send({t:'call-end',to:callPeer});closeCallUI('Звонок завершён')}
function closeCallUI(state){if(pc){pc.close();pc=null}if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null}$('remoteVideo').srcObject=null;$('localVideo').srcObject=null;$('remoteVideoWrap').classList.add('hidden');$('localVideo').classList.add('hidden');$('callOverlay').classList.add('hidden');$('callState').textContent=state||'';$('muteCall').textContent='🎙';$('muteCall').style.width='53px';$('muteCall').style.borderRadius='50%';$('muteCall').style.padding='0';$('cameraCall').classList.remove('hidden');$('endCall').textContent='☎';$('endCall').onclick=()=>endCall(true);$('closeCall').onclick=()=>endCall(true);callPeer=null;callInitiator=false;pendingCandidates=[]}
window.addEventListener('DOMContentLoaded',init);
})();