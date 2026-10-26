(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const packages=[
 {amount:500,price:50,discount:0,label:'Старт'},
 {amount:5000,price:475,discount:5,label:'Для себя'},
 {amount:25000,price:2250,discount:10,label:'Выгодно'},
 {amount:100000,price:8000,discount:20,label:'Большой набор'},
 {amount:250000,price:15000,discount:40,label:'Максимум'},
 {amount:1000000,price:50000,discount:50,label:'Мега-набор'}
];
let current='vlt',selected=packages[0],catBalance=0;
const money=n=>Number(n||0).toLocaleString('ru-RU');
function ensureModals(){
 if(!$('currencyShopModal')){
  const el=document.createElement('div');el.id='currencyShopModal';el.className='modal hidden';el.innerHTML='<div class="modal-card shop-modal"><button class="modal-close" data-shop-close="currencyShopModal" aria-label="Закрыть">×</button><div class="shop-kicker">VOLTRA ECONOMY</div><h2>Валютный центр</h2><p class="muted">Покупки и обмен пока показывают расчёт. Реальные платежи и выплаты ещё не подключены.</p><div class="shop-switch"><button type="button" data-currency-tab="vlt" class="active">Купить ϟ</button><button type="button" data-currency-tab="cat">CAT → ₽</button></div><section id="vltShopView"><div class="shop-rate-line"><span>Базовый курс</span><strong>500 ϟ = 50 ₽</strong></div><div class="vlt-package-grid" id="vltPackageGrid"></div><div class="shop-checkout"><div><small>Выбрано</small><b id="vltSelectedSummary">500 ϟ · 50 ₽</b></div><button type="button" class="primary" disabled>Оплата не подключена</button></div><p class="shop-footnote">Скидка рассчитывается от базовой цены 0,10 ₽ за 1 ϟ. Максимальная демонстрационная скидка — 50%. Деньги не списываются.</p></section><section id="catShopView" class="hidden"><div class="shop-rate-line"><span>Расчётный курс CAT</span><strong>100 CAT = 10 ₽</strong></div><div class="cat-exchange-card"><div class="cat-large-mark">🐱</div><label for="catExchangeAmount">Сколько CAT хочешь обменять?</label><input id="catExchangeAmount" type="number" min="100" step="100" value="100"><div class="cat-balance-line">Твой баланс: <b id="catShopBalance">— CAT</b></div><div class="cat-rub-quote"><span>Расчётная сумма</span><strong id="catRubQuote">10 ₽</strong></div><button type="button" class="primary" disabled>Обмен пока недоступен</button><small>CAT нельзя купить за рубли. Обмен и вывод будут недоступны до подключения выплат и проверки заявок создателем. Сумма выше — только предварительный расчёт, не обещание выплаты.</small></div></section></div>';
  document.body.appendChild(el);
 }
 if(!$('vipShopModal')){
  const el=document.createElement('div');el.id='vipShopModal';el.className='modal hidden';el.innerHTML='<div class="modal-card shop-modal vip-shop-modal"><button class="modal-close" data-shop-close="vipShopModal" aria-label="Закрыть">×</button><div class="shop-kicker">VOLTRA PREMIUM</div><div class="vip-crown">👑</div><h2>VOLTRA VIP</h2><div class="vip-price-big">399 ₽ <span>навсегда</span></div><p class="muted">Расширенное оформление аккаунта и сообщений. VIP получает только тот аккаунт, для которого покупка будет подтверждена после подключения оплаты.</p><div class="vip-perks-grid"><div><span>✦</span><b>VIP-бейдж</b><small>Значок возле ника и логотипа VOLTRA</small></div><div><span>◉</span><b>Истории</b><small>Создание историй в профиле</small></div><div><span>🌈</span><b>Цветные сообщения</b><small>Цвет текста и градиентное оформление</small></div><div><span>✎</span><b>Приписка возле ника</b><small>Добавление и смена личной подписи</small></div><div><span>✧</span><b>Оформление профиля</b><small>Дополнительные визуальные эффекты</small></div><div><span>🎁</span><b>Коллекция</b><small>Более заметное оформление подарков</small></div></div><button type="button" class="primary vip-disabled-pay" disabled>Создатель ещё не подключил оплату</button><p class="shop-footnote">Кнопка временно отключена: деньги не списываются, VIP не выдаётся автоматически. Функции, которые ещё не разработаны, появятся отдельно после реализации.</p></div>';
  document.body.appendChild(el);
 }
}
function setTab(tab){
 current=tab;
 document.querySelectorAll('[data-currency-tab]').forEach(b=>b.classList.toggle('active',b.dataset.currencyTab===tab));
 $('vltShopView')?.classList.toggle('hidden',tab!=='vlt');
 $('catShopView')?.classList.toggle('hidden',tab!=='cat');
}
function renderPackages(){
 const grid=$('vltPackageGrid');if(!grid)return;
 grid.innerHTML=packages.map((p,i)=>'<button type="button" class="vlt-package '+(p===selected?'selected':'')+'" data-package="'+i+'"><span class="package-label">'+p.label+'</span><b>'+money(p.amount)+' ϟ</b><strong>'+money(p.price)+' ₽</strong><small>'+(p.discount?'−'+p.discount+'% скидка':'Без скидки')+'</small>'+(p.discount===50?'<em>ЛУЧШАЯ ЦЕНА</em>':'')+'</button>').join('');
 grid.querySelectorAll('[data-package]').forEach(b=>b.onclick=()=>{selected=packages[Number(b.dataset.package)]||packages[0];renderPackages();$('vltSelectedSummary').textContent=money(selected.amount)+' ϟ · '+money(selected.price)+' ₽';});
 $('vltSelectedSummary').textContent=money(selected.amount)+' ϟ · '+money(selected.price)+' ₽';
}
async function openCurrency(tab='vlt'){
 ensureModals();$('currencyShopModal').classList.remove('hidden');setTab(tab);selected=selected||packages[0];renderPackages();
 try{const r=await fetch('/api/gifts',{credentials:'same-origin'});if(r.ok){const d=await r.json();catBalance=Math.max(0,Number(d.catCoins)||0);$('catShopBalance').textContent=money(catBalance)+' CAT';window.voltraCatBalance=catBalance;}}
 catch{$('catShopBalance').textContent=money(window.voltraCatBalance||0)+' CAT';}
 updateCatQuote();
}
function updateCatQuote(){
 const input=$('catExchangeAmount');if(!input)return;
 let amount=Math.floor(Number(input.value)||0);if(amount<0)amount=0;if(Number.isFinite(catBalance)&&catBalance>0&&amount>catBalance){amount=Math.floor(catBalance);input.value=String(amount)}
 $('catRubQuote').textContent=(amount/10).toLocaleString('ru-RU',{maximumFractionDigits:2})+' ₽';
}
function openVip(){ensureModals();$('vipShopModal').classList.remove('hidden')}
document.addEventListener('click',e=>{
 const t=e.target instanceof Element?e.target:null;if(!t)return;
 const closer=t.closest('[data-shop-close]');if(closer){$(closer.dataset.shopClose)?.classList.add('hidden');return}
 const tab=t.closest('[data-currency-tab]');if(tab){setTab(tab.dataset.currencyTab);updateCatQuote();return}
 if(t.closest('#currencyShopOpen')){e.preventDefault();void openCurrency('vlt');return}
 if(t.closest('#catExchangeOpen')){e.preventDefault();void openCurrency('cat');return}
 if(t.closest('#vipShopOpen')||t.closest('[data-open-vip-shop]')){e.preventDefault();openVip();return}
 if(t.closest('#openCurrencyShopFromVip')){e.preventDefault();void openCurrency('vlt');return}
 if(t.classList.contains('modal')&&['currencyShopModal','vipShopModal'].includes(t.id)){t.classList.add('hidden');return}
});
document.addEventListener('input',e=>{if(e.target?.id==='catExchangeAmount')updateCatQuote()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){['currencyShopModal','vipShopModal'].forEach(id=>$(id)?.classList.add('hidden'))}});
window.addEventListener('pulseCatCoinsUpdated',e=>{catBalance=Math.max(0,Number(e.detail?.catCoins)||0);if($('catShopBalance'))$('catShopBalance').textContent=money(catBalance)+' CAT';updateCatQuote()});
const premiumStatus=$('premiumStatus');if(premiumStatus&&typeof MutationObserver!=='undefined'){const fixPremiumStatus=()=>{const el=$('premiumStatus');if(!el)return;const text=el.textContent||'';if(text.includes('уже активирован'))return;const desired='Создатель ещё не подключил оплату. VIP за 399 ₽ пока нельзя купить.';if(text!==desired)el.textContent=desired};new MutationObserver(fixPremiumStatus).observe(premiumStatus,{childList:true,characterData:true,subtree:true});fixPremiumStatus();}
window.voltraOpenCurrencyShop=openCurrency;window.voltraOpenVipShop=openVip;
document.addEventListener('DOMContentLoaded',()=>{ensureModals();renderPackages()});
})();