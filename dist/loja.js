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

// Values in cents: keep the commercial composition exact and independent of 3D.
const products = {
  creatina: { name: 'Creatina 300g', price: 8990, costs: [3800,1200,450,540], operation: 'Estoque próprio' },
  whey: { name: 'Whey Protein 900g', price: 12990, costs: [6500,1300,650,780], operation: 'Estoque próprio' },
  shaker: { name: 'Shaker FacilityGym', price: 3990, costs: [1200,800,200,240], operation: 'Estoque próprio' },
  halteres: { name: 'Kit Halteres', price: 18990, costs: [9200,2800,950,1140], operation: 'Sob encomenda' }
};
const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const panel = document.querySelector('.price-anatomy');
const tabs = [...document.querySelectorAll('.price-selector button')];
const segments = [...document.querySelectorAll('.cost-bar span')];
let activeProduct = 'creatina';
const fades = new Map();
async function updateNumber(element, text) {
  fades.get(element)?.cancel();
  if (reduced.matches || !element.animate) { element.textContent = text; return; }
  const outgoing = element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: 'forwards', easing: 'ease-out' });
  fades.set(element, outgoing);
  try { await outgoing.finished; } catch { return; }
  element.textContent = text;
  outgoing.cancel();
  const incoming = element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 130, easing: 'ease-out' });
  fades.set(element, incoming);
}
function selectProduct(key) {
  const product = products[key];
  if (!product || key === activeProduct) return;
  activeProduct = key;
  const total = product.costs.reduce((sum, value) => sum + value, 0);
  const profit = product.price - total;
  const values = [...product.costs, profit];
  const margin = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(profit / product.price * 100) + '%';
  tabs.forEach(tab => {
    const selected = tab.dataset.product === key;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', `tab-${key}`);
  panel.querySelector('[data-field=name]').textContent = product.name;
  panel.querySelector('[data-field=operation]').textContent = product.operation;
  updateNumber(panel.querySelector('[data-field=price]'), money(product.price));
  updateNumber(panel.querySelector('[data-field=margin]'), margin);
  panel.querySelector('[data-field=total]').textContent = money(total);
  values.forEach((value, index) => {
    segments[index].style.flexGrow = String(value / product.price * 100);
    panel.querySelector(`[data-cost="${index}"]`).textContent = money(value);
  });
  document.querySelector('#price-announcement').textContent = `${product.name}. Preço ${money(product.price)}. Custo total ${money(total)}. Lucro ${money(profit)}. Margem ${margin}.`;
}
// Normalize the initial segments to the same 100-unit basis used on updates.
segments.forEach((segment, index) => { segment.style.flexGrow = String([3800,1200,450,540,3000][index] / 8990 * 100); });
document.querySelectorAll('[data-product]').forEach(control => control.addEventListener('click', () => selectProduct(control.dataset.product)));
tabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
  let next;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  if (next === undefined) return;
  event.preventDefault();
  tabs[next].focus();
  selectProduct(tabs[next].dataset.product);
}));
reduced.addEventListener('change', () => {
  if (!reduced.matches) return;
  fades.forEach(animation => animation.cancel());
  const product = products[activeProduct];
  const profit = product.price - product.costs.reduce((sum, value) => sum + value, 0);
  panel.querySelector('[data-field=price]').textContent = money(product.price);
  panel.querySelector('[data-field=margin]').textContent = (profit / product.price * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
});
