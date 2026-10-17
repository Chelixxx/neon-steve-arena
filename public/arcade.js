(()=>{'use strict';
const $=id=>document.getElementById(id);
const games={
 'voxel-builder':{title:'Voxel Builder',src:'/arcade/voxel-builder.html',credit:'Автор: Pulse Arcade · оригинальная игра',creditHtml:'Оригинальная браузерная voxel-песочница, созданная для Pulse. Не является продуктом Mojang или Microsoft.'},
 'neon-maze':{title:'Neon Maze',src:'/arcade/maze.html',credit:'Автор: Pulse Arcade · оригинальная игра',creditHtml:'Оригинальная мини-игра Pulse Arcade. Собирай кристаллы и найди выход.'}
};
function open(){ $('arcadeModal').classList.remove('hidden') }
function stop(){ $('arcadeFrame').src='about:blank';$('arcadePlayer').classList.add('hidden');$('arcadeCatalog').classList.remove('hidden') }
function launch(key){const g=games[key];if(!g)return;$('arcadeCatalog').classList.add('hidden');$('arcadePlayer').classList.remove('hidden');$('arcadeGameTitle').textContent=g.title;$('arcadeCredit').textContent=g.credit;$('arcadeAttribution').textContent=g.creditHtml;$('arcadeFrame').title=g.title;$('arcadeFrame').src=g.src}
document.addEventListener('click',e=>{if(e.target.closest('[data-nav-action="arcade"]')){e.preventDefault();open();stop();return}const game=e.target.closest('[data-arcade-game]');if(game){launch(game.dataset.arcadeGame);return}if(e.target.closest('#arcadeBack')){stop();return}if(e.target.closest('#arcadeFullscreen')){const f=$('arcadeFrame');if(f.requestFullscreen)f.requestFullscreen().catch(()=>{});else if(f.webkitRequestFullscreen)f.webkitRequestFullscreen();return}if(e.target.closest('[data-close="arcadeModal"]')||e.target===$('arcadeModal')){$('arcadeModal').classList.add('hidden');stop()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('arcadeModal')&&!$('arcadeModal').classList.contains('hidden')){$('arcadeModal').classList.add('hidden');stop()}});
})();