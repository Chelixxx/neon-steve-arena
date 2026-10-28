(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Math.round(Number(n)||0).toLocaleString('ru-RU');
let state=null,targetNode=null,sourceId='',targetId='',query='',busy=false,result=null;
async function api(path,body){
 const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 let d={};try{d=await r.json()}catch{}
 if(!r.ok)throw new Error(d.error||'Запрос не выполнен');
 return d;
}
function ownedSource(){return (state?.inventory||[]).find(x=>x.id===sourceId)||null}
function targetGift(){return (state?.targets||[]).find(x=>x.id===targetId)||null}
function chanceFor(source,target){
 if(!source||!target)return 0;
 if(String(target.id||'')==='voltra-galaxy-heart-500'||Number(target.price)>=99999999)return 1;
 return Math.max(1,Math.min(35,Math.floor(35*Math.max(15,Number(source.price)||15)/Math.max(15,Number(target.price)||15))));
}
function art(g,large=false){
 if(!g)return '<div class="gift-upgrader-art-placeholder">🎁</div>';
 try{if(typeof window.pulseGiftSvg==='function'){const svg=window.pulseGiftSvg(g);if(typeof svg==='string'&&svg.length<12000)return '<div class="gift-upgrader-art-svg '+(large?'is-large':'')+'">'+svg+'</div>'}}catch{}
 if(g.image&&/^https:\/\//i.test(g.image))return '<img class="gift-upgrader-art-image" src="'+esc(g.image)+'" alt="" loading="lazy">';
 return '<div class="gift-upgrader-art-emoji '+(large?'is-large':'')+'">'+esc(g.emoji||'🎁')+'</div>';
}
function rarityClass(g){const t=String(g?.rarity||'').toLowerCase();if(t.includes('миф')||t.includes('myth'))return'mythic';if(t.includes('леген')||t.includes('legend'))return'legendary';if(t.includes('эпич')||t.includes('epic'))return'epic';if(t.includes('редк')||t.includes('rare'))return'rare';if(t.includes('необыч')||t.includes('uncommon'))return'uncommon';return'common'}
function rarityName(g){return String(g?.rarity||'Обычный')}
function selectedCard(g,label){
 return '<article class="gift-upgrader-selected-card '+(g?'rarity-'+rarityClass(g):'is-empty')+'"><div class="gift-upgrader-selected-art">'+art(g,true)+'</div><div class="gift-upgrader-selected-label">'+label+'</div><b class="gift-upgrader-selected-name">'+esc(g?.name||'Выбери подарок')+'</b><span class="gift-upgrader-selected-rarity">'+esc(g?rarityName(g):'Ничего не выбрано')+'</span>'+(g?'<div class="gift-upgrader-selected-price">'+money(g.price)+' ϟ</div>':'')+'</article>';
}
function renderResult(){
 if(!result)return'';
 const g=result.prize||result.target;
 return '<section class="gift-upgrader-result '+(result.won?'is-win':'is-loss')+'"><div class="gift-upgrader-result-glow"></div><div class="gift-upgrader-result-icon">'+(result.won?'🎉':'↩️')+'</div><b>'+(result.won?'АПГРЕЙД УСПЕШЕН':'НЕ УДАЛОСЬ')+'</b><div class="gift-upgrader-result-art">'+art(g,true)+'</div><h3>'+esc(result.won?(result.prize?.name||result.target?.name):'Исходный подарок возвращён в магазин')+'</h3><p>'+esc(result.message||'')+'</p><span>Фактический шанс: '+Number(result.chance||0)+'%</span><button type="button" class="secondary" data-upgrader-dismiss>Понятно</button></section>';
}
function render(target){
 target=target||targetNode||$('messages');if(!target)return;targetNode=target;
 const source=ownedSource(),prize=targetGift(),chance=chanceFor(source,prize),inventory=state?.inventory||[],allTargets=state?.targets||[];
 const visibleTargets=allTargets.filter(g=>!query||(String(g.name||'')+' '+String(g.rarity||'')+' '+String(g.collection||'')).toLowerCase().includes(query.toLowerCase())).slice(0,48);
 const focus=document.activeElement?.dataset?.upgraderSearch!==undefined,caret=focus?document.activeElement.selectionStart:null;
 target.innerHTML='<main class="gift-upgrader-shell">'+
  '<header class="gift-upgrader-hero"><div class="gift-upgrader-mark">⌃<span>✦</span></div><div class="gift-upgrader-hero-text"><small>VOLTRA · GIFT UPGRADE</small><h2>GIFT UPGRADER</h2><p>Выбери свой настоящий подарок и приз из каталога VOLTRA. При проигрыше подарок возвращается в магазин по базовой цене.</p></div><button type="button" class="gift-upgrader-refresh" data-upgrader-refresh title="Обновить">↻</button></header>'+
  '<div class="gift-upgrader-safety"><span>ⓘ</span><p>Шанс рассчитывается на сервере и отображается честно. Вольтриксы за попытку не списываются — ставкой служит выбранный подарок.</p></div>'+
  (result?renderResult():'')+
  '<section class="gift-upgrader-stage"><div class="gift-upgrader-picks">'+selectedCard(source,'ТВОЙ ПОДАРОК')+'<div class="gift-upgrader-vs">➜</div>'+selectedCard(prize,'ЖЕЛАЕМЫЙ ПРИЗ')+'</div>'+
  '<div class="gift-upgrader-gauge-wrap"><div class="gift-upgrader-gauge" style="--upgrade-chance:'+chance+'"><div class="gift-upgrader-gauge-inner"><small>ШАНС УСПЕХА</small><strong>'+chance.toFixed(0)+'<span>%</span></strong><b>'+(!source||!prize?'ВЫБЕРИ ПРЕДМЕТЫ':chance<=1?'ОЧЕНЬ НИЗКИЙ ШАНС':chance<10?'НИЗКИЙ ШАНС':chance<25?'СРЕДНИЙ ШАНС':'ВЫСОКИЙ ШАНС')+'</b></div><div class="gift-upgrader-gauge-pointer"></div></div><div class="gift-upgrader-gauge-labels"><span>0%</span><span>100%</span></div></div>'+
  '<button type="button" class="primary gift-upgrader-attempt" data-upgrader-attempt '+(!source||!prize||busy?'disabled':'')+'>'+(busy?'✦ Проверяем результат…':'⌃ АПГРЕЙД ПОДАРКА')+'</button>'+
  '<small class="gift-upgrader-target-note">'+(prize&&(String(prize.id||'')==='voltra-galaxy-heart-500'||Number(prize.price)>=99999999)?'💜 Сердце Галактики — самый дорогой приз. Честный шанс: 1%.':prize?'Фактический шанс рассчитывается по ценам подарков и ограничен 35%.':'Сначала выбери цель апгрейда.')+'</small></section>'+
  '<section class="gift-upgrader-section"><div class="gift-upgrader-section-heading"><div><h3>🎒 Мои подарки</h3><p>Выбери подарок, который используешь для попытки.</p></div><span>'+inventory.length+'</span></div>'+
  (inventory.length?'<div class="gift-upgrader-items">'+inventory.map(g=>'<button type="button" class="gift-upgrader-item '+(g.id===sourceId?'is-selected ':'')+'rarity-'+rarityClass(g)+'" data-upgrader-source="'+esc(g.id)+'"><span class="gift-upgrader-item-art">'+art(g)+'</span><span class="gift-upgrader-item-details"><b>'+esc(g.name)+'</b><small>'+esc(rarityName(g))+'</small><strong>'+money(g.price)+' ϟ</strong></span>'+(g.id===sourceId?'<span class="gift-upgrader-check">✓</span>':'')+'</button>').join('')+'</div>':'<div class="gift-upgrader-empty"><span>🎁</span><b>Пока нет подарков</b><p>Купи или получи подарок VOLTRA, и он появится здесь.</p><button type="button" class="primary" data-upgrader-open-gifts>Открыть магазин подарков</button></div>')+
  '</section>'+
  '<section class="gift-upgrader-section"><div class="gift-upgrader-section-heading"><div><h3>✨ Какой подарок хочешь?</h3><p>Цель выбирается из настоящего каталога VOLTRA.</p></div><span>'+allTargets.length+'</span></div><input class="gift-upgrader-search" data-upgrader-search type="search" maxlength="100" placeholder="Найти подарок, например: Сердце Галактики" value="'+esc(query)+'"><div class="gift-upgrader-target-note">Показано '+visibleTargets.length+' из '+allTargets.length+'. Используй поиск, чтобы найти редкий или коллекционный подарок.</div>'+
  (visibleTargets.length?'<div class="gift-upgrader-items gift-upgrader-targets">'+visibleTargets.map(g=>'<button type="button" class="gift-upgrader-item '+(g.id===targetId?'is-selected ':'')+'rarity-'+rarityClass(g)+'" data-upgrader-target="'+esc(g.id)+'"><span class="gift-upgrader-item-art">'+art(g)+'</span><span class="gift-upgrader-item-details"><b>'+esc(g.name)+'</b><small>'+esc(rarityName(g))+(g.collection?' · '+esc(g.collection):'')+'</small><strong>'+money(g.price)+' ϟ</strong></span>'+(g.collectible?'<span class="gift-upgrader-stock">В наличии</span>':'')+(g.id===targetId?'<span class="gift-upgrader-check">✓</span>':'')+'</button>').join('')+'</div>':'<div class="gift-upgrader-empty">По этому запросу подарки не найдены.</div>')+
  '</section><footer class="gift-upgrader-footer"><span>🎁 Приз — настоящий подарок VOLTRA</span><span>⚖️ Шанс виден до запуска</span></footer></main>';
 if(focus){const input=target.querySelector('[data-upgrader-search]');if(input){input.focus();try{input.setSelectionRange(caret,caret)}catch{}}}
}
async function refresh(target){
 target=target||targetNode||$('messages');if(!target)return;targetNode=target;
 target.innerHTML='<div class="gift-upgrader-shell"><div class="gift-upgrader-loading">🎁 Загружаем подарки и инвентарь…</div></div>';
 try{
  state=await api('/api/gifts/upgrader');
  if(!sourceId||(state.inventory||[]).every(x=>x.id!==sourceId))sourceId=state.inventory?.[0]?.id||'';
  if(!targetId||(state.targets||[]).every(x=>x.id!==targetId)){
   const src=ownedSource();targetId=(state.targets||[]).find(x=>x.price>Number(src?.price||0))?.id||state.targets?.[0]?.id||'';
  }
  render(target);
 }catch(error){target.innerHTML='<div class="gift-upgrader-shell"><div class="gift-upgrader-loading"><b>Не удалось открыть апгрейдер</b><p>'+esc(error.message||'Ошибка загрузки')+'</p><button type="button" class="secondary" data-upgrader-refresh>Повторить</button></div></div>'}
}
window.pulseRenderGiftUpgraderChat=target=>{targetNode=target||$('messages');void refresh(targetNode)};
document.addEventListener('input',e=>{
 if(!e.target.matches('[data-upgrader-search]'))return;
 query=String(e.target.value||'').slice(0,100);
 render(targetNode);
});
document.addEventListener('click',async e=>{
 const refreshButton=e.target.closest('[data-upgrader-refresh]');
 if(refreshButton){e.preventDefault();result=null;await refresh(targetNode);return}
 const source=e.target.closest('[data-upgrader-source]');
 if(source){e.preventDefault();sourceId=source.dataset.upgraderSource;result=null;render(targetNode);return}
 const target=e.target.closest('[data-upgrader-target]');
 if(target){e.preventDefault();targetId=target.dataset.upgraderTarget;result=null;render(targetNode);return}
 const dismiss=e.target.closest('[data-upgrader-dismiss]');
 if(dismiss){result=null;render(targetNode);return}
 if(e.target.closest('[data-upgrader-open-gifts]')){document.getElementById('openGifts')?.click();return}
 const attempt=e.target.closest('[data-upgrader-attempt]');
 if(attempt){
  e.preventDefault();if(busy)return;
  const sourceGift=ownedSource(),targetItem=targetGift();
  if(!sourceGift||!targetItem)return;
  if(!window.confirm('Попробовать улучшить «'+sourceGift.name+'» до «'+targetItem.name+'»? Исходный подарок будет снят с инвентаря при любом результате. При проигрыше он возвращается в каталог по базовой цене. Настоящий шанс успеха — '+chanceFor(sourceGift,targetItem)+'%.' ))return;
  busy=true;result=null;render(targetNode);
  const shell=targetNode?.querySelector('.gift-upgrader-shell');shell?.classList.add('is-upgrading');
  try{
   const request=api('/api/gifts/upgrader/attempt',{sourceId:sourceGift.id,targetId:targetItem.id});
   await new Promise(resolve=>setTimeout(resolve,1400));
   const data=await request;state=data.state;result={won:!!data.won,chance:data.chance,source:data.source,target:data.target,prize:data.prize,message:data.message};
   sourceId=state.inventory?.[0]?.id||'';
   if(data.won&&data.prize?.id)sourceId=state.inventory?.find(x=>x.id===data.prize.id)?.id||sourceId;
   if((state.targets||[]).some(x=>x.id===targetId)){}else targetId=state.targets?.find(x=>x.price>Number(sourceGift.price||0))?.id||state.targets?.[0]?.id||'';
   window.dispatchEvent(new CustomEvent('pulseGiftInventoryUpdated'));
   if(data.won)window.dispatchEvent(new CustomEvent('pulseGiftUpgraderResult',{detail:{won:true,gift:data.prize}}));
  }catch(error){result={won:false,chance:chanceFor(sourceGift,targetItem),source:sourceGift,target:targetItem,message:error.message||'Не удалось выполнить попытку.'};}
  finally{busy=false;render(targetNode)}
 }
});
})();