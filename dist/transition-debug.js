// Temporary diagnostics: always enabled until visual validation is complete.
(() => {
  const reportError = error => console.error('[FacilityGym diagnóstico] Falha no diagnóstico:', error);
  try {
  const fields = ['fontSize','lineHeight','position','width','height','transform','scale','overflow','overflowX','overflowY','opacity','visibility','display','zIndex','top','right','content'];
  const rect = el => { const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
  const style = (el,pseudo) => {const c=getComputedStyle(el,pseudo);return Object.fromEntries(fields.map(k=>[k,c[k]]));};
  const rules = el => {
    const result=[];
    function walk(items,source,conditions=[]) {
      for(const r of items) {
        if(r.selectorText) {try{if(el.matches(r.selectorText))result.push({source,conditions,selector:r.selectorText,css:r.style.cssText});}catch{}}
        else if(r.cssRules) walk(r.cssRules,source,[...conditions,r.conditionText||r.name||'group']);
      }
    }
    for(const sheet of document.styleSheets) {try{walk(sheet.cssRules,sheet.href||'inline');}catch{result.push({source:sheet.href,inaccessible:true});}}
    return result;
  };
  const inspect=el=>({element:el.tagName+'.'+el.className,style:style(el),inline:el.getAttribute('style'),box:rect(el),before:style(el,'::before'),after:style(el,'::after'),rules:rules(el)});
  const point=(el,p)=>{const m=el.getScreenCTM();if(!m)return null;const q=new DOMPoint(p.x,p.y).matrixTransform(m);return {x:q.x,y:q.y};};
  const endpoint=(selector,end)=>{const el=document.querySelector(selector);return point(el,el.getPointAtLength(end?el.getTotalLength():0));};
  const edge=(selector,side)=>{const el=document.querySelector(selector);const b=el.getBBox();return point(el,{x:side==='right'?b.x+b.width:side==='left'?b.x:b.x+b.width/2,y:side==='top'?b.y:side==='bottom'?b.y+b.height:b.y+b.height/2});};
  const samples=[];
  const panel=document.createElement('aside');
  panel.style.cssText='position:fixed;bottom:12px;right:12px;z-index:2147483647;background:#111;color:#eee;border:1px solid #bc9d60;padding:12px;font:12px monospace;max-width:90vw';
  const label=document.createElement('div');
  const button=document.createElement('button');button.type='button';button.textContent='Exportar diagnóstico real';
  button.style.cssText='display:block;background:#bc9d60;color:#111;border:0;padding:12px 16px;font:600 14px Arial,sans-serif;cursor:pointer;pointer-events:auto';
  panel.append(label,button);document.body.append(panel);
  function capture() {
    const age=document.querySelector('.audience-age');
    const parents=[];for(let el=age.parentElement;el;el=el.parentElement)parents.push(inspect(el));
    const pairs=[['supplier start',endpoint('.flow-supplier',false),edge('.node-supplier rect','right')],['supplier end',endpoint('.flow-supplier',true),edge('.node-facility rect','left')],['client start',endpoint('.flow-client',false),edge('.node-facility rect','right')],['client end',endpoint('.flow-client',true),edge('.node-client rect','left')],['trunk start',endpoint('.branch-trunk',false),edge('.node-facility rect','bottom')],['fork stock',endpoint('.branch-fork',false),edge('.node-stock rect','top')],['fork drop',endpoint('.branch-fork',true),edge('.node-drop rect','top')]];
    const report={at:new Date().toISOString(),url:location.href,viewport:{width:innerWidth,height:innerHeight,scrollY},age:inspect(age),parents,media:{mobile:matchMedia('(max-width:768px)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches},svg:[...document.querySelectorAll('.business-connections path,.business-node rect')].map(el=>({class:el.getAttribute('class'),d:el.getAttribute('d'),box:rect(el),style:style(el)})),connections:pairs.map(([name,a,b])=>({name,a,b,gapPx:a&&b?Math.hypot(a.x-b.x,a.y-b.y):null})),model:style(document.querySelector('#modelo')),mvv:style(document.querySelector('#proposito')),overflow:document.documentElement.scrollWidth>innerWidth};
    samples.push(report);if(samples.length>120)samples.shift();
    label.textContent=`20—40: ${report.age.style.fontSize} | ${report.age.style.width} × ${report.age.style.height} | scroll ${Math.round(scrollY)}`;
    console.info('[FacilityGym transition diagnostics]',report);
    return report;
  }
  button.addEventListener('click',()=>{try{capture();const url=URL.createObjectURL(new Blob([JSON.stringify(samples,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`facilitygym-debug-${innerWidth}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){reportError(error);label.textContent='Falha ao exportar: consulte o console.';}});
  let timer;const queue=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{capture();}catch(error){reportError(error);label.textContent='Falha na coleta: consulte o console.';}},350);};
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);addEventListener('load',queue);queue();
  } catch(error) { reportError(error); }
})();
