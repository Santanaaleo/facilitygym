// Temporary diagnostics: always enabled until visual validation is complete.
(() => {
  const fields = ['fontSize','lineHeight','position','width','height','transform','scale','overflow','overflowX','overflowY','opacity','visibility','display','zIndex','top','right','content'];
  const samples=[];
  let missing=new Set(), issues=[];
  const identity=el=>el ? el.tagName+(el.id?'#'+el.id:'.'+(el.getAttribute('class')||'')) : '(unknown element)';
  const absent=selector=>{missing.add(selector);return {found:false,selector,bbox:null};};
  function safe(selector,operation,fn) {
    try {return fn();} catch(error) {
      const issue={selector,operation,error:String(error.message||error)};
      issues.push(issue);return {found:true,...issue,bbox:null};
    }
  }
  const find=selector=>safe(selector,'querySelector',()=>document.querySelector(selector));
  function measure(el,selector,operation,fn) {
    if(!el)return absent(selector);
    return safe(selector,operation,()=>fn(el));
  }
  const rect=(el,selector=identity(el))=>measure(el,selector,'getBoundingClientRect',node=>{
    const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
  });
  const style=(el,pseudo,selector=identity(el))=>measure(el,selector,'getComputedStyle'+(pseudo||''),node=>{
    const c=getComputedStyle(node,pseudo);return Object.fromEntries(fields.map(k=>[k,c[k]]));
  });
  const rules=(el,selector=identity(el))=>measure(el,selector,'CSS rules',node=>{
    const result=[];
    function walk(items,source,conditions=[]) {
      for(const r of items) {
        if(r.selectorText) {try{if(node.matches(r.selectorText))result.push({source,conditions,selector:r.selectorText,css:r.style.cssText});}catch{}}
        else if(r.cssRules) walk(r.cssRules,source,[...conditions,r.conditionText||r.name||'group']);
      }
    }
    for(const sheet of document.styleSheets) {try{walk(sheet.cssRules,sheet.href||'inline');}catch{result.push({source:sheet.href,inaccessible:true});}}
    return result;
  });
  const inspect=(el,selector=identity(el))=>measure(el,selector,'inspect',node=>({
    found:true,selector,element:identity(node),style:style(node,undefined,selector),inline:node.getAttribute('style'),
    box:rect(node,selector),before:style(node,'::before',selector),after:style(node,'::after',selector),rules:rules(node,selector)
  }));
  const point=(el,p,selector)=>measure(el,selector,'getScreenCTM',node=>{
    const m=node.getScreenCTM();if(!m)return {found:true,selector,bbox:null,point:null,reason:'No screen matrix'};
    const q=new DOMPoint(p.x,p.y).matrixTransform(m);return {found:true,selector,x:q.x,y:q.y};
  });
  const endpoint=(selector,end)=>measure(find(selector),selector,'path endpoint',el=>
    point(el,el.getPointAtLength(end?el.getTotalLength():0),selector));
  const edge=(selector,side)=>measure(find(selector),selector,'getBBox',el=>{
    const b=el.getBBox();return point(el,{x:side==='right'?b.x+b.width:side==='left'?b.x:b.x+b.width/2,y:side==='top'?b.y:side==='bottom'?b.y+b.height:b.y+b.height/2},selector);
  });
  const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  const panel=document.createElement('aside');
  panel.style.cssText='position:fixed;bottom:12px;right:12px;z-index:2147483647;background:#111;color:#eee;border:1px solid #bc9d60;padding:12px;font:12px monospace;max-width:90vw';
  const label=document.createElement('div');
  const button=document.createElement('button');button.type='button';button.textContent='Exportar diagnóstico real';
  button.style.cssText='display:block;background:#bc9d60;color:#111;border:0;padding:12px 16px;font:600 14px Arial,sans-serif;cursor:pointer;pointer-events:auto';
  panel.append(label,button);document.body.append(panel);
  function capture() {
    missing=new Set();issues=[];
    const report={at:new Date().toISOString(),url:location.href,viewport:{width:innerWidth,height:innerHeight,scrollY}};
    report.age=inspect(find('.audience-age'),'.audience-age');
    report.parents=safe('.audience-age','parents',()=>{
      const parents=[],age=find('.audience-age');
      for(let el=age?.parentElement;el;el=el.parentElement)parents.push(inspect(el));
      return parents;
    });
    report.connections=[
      ['supplier start','.flow-supplier',false,'.node-supplier rect','right'],
      ['supplier end','.flow-supplier',true,'.node-facility rect','left'],
      ['client start','.flow-client',false,'.node-facility rect','right'],
      ['client end','.flow-client',true,'.node-client rect','left'],
      ['trunk start','.branch-trunk',false,'.node-facility rect','bottom'],
      ['fork stock','.branch-fork',false,'.node-stock rect','top'],
      ['fork drop','.branch-fork',true,'.node-drop rect','top']
    ].map(([name,path,end,node,side])=>{
      const a=endpoint(path,end),b=edge(node,side);
      return {name,a,b,gapPx:finitePoint(a)&&finitePoint(b)?Math.hypot(a.x-b.x,a.y-b.y):null};
    });
    report.media=safe('window','matchMedia',()=>({mobile:matchMedia('(max-width:768px)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches}));
    report.svg=safe('.business-connections path,.business-node rect','SVG collection',()=>
      [...document.querySelectorAll('.business-connections path,.business-node rect')].map(el=>inspect(el)));
    report.model=style(find('#modelo'),undefined,'#modelo');
    report.mvv=style(find('#proposito'),undefined,'#proposito');
    report.overflow=safe('html','overflow',()=>document.documentElement.scrollWidth>innerWidth);
    report.missingSelectors=[...missing];report.issues=[...issues];
    samples.push(report);if(samples.length>120)samples.shift();
    label.textContent=`20—40: ${report.age.style?.fontSize||'indisponível'} | ${report.missingSelectors.length} seletores ausentes`;
    return report;
  }
  function collect() {
    try {return capture();}catch(error){
      // An unexpected collection failure is also exportable diagnostic data.
      const report={at:new Date().toISOString(),missingSelectors:[...missing],issues:[...issues,{operation:'capture',error:String(error.message||error)}]};
      samples.push(report);label.textContent='Coleta parcial; detalhes disponíveis no JSON.';return report;
    }
  }
  button.addEventListener('click',()=>{
    try {
      collect();
      const url=URL.createObjectURL(new Blob([JSON.stringify(samples,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download=`facilitygym-debug-${innerWidth}.json`;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){console.error('[FacilityGym diagnóstico] Falha total da exportação:',error);label.textContent='Falha ao exportar: consulte o console.';}
  });
  let timer;const queue=()=>{clearTimeout(timer);timer=setTimeout(collect,350);};
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);addEventListener('load',queue);queue();
})();
