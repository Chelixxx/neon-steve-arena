(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let state=null,lastReveal=null,busy=false,lastTarget=null,adminNote='';
const rarityOrder=['common','uncommon','rare','epic','legendary','mythic'];
function odds(value){return (Number(value||0)/100).toLocaleString('ru-RU',{maximumFractionDigits:2})+'%'}
function duration(ms){const sec=Math.max(0,Math.ceil(Number(ms||0)/1000));if(!sec)return'Готово';const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;if(h)return h+' ч '+(m?m+' мин':'');if(m)return m+' мин';return s+' сек'}
function rarityKey(r){return 'drop-rarity-'+String(r||'common')}
async function api(path,body){
 const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 let data={};try{data=await response.json()}catch{}
 if(!response.ok)throw new Error(data.error||'Запрос не выполнен');
 return data;
}
function renderOdds(c){
 const labels=state?.rarityLabels||{};
 return '<details class="drop-odds"><summary>Шансы дропа</summary><div class="drop-odds-grid">'+rarityOrder.map(r=>'<span class="'+rarityKey(r)+'">'+esc((state?.rarityEmojis||{})[r]||'✦')+' '+esc(labels[r]||r)+'</span><b>'+odds(c.odds?.[r])+'</b>').join('')+'</div><small>Вероятности суммируются до 100%. Бросок рассчитывает сервер.</small></details>';
}
function renderAdminSettings(){
 if(!state?.canConfigure)return'';
 const cases=state.cases||[],labels=state.rarityLabels||{},upgrade=state.upgradeOdds||{};
 return '<details class="drop-admin-settings"><summary>⚙️ Настроить шансы · администратор</summary><p>Эти вероятности относятся только к бесплатным косметическим предметам. Сумма шансов каждого кейса должна быть ровно 100%.</p><div class="drop-admin-case-grid">'+cases.map(c=>'<section class="drop-admin-case"><h4>'+esc(c.emoji||'📦')+' '+esc(c.name)+' кейс</h4><div class="drop-admin-input-grid">'+rarityOrder.map(r=>'<label><span>'+esc(labels[r]||r)+' (%)</span><input type="number" min="0" max="100" step="0.01" data-drop-setting-case="'+esc(c.id)+'" data-drop-setting-rarity="'+r+'" value="'+(Number(c.odds?.[r]||0)/100).toFixed(2)+'"></label>').join('')+'</div></section>').join('')+'</div><h4>Шансы апгрейда</h4><div class="drop-admin-input-grid drop-upgrade-admin-grid">'+rarityOrder.filter(r=>(state.nextRarity||{})[r]).map(r=>'<label><span>'+esc(labels[r]||r)+' → '+esc(labels[state.nextRarity[r]]||state.nextRarity[r])+' (%)</span><input type="number" min="0" max="100" step="1" data-drop-upgrade-chance="'+r+'" value="'+Number(upgrade[r]||0)+'"></label>').join('')+'</div><button type="button" class="primary drop-save-settings" data-drop-save-settings '+(busy?'disabled':'')+'>Сохранить шансы</button><small id="dropAdminStatus" class="drop-admin-status">'+esc(adminNote)+'</small></details>';
}
function renderReveal(){
 if(!lastReveal)return'';
 if(lastReveal.kind==='case'){
  const item=lastReveal.item||{};
  return '<section class="drop-reveal '+rarityKey(item.rarity)+'"><div class="drop-reveal-rays"></div><small>КЕЙС ОТКРЫТ · '+esc(lastReveal.caseName||'Drop')+'</small><div class="drop-reveal-item"><span>'+esc(item.emoji||'✦')+'</span></div><b>'+esc(item.name||'Косметический предмет')+'</b><span class="drop-rarity-pill '+rarityKey(item.rarity)+'">'+esc((state?.rarityLabels||{})[item.rarity]||item.rarity)+'</span><p>Новый декоративный предмет добавлен в коллекцию.</p></section>';
 }
 const result=lastReveal;
 return '<section class="drop-reveal '+(result.success?rarityKey(result.item?.rarity):'drop-reveal-muted')+'"><div class="drop-reveal-rays"></div><small>АПГРЕЙД · '+Number(result.chance||0)+'%</small><div class="drop-reveal-item"><span>'+esc(result.item?.emoji||'✦')+'</span></div><b>'+(result.success?'✨ '+esc(result.item?.name||'Апгрейд успешен'):'Попытка не удалась')+'</b><p>'+esc(result.message||'Предмет остался в коллекции.')+'</p></section>';
}
function render(target){
 target=target||lastTarget||$('messages');if(!target)return;lastTarget=target;
 if(!state){target.innerHTML='<div class="drop-bot-shell"><div class="drop-bot-loading">🎁 Загружаем бесплатные кейсы…</div></div>';return}
 const cases=state.cases||[],items=state.inventory||[],labels=state.rarityLabels||{},emojis=state.rarityEmojis||{},next=state.nextRarity||{},upgradeOdds=state.upgradeOdds||{};
 target.innerHTML='<div class="drop-bot-shell">'+
  '<header class="drop-bot-hero"><div class="drop-bot-avatar">D<span>✦</span></div><div class="drop-bot-hero-text"><div class="drop-bot-kicker">VOLTRA · COSMETIC DROP</div><h2>@drop</h2><p>Открывай бесплатные кейсы, собирай декоративные дропы и пробуй улучшать их редкость.</p></div><button type="button" class="drop-refresh" data-drop-refresh title="Обновить">↻</button></header>'+
  '<div class="drop-safe-notice"><span>🛡️</span><p><b>Бесплатная игра</b><br>Кейсы не тратят Вольтриксы или CAT. Предметы косметические: их нельзя продать, передать, обменять на подарки или вывести. При неудачном апгрейде предмет сохраняется.</p></div>'+
  renderReveal()+
  '<section class="drop-section"><div class="drop-section-heading"><div><h3>🎁 Кейсы</h3><p>У каждого кейса свой набор шансов и время восстановления.</p></div><span class="drop-free-pill">БЕСПЛАТНО</span></div><div class="drop-case-grid">'+cases.map(c=>{
    const remaining=Number(c.remainingMs)||0,disabled=busy||remaining>0||items.length>=100;
    return '<article class="drop-case-card '+(disabled?'is-cooling':'')+'" data-drop-case-card="'+esc(c.id)+'"><div class="drop-case-art"><div class="drop-case-glow"></div><span class="drop-case-emoji">'+esc(c.emoji||'📦')+'</span><span class="drop-case-spark">✦</span></div><h4>'+esc(c.name)+' кейс</h4><p>'+esc(c.description||'Бесплатный косметический кейс.')+'</p><div class="drop-case-meta"><span>♾️ Без оплаты</span><span>'+ (remaining>0?'⏳ '+duration(remaining):items.length>=100?'Инвентарь полон':'✓ Доступен')+'</span></div>'+renderOdds(c)+'<button type="button" class="primary drop-open-button" data-drop-open="'+esc(c.id)+'" '+(disabled?'disabled':'')+'>'+(remaining>0?'Доступен через '+duration(remaining):items.length>=100?'Освободи место':'Открыть бесплатно')+'</button></article>';
   }).join('')+'</div></section>'+
  '<section class="drop-section"><div class="drop-section-heading"><div><h3>⬆️ Апгрейды</h3><p>Шанс улучшения показан до попытки. Неудача не удаляет предмет.</p></div><span class="drop-stat-pill">'+Number(state.upgradesWon||0)+' успешно</span></div><div class="drop-upgrade-info">'+rarityOrder.filter(r=>next[r]).map(r=>'<div class="drop-upgrade-step"><span class="'+rarityKey(r)+'">'+esc(emojis[r]||'✦')+' '+esc(labels[r]||r)+'</span><i>→</i><span class="'+rarityKey(next[r])+'">'+esc(emojis[next[r]]||'✦')+' '+esc(labels[next[r]]||next[r])+'</span><b>'+Number(upgradeOdds[r]||0)+'%</b></div>').join('')+'</div></section>'+
  '<section class="drop-section"><div class="drop-section-heading"><div><h3>🧩 Моя косметическая коллекция</h3><p>Предметы принадлежат только коллекции @drop и не связаны с инвентарём подарков.</p></div><span class="drop-stat-pill">'+items.length+' / 100</span></div>'+
  (items.length?'<div class="drop-inventory-grid">'+items.slice().reverse().map(item=>{
    const nextRarity=next[item.rarity],chance=upgradeOdds[item.rarity]||0;
    return '<article class="drop-item-card '+rarityKey(item.rarity)+'"><div class="drop-item-icon">'+esc(item.emoji||'✦')+'</div><div class="drop-item-copy"><span class="drop-rarity-pill '+rarityKey(item.rarity)+'">'+esc(labels[item.rarity]||item.rarity)+'</span><b>'+esc(item.name)+'</b><small>Косметический дроп · не продаётся</small></div><div class="drop-item-actions">'+(nextRarity?'<button type="button" class="secondary drop-upgrade-button" data-drop-upgrade="'+esc(item.instanceId)+'" '+(busy?'disabled':'')+'>Улучшить · '+chance+'%</button>':'<span class="drop-max-rarity">✦ MAX</span>')+'<button type="button" class="drop-discard-button" data-drop-discard="'+esc(item.instanceId)+'" '+(busy?'disabled':'')+'>Убрать</button>'+'</div></article>';
  }).join('')+'</div>':'<div class="drop-empty"><span>🪄</span><b>Коллекция пока пустая</b><p>Открой бесплатный кейс — первый косметический дроп ждёт тебя.</p></div>')+
  '</section>'+renderAdminSettings()+'<footer class="drop-bot-footer"><span>Открыто кейсов: <b>'+Number(state.totalOpened||0)+'</b></span><span>Попыток апгрейда: <b>'+Number(state.upgradesAttempted||0)+'</b></span><span>Без ставок и обмена на валюту</span></footer></div>';
}
async function refresh(target){
 target=target||lastTarget||$('messages');if(!target)return;lastTarget=target;
 try{state=await api('/api/drop/status');render(target)}
 catch(error){target.innerHTML='<div class="drop-bot-shell"><div class="drop-bot-error"><b>Не удалось загрузить @drop</b><p>'+esc(error.message||'Ошибка соединения')+'</p><button type="button" class="secondary" data-drop-refresh>Повторить</button></div></div>'}
}
window.pulseRenderDropBotChat=target=>{lastTarget=target||$('messages');void refresh(lastTarget)};
document.addEventListener('click',async event=>{
 const refreshButton=event.target.closest('[data-drop-refresh]');
 if(refreshButton){event.preventDefault();await refresh(lastTarget);return}
 const openButton=event.target.closest('[data-drop-open]');
 if(openButton){
  event.preventDefault();if(busy)return;
  const caseId=openButton.dataset.dropOpen,caseCard=openButton.closest('[data-drop-case-card]');
  busy=true;openButton.disabled=true;caseCard?.classList.add('is-opening');
  try{
   const request=api('/api/drop/open',{caseId});
   await wait(1250);
   const data=await request;state=data.state;lastReveal={kind:'case',item:data.item,caseName:data.case?.name||'Drop'};
   render(lastTarget);
  }catch(error){if(lastTarget){const message=document.createElement('div');message.className='drop-inline-error';message.textContent=error.message||'Не удалось открыть кейс';lastTarget.querySelector('.drop-bot-shell')?.prepend(message)}await refresh(lastTarget)}
  finally{busy=false;if(lastTarget)render(lastTarget)}
  return;
 }
 const discardButton=event.target.closest('[data-drop-discard]');
 if(discardButton){
  event.preventDefault();if(busy)return;
  if(!window.confirm('Убрать этот косметический предмет из коллекции @drop? Баланс и подарки не изменятся.'))return;
  busy=true;discardButton.disabled=true;
  try{const data=await api('/api/drop/discard',{instanceId:discardButton.dataset.dropDiscard});state=data.state;lastReveal=null;render(lastTarget)}
  catch(error){await refresh(lastTarget);if(lastTarget){const note=document.createElement('div');note.className='drop-inline-error';note.textContent=error.message||'Не удалось убрать предмет';lastTarget.querySelector('.drop-bot-shell')?.prepend(note)}}
  finally{busy=false;if(lastTarget)render(lastTarget)}
  return;
 }
 const settingsButton=event.target.closest('[data-drop-save-settings]');
 if(settingsButton){
  event.preventDefault();if(busy)return;
  busy=true;settingsButton.disabled=true;adminNote='';
  try{
   const cases={};
   document.querySelectorAll('[data-drop-setting-case]').forEach(input=>{const id=input.dataset.dropSettingCase,rarity=input.dataset.dropSettingRarity;if(!cases[id])cases[id]={};cases[id][rarity]=Number(input.value)});
   const upgradeOdds={mythic:Number(state?.upgradeOdds?.mythic)||0};
   document.querySelectorAll('[data-drop-upgrade-chance]').forEach(input=>{upgradeOdds[input.dataset.dropUpgradeChance]=Number(input.value)});
   const data=await api('/api/drop/settings',{cases,upgradeOdds});
   state=data.state;lastReveal=null;adminNote='✅ Шансы сохранены';
  }catch(error){adminNote=error.message||'Не удалось сохранить шансы'}
  finally{busy=false;render(lastTarget)}
  return;
 }
 const upgradeButton=event.target.closest('[data-drop-upgrade]');
 if(upgradeButton){
  event.preventDefault();if(busy)return;
  const instanceId=upgradeButton.dataset.dropUpgrade;
  busy=true;upgradeButton.disabled=true;upgradeButton.classList.add('is-upgrading');
  try{
   const request=api('/api/drop/upgrade',{instanceId});
   await wait(700);
   const data=await request;state=data.state;lastReveal={kind:'upgrade',success:!!data.success,chance:data.chance,item:data.item,message:data.message};
   render(lastTarget);
  }catch(error){if(lastTarget){const message=document.createElement('div');message.className='drop-inline-error';message.textContent=error.message||'Не удалось улучшить предмет';lastTarget.querySelector('.drop-bot-shell')?.prepend(message)}await refresh(lastTarget)}
  finally{busy=false;if(lastTarget)render(lastTarget)}
 }
});
})();