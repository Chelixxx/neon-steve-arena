(()=>{'use strict';
const $=id=>document.getElementById(id);
const coreOpenGiftSend=window.pulseOpenGiftSend;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog=[],owned=[],pendingGift=null,pendingVariant=null,pendingMode='buy',pendingRecipientId=null;
const skins=['classic','chrome','holographic','crystal','neon','ember','ice','shadow','royal','candy'];
const backgrounds=['midnight','aurora','gold','rose','ice','custom','ember','forest','cosmic','violet'];
const patterns=['none','stars','waves','grid','diamonds','runes','bats','spiderweb','leaves','sparkles'];
const materials=['Глянцевая эмаль','Галактический блеск','Гравировка','Мрамор и лава','Полированный металл','Ткань и дерево','Неоновый контур','Шахматка и анимал','Флора и цветы','Кристаллы и снег','Золотая фольга','Перламутр'];
const variantsFor=g=>{const bolt=String(g&&(g.id==='gift-013'||g.baseGiftId==='gift-013')?'gift-013':'')==='gift-013',total=bolt?120:12;return Array.from({length:total},(_,i)=>({variant:i+1,skin:skins[i%10],background:backgrounds[(i*7+Math.floor(i/10))%10],pattern:patterns[(i*3+Math.floor(i/10))%10],material:materials[bolt?Math.floor(i/10)%materials.length:i%materials.length],shape:bolt?Math.floor(i/30)%4+1:1}))};const variants=()=>variantsFor({});
const bgMap={midnight:'#17142d',aurora:'#183b58',gold:'#70421c',rose:'#642b51',ice:'#1b426b',custom:'#4b225f',ember:'#54202b',forest:'#173e2c',cosmic:'#211a53',violet:'#39215d'};
const pal={classic:['#ffad32','#f47a16','#6c354b'],chrome:['#d9e3f1','#7d8ca7','#29334d'],holographic:['#7df9df','#8a61ff','#421e66'],crystal:['#b7f6ff','#59b8d8','#17465d'],neon:['#c7ff35','#58cf48','#173c2d'],ember:['#ff613d','#c52b20','#451d37'],ice:['#a6e8ff','#4a9bd1','#183f76'],shadow:['#705b82','#3e3156','#1b1428'],royal:['#ffd45a','#9a5ee8','#381f56'],candy:['#ffb6d7','#ff6b8b','#542348']};
function lightningSvg(g){
 const index=Math.max(1,Number(g.variant)||1),skin=g.skin||'classic',colors={classic:['#fff331','#ffca00','#ff8a00'],chrome:['#fff','#b6c5d9','#45516b'],holographic:['#ff91e7','#66e6ff','#6837db'],crystal:['#e3ffff','#70dfff','#2579b9'],neon:['#efff63','#9bef20','#39a92d'],ember:['#fff0a0','#ff8b22','#d92c1d'],ice:['#e5ffff','#8ce6ff','#3a83d2'],shadow:['#c5a7ff','#7561a7','#29213e'],royal:['#fff0ab','#edb82d','#7934b7'],candy:['#ffb6df','#ff6caa','#8d38b7']},p=colors[skin]||colors.classic,bg=bgMap[g.background]||'#17142d',mat=String(g.material||'Глянцевая эмаль'),pat=String(g.pattern||'none'),shape=Number(g.shape)||Math.floor((index-1)/30)%4+1,uid='bolt'+Math.random().toString(36).slice(2,9);
 const paths=['M187 20L88 176Q84 184 96 180L145 166Q154 163 151 173L115 280L214 130Q218 123 207 125L163 134Q155 136 160 126Z','M205 24L111 151L163 151L100 276L245 121L184 124Z','M174 20L74 152L129 160L96 276L229 130L173 139L218 72L169 103Z','M193 22L106 128L151 143L89 202L137 206L105 280L234 130L183 136L218 83L170 111Z'],path=paths[Math.max(0,Math.min(3,shape-1))];
 let texture='';
 if(mat==='Галактический блеск'){let stars='';for(let i=0;i<22;i++)stars+='<circle cx="'+(85+(i*31+index*7)%130)+'" cy="'+(48+(i*43+index*3)%190)+'" r="'+(1+i%3)+'" fill="'+(i%4===0?'#ffe9a3':'#fff')+'" opacity=".8"/>';texture='<path d="M78 160Q122 118 150 160T213 139" fill="none" stroke="#ff7ce8" stroke-width="16" opacity=".36"/><path d="M82 178Q121 144 153 180T211 157" fill="none" stroke="#71efff" stroke-width="8" opacity=".45"/>'+stars}
 else if(mat==='Гравировка')texture='<g fill="none" stroke="'+p[0]+'" stroke-width="3.5"><path d="M131 63l15 20-15 20m-6-10h24M164 169l15 20-15 20m-6-10h24M118 219l12 12-12 12"/></g>'
 else if(mat==='Мрамор и лава')texture='<path d="M171 45L137 105 153 132 120 165 141 184 124 239M180 88L195 105 175 138 193 154 166 186 181 204" fill="none" stroke="'+(index%2?'#fff1ba':'#ff7953')+'" stroke-width="4"/>'
 else if(mat==='Полированный металл')texture='<path d="M184 29L102 162M196 44L112 177M204 54L125 186" stroke="#fff" stroke-width="12" opacity=".28"/><path d="M168 48L120 138M184 171L144 236" stroke="'+p[0]+'" stroke-width="3" opacity=".65"/>'
 else if(mat==='Ткань и дерево')texture='<path d="M158 55L110 161M171 69L122 176M186 82L136 190M169 167L137 220M187 178L151 241" stroke="#fff0d0" stroke-width="4" opacity=".3"/>'
 else if(mat==='Неоновый контур')texture='<path d="M188 32L102 173L146 160L127 229" fill="none" stroke="'+p[0]+'" stroke-width="5" opacity=".9"/><circle cx="146" cy="160" r="5" fill="#fff"/>'
 else if(mat==='Шахматка и анимал')texture='<g fill="#18141d" opacity=".6"><path d="M140 89l17 7-10 14-17-7zM166 121l18 8-10 14-18-8zM132 180l17 7-10 14-17-7zM163 213l17 7-10 14-17-7z"/></g>'
 else if(mat==='Флора и цветы')texture='<g fill="#fff1fa"><circle cx="143" cy="90" r="6"/><circle cx="153" cy="90" r="6"/><circle cx="148" cy="81" r="6"/><circle cx="148" cy="99" r="6"/><circle cx="148" cy="90" r="3" fill="#ffd46a"/><circle cx="158" cy="190" r="5"/><circle cx="168" cy="190" r="5"/><circle cx="163" cy="181" r="5"/><circle cx="163" cy="199" r="5"/><circle cx="163" cy="190" r="3" fill="#ffd46a"/></g>'
 else if(mat==='Кристаллы и снег')texture='<path d="M139 87l18 18m-18 0l18-18m-9-9v36M164 186l16 16m-16 0l16-16m-8-8v32" stroke="#fff" stroke-width="4"/>'
 else if(mat==='Золотая фольга')texture='<path d="M180 48L133 115 161 141 128 190 147 213" fill="none" stroke="#fff0a1" stroke-width="10" opacity=".6"/>'
 else texture='<path d="M170 54Q129 105 159 129T141 194T136 244" fill="none" stroke="#fff" stroke-width="6" opacity=".4"/>';
 let pattern='';
 if(pat==='stars'||pat==='sparkles')pattern='<g fill="#fff8d8"><path d="M126 58l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M185 208l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>';
 else if(pat==='grid')pattern='<path d="M115 74l-15 205M143 42l-15 235M171 25l-15 235M198 31l-15 222M83 118l135 16M70 155l133 17M58 196l122 18" stroke="#fff" stroke-width="2" opacity=".18"/>';
 else if(pat==='diamonds')pattern='<path d="M143 78l10 10-10 10-10-10zM158 175l12 12-12 12-12-12zM142 220l8 8-8 8-8-8z" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>';
 else if(pat==='waves')pattern='<path d="M145 42q22 14 2 36t2 36t2 36t2 36t2 36t2 36" fill="none" stroke="#fff" stroke-width="5" opacity=".32"/>';
 else if(pat==='runes')pattern='<path d="M126 112l14 15-14 15m-4-8h22M170 163l13 14-13 14m-4-7h21" fill="none" stroke="#fff" stroke-width="3" opacity=".55"/>';
 else if(pat==='bats')pattern='<g fill="#20152b"><path d="M139 126l9 4 9-4-3 8 5 4-11-2-11 2 5-4zM157 202l9 4 9-4-3 8 5 4-11-2-11 2 5-4z"/></g>';
 else if(pat==='spiderweb')pattern='<path d="M113 84L156 132 113 180M113 84h25l18 48-18 48h-25M113 108h35M113 157h35" stroke="#fff" fill="none" stroke-width="2" opacity=".38"/>';
 else if(pat==='leaves')pattern='<path d="M124 180q21-30 31-4q-5 22-31 4m0 0l27 5M154 105q20-30 31-4q-5 22-31 4m0 0l27 5" stroke="#dcffc3" fill="none" stroke-width="4"/>';
 return '<svg class="lightning-svg" viewBox="0 0 300 300" role="img" aria-label="'+esc(g.name||'Молния')+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="'+uid+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+p[0]+'"/><stop offset=".48" stop-color="'+p[1]+'"/><stop offset="1" stop-color="'+p[2]+'"/></linearGradient><linearGradient id="'+uid+'edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity=".8"/><stop offset=".35" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient><clipPath id="'+uid+'clip"><path d="'+path+'"/></clipPath><filter id="'+uid+'shadow" x="-30%" y="-20%" width="170%" height="150%"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="300" height="300" rx="26" fill="'+bg+'"/><circle cx="150" cy="150" r="122" fill="#fff" opacity=".035"/><path d="'+path+'" transform="translate(0 7)" fill="#000" opacity=".28" filter="url(#'+uid+'shadow)"/><path d="'+path+'" fill="url(#'+uid+')" stroke="'+p[2]+'" stroke-width="4" stroke-linejoin="round"/><g clip-path="url(#'+uid+'clip)">'+texture+pattern+'<path d="'+path+'" fill="url(#'+uid+'edge)"/><path d="M183 29L101 170" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".45"/></g><path d="'+path+'" fill="none" stroke="#fff" stroke-width="1.5" opacity=".28"/></svg>';
}

function stickerSvg(g){
 if(String(g.id||g.baseGiftId||g.giftId||'')==='gift-013'||String(g.baseGiftId||'')==='gift-013')return lightningSvg({...g,name:String(g.name||'Молния').replace(/\s+1$/,'')});
 const v=(!g.ownedInstance&&!g.material)?{...variantsFor(g)[0],...g}:g,colors=pal[v.skin]||pal.classic,bg=bgMap[v.background]||'#17142d',id='sv'+Math.random().toString(36).slice(2,10),emoji=esc(v.emoji||'🎁'),n=Number(v.variant)||1;
 let texture='';
 switch(v.material){
 case 'Галактический блеск':{let stars='';for(let i=0;i<28;i++){let x=30+(i*37+n*13)%240,y=77+(i*29+n*7)%146;stars+='<circle cx="'+x+'" cy="'+y+'" r="'+(1+i%3)+'" fill="'+(i%5===0?'#ffd98b':'#fff')+'" opacity=".8"/>'}texture='<path d="M22 147Q68 92 111 147T201 132T279 116M24 190Q78 144 119 190T209 172T278 156" stroke="#ff79df" stroke-width="17" opacity=".24" fill="none"/><path d="M25 164Q71 119 114 164T204 150T277 135" stroke="#67eaff" stroke-width="8" opacity=".3" fill="none"/>'+stars;break}
 case 'Гравировка':texture='<g fill="none" stroke="'+colors[0]+'" stroke-width="4"><path d="M38 106q36 22 0 46t0 46M262 106q-36 22 0 46t0 46M80 193q35-40 70 0t70 0M106 87l12 13-12 13-12-13zM194 87l12 13-12 13-12-13z"/></g>';break;
 case 'Мрамор и лава':texture='<path d="M28 91L76 127 94 111 123 155 105 181 133 221M272 91L224 127 206 111 177 155 195 181 167 221M117 81L143 113 128 141 151 164M183 81L157 113 172 141 149 164" fill="none" stroke="'+(n%2?'#fff0cb':'#ff9858')+'" stroke-width="4"/>';break;
 case 'Полированный металл':texture='<path d="M10 106L288 47M12 144L288 86M12 184L288 127M30 221L270 164" stroke="#fff" stroke-width="16" opacity=".19"/><path d="M30 108H270M30 209H270" stroke="'+colors[0]+'" stroke-width="3" opacity=".6"/>';break;
 case 'Ткань и дерево':texture='<path d="M25 92L276 224M37 72L289 204M15 143L205 247M22 229L280 100M56 244L280 125" stroke="#fff3d7" stroke-width="4" opacity=".3"/><path d="M38 135Q83 156 127 132T261 138M38 171Q83 192 127 168T261 174" fill="none" stroke="#fff" stroke-width="2" opacity=".25"/>';break;
 case 'Неоновый контур':texture='<g fill="none" stroke="'+colors[0]+'" stroke-width="5"><path d="M26 108h55l23 20h24M26 191h55l23-20h24M274 108h-55l-23 20h-24M274 191h-55l-23-20h-24"/><circle cx="44" cy="108" r="4"/><circle cx="256" cy="108" r="4"/></g>';break;
 case 'Шахматка и анимал':texture='<g fill="#12101b" opacity=".65"><ellipse cx="60" cy="125" rx="12" ry="7" transform="rotate(-25 60 125)"/><ellipse cx="99" cy="176" rx="13" ry="8"/><ellipse cx="150" cy="105" rx="12" ry="7"/><ellipse cx="198" cy="187" rx="13" ry="8" transform="rotate(25 198 187)"/><ellipse cx="242" cy="127" rx="12" ry="7"/></g>';break;
 case 'Флора и цветы':texture='<g fill="#fff1f9"><g transform="translate(61 121)"><circle cy="-8" r="6"/><circle cx="8" r="6"/><circle cy="8" r="6"/><circle cx="-8" r="6"/><circle r="3" fill="#ffd86a"/></g><g transform="translate(239 185)"><circle cy="-8" r="6"/><circle cx="8" r="6"/><circle cy="8" r="6"/><circle cx="-8" r="6"/><circle r="3" fill="#ffd86a"/></g></g><path d="M41 201q35-40 61-3t54-7t62 0t43-5" fill="none" stroke="#83e998" stroke-width="4"/>';break;
 case 'Кристаллы и снег':texture='<path d="M60 112l12 12m-12 0l12-12m-6-7v26M238 179l12 12m-12 0l12-12m-6-7v26M145 90l10 10m-10 0l10-10" stroke="#fff" stroke-width="4"/>';break;
 case 'Золотая фольга':texture='<path d="M26 98L104 123 90 158 157 191 201 142 274 167" fill="none" stroke="#ffe79b" stroke-width="10" opacity=".65"/><path d="M55 203l32-20m126-80l24-14" stroke="#fff5be" stroke-width="5"/>';break;
 default:texture='<path d="M25 113Q58 78 95 116T166 112T240 116T285 105M25 182Q58 146 95 183T166 178T240 184T285 174" fill="none" stroke="#fff" stroke-width="4" opacity=".3"/><path d="M45 85Q80 64 118 86M182 213Q220 235 258 207" fill="none" stroke="#fff" stroke-width="7" opacity=".3"/>';
 }
 let pat='';
 if(v.pattern==='stars'||v.pattern==='sparkles')pat='<g fill="#fff8d8"><path d="M48 62l5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><path d="M250 206l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/></g>';
 else if(v.pattern==='grid')pat='<path d="M30 90h240M30 120h240M30 150h240M30 180h240M70 60v180M110 60v180M150 60v180M190 60v180M230 60v180" stroke="#fff" stroke-width="2" opacity=".16"/>';
 else if(v.pattern==='diamonds')pat='<path d="M46 103l13 13-13 13-13-13zM252 150l14 14-14 14-14-14z" stroke="#fff" fill="none" stroke-width="3" opacity=".7"/>';
 else if(v.pattern==='waves')pat='<path d="M25 143q22-20 44 0t44 0t44 0t44 0t44 0t44 0M25 203q22-20 44 0t44 0t44 0t44 0t44 0t44 0" fill="none" stroke="#fff" stroke-width="4" opacity=".3"/>';
 else if(v.pattern==='runes')pat='<path d="M39 104l14 20-14 20m-4-10h24M261 104l-14 20 14 20m-24-10h24" stroke="#fff" fill="none" stroke-width="3" opacity=".55"/>';
 else if(v.pattern==='bats')pat='<g fill="#171323" opacity=".7"><path d="M41 158l12 5 12-5-4 10 7 5-15-3-15 3 7-5zM244 112l12 5 12-5-4 10 7 5-15-3-15 3 7-5z"/></g>';
 else if(v.pattern==='spiderweb')pat='<path d="M25 82L103 145 25 210M25 82h38l40 63-40 65H25M25 112h48M25 182h48" stroke="#fff" fill="none" stroke-width="2" opacity=".35"/>';
 else if(v.pattern==='leaves')pat='<path d="M43 179q22-35 42-5q-5 27-42 5m0 0l36 4M235 106q22-35 42-5q-5 27-42 5m0 0l36 4" stroke="#e4ffc4" fill="none" stroke-width="4" opacity=".65"/>';
 const shape=n%3===0?'M150 34L266 150 150 266 34 150Z':n%3===1?'M63 53H237Q260 53 260 76V222Q260 245 237 245H63Q40 245 40 222V76Q40 53 63 53Z':'M150 35C207 35 260 78 260 145Q260 225 150 265Q40 225 40 145C40 78 93 35 150 35Z';
 return '<svg class="gift-sticker-svg" viewBox="0 0 300 300" role="img" aria-label="'+esc(g.name)+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+colors[0]+'"/><stop offset=".55" stop-color="'+colors[1]+'"/><stop offset="1" stop-color="'+colors[2]+'"/></linearGradient><radialGradient id="'+id+'shine" cx=".28" cy=".18" r=".9"><stop stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient></defs><rect width="300" height="300" rx="34" fill="'+bg+'"/><circle cx="150" cy="148" r="120" fill="#fff" opacity=".04"/><path d="'+shape+'" fill="url(#'+id+')" stroke="#fff" stroke-opacity=".7" stroke-width="4"/>'+texture+pat+'<path d="'+shape+'" fill="url(#'+id+'shine)"/><path d="'+shape+'" fill="none" stroke="#070811" stroke-width="7" opacity=".85"/><text x="150" y="180" text-anchor="middle" font-size="92" style="font-family:system-ui,Apple Color Emoji,Noto Color Emoji">'+emoji+'</text><circle cx="75" cy="75" r="4" fill="#fff" opacity=".75"/><circle cx="231" cy="221" r="5" fill="#fff" opacity=".6"/></svg>';
}
function pumpkinArt(g){
 const colors=pal[g.skin]||pal.classic,bg=bgMap[g.background]||'#17142d',n=Number(g.variant)||1,id='pumpkin'+n+'_'+Math.random().toString(36).slice(2,8),mat=g.material||materials[(n-1)%10],pat=g.pattern||patterns[(n-1)%10];
 let tex='';
 if(mat==='Космос и галактика'){let s='';for(let i=0;i<28;i++)s+='<circle cx="'+(62+(i*43+n*11)%176)+'" cy="'+(94+(i*31+n*7)%125)+'" r="'+(1+i%3)+'" fill="'+(i%4===0?'#ffd98b':'#fff')+'"/>';tex='<path d="M52 160Q95 115 132 154T205 138T245 126" fill="none" stroke="#f881ff" stroke-width="17" opacity=".3"/><path d="M52 181Q95 145 132 176T205 159T245 145" fill="none" stroke="#68ebff" stroke-width="9" opacity=".3"/>'+s}
 else if(mat==='Гравировка')tex='<path d="M67 128q24-34 45 0t-17 31q-20-3-8-18q11-7 16 3M233 128q-24-34-45 0t17 31q20-3 8-18q-11-7-16 3" stroke="'+colors[0]+'" stroke-width="4" fill="none"/>';
 else if(mat==='Мрамор и лава')tex='<path d="M55 104l33 32 16-15 20 34-17 30 20 31M245 104l-33 32-16-15-20 34 17 30-20 31M122 89l18 27-12 24 22 22m28-73l-18 27 12 24-22 22" fill="none" stroke="'+(n%2?'#fff1c7':'#ff9b54')+'" stroke-width="4"/>';
 else if(mat==='Полированный металл')tex='<path d="M40 110L250 70M35 145L260 95M43 182L255 134M64 213L235 170" stroke="#fff" stroke-width="12" opacity=".18"/>';
 else if(mat==='Ткань и дерево')tex='<path d="M60 95l180 124M54 131l174 110M62 215l176-112M80 237l172-111" stroke="#fff2da" stroke-width="4" opacity=".3"/>';
 else if(mat==='Неоновый контур')tex='<path d="M56 126h27l17 16h25M56 185h27l17-16h25M244 126h-27l-17 16h-25M244 185h-27l-17-16h-25" fill="none" stroke="'+colors[0]+'" stroke-width="4"/>';
 else if(mat==='Шахматка и анимал')tex='<g fill="#15121b" opacity=".6"><ellipse cx="88" cy="126" rx="10" ry="7"/><ellipse cx="112" cy="180" rx="11" ry="8"/><ellipse cx="206" cy="126" rx="10" ry="7"/><ellipse cx="187" cy="180" rx="11" ry="8"/></g>';
 else if(mat==='Флора и цветы')tex='<g fill="#fff1fa"><circle cx="66" cy="130" r="5"/><circle cx="76" cy="130" r="5"/><circle cx="71" cy="121" r="5"/><circle cx="71" cy="139" r="5"/><circle cx="71" cy="130" r="3" fill="#ffd76b"/><circle cx="229" cy="184" r="5"/><circle cx="239" cy="184" r="5"/><circle cx="234" cy="175" r="5"/><circle cx="234" cy="193" r="5"/><circle cx="234" cy="184" r="3" fill="#ffd76b"/></g>';
 else if(mat==='Кристаллы и снег')tex='<path d="M68 122l12 12m-12 0l12-12m-6-6v24M228 180l12 12m-12 0l12-12m-6-6v24" stroke="#fff" stroke-width="3"/>';
 else tex='<path d="M54 109Q90 87 123 111M178 111Q214 87 246 109" fill="none" stroke="#fff" stroke-width="8" opacity=".35"/>';
 let patArt='';
 if(pat==='stars'||pat==='sparkles')patArt='<g fill="#fff8d8"><path d="M58 85l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M239 177l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>';
 else if(pat==='grid')patArt='<path d="M55 95h190M55 120h190M55 145h190M55 170h190M95 65v140M135 65v140M175 65v140M215 65v140" stroke="#fff" opacity=".18"/>';
 else if(pat==='diamonds')patArt='<path d="M80 95l18 18-18 18-18-18zM220 145l18 18-18 18-18-18z" fill="none" stroke="#fff" stroke-width="3"/>';
 else if(pat==='waves')patArt='<path d="M50 100q20-20 40 0t40 0t40 0t40 0t40 0M50 175q20-20 40 0t40 0t40 0t40 0t40 0" fill="none" stroke="#fff" stroke-width="4" opacity=".3"/>';
 else if(pat==='bats')patArt='<g fill="#271437"><path d="M58 88l12 6 12-6-4 10 7 6-15-3-15 3 7-6zM217 180l12 6 12-6-4 10 7 6-15-3-15 3 7-6z"/></g>';
 else if(pat==='spiderweb')patArt='<path d="M52 68L110 125 52 185M52 68h34l24 57-24 60H52M52 98h40M52 155h40" fill="none" stroke="#fff" stroke-width="2" opacity=".4"/>';
 else if(pat==='leaves')patArt='<path d="M65 170q22-34 40-5q-3 29-40 5m0 0l36 5M210 182q22-34 40-5q-3 29-40 5m0 0l36 5" fill="none" stroke="#e0ffc0" stroke-width="4"/>';
 const body='M150 89C117 62 77 82 61 116C35 169 62 222 104 233C122 251 139 245 150 237C164 248 183 248 198 233C241 222 266 169 239 116C222 82 183 62 150 89Z';
 return '<svg class="pumpkin-svg" viewBox="0 0 300 300" role="img" aria-label="'+esc(g.name)+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+colors[0]+'"/><stop offset=".52" stop-color="'+colors[1]+'"/><stop offset="1" stop-color="'+colors[2]+'"/></linearGradient><clipPath id="'+id+'clip"><path d="'+body+'"/></clipPath><radialGradient id="'+id+'shine"><stop stop-color="#fff" stop-opacity=".48"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs><rect width="300" height="300" rx="30" fill="'+bg+'"/><ellipse cx="150" cy="242" rx="84" ry="12" fill="#000" opacity=".25"/><path d="M147 93Q171 52 152 35Q173 26 182 48L197 92Z" fill="'+colors[2]+'"/><path d="'+body+'" fill="url(#'+id+')" stroke="#09090d" stroke-width="4"/><g clip-path="url(#'+id+'clip)">'+tex+patArt+'<path d="M150 80Q105 122 125 232M150 80Q195 122 175 232" fill="none" stroke="'+colors[2]+'" stroke-width="20" opacity=".3"/><rect x="35" y="65" width="230" height="180" fill="url(#'+id+'shine)"/></g><path d="M85 125L121 136 95 150ZM179 136L215 125 205 150Z" fill="'+colors[2]+'"/><path d="M150 155l-16 22h32zM78 176Q150 223 222 176Q201 216 150 218Q99 216 78 176Z" fill="'+colors[2]+'"/></svg>';
}

function chocolateSvg(g){
 const n=Math.max(1,Number(g.variant)||1),shape=Math.max(1,Math.min(6,Number(g.shape)||((n-1)%6)+1)),skin=g.skin||'classic',id='choc'+n+'_'+Math.random().toString(36).slice(2,8);
 const wrappers={classic:'#ef1828',rose:'#ee4b9a',ice:'#28a9ff',violet:'#8e4be7',forest:'#1ab56b',gold:'#e8b51f',holographic:'#d86df5',neon:'#8acb29',candy:'#ff78bd',ember:'#ff6b23'},wrap=g.wrapperColor||wrappers[skin]||'#ef1828';
 const backgrounds={midnight:'#17142d',aurora:'#183b58',gold:'#70421c',rose:'#642b51',ice:'#1b426b',custom:'#4b225f',ember:'#54202b',forest:'#173e2c',cosmic:'#211a53',violet:'#39215d'},bg=backgrounds[g.background]||'#17142d';
 const chocolateSets=[['#7a351f','#a6502d','#4a2018'],['#351a18','#5a2922','#1b1010'],['#fae8d3','#fff4dc','#cfb99f'],['#6e382a','#d4a08a','#37202b'],['#a45426','#df9c38','#69301e'],['#4f2a21','#9b5b36','#2b1917'],['#fff0a1','#e0b43a','#805020'],['#c6ffff','#6fbbdd','#305d9d'],['#55301f','#ba7442','#2c1712'],['#7e4a35','#d9a37e','#49231e']];
 const row=Math.floor((n-1)/6)%10,mat=String(g.material||'Молочный шоколад');let palette=chocolateSets[row]||chocolateSets[0];if(mat.includes('Тёмный'))palette=chocolateSets[1];else if(mat.includes('Белый'))palette=chocolateSets[2];else if(mat.includes('Мрамор'))palette=chocolateSets[3];else if(mat.includes('Карамель'))palette=chocolateSets[4];else if(mat.includes('Орех'))palette=chocolateSets[5];else if(mat.includes('Золот'))palette=chocolateSets[6];else if(mat.includes('Кристал'))palette=chocolateSets[7];else if(mat.includes('Кофейн'))palette=chocolateSets[8];else if(mat.includes('Мят'))palette=chocolateSets[9];
 const angles=[26,30,22,34,18,28],angle=angles[shape-1],widths=[156,146,166,150,160,142],w=widths[shape-1],x=(300-w)/2,cols=4,rows=3,bw=w/cols,bh=38;
 let cells='';
 for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){
  const xx=x+col*bw+1,yy=17+r*bh+1;
  const variation=(r*3+col+n)%3,fill=variation===0?palette[0]:variation===1?palette[1]:palette[2];
  cells+='<g><rect x="'+xx+'" y="'+yy+'" width="'+(bw-2)+'" height="'+(bh-2)+'" rx="'+(shape%2?4:2)+'" fill="'+fill+'" stroke="#2b1512" stroke-width="2.4"/><path d="M'+(xx+4)+' '+(yy+4)+'h'+(bw-11)+'l-4 4h-'+(bw-15)+'z" fill="#fff" opacity="'+(.12+((n+col+r)%3)*.05)+'"/><path d="M'+(xx+5)+' '+(yy+bh-7)+'h'+(bw-12)+'" stroke="#1a0d0a" stroke-width="2" opacity=".35"/></g>';
 }
 let material='';
 if(mat.includes('Галак')||mat.includes('Кристал')){let stars='';for(let i=0;i<22;i++)stars+='<circle cx="'+(83+(i*29+n*7)%134)+'" cy="'+(24+(i*31+n*11)%105)+'" r="'+(1+i%3)+'" fill="'+(i%4===0?'#fff0a0':'#fff')+'" opacity=".8"/>';material=stars+'<path d="M78 61Q119 32 154 66T226 46" fill="none" stroke="#ff80ef" stroke-width="9" opacity=".32"/>'}
 else if(mat.includes('Грав'))material='<path d="M84 45q20-24 40 0t-20 27q-16-2-6-12q9-5 12 2M176 73q20-24 40 0t-20 27q-16-2-6-12q9-5 12 2" fill="none" stroke="'+palette[1]+'" stroke-width="3"/>';
 else if(mat.includes('Мрамор'))material='<path d="M89 24l18 19-9 18 24 17-13 24 19 13M190 23l-14 20 13 15-10 23 16 19" fill="none" stroke="#fff0e3" stroke-width="3" opacity=".7"/>';
 else if(mat.includes('Золот'))material='<path d="M82 26L215 120M78 57L190 136M113 19L226 96" stroke="#ffeaa1" stroke-width="6" opacity=".6"/>';
 else if(mat.includes('Орех')){for(let i=0;i<12;i++)material+='<circle cx="'+(93+(i*19+n*7)%112)+'" cy="'+(30+(i*23)%95)+'" r="'+(2+i%3)+'" fill="#e4bb8a" stroke="#623b25" stroke-width="1"/>'}
 else if(mat.includes('Мят'))material='<path d="M86 58q22-34 48-3q-3 34-48 3M172 85q22-34 48-3q-3 34-48 3" fill="#91e5a7" stroke="#39754a" stroke-width="2"/>';
 else material='<path d="M83 124L216 25M105 139L236 42" stroke="#fff" stroke-width="8" opacity=".12"/>';
 let pattern='';
 const pat=String(g.pattern||'none');
 if(pat==='stars'||pat==='sparkles')pattern='<g fill="#fff4b2"><path d="M101 43l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M202 88l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>';
 else if(pat==='grid')pattern='<path d="M88 31h124M88 59h124M88 87h124M119 20v112M150 20v112M181 20v112" stroke="#fff" stroke-width="2" opacity=".17"/>';
 else if(pat==='diamonds')pattern='<path d="M110 42l8 8-8 8-8-8zM188 90l9 9-9 9-9-9z" fill="none" stroke="#fff" stroke-width="2.5"/>';
 else if(pat==='waves')pattern='<path d="M83 72q18-17 36 0t36 0t36 0t36 0" fill="none" stroke="#fff" stroke-width="3" opacity=".25"/>';
 let foilLines='';
 if(shape===2||shape===4)foilLines='<path d="M62 145l22 14-9 89M238 145l-22 14 9 89" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>';
 if(shape===3||shape===6)foilLines+='<path d="M90 167l25 97M210 167l-25 97M110 174l25 90M190 174l-25 90" stroke="#fff" stroke-width="3" opacity=".24"/>';
 const chocolateTop=shape===3?'M79 20L102 11H198L221 20L221 137Q150 151 79 137Z':'M'+x+' 20Q150 9 '+(300-x)+' 20L'+(300-x)+' 137Q150 151 '+x+' 137Z';
 const wrapper=shape===5?'M65 139Q90 127 115 139T165 139T215 139L228 260Q150 286 72 260Z':'M66 139Q90 127 114 139T162 139T210 139L230 265Q150 286 70 265Z';
 return '<svg class="chocolate-svg" viewBox="0 0 300 300" role="img" aria-label="'+esc(g.name||'Шоколадка')+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="'+id+'wrap" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+wrap+'"/><stop offset=".52" stop-color="'+wrap+'"/><stop offset="1" stop-color="#450b19"/></linearGradient><linearGradient id="'+id+'choc" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+palette[1]+'"/><stop offset="1" stop-color="'+palette[2]+'"/></linearGradient><clipPath id="'+id+'clip"><path d="'+chocolateTop+'"/></clipPath><linearGradient id="'+id+'shine"><stop stop-color="#fff" stop-opacity=".42"/><stop offset=".7" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient></defs><rect width="300" height="300" rx="28" fill="'+bg+'"/><circle cx="150" cy="150" r="125" fill="#fff" opacity=".035"/><g transform="rotate('+angle+' 150 150)"><path d="'+wrapper+'" fill="url(#'+id+'wrap)" stroke="#24141a" stroke-width="4"/><path d="M68 151Q83 130 106 144T147 148T190 145T226 146" fill="none" stroke="#fff" stroke-width="23" stroke-linecap="round"/><path d="M68 151Q83 130 106 144T147 148T190 145T226 146" fill="none" stroke="#f5d9d4" stroke-width="16" stroke-linecap="round"/><path d="M78 173L92 252M219 173L207 252M93 261l58 11 56-11" fill="none" stroke="#fff" stroke-width="4" opacity=".2"/><path d="'+chocolateTop+'" fill="url(#'+id+'choc)" stroke="#26130f" stroke-width="4"/><g clip-path="url(#'+id+'clip)">'+cells+material+pattern+'<path d="'+chocolateTop+'" fill="url(#'+id+'shine)"/></g><path d="'+chocolateTop+'" fill="none" stroke="#20100d" stroke-width="4"/>'+foilLines+'</g><path d="M43 224l15 10M254 67l8 7" stroke="#fff" stroke-width="3" opacity=".65"/></svg>';
}

function galaxyHeartSvg(g){
 const palettes={classic:['#ff75da','#9c46f0','#39d9ff'],chrome:['#f5f8ff','#8c9ab6','#d5aaff'],holographic:['#ff8bdb','#58f5ef','#a18bff'],crystal:['#d5fbff','#67a9ff','#e8caff'],neon:['#b9ff52','#43e7c7','#ff5de3'],ember:['#ffb05c','#ff436b','#7e2cff'],ice:['#e4ffff','#69c8ff','#b3a9ff'],shadow:['#a99bcf','#584c87','#ff72cb'],royal:['#ffe79a','#b16aff','#ff83d5'],candy:['#ffb2de','#ff6798','#8cecff']};
 const p=palettes[g.skin]||palettes.classic,n=Math.max(1,Number(g.variant)||1),id='gh'+n+'x'+Math.random().toString(36).slice(2,7);
 const bg={midnight:'#100c29',aurora:'#123744',gold:'#3b241c',rose:'#451b40',ice:'#102e53',custom:'#302053',ember:'#401627',forest:'#12342b',cosmic:'#17103f',violet:'#27103e'}[g.background]||'#100c29';
 const pat=String(g.pattern||'stars');
 let detail='';
 if(pat==='waves')detail='<path d="M65 131q22-23 44 0t44 0t44 0t44 0M72 160q22-23 44 0t44 0t44 0t44 0" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="4"/>';
 else if(pat==='grid')detail='<path d="M85 94v112M112 79v142M139 69v159M166 69v159M193 79v142M220 94v112M62 119h136M65 148h140M79 178h120" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>';
 else if(pat==='diamonds')detail='<g fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3"><path d="M93 118l14 14-14 14-14-14zM204 154l13 13-13 13-13-13zM149 178l10 10-10 10-10-10z"/></g>';
 else if(pat==='runes')detail='<g fill="none" stroke="#fff" stroke-opacity=".56" stroke-width="3"><path d="M80 129l8-18 8 18m-8-18v35M210 127l10 13-10 13m0-26v26M143 180l11-14 11 14m-11-14v30"/></g>';
 else if(pat==='sparkles'||pat==='constellation')detail='<g fill="#fff9d7"><path d="M81 110l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><path d="M222 169l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><circle cx="202" cy="105" r="3"/><circle cx="104" cy="181" r="2"/></g>';
 else if(pat==='leaves')detail='<g fill="none" stroke="#bcffd9" stroke-width="3" stroke-opacity=".7"><path d="M88 158q-24-29 3-42q18 22-3 42zm0 0q24-29 41-9q-15 25-41 9zm96 4q-24-29 3-42q18 22-3 42zm0 0q24-29 41-9q-15 25-41 9z"/></g>';
 else detail='<g fill="#fff"><circle cx="81" cy="145" r="2"/><circle cx="217" cy="119" r="2"/><circle cx="101" cy="189" r="2"/><circle cx="201" cy="194" r="2"/><path d="M151 85l4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/></g>';
 let texture='';
 const material=String(g.material||'');
 if(material.includes('хром'))texture='<path d="M77 122q20-31 45-16M163 191q25 21 43-4" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".7"/>';
 else if(material.includes('кристалл')||material.includes('опал'))texture='<g fill="#fff" fill-opacity=".55"><path d="M99 139l12-14 9 15-10 14zM186 162l11-19 12 18-12 12zM142 188l8-10 9 10-9 11z"/></g>';
 else if(material.includes('гравиров'))texture='<path d="M103 124q45-35 90 0M95 133q55-38 110 0M107 184q42 24 84 0" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".48"/>';
 else texture='<path d="M83 114q21-18 37-7M174 196q17 7 30-9" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".38"/>';
 return '<svg class="galaxy-heart-svg" viewBox="0 0 300 300" role="img" aria-label="'+esc(g.name||'Сердце Галактики')+'" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="'+id+'bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+bg+'"/><stop offset="1" stop-color="#080713"/></linearGradient><linearGradient id="'+id+'heart" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+p[0]+'"/><stop offset=".52" stop-color="'+p[1]+'"/><stop offset="1" stop-color="'+p[2]+'"/></linearGradient><radialGradient id="'+id+'shine" cx=".28" cy=".19" r=".8"><stop stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#02020a" stop-opacity=".42"/></radialGradient><filter id="'+id+'glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="'+id+'clip"><path d="M150 224C131 205 70 167 68 126C66 85 111 69 150 105C189 69 234 85 232 126C230 167 169 205 150 224Z"/></clipPath></defs><rect width="300" height="300" rx="28" fill="url(#'+id+'bg)"/><g fill="#fff" opacity=".68"><circle cx="47" cy="66" r="2"/><circle cx="251" cy="62" r="1.8"/><circle cx="44" cy="205" r="1.4"/><circle cx="257" cy="214" r="2"/><circle cx="84" cy="252" r="1.6"/><circle cx="213" cy="251" r="1.4"/><path d="M62 88l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM242 133l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g><ellipse cx="150" cy="153" rx="101" ry="47" fill="none" stroke="'+p[2]+'" stroke-width="3" opacity=".7" transform="rotate(-22 150 153)"/><ellipse cx="150" cy="153" rx="111" ry="34" fill="none" stroke="'+p[0]+'" stroke-width="2" opacity=".55" transform="rotate(27 150 153)"/><path d="M124 87l-8-23 20 11 14-20 14 20 20-11-8 23" fill="none" stroke="'+p[0]+'" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#'+id+'glow)"/><path d="M150 224C131 205 70 167 68 126C66 85 111 69 150 105C189 69 234 85 232 126C230 167 169 205 150 224Z" fill="url(#'+id+'heart)" stroke="'+p[0]+'" stroke-width="4" filter="url(#'+id+'glow)"/><g clip-path="url(#'+id+'clip)"><path d="M50 174Q105 101 153 151T257 121" fill="none" stroke="'+p[2]+'" stroke-width="25" stroke-opacity=".42"/><path d="M45 147Q107 199 158 142T261 164" fill="none" stroke="'+p[0]+'" stroke-width="12" stroke-opacity=".5"/>'+detail+texture+'<path d="M62 80h176v160H62z" fill="url(#'+id+'shine)"/></g><path d="M150 224C131 205 70 167 68 126C66 85 111 69 150 105C189 69 234 85 232 126C230 167 169 205 150 224Z" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/><g fill="'+p[0]+'" stroke="#fff" stroke-opacity=".65" stroke-width="2"><circle cx="49" cy="149" r="6"/><circle cx="250" cy="157" r="6"/><path d="M146 232l4-9 4 9-4 9z"/></g><rect x="69" y="263" width="162" height="22" rx="11" fill="#080713" fill-opacity=".65" stroke="'+p[2]+'" stroke-opacity=".7"/><text x="150" y="277" text-anchor="middle" font-family="sans-serif" font-size="10" letter-spacing="2" fill="#fff">VOLTRA · #'+String(n).padStart(3,'0')+'</text></svg>';
}
function artForGift(g){const itemId=String(g.id||g.giftId||''),baseId=String(g.baseGiftId||'');if(itemId.startsWith('voltra-galaxy-heart-')||g.collection==='galaxy-heart'||baseId.startsWith('voltra-galaxy-heart-'))return galaxyHeartSvg(g);if(itemId==='gift-013'||baseId==='gift-013'||itemId.startsWith('voltra-lightning-'))return lightningSvg(g);if(itemId.startsWith('voltra-chocolate-')||baseId.startsWith('voltra-chocolate-'))return chocolateSvg(g);if(/^halloween-pumpkin-\d+$/.test(itemId))return pumpkinArt(g);if(/^voltra-bat-\d+$/.test(itemId)&&typeof legacyGiftSvg==='function')return legacyGiftSvg({...g,id:itemId});if(g.image&&g.collectible&&!g.ownedInstance)return '<img src="'+esc(g.image)+'" alt="">';return stickerSvg(g)}
const legacyGiftSvg=window.pulseGiftSvg;
window.pulseGiftSvg=artForGift;
function giftInfo(id){return catalog.find(g=>g.id===String(id||''))||(window.pulseGiftCatalogSnapshot||[]).find(g=>g.id===String(id||''))||null}
async function reload(){try{const r=await fetch('/api/gifts',{credentials:'same-origin'});if(r.ok){const d=await r.json();catalog=d.catalog||[];owned=d.owned||[];enhanceCards()}}catch{}}
function enhanceCards(){const root=$('giftCatalog');if(root)root.querySelectorAll('.gift-card').forEach(card=>{const action=card.querySelector('[data-gift]')||card.querySelector('[data-gift-sell]')||card.querySelector('[data-gift-send]'),id=action?.dataset.gift||action?.dataset.giftSell||action?.dataset.giftSend;if(!id)return;const g=giftInfo(id);const inspect=card.querySelector('[data-gift-inspect]');if(inspect)inspect.dataset.giftId=id;const art=card.querySelector('.gift-art');if(!art||art.dataset.stickerEnhanced==='1'||!g)return;art.dataset.stickerEnhanced='1';art.innerHTML=artForGift(g);art.classList.add('gift-art-enhanced')});enhancePumpkinCollections()}
function enhancePumpkinCollections(activeId){const feature=$('openPumpkinCollection'),first=catalog.find(g=>/^halloween-pumpkin-\d+$/.test(String(g.id||'')));if(feature&&first&&feature.dataset.materialEnhanced!=='1'){const old=feature.querySelector('.pumpkin-svg');if(old){old.outerHTML=pumpkinArt(first);feature.dataset.materialEnhanced='1'}}const grid=$('pumpkinGrid');if(grid)grid.querySelectorAll('[data-pumpkin]').forEach(tile=>{const g=giftInfo(tile.dataset.pumpkin);if(!g||tile.dataset.materialEnhanced==='1')return;tile.dataset.materialEnhanced='1';tile.innerHTML=pumpkinArt(g)+'<b>#'+String(g.variant||1).padStart(2,'0')+'</b><small>'+esc(g.rarity)+'</small>'});if(activeId){const g=giftInfo(activeId),detail=$('pumpkinDetail')?.querySelector('.pumpkin-large');if(g&&detail)detail.innerHTML=pumpkinArt(g)}}
function openVariantModal(g,mode,current){
 pendingGift=g;pendingMode=mode;const list=variantsFor(g);pendingVariant={...list[(Number(current?.variant||1)-1+list.length)%list.length],...(current||{})};
 let modal=$('stickerVariantModal');if(!modal){modal=document.createElement('div');modal.id='stickerVariantModal';modal.className='gift-variant-backdrop';modal.innerHTML='<section class="gift-variant-panel"><header><div><small>VOLTRA GIFT STUDIO</small><h2 id="stickerVariantTitle">Выбери оформление</h2><p id="stickerVariantCount">12 вариантов · материалы, цвета, узоры и фоны</p></div><button type="button" id="stickerVariantClose">×</button></header><div class="gift-variant-preview" id="stickerVariantPreview"></div><div class="gift-variant-grid" id="stickerVariantGrid"></div><div class="gift-variant-actions"><button type="button" class="secondary" id="stickerVariantCancel">Отмена</button><button type="button" class="primary" id="stickerVariantConfirm">Продолжить</button></div></section>';document.body.appendChild(modal)}
 const close=()=>modal.classList.remove('show');$('stickerVariantClose').onclick=close;$('stickerVariantCancel').onclick=close;
 const draw=()=>{$('stickerVariantPreview').innerHTML=stickerSvg({...g,...pendingVariant})+'<div><b>Вариант #'+String(pendingVariant.variant).padStart(2,'0')+'</b><small>'+esc(pendingVariant.material)+' · '+esc(pendingVariant.background)+'</small><small>Узор: '+esc(pendingVariant.pattern)+'</small></div>';$('stickerVariantGrid').innerHTML=list.map(v=>'<button type="button" class="gift-variant-option '+(pendingVariant.variant===v.variant?'active':'')+'" data-sticker-variant="'+v.variant+'">'+stickerSvg({...g,...v})+'<b>#'+String(v.variant).padStart(2,'0')+'</b><small>'+esc(v.material)+'</small></button>').join('')};
 $('stickerVariantTitle').textContent=String(g.name||'Подарок').replace(/\s+1$/,'');$('stickerVariantCount').textContent=list.length+' вариантов · материалы, цвета, узоры и фоны';draw();$('stickerVariantGrid').onclick=e=>{const b=e.target.closest('[data-sticker-variant]');if(!b)return;pendingVariant=list[Number(b.dataset.stickerVariant)-1];draw()};
 $('stickerVariantConfirm').textContent=mode==='buy'?'Купить за '+Number(g.price).toLocaleString('ru-RU')+' ϟ':mode==='send'?'Далее к отправке':'Применить оформление';
 $('stickerVariantConfirm').onclick=async()=>{if(mode==='buy'){const btn=$('stickerVariantConfirm');btn.disabled=true;try{const r=await fetch('/api/gifts/buy',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({giftId:g.id,variant:pendingVariant})}),d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось купить подарок');modal.classList.remove('show');window.dispatchEvent(new CustomEvent('pulsePulsesUpdated',{detail:{pulses:d.balance}}));window.dispatchEvent(new Event('pulseGiftInventoryUpdated'));toast('Подарок куплен 🎁')}catch(e){toast(e.message)}finally{btn.disabled=false}}else if(mode==='send'){modal.classList.remove('show');openSendModal(g,pendingVariant)}else{modal.classList.remove('show');sendVariant=pendingVariant;refreshSendPreview()}};
 modal.classList.add('show')
}
let sendGift=null,sendVariant=null,sendRecipientId=null;
function refreshSendPreview(){if(!sendGift)return;const art=sendGift.collectible?artForGift(sendGift):stickerSvg({...sendGift,...sendVariant});$('sendGiftPreview').innerHTML='<span class="send-gift-variant-art">'+art+'</span><div><b>'+esc(sendGift.name)+'</b><small>'+Number(sendGift.price).toLocaleString('ru-RU')+' ϟ · '+esc(sendVariant?.material||'Коллекционный')+'</small></div>';const b=$('sendGiftVariantBtn');if(b)b.classList.toggle('hidden',!!sendGift.collectible)}
function openSendModal(g,v){
 sendGift=g;sendVariant=g.collectible?null:(v||variantsFor(g)[0]);sendRecipientId=window.pulseGiftRecipientId||null;window.pulseGiftRecipientId=null;
 $('sendGiftModal').querySelector('h2').textContent='🎁 Купить и отправить';$('confirmSendGift').textContent='Купить и отправить';$('sendGiftModal').querySelector('.muted').textContent='Стоимость спишется с отправителя один раз после проверки получателя.';
 $('sendGiftRecipient').value=window.pulseGiftRecipient||'';window.pulseGiftRecipient='';$('sendGiftMessage').value='';$('sendGiftStatus').textContent='';refreshSendPreview();$('sendGiftModal').classList.remove('hidden')
}
async function sendSelectedGift(){
 if(!sendGift)return;const username=$('sendGiftRecipient').value.trim(),note=$('sendGiftMessage').value.trim().slice(0,300),btn=$('confirmSendGift');
 if(!sendRecipientId&&!username){$('sendGiftStatus').textContent='Укажи ник получателя';return}
 btn.disabled=true;
 try{const body=sendRecipientId?{userId:sendRecipientId,giftId:sendGift.id,variant:sendVariant,message:note}:{username,giftId:sendGift.id,variant:sendVariant,message:note};
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let r,d;try{r=await fetch('/api/gifts/send',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal});d=await r.json()}finally{clearTimeout(timeout)}if(!r.ok)throw new Error(d.error||'Не удалось отправить подарок');
 if(d.message&&window.pulseInjectMessage)window.pulseInjectMessage(d.message);
 window.dispatchEvent(new CustomEvent('pulsePulsesUpdated',{detail:{pulses:d.balance}}));window.dispatchEvent(new Event('pulseGiftInventoryUpdated'));
 $('sendGiftStatus').textContent='Подарок отправлен пользователю '+d.recipient+' ✓';$('sendGiftModal').classList.add('hidden');toast('Подарок отправлен 🎁')
 }catch(e){const message=e?.name==='AbortError'?'Сервер не ответил за 15 секунд. Проверь соединение и попробуй ещё раз.':(e.message||'Не удалось отправить подарок');$('sendGiftStatus').textContent=message;toast(message)}finally{btn.disabled=false}
}
function toast(s){const t=$('toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}}
window.pulseGiftInspectionData=id=>{const g=giftInfo(id);if(!g)return null;const art=artForGift(g),base=String(g.baseGiftId||g.id);return {id:g.id,name:String(g.name||'').replace(/\s+1$/,''),emoji:g.emoji,rarity:g.rarity,material:g.material||'',pattern:g.pattern||'',kind:/^halloween-pumpkin-/.test(base)?'pumpkin':/^voltra-bat-/.test(base)?'bat':String(base).startsWith('voltra-chocolate-')?'chocolate':String(base).startsWith('voltra-lightning-')?'lightning':'sticker',art,accent:(pal[g.skin]||pal.classic)[0]}};

async function openGiftResaleMarket(){
 let modal=$('giftResaleMarketModal');
 if(!modal){
  modal=document.createElement('div');modal.id='giftResaleMarketModal';modal.className='gift-variant-backdrop';
  modal.innerHTML='<section class="gift-variant-panel gift-market-panel"><header><div><small>VOLTRA MARKET</small><h2>🏷️ Маркет подарков</h2><p>Покупай подарки у других пользователей по фиксированной цене.</p></div><button type="button" id="closeGiftResaleMarket">×</button></header><div id="giftResaleMarketStatus" class="muted"></div><div id="giftResaleListings" class="gift-resale-listings"></div></section>';
  document.body.appendChild(modal);
  $('closeGiftResaleMarket').onclick=()=>modal.classList.remove('show');
 }
 modal.classList.add('show');
 const status=$('giftResaleMarketStatus'),root=$('giftResaleListings');
 if(!status||!root)return;
 status.textContent='Загружаю лоты…';root.innerHTML='';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{
  let response,data;
  try{
   response=await fetch('/api/gifts/resale',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   const raw=await response.text();
   try{data=JSON.parse(raw)}catch{throw new Error('Сервер вернул некорректный ответ')}
  }finally{clearTimeout(timeout)}
  if(!response.ok)throw new Error(data.error||'Не удалось открыть маркет');
  const list=Array.isArray(data.listings)?data.listings:[];
  status.textContent=list.length?'Активных лотов: '+list.length:'Пока нет активных лотов. Чтобы продать подарок, открой «Мою коллекцию» и нажми «Продать / выставить».';
  const cards=[];
  for(const l of list){
   try{
    const art=artForGift({...l,id:l.baseGiftId||l.giftId,baseGiftId:l.baseGiftId||'',giftId:l.giftId,name:l.giftName,emoji:l.emoji});
    const prices=(l.priceVlt?'<button type="button" data-resale-buy="'+esc(l.id)+'" data-resale-currency="vlt">Купить за '+Number(l.priceVlt).toLocaleString('ru-RU')+' ϟ</button>':'')+(l.priceCat?'<button type="button" class="secondary" data-resale-buy="'+esc(l.id)+'" data-resale-currency="cat">Купить за '+Number(l.priceCat).toLocaleString('ru-RU')+' CAT</button>':'');
    cards.push('<article class="gift-resale-card"><div class="gift-resale-art">'+art+'</div><div class="gift-resale-info"><b>'+esc(l.giftName||'Подарок')+'</b><small>Продавец: '+esc(l.sellerName||'Пользователь')+'</small><small>'+esc(l.material||'Особое оформление')+' · вариант #'+String(l.variant||1).padStart(2,'0')+'</small></div><div class="gift-resale-actions">'+(l.mine?'<span>Твой лот</span><button type="button" class="secondary" data-resale-cancel="'+esc(l.id)+'">Снять с продажи</button>':prices)+'</div></article>');
   }catch(error){console.warn('VOLTRA resale listing render failed:',error)}
  }
  root.innerHTML=cards.join('');
  if(list.length&&!cards.length)status.textContent='Лоты загружены, но их оформление не удалось отобразить. Обнови маркет.';
 }catch(error){
  status.textContent=error?.name==='AbortError'?'Маркет не ответил за 8 секунд. Попробуй ещё раз.':(error.message||'Не удалось загрузить маркет');
  root.innerHTML='<button type="button" class="secondary" id="giftResaleRetry">↻ Повторить загрузку</button>';
 }finally{clearTimeout(timeout)}
}
async function buyResaleListing(id,currency){
 try{const r=await fetch('/api/gifts/resale/buy',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({listingId:id,currency})}),d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось купить подарок');toast('Подарок куплен у '+d.seller+' 🎁');window.dispatchEvent(new CustomEvent('pulsePulsesUpdated',{detail:{pulses:d.balance,catCoins:d.catCoins}}));window.dispatchEvent(new Event('pulseGiftInventoryUpdated'));await openGiftResaleMarket()}catch(e){toast(e.message)}
}
async function cancelResaleListing(id){
 try{const r=await fetch('/api/gifts/resale/cancel',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({listingId:id})}),d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось снять лот');toast('Лот снят с продажи');await openGiftResaleMarket()}catch(e){toast(e.message)}
}

function onCapture(e){
 const t=e.target instanceof Element?e.target:null;if(!t)return;
 if(t.closest('#openPumpkinCollection')){setTimeout(()=>enhancePumpkinCollections(),70);return}
 const pumpkinTile=t.closest('#pumpkinGrid [data-pumpkin]');if(pumpkinTile){const id=pumpkinTile.dataset.pumpkin;setTimeout(()=>enhancePumpkinCollections(id),60);return}
 const marketBuy=t.closest('[data-resale-buy]');if(marketBuy){e.preventDefault();e.stopImmediatePropagation();void buyResaleListing(marketBuy.dataset.resaleBuy,marketBuy.dataset.resaleCurrency);return}const marketCancel=t.closest('[data-resale-cancel]');if(marketCancel){e.preventDefault();e.stopImmediatePropagation();void cancelResaleListing(marketCancel.dataset.resaleCancel);return}
 const inspect=t.closest('[data-gift-inspect]');if(inspect){const card=inspect.closest('.gift-card'),action=card?.querySelector('[data-gift]')||card?.querySelector('[data-gift-sell]')||card?.querySelector('[data-gift-send]'),id=action?.dataset.gift||action?.dataset.giftSell||action?.dataset.giftSend;if(id)inspect.dataset.giftId=id;return}
 if(t.closest('#giftResaleRetry')){e.preventDefault();e.stopImmediatePropagation();void openGiftResaleMarket();return}if(t.closest('#giftMarketOpen')){e.preventDefault();e.stopImmediatePropagation();void openGiftResaleMarket();return}
 if(t.closest('#openGifts')){void reload();return}
 const variantBtn=t.closest('#sendGiftVariantBtn');if(variantBtn){e.preventDefault();e.stopImmediatePropagation();if(sendGift)openVariantModal(sendGift,'update-send',sendVariant);return}
 const confirm=t.closest('#confirmSendGift');if(confirm){e.preventDefault();e.stopImmediatePropagation();void sendSelectedGift();return}
 const card=t.closest('#giftCatalog .gift-card');if(!card)return;
 const tabInventory=$('giftInventoryTab')?.classList.contains('active'),button=t.closest('[data-gift-send]'),buy=t.closest('[data-gift]');if(tabInventory)return;
 const id=button?.dataset.giftSend||buy?.dataset.gift;if(!id)return;
 const g=giftInfo(id);if(!g)return;
 const receiving=!!(window.pulseGiftRecipientId||window.pulseGiftRecipient);
 if(g.collectible){if(button||receiving){e.preventDefault();e.stopImmediatePropagation();openSendModal(g,null)}return}
 e.preventDefault();e.stopImmediatePropagation();
 if(button){openVariantModal(g,'send');return}
 if(receiving)openVariantModal(g,'send');else openVariantModal(g,'buy')
}
window.pulseOpenVariantPicker=(id,mode,current)=>{const g=giftInfo(id);if(g)openVariantModal(g,mode,current)};
window.pulseOpenGiftSend=id=>{const g=giftInfo(id);if(g&&g.collectible){openSendModal(g,null);return}if(typeof coreOpenGiftSend==='function')coreOpenGiftSend(id)};
document.addEventListener('click',onCapture,true);
const catalogRoot=$('giftCatalog');if(catalogRoot)new MutationObserver(()=>enhanceCards()).observe(catalogRoot,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>{reload();$('giftMarketOpen')?.addEventListener('click',openGiftResaleMarket);$('sendGiftVariantBtn')?.addEventListener('click',()=>{if(sendGift&&!sendGift.collectible)openVariantModal(sendGift,'update-send',sendVariant)});$('sendGiftModal')?.addEventListener('click',e=>{if(e.target.closest('[data-close="sendGiftModal"]')){sendGift=null;sendVariant=null;sendRecipientId=null}})});
})();