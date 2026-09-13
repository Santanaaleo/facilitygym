const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (!reduced.matches) document.body.classList.add('motion-ready');
const scene = document.querySelector('.product-scene');
let actor, generation=0;
async function start() {
  const current=++generation;
  scene.dataset.state='waiting';
  try {
    const { createCreatineActor } = await import('./creatina-3d.js');
    if(current!==generation)return;
    const loaded=await createCreatineActor(scene);
    if(current!==generation){loaded.dispose();return;}
    actor=loaded;
  } catch (error) {
    if(current!==generation)return;
    scene.dataset.state = 'fallback';
    console.warn('[FacilityGym loja] Visualização 3D indisponível:', error.message);
  }
}
start();
addEventListener('pagehide', () => {generation++;actor?.dispose();actor=undefined;});
addEventListener('pageshow', event => { if (event.persisted) start(); });
