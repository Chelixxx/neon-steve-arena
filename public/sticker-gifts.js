(()=>{'use strict';
const $=id=>document.getElementById(id);
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
function artForGift(g){const itemId=String(g.id||g.giftId||''),baseId=String(g.baseGiftId||'');if(itemId==='gift-013'||baseId==='gift-013')return lightningSvg(g);if(/^halloween-pumpkin-\d+$/.test(itemId))return pumpkinArt(g);if(/^voltra-bat-\d+$/.test(itemId)&&typeof legacyGiftSvg==='function')return legacyGiftSvg({...g,id:itemId});if(g.image&&g.collectible&&!g.ownedInstance)return '<img src="'+esc(g.image)+'" alt="">';return stickerSvg(g)}
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
 $('sendGiftRecipient').value=window.pulseGiftRecipient||'';window.pulseGiftRecipient='';$('sendGiftMessage').value='';$('sendGiftStatus').textContent='';refreshSendPreview();$('sendGiftModal').classList.remove('hidden')
}
async function sendSelectedGift(){
 if(!sendGift)return;const username=$('sendGiftRecipient').value.trim(),note=$('sendGiftMessage').value.trim().slice(0,300),btn=$('confirmSendGift');
 if(!sendRecipientId&&!username){$('sendGiftStatus').textContent='Укажи ник получателя';return}
 btn.disabled=true;
 try{const body=sendRecipientId?{userId:sendRecipientId,giftId:sendGift.id,variant:sendVariant,message:note}:{username,giftId:sendGift.id,variant:sendVariant,message:note};
 const r=await fetch('/api/gifts/send',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.error||'Не удалось отправить подарок');
 if(d.message&&window.pulseInjectMessage)window.pulseInjectMessage(d.message);
 window.dispatchEvent(new CustomEvent('pulsePulsesUpdated',{detail:{pulses:d.balance}}));window.dispatchEvent(new Event('pulseGiftInventoryUpdated'));
 $('sendGiftStatus').textContent='Подарок отправлен пользователю '+d.recipient+' ✓';$('sendGiftModal').classList.add('hidden');toast('Подарок отправлен 🎁')
 }catch(e){$('sendGiftStatus').textContent=e.message;toast(e.message)}finally{btn.disabled=false}
}
function toast(s){const t=$('toast');if(t){t.textContent=s;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)}}
window.pulseGiftInspectionData=id=>{const g=giftInfo(id);if(!g)return null;const art=artForGift(g),base=String(g.baseGiftId||g.id);return {id:g.id,name:String(g.name||'').replace(/\s+1$/,''),emoji:g.emoji,rarity:g.rarity,material:g.material||'',pattern:g.pattern||'',kind:/^halloween-pumpkin-/.test(base)?'pumpkin':/^voltra-bat-/.test(base)?'bat':'sticker',art,accent:(pal[g.skin]||pal.classic)[0]}};

async function openGiftResaleMarket(){
 let modal=$('giftResaleMarketModal');
 if(!modal){modal=document.createElement('div');modal.id='giftResaleMarketModal';modal.className='gift-variant-backdrop';modal.innerHTML='<section class="gift-variant-panel gift-market-panel"><header><div><small>VOLTRA MARKET</small><h2>🏷️ Маркет подарков</h2><p>Покупай подарки у других пользователей по фиксированной цене.</p></div><button type="button" id="closeGiftResaleMarket">×</button></header><div id="giftResaleMarketStatus" class="muted"></div><div id="giftResaleListings" class="gift-resale-listings"></div></section>';document.body.appendChild(modal);$('closeGiftResaleMarket').onclick=()=>modal.classList.remove('show')}
 modal.classList.add('show');
 const status=$('giftResaleMarketStatus'),root=$('giftResaleListings');status.textContent='Загружаю лоты…';
 try{
  const r=await fetch('/api/gifts/resale',{credentials:'same-origin'}),d=await r.json();
  if(!r.ok)throw new Error(d.error||'Не удалось открыть маркет');
  const list=d.listings||[];
  status.textContent=list.length?'Активных лотов: '+list.length:'Пока нет активных лотов. Чтобы продать подарок, открой «Мою коллекцию» и нажми «Продать / выставить».';
  root.innerHTML=list.map(l=>{
   const art=artForGift({...l,id:l.baseGiftId||l.giftId,baseGiftId:l.baseGiftId||'',giftId:l.giftId,name:l.giftName,emoji:l.emoji});
   const prices=(l.priceVlt?'<button type="button" data-resale-buy="'+esc(l.id)+'" data-resale-currency="vlt">Купить за '+Number(l.priceVlt).toLocaleString('ru-RU')+' ϟ</button>':'')+(l.priceCat?'<button type="button" class="secondary" data-resale-buy="'+esc(l.id)+'" data-resale-currency="cat">Купить за '+Number(l.priceCat).toLocaleString('ru-RU')+' CAT</button>':'');
   return '<article class="gift-resale-card"><div class="gift-resale-art">'+art+'</div><div class="gift-resale-info"><b>'+esc(l.giftName||'Подарок')+'</b><small>Продавец: '+esc(l.sellerName||'Пользователь')+'</small><small>'+esc(l.material||'Особое оформление')+' · вариант #'+String(l.variant||1).padStart(2,'0')+'</small></div><div class="gift-resale-actions">'+(l.mine?'<span>Твой лот</span><button type="button" class="secondary" data-resale-cancel="'+esc(l.id)+'">Снять с продажи</button>':prices)+'</div></article>';
  }).join('');
 }catch(e){status.textContent=e.message;root.innerHTML=''}
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
 if(t.closest('#giftMarketOpen')){e.preventDefault();e.stopImmediatePropagation();void openGiftResaleMarket();return}
 if(t.closest('#openGifts')){void reload();return}
 const variantBtn=t.closest('#sendGiftVariantBtn');if(variantBtn){e.preventDefault();e.stopImmediatePropagation();if(sendGift)openVariantModal(sendGift,'update-send',sendVariant);return}
 const confirm=t.closest('#confirmSendGift');if(confirm){e.preventDefault();e.stopImmediatePropagation();void sendSelectedGift();return}
 const card=t.closest('#giftCatalog .gift-card');if(!card)return;
 const tabInventory=$('giftInventoryTab')?.classList.contains('active'),button=t.closest('[data-gift-send]'),buy=t.closest('[data-gift]');if(tabInventory)return;
 const id=button?.dataset.giftSend||buy?.dataset.gift;if(!id)return;
 const g=giftInfo(id);if(!g||g.collectible)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(button){openVariantModal(g,'send');return}
 if(window.pulseGiftRecipientId||window.pulseGiftRecipient)openVariantModal(g,'send');else openVariantModal(g,'buy')
}
window.pulseOpenVariantPicker=(id,mode,current)=>{const g=giftInfo(id);if(g)openVariantModal(g,mode,current)};
document.addEventListener('click',onCapture,true);
const catalogRoot=$('giftCatalog');if(catalogRoot)new MutationObserver(()=>enhanceCards()).observe(catalogRoot,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>{reload();$('giftMarketOpen')?.addEventListener('click',openGiftResaleMarket);$('sendGiftVariantBtn')?.addEventListener('click',()=>{if(sendGift&&!sendGift.collectible)openVariantModal(sendGift,'update-send',sendVariant)});$('sendGiftModal')?.addEventListener('click',e=>{if(e.target.closest('[data-close="sendGiftModal"]')){sendGift=null;sendVariant=null;sendRecipientId=null}})});
})();