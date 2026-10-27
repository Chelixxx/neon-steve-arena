(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const request=async(url,options={})=>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Не удалось выполнить запрос');return d};
const toast=s=>{if(typeof window.toast==='function'){window.toast(s);return}const t=$('toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}};
const style=document.createElement('style');
style.id='voltra-suite-styles';
style.textContent=`
.vp-suite-section{margin:18px 0;padding:16px;border:1px solid #8b73ff40;border-radius:18px;background:linear-gradient(135deg,#17152a,#111522)}.vp-suite-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.vp-suite-head h3{margin:0}.vp-suite-actions{display:flex;gap:8px;flex-wrap:wrap}.vp-suite-actions button,.vp-session-row button{border:1px solid #8b73ff55;border-radius:10px;padding:8px 11px;background:#27223d;color:#f4f0ff;cursor:pointer}.vp-session-list{display:grid;gap:9px;margin-top:12px}.vp-session-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px;border:1px solid #ffffff14;border-radius:12px;background:#ffffff05}.vp-session-row b{display:block}.vp-session-row small{display:block;color:#b9bbd4;margin-top:3px}.vp-session-row button{flex-shrink:0;color:#ffc7d8;border-color:#fb718555}.vp-session-pill{display:inline-block;border-radius:999px;padding:3px 7px;margin:3px 4px 0 0;background:#8b73ff24;color:#d9d1ff;font-size:11px}.vp-achievement-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin-top:12px}.vp-achievement{min-width:0;border:1px solid #ffffff16;border-radius:13px;padding:11px;background:#ffffff05;opacity:.62}.vp-achievement.is-unlocked{opacity:1;border-color:#8b73ff88;background:linear-gradient(145deg,#32274f88,#151527)}.vp-achievement .vp-ach-icon{font-size:24px;display:block;margin-bottom:6px}.vp-achievement b{display:block;font-size:13px}.vp-achievement small{display:block;color:#b9bbd4;font-size:11px;margin-top:5px}.vp-ach-progress{height:4px;border-radius:9px;background:#ffffff12;margin-top:8px;overflow:hidden}.vp-ach-progress span{display:block;height:100%;background:linear-gradient(90deg,#8b73ff,#e879f9)}.vp-achievements-block{margin:16px 0}.vp-achievements-block h3{font-size:16px;margin:0 0 8px}.vp-voice-room-btn{display:none!important}.vp-voice-room-btn.is-available{display:inline-flex!important;align-items:center;gap:6px}.vp-voice-room-backdrop{position:fixed;inset:0;z-index:1000000;background:#070711d9;backdrop-filter:blur(14px);display:grid;place-items:center;padding:18px}.vp-voice-room{width:min(480px,100%);border:1px solid #9b84ff66;border-radius:24px;padding:20px;background:radial-gradient(130% 120% at 0 0,#352353,#101321 60%);color:#f5f3ff;box-shadow:0 25px 100px #0009}.vp-voice-room h2{margin:0 0 5px}.vp-voice-room p{color:#c0bfdb}.vp-voice-members{display:grid;gap:8px;margin:16px 0}.vp-voice-member{display:flex;align-items:center;gap:10px;border:1px solid #ffffff17;border-radius:13px;padding:10px}.vp-voice-dot{width:9px;height:9px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d39988}.vp-voice-member small{margin-left:auto;color:#c4b5fd}.vp-voice-actions{display:flex;gap:8px;flex-wrap:wrap}.vp-voice-actions button{flex:1;min-width:110px;border:1px solid #ffffff24;border-radius:12px;padding:12px;background:#292440;color:#f5f3ff;font-weight:700;cursor:pointer}.vp-voice-actions .leave{background:#7f1d3b;border-color:#f472b655}.vp-voice-status{font-size:12px;color:#c4b5fd;margin-top:10px}.vp-mini-favorites-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:8px 0}.vp-mini-favorites-bar label{display:flex;align-items:center;gap:7px;font-size:13px}.vp-mini-favorites-bar button{border-radius:10px;padding:7px 10px;border:1px solid #8b73ff55;background:#28233e;color:#eee9ff}.miniapp-favorite-toggle{border:1px solid #a78bfa55!important;background:#2a2142!important;color:#e9d5ff!important}.vp-empty{font-size:13px;color:#b7b4d3;padding:8px 0}.gift-owner-history{margin-top:7px;padding-top:6px;border-top:1px solid #ffffff16}.gift-owner-history summary{cursor:pointer;color:#c4b5fd;font-size:11px;list-style-position:inside}.gift-owner-history small{display:block;margin-top:5px;color:#bebad9;font-size:10px;overflow-wrap:anywhere}.vp-session-row small{overflow-wrap:anywhere}
@media(max-width:600px){.vp-session-row{align-items:flex-start}.vp-session-row button{max-width:115px;white-space:normal}.vp-suite-section{padding:12px}.vp-achievement-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
document.head.append(style);

function achievementHTML(items){
 if(!items?.length)return '<p class="vp-empty">Пока нет данных о достижениях.</p>';
 return '<div class="vp-achievement-grid">'+items.map(a=>'<article class="vp-achievement '+(a.unlocked?'is-unlocked':'')+'"><span class="vp-ach-icon">'+esc(a.emoji||'🏅')+'</span><b>'+esc(a.title||'Достижение')+'</b><small>'+esc(a.unlocked?'Получено ✓':(a.current||0)+' / '+(a.target||1)+' · '+(a.description||''))+'</small><div class="vp-ach-progress"><span style="width:'+Math.max(0,Math.min(100,Number(a.progress)||0))+'%"></span></div></article>').join('')+'</div>';
}
function addSuitePanels(){
 const card=document.querySelector('#settingsModal .modal-card');
 if(card&&!$('vpSuiteSettings')){
  const anchor=card.querySelector('.settings-list')||card.lastElementChild;
  const wrap=document.createElement('section');wrap.id='vpSuiteSettings';wrap.className='vp-suite-section';wrap.dataset.vpSettingsCategory='security';
  wrap.innerHTML='<div class="vp-suite-head"><div><h3>🛡️ Центр безопасности и VOLTRA Plus</h3><small class="vp-suite-subtitle">Устройства, входы и достижения аккаунта</small></div><div class="vp-suite-actions"><button type="button" data-vp-suite-toggle aria-expanded="false">Показать</button><button type="button" data-vp-refresh-sessions>↻ Устройства</button><button type="button" data-vp-open-miniapps>🧩 Mini Apps</button></div></div><div id="vpSuiteContent" class="vp-suite-content hidden"><p class="muted">Просматривай сеансы входа и завершай старые устройства. Достижения обновляются автоматически по твоей активности.</p><div id="vpSessions" class="vp-session-list"><p class="vp-empty">Нажми «Устройства», чтобы посмотреть активные сессии.</p></div><div class="vp-suite-divider"></div><div class="vp-suite-head"><h3>🏅 Достижения</h3><div class="vp-suite-actions"><button type="button" data-vp-refresh-achievements>↻ Обновить</button></div></div><div id="vpOwnAchievements"><p class="vp-empty">Открой этот раздел, чтобы загрузить достижения.</p></div></div>';
  if(anchor)anchor.before(wrap);else card.append(wrap);
 }
 const profileCard=document.querySelector('#profileModal .modal-card');
 if(profileCard&&!$('vpOwnProfileAchievements')){
  const bio=$('profileBio');
  const section=document.createElement('section');section.id='vpOwnProfileAchievements';section.className='vp-achievements-block';
  section.innerHTML='<h3>🏅 Мои достижения</h3><div id="vpOwnProfileAchievementList"><p class="vp-empty">Загружаем…</p></div>';
  if(bio)bio.insertAdjacentElement('afterend',section);else profileCard.append(section);
 }
 if($('publicProfileGifts')&&!$('publicProfileAchievements')){
  const section=document.createElement('section');section.id='publicProfileAchievements';section.className='vp-achievements-block';
  section.innerHTML='<h3>🏅 Достижения</h3><div id="publicProfileAchievementList"></div>';
  $('publicProfileGifts').before(section);
 }
}
function compactSettingsLayout(){
 const card=document.querySelector('#settingsModal .modal-card');if(!card)return;
 const title=card.querySelector(':scope > h2');
 if(title&&!$('vpSettingsToolbar')){
  const toolbar=document.createElement('div');toolbar.id='vpSettingsToolbar';toolbar.className='vp-settings-toolbar';
  toolbar.innerHTML='<input id="vpSettingsSearch" type="search" maxlength="80" placeholder="⌕ Найти настройку…" aria-label="Найти настройку"><div class="vp-settings-filters" role="group" aria-label="Фильтр настроек"><button type="button" data-vp-settings-filter="all" aria-pressed="true">Все</button><button type="button" data-vp-settings-filter="general" aria-pressed="false">Основное</button><button type="button" data-vp-settings-filter="appearance" aria-pressed="false">Дизайн</button><button type="button" data-vp-settings-filter="notifications" aria-pressed="false">Звуки</button><button type="button" data-vp-settings-filter="security" aria-pressed="false">Безопасность</button><button type="button" data-vp-settings-filter="admin" aria-pressed="false">Админ</button></div>';
  title.after(toolbar);
 }
 const tag=(node,category)=>{if(node&&!node.dataset.vpSettingsCategory)node.dataset.vpSettingsCategory=category};
 const parentLabel=id=>$(id)?.closest('label');
 tag(card.querySelector('.interface-setting-card'),'appearance');
 tag(card.querySelector('.font-settings'),'appearance');
 tag(card.querySelector('.pulse-sound-settings'),'notifications');
 tag(card.querySelector('.customize-settings'),'appearance');
 tag($('vpSuiteSettings'),'security');
 tag($('settingTheme')?.closest('.theme-setting'),'appearance');
 for(const id of ['settingCompact','settingAnimations','settingAccent','settingChatBg','settingTextSize','settingBubbleStyle','settingRadius','settingFont','settingDensity','settingBiomeIcon','appIconFile','resetAppIcon'])tag($(id)?.closest('label')||$(id)?.closest('.app-icon-customizer'),'appearance');
 for(const id of ['settingSounds','previewNotificationSound','clearNotificationSound','notificationSoundFile','callSoundFile','previewCallSound','clearCallSound'])tag($(id)?.closest('label')||$(id)?.closest('.pulse-sound-row'),'notifications');
 for(const id of ['settingAlwaysOnline','settingGhostMode']){const label=parentLabel(id);tag(label,'security');const next=label?.nextElementSibling;if(next?.classList.contains('muted'))tag(next,'security')}
 tag($('profilePrivacySetting'),'security');tag($('moderationPanel'),'admin');tag($('adminGlobalChatPanel'),'admin');tag($('adminBanPanel'),'admin');
 const guessCategory=t=>{
  if(/модерац|админ|бан |заблокир|жалоб|доступ к общему|изменить свою надпись/.test(t))return 'admin';
  if(/безопас|приват|скрывать мой профиль|устройств|сесси|восстанов|контакт|email|телефон|онлайн|призрак|парол/.test(t))return 'security';
  if(/звук|уведомлен|мелод|микрофон/.test(t))return 'notifications';
  if(/компакт|интерфейс|цвет|тема|шрифт|иконк|анимац|дизайн|скруглен|размер текста|плотность|оформлен/.test(t))return 'appearance';
  return 'general';
 };
 card.querySelectorAll('.settings-list > *').forEach(node=>{if(!node.dataset.vpSettingsCategory)tag(node,guessCategory(String(node.innerText||node.textContent||'').toLocaleLowerCase('ru-RU')))});
 [...card.children].forEach(node=>{
  if(node.matches('h2,.modal-close,.settings-list,#vpSettingsToolbar'))return;
  if(!node.dataset.vpSettingsCategory)tag(node,guessCategory(String(node.innerText||node.textContent||'').toLocaleLowerCase('ru-RU')));
 });
 const fold=(selector,label,category,caption)=>{
  const source=card.querySelector(selector);if(!source||source.closest('.vp-settings-accordion'))return;
  const parent=source.parentElement;if(!parent)return;
  const details=document.createElement('details');details.className='vp-settings-accordion';details.dataset.vpSettingsCategory=category;details.open=false;
  const summary=document.createElement('summary');summary.textContent=label;
  if(caption){const small=document.createElement('span');small.className='vp-accordion-caption';small.textContent=caption;summary.append(small)}
  const inner=document.createElement('div');inner.className='vp-settings-accordion-content';
  parent.insertBefore(details,source);details.append(summary,inner);inner.append(source);
 };
 fold('.font-settings','🔤 Шрифты','appearance','Локально');
 fold('.pulse-sound-settings','🔔 Свои звуки','notifications','2 звука');
 fold('.customize-settings','🎨 Внешний вид и иконки','appearance','Цвета · шрифт · фон');
 const profile=$('profileModal');
 if(profile){
  const perks=profile.querySelector('.vip-perk-list');
  if(perks&&!perks.dataset.vpCompact){perks.dataset.vpCompact='1';const details=document.createElement('details');details.className='vp-settings-accordion';const summary=document.createElement('summary');summary.textContent='✨ Что входит в VIP';const inner=document.createElement('div');inner.className='vp-settings-accordion-content';perks.before(details);details.append(summary,inner);inner.append(perks)}
 }
 const compact=$('settingCompact');if(compact){compact.checked=localStorage.getItem('pulseCompact')==='1';document.body.classList.toggle('compact-mode',compact.checked)}
 applySettingsFilter();
}
function applySettingsFilter(){
 const card=document.querySelector('#settingsModal .modal-card');if(!card)return;
 const mode=$('vpSettingsToolbar')?.dataset.filter||'all',query=String($('vpSettingsSearch')?.value||'').trim().toLocaleLowerCase('ru-RU');
 const nodes=new Set([...card.querySelectorAll('[data-vp-settings-category]'),...card.querySelectorAll('.settings-list > *')]);
 for(const node of nodes){
  if(node.id==='vpSettingsToolbar'||node.closest('#vpSettingsToolbar'))continue;
  const category=node.dataset.vpSettingsCategory||'general',text=String(node.innerText||node.textContent||'').toLocaleLowerCase('ru-RU');
  const matchesCategory=mode==='all'||category===mode,matchesQuery=!query||text.includes(query);
  node.classList.toggle('vp-filtered-out',!(matchesCategory&&matchesQuery));
  if(node.tagName==='DETAILS'&&matchesCategory&&matchesQuery&&query)node.open=true;
 }
 const toolbar=$('vpSettingsToolbar');if(toolbar)toolbar.querySelectorAll('[data-vp-settings-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vpSettingsFilter===mode)));
}
async function loadAchievements(){
 try{const d=await request('/api/achievements/me');const html=achievementHTML(d.items||[]);if($('vpOwnAchievements'))$('vpOwnAchievements').innerHTML='<div class="vp-suite-head"><small class="muted">Открыто '+Number(d.unlocked||0)+' из '+Number(d.total||0)+'</small></div>'+html;if($('vpOwnProfileAchievementList'))$('vpOwnProfileAchievementList').innerHTML=html}catch(e){if($('vpOwnAchievements'))$('vpOwnAchievements').innerHTML='<p class="vp-empty">'+esc(e.message)+'</p>'}
}
async function loadSessions(){
 const el=$('vpSessions');if(!el)return;el.innerHTML='<p class="vp-empty">Проверяем устройства…</p>';
 try{const d=await request('/api/security/sessions');const rows=d.sessions||[];if(!rows.length){el.innerHTML='<p class="vp-empty">Нет сохранённых сессий.</p>';return}
 el.innerHTML=rows.map(s=>'<div class="vp-session-row"><div><b>'+esc(s.label||'Устройство')+(s.isCurrent?' <span class="vp-session-pill">Это устройство</span>':'')+'</b><small>'+(s.online?'🟢 Активно в сети':s.revoked?'Отозвано':'Не в сети')+' · Последняя активность: '+(s.lastSeen?esc(new Date(s.lastSeen).toLocaleString()):'—')+'</small><small>Добавлено: '+(s.firstSeen?esc(new Date(s.firstSeen).toLocaleDateString()):'—')+'</small></div>'+(s.isCurrent?'<span class="vp-session-pill">Текущая</span>':s.revoked?'<span class="vp-session-pill">Отозвана</span>':'<button type="button" data-vp-revoke-device="'+esc(s.id)+'">Завершить</button>')+'</div>').join('');
 }catch(e){el.innerHTML='<p class="vp-empty">'+esc(e.message)+' · если сессия устарела, войди в аккаунт заново.</p>'}
}
function chatKey(){try{if(typeof currentKey==='function')return String(currentKey())}catch{}return 'chat:'+String($('peerName')?.textContent||'general')}
const draftKey=k=>'voltra-draft-v1:'+String(k||'general');
let lastDraftChat='';
function saveDraftFor(key,value){try{if(!key)return;if(String(value||'').trim())localStorage.setItem(draftKey(key),String(value));else localStorage.removeItem(draftKey(key))}catch{}}
function syncDraft(){
 const input=$('messageInput');if(!input)return;const key=chatKey();
 if(!lastDraftChat){lastDraftChat=key;try{input.value=localStorage.getItem(draftKey(key))||'';if(input.value)input.dispatchEvent(new Event('input',{bubbles:true}))}catch{}return}
 if(key===lastDraftChat)return;
 saveDraftFor(lastDraftChat,input.value);
 lastDraftChat=key;
 try{input.value=localStorage.getItem(draftKey(key))||'';input.dispatchEvent(new Event('input',{bubbles:true}))}catch{input.value=''}
}
function initDrafts(){
 const input=$('messageInput');if(!input)return;lastDraftChat=chatKey();
 try{input.value=localStorage.getItem(draftKey(lastDraftChat))||'';if(input.value)input.dispatchEvent(new Event('input',{bubbles:true}))}catch{}
 input.addEventListener('input',()=>saveDraftFor(chatKey(),input.value));
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey)setTimeout(()=>{if(!input.value.trim())saveDraftFor(chatKey(),'')},0)},true);
 $('composer')?.addEventListener('submit',()=>setTimeout(()=>{if(!input.value.trim())saveDraftFor(chatKey(),'')},0),true);
 window.addEventListener('beforeunload',()=>saveDraftFor(chatKey(),input.value));
 const peer=$('peerName');if(peer)new MutationObserver(()=>setTimeout(syncDraft,0)).observe(peer,{childList:true,subtree:true,characterData:true});
 $('chatList')?.addEventListener('click',e=>{if(e.target.closest('.chat-item,.directory-result'))setTimeout(syncDraft,60)},true);
 document.addEventListener('click',e=>{if(e.target.closest('#back'))setTimeout(syncDraft,60)},true);
}
let room={id:null,stream:null,peers:new Map(),members:new Map(),muted:false};
function activeGroup(){
 try{if(typeof activeId!=='string'||!activeId.startsWith('channel:'))return null;const id=activeId.slice(8);const list=typeof channels!=='undefined'&&Array.isArray(channels)?channels:[];const c=list.find(x=>x.id===id);return c?.type==='group'?c:null}catch{return null}
}
function addRoomButton(){
 const actions=document.querySelector('.chat-head .head-actions');if(!actions)return;
 if(!$('vpVoiceRoomButton')){const b=document.createElement('button');b.type='button';b.id='vpVoiceRoomButton';b.className='icon-btn vp-voice-room-btn';b.title='Голосовая комната группы';b.textContent='🎙️';b.addEventListener('click',()=>{const c=activeGroup();if(c)joinRoom(c.id,c.name)});const before=$('voiceCall');if(before)before.before(b);else actions.append(b)}
 updateRoomButton();
}
function updateRoomButton(){const b=$('vpVoiceRoomButton');if(!b)return;const c=activeGroup();b.classList.toggle('is-available',!!c);b.title=c?'Голосовая комната группы «'+c.name+'»':'Голосовая комната';if(room.id)b.textContent='🎙 '+room.members.size}
function buildRoomModal(){
 let backdrop=$('vpVoiceRoomBackdrop');if(backdrop)return backdrop;
 backdrop=document.createElement('div');backdrop.id='vpVoiceRoomBackdrop';backdrop.className='vp-voice-room-backdrop';backdrop.innerHTML='<section class="vp-voice-room" role="dialog" aria-modal="true" aria-labelledby="vpVoiceRoomTitle"><h2 id="vpVoiceRoomTitle">🎙️ Голосовая комната</h2><p id="vpVoiceRoomDescription">Подключаемся к участникам группы…</p><div id="vpVoiceRoomMembers" class="vp-voice-members"></div><div class="vp-voice-actions"><button type="button" id="vpVoiceMute">🎙️ Выключить микрофон</button><button type="button" class="leave" id="vpVoiceLeave">Покинуть комнату</button></div><div id="vpVoiceRoomStatus" class="vp-voice-status">Подготовка соединения…</div></section>';
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)toast('Чтобы отключиться, нажми «Покинуть комнату».')});
 $('vpVoiceLeave')?.removeEventListener?.('click',leaveRoom);
 backdrop.querySelector('#vpVoiceLeave').addEventListener('click',leaveRoom);
 backdrop.querySelector('#vpVoiceMute').addEventListener('click',toggleRoomMute);
 document.body.append(backdrop);return backdrop;
}
function renderRoomMembers(){
 const el=$('vpVoiceRoomMembers');if(!el)return;
 const members=[...room.members.values()];
 el.innerHTML=members.map(m=>'<div class="vp-voice-member"><span class="vp-voice-dot"></span><b>'+esc(m.name||'Участник')+(String(m.id)===myId?' (ты)':'')+'</b><small>'+(String(m.id)===myId?(room.muted?'Микрофон выключен':'Микрофон включён'):'Подключение')+'</small></div>').join('')||'<p class="vp-empty">Пока никого нет.</p>';
 const desc=$('vpVoiceRoomDescription');if(desc)desc.textContent='Участники группы · '+members.length;
 const button=$('vpVoiceMute');if(button)button.textContent=room.muted?'🎙️ Включить микрофон':'🎙️ Выключить микрофон';
 updateRoomButton();
}
function setRoomStatus(s){if($('vpVoiceRoomStatus'))$('vpVoiceRoomStatus').textContent=s}
function sendRoom(m){if(!room.id)return;try{if(typeof send==='function')send({...m,roomId:room.id})}catch{}}
function ensurePeer(peerId){
 let entry=room.peers.get(peerId);if(entry)return entry;
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
 entry={pc,candidates:[],audio:null};room.peers.set(peerId,entry);
 for(const track of room.stream?.getTracks()||[])pc.addTrack(track,room.stream);
 pc.onicecandidate=e=>{if(e.candidate)sendRoom({t:'voice-room-ice',to:peerId,candidate:e.candidate})};
 pc.ontrack=e=>{try{let audio=entry.audio;if(!audio){audio=new Audio();audio.autoplay=true;audio.playsInline=true;audio.style.display='none';document.body.append(audio);entry.audio=audio}audio.srcObject=e.streams?.[0]||new MediaStream([e.track]);audio.play().catch(()=>setRoomStatus('Нажми на страницу, чтобы разрешить воспроизведение звука.'))}catch{}};
 pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')setRoomStatus('Связь установлена ✓');else if(['failed','disconnected'].includes(pc.connectionState))setRoomStatus('Соединение с участником прервалось…')};
 return entry;
}
async function startRoomOffer(peerId){
 if(!room.id||!room.stream||!myId||String(myId).localeCompare(String(peerId))>=0)return;
 try{const p=ensurePeer(peerId);if(p.pc.localDescription)return;const offer=await p.pc.createOffer();await p.pc.setLocalDescription(offer);sendRoom({t:'voice-room-offer',to:peerId,offer:p.pc.localDescription})}catch(e){setRoomStatus('Не удалось вызвать участника: '+(e.message||'ошибка'))}
}
async function handleRoomSignal(m){
 if(m.t==='voice-room-error'){const message=m.message||'Ошибка голосовой комнаты';cleanupRoom(false);toast(message);return}
 if(!room.id||m.roomId!==room.id)return;
 if(m.t==='voice-room-state'){room.members.clear();for(const x of m.members||[])room.members.set(x.id,x);renderRoomMembers();for(const x of m.members||[]){if(x.id!==myId){ensurePeer(x.id);if(String(myId).localeCompare(String(x.id))<0)void startRoomOffer(x.id)}}return}
 if(m.t==='voice-room-joined'){if(!m.user?.id)return;room.members.set(m.user.id,m.user);renderRoomMembers();ensurePeer(m.user.id);if(String(myId).localeCompare(String(m.user.id))<0)void startRoomOffer(m.user.id);return}
 if(m.t==='voice-room-left'){removePeer(m.userId);room.members.delete(m.userId);renderRoomMembers();return}
 if(m.t==='voice-room-offer'){
  if(!m.offer||!m.from)return;try{const p=ensurePeer(m.from);await p.pc.setRemoteDescription(new RTCSessionDescription(m.offer));for(const candidate of p.candidates.splice(0))await p.pc.addIceCandidate(candidate).catch(()=>{});const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);sendRoom({t:'voice-room-answer',to:m.from,answer:p.pc.localDescription})}catch(e){setRoomStatus('Ошибка подключения участника: '+(e.message||'ошибка'))}return
 }
 if(m.t==='voice-room-answer'){const p=room.peers.get(m.from);if(!p||!m.answer)return;try{await p.pc.setRemoteDescription(new RTCSessionDescription(m.answer));for(const candidate of p.candidates.splice(0))await p.pc.addIceCandidate(candidate).catch(()=>{})}catch(e){setRoomStatus('Не удалось принять ответ звонка.')}return}
 if(m.t==='voice-room-ice'){if(!m.from||!m.candidate)return;const p=ensurePeer(m.from),candidate=new RTCIceCandidate(m.candidate);if(p.pc.remoteDescription)await p.pc.addIceCandidate(candidate).catch(()=>{});else p.candidates.push(candidate);return}
 if(m.t==='voice-room-hangup'){removePeer(m.from);room.members.delete(m.from);renderRoomMembers()}
}
function removePeer(id){const p=room.peers.get(id);if(!p)return;try{p.pc.ontrack=null;p.pc.close()}catch{}try{p.audio?.pause();p.audio.srcObject=null;p.audio.remove()}catch{}room.peers.delete(id)}
function cleanupRoom(sendLeave=true){
 if(sendLeave&&room.id)sendRoom({t:'voice-room-leave'});
 for(const id of [...room.peers.keys()])removePeer(id);
 for(const track of room.stream?.getTracks()||[])try{track.stop()}catch{}
 room={id:null,stream:null,peers:new Map(),members:new Map(),muted:false};
 $('vpVoiceRoomBackdrop')?.remove();updateRoomButton();
}
async function joinRoom(roomId,name){
 if(room.id){if(room.id===roomId){buildRoomModal();return}leaveRoom()}
 if(!navigator.mediaDevices?.getUserMedia){toast('Этот браузер не поддерживает доступ к микрофону. Открой VOLTRA по HTTPS.');return}
 if(typeof ws==='undefined'||!ws||ws.readyState!==1){toast('Нет соединения с VOLTRA. Подожди переподключения.');return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  room={id:roomId,stream,peers:new Map(),members:new Map(),muted:false};
  buildRoomModal();$('vpVoiceRoomTitle').textContent='🎙️ '+(name||'Голосовая комната');room.members.set(String(myId),{id:String(myId),name:typeof myName!=='undefined'?myName:'Ты'});renderRoomMembers();setRoomStatus('Запрашиваем список участников…');sendRoom({t:'voice-room-join'});updateRoomButton();
 }catch(e){cleanupRoom(false);toast(e.name==='NotAllowedError'?'Разреши VOLTRA доступ к микрофону в настройках браузера.':e.message||'Не удалось включить микрофон')}
}
function toggleRoomMute(){if(!room.stream)return;room.muted=!room.muted;for(const track of room.stream.getAudioTracks())track.enabled=!room.muted;renderRoomMembers()}
function leaveRoom(){if(!room.id)return;cleanupRoom(true);toast('Ты покинул(а) голосовую комнату')}
function setupSuiteUI(){
 addSuitePanels();compactSettingsLayout();addRoomButton();initDrafts();
 document.addEventListener('click',async e=>{
  const suiteToggle=e.target.closest('[data-vp-suite-toggle]');if(suiteToggle){const content=$('vpSuiteContent');if(content){const opening=content.classList.contains('hidden');content.classList.toggle('hidden',!opening);suiteToggle.textContent=opening?'Свернуть':'Показать';suiteToggle.setAttribute('aria-expanded',String(opening));if(opening){await loadSessions();await loadAchievements()}}return}
  const refreshAchievements=e.target.closest('[data-vp-refresh-achievements]');if(refreshAchievements){refreshAchievements.disabled=true;try{await loadAchievements();toast('Достижения обновлены ✓')}finally{refreshAchievements.disabled=false}return}
  const refresh=e.target.closest('[data-vp-refresh-sessions]');if(refresh){await loadSessions();return}
  const revoke=e.target.closest('[data-vp-revoke-device]');if(revoke){const id=revoke.dataset.vpRevokeDevice;if(!confirm('Завершить эту сессию? Это устройство попросит войти заново.'))return;revoke.disabled=true;try{await request('/api/security/sessions/revoke',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({deviceId:id})});toast('Сессия завершена ✓');await loadSessions()}catch(err){toast(err.message)}finally{revoke.disabled=false}return}
  const filterButton=e.target.closest('[data-vp-settings-filter]');if(filterButton){const toolbar=$('vpSettingsToolbar');if(toolbar)toolbar.dataset.filter=filterButton.dataset.vpSettingsFilter;applySettingsFilter();return}
  if(e.target.closest('[data-vp-open-miniapps]')){const b=$('openBots');if(b)b.click();else document.querySelector('[data-nav-action="bots"]')?.click();setTimeout(()=>window.pulseRefreshMiniApps?.(),180)}
 });
 $('vpSettingsSearch')?.addEventListener('input',applySettingsFilter);
 const settings=$('settingsModal');if(settings)new MutationObserver(()=>{if(!settings.classList.contains('hidden'))compactSettingsLayout()}).observe(settings,{attributes:true,attributeFilter:['class']});
 const profile=$('profileModal');if(profile)new MutationObserver(()=>{if(!profile.classList.contains('hidden'))void loadAchievements()}).observe(profile,{attributes:true,attributeFilter:['class']});
 const peer=$('peerName');if(peer)new MutationObserver(()=>{updateRoomButton();setTimeout(syncDraft,0)}).observe(peer,{childList:true,subtree:true,characterData:true});
 $('chatList')?.addEventListener('click',()=>setTimeout(()=>{updateRoomButton();syncDraft()},70),true);
 $('settingCompact')?.addEventListener('change',e=>{document.body.classList.toggle('compact-mode',e.target.checked);try{localStorage.setItem('pulseCompact',e.target.checked?'1':'0')}catch{}});
 window.addEventListener('voltraWSMessage',e=>{const m=e.detail;if(m&&typeof m.t==='string')void handleRoomSignal(m)});
 window.addEventListener('pagehide',()=>{if(room.id){try{sendRoom({t:'voice-room-leave'})}catch{}for(const p of room.peers.values())try{p.pc.close()}catch{}for(const track of room.stream?.getTracks()||[])track.stop()}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupSuiteUI,{once:true});else setupSuiteUI();
})();