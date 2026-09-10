const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navigation.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}
// The store keeps its legacy menu. Motion is scoped to the institutional page.
(() => {
  const page = document.querySelector('.phase-one');
  if (!page || !window.gsap || !window.ScrollTrigger) return; // Readable static fallback.
  gsap.registerPlugin(ScrollTrigger);
  const $ = selector => page.querySelector(selector);
  const mm = gsap.matchMedia();
  const number = $('#capital-number');
  let counted = false;
  mm.add({ reduced:'(prefers-reduced-motion: reduce)', desktop:'(min-width: 769px)', mobile:'(max-width: 768px)' }, context => {
    const { reduced, desktop } = context.conditions;
    const sections = gsap.utils.toArray('.lp-section, .lp-manifesto', page);
    const hero = $('#inicio'), actor = $('.lp-object-motion'), stage = $('.lp-object-stage');
    const fallback = $('.lp-weight');
    const state = { x:0,y:0,scale:1,rotation:-8,depth:0,opacity:1,hero:1 };
    const entry = { opacity:1,scale:1,rotation:0 };
    const pointer = { x:0,y:0 };
    let threeActor, disposed=false, mobileStatic=false, actorActive=true;
    function actorView() {
      return { width:reduced ? stage.clientWidth : innerWidth, height:reduced ? stage.clientHeight : innerHeight,
        actorWidth:actor.offsetWidth, actorHeight:actor.offsetHeight, headerBottom:$('.lp-header').offsetHeight,
        reduced, mobile:!desktop, scroll:scrollY };
    }
    function paintActor() {
      if(disposed)return;
      const view=actorView();
      if(!reduced){
        const mouse=Math.max(0,1-scrollY/48);
        // The DOM actor remains a live fallback. The canvas receives no CSS transform.
        const halfBound=Math.hypot(view.actorWidth,view.actorHeight)*state.scale/2;
        const safeY=state.hero>.5 ? Math.max(state.y,view.headerBottom+24+halfBound-view.actorHeight/2) : state.y;
        gsap.set(actor,{x:state.x,y:safeY,scale:state.scale,rotation:-state.rotation,opacity:state.opacity,filter:`blur(${desktop ? Math.min(state.depth,4) : 0}px)`});
        gsap.set('.lp-object-entry',{opacity:entry.opacity,scale:entry.scale,rotation:-entry.rotation});
        gsap.set(fallback,{rotationX:pointer.x*mouse,rotationY:pointer.y*mouse});
        if(mobileStatic){
          // A slow/unsupported mobile GPU keeps a static hero fallback only.
          gsap.set(actor,{x:innerWidth-view.actorWidth*.9,y:Math.max(view.headerBottom+24,innerHeight-view.actorHeight*.7)-scrollY,scale:1,rotation:0,opacity:scrollY<hero.offsetHeight ? 1 : 0,filter:'none'});
        }
      }
      threeActor?.update();
    }
    import('./halter-3d.js').then(({createDumbbellActor})=>{
      if(disposed)return;
      threeActor=createDumbbellActor({stage,fallback,pose:{state,entry,pointer},getView:actorView,gsap,
        onFailure:()=>{ mobileStatic=!desktop&&!reduced;paintActor(); }});
      threeActor.setActive(actorActive);paintActor();
    }).catch(()=>{mobileStatic=!desktop&&!reduced;paintActor();});
    function disposeActor(){
      disposed=true;threeActor?.dispose();
      gsap.set([actor,$('.lp-object-entry'),fallback],{clearProps:'transform,opacity,filter'});
    }

    if (reduced) {
      number.textContent = '1.500';
      // No ScrollTrigger, pin or transform is constructed in this branch.
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          context.add(() => gsap.fromTo(entry.target, { opacity:.65 }, { opacity:1, duration:.5 }));
          observer.unobserve(entry.target);
        }
      }), { threshold:.15 });
      sections.forEach(section => observer.observe(section));
      return () => { observer.disconnect();disposeActor(); };
    }
    const manifesto = $('#manifesto'), equipment = $('#equipamentos');
    const parent = stage.parentNode, next = stage.nextSibling;
    page.appendChild(stage);
    stage.classList.add('is-persistent');
    const intro = gsap.timeline({ defaults:{ ease:'power3.out' } });
    intro.from('.lp-atmosphere', { opacity:0, duration:1.5 })
      .from('.lp-rule', { scaleX:0, duration:1.3 }, .2)
      .from('.lp-title-line', { opacity:0, y:20, filter:'blur(8px)', stagger:.25, duration:1.3 }, .4)
      .from('.lp-description', { opacity:0, duration:1 }, 1.6)
      .fromTo(entry, { opacity:0, scale:.92, rotation:0 }, { opacity:1, scale:1, rotation:0, duration:1, onUpdate:paintActor }, .6);
    gsap.to('.lp-depth', { opacity:0, y:-30, ease:'none', scrollTrigger:{ trigger:hero, start:'40% top', end:'bottom top', scrub:.5 } });
    gsap.to('.lp-rule-depth', { scaleX:.15, ease:'none', scrollTrigger:{ trigger:hero, start:'40% top', end:'bottom top', scrub:.5 } });
    gsap.utils.toArray('.lp-hero-photo, .lp-photo img').forEach(photo => gsap.fromTo(photo, { y:0 }, {
      yPercent:desktop ? -10 : -3, ease:'none', scrollTrigger:{ trigger:photo.closest('section'), start:'top bottom', end:'bottom top', scrub:.6 }
    }));
    // Preserve the two existing halter pins; the later story has its own shared pin.
    const manifestoPin = desktop ? ScrollTrigger.create({ trigger:manifesto, start:'top top', end:() => '+=' + innerHeight * .7, pin:true }) : null;
    const equipmentPin = desktop ? ScrollTrigger.create({ trigger:equipment, start:'top top', end:() => '+=' + innerHeight, pin:true, anticipatePin:1 }) : null;
    const reveal = gsap.timeline({ scrollTrigger:{ trigger:manifesto, start:'top 65%', toggleActions:'play none none reverse' } });
    reveal.fromTo('#manifesto [data-reveal]', { clipPath:'inset(0 0 100% 0)', opacity:0 }, { clipPath:'inset(0 0 0% 0)', opacity:1, duration:1, stagger:.2, ease:'power3.out' });
    gsap.to('.lp-manifesto-inner', { y:-25, opacity:.15, scale:desktop ? .97 : 1, ease:'none', scrollTrigger:{ trigger:manifesto, start:() => manifestoPin ? manifestoPin.end : '60% top', end:() => manifestoPin ? manifestoPin.end + innerHeight*.6 : 'bottom top', scrub:.5 } });
    gsap.utils.toArray('[data-enter]', page).forEach(element => gsap.from(element, { opacity:0, x:-20, duration:1, ease:'power3.out', scrollTrigger:{ trigger:element, start:'top 85%', once:true } }));
    gsap.fromTo('.audience-age', { xPercent:desktop ? -5 : -1 }, { xPercent:desktop ? 5 : 1, ease:'none', scrollTrigger:{ trigger:'#publico', start:'top bottom', end:'bottom top', scrub:desktop ? 1 : .3 } });
    gsap.fromTo('[data-audience]', { clipPath:'inset(0 0 100% 0)', opacity:0 }, { clipPath:'inset(0 0 0% 0)', opacity:1, duration:1.2, ease:'power3.out', scrollTrigger:{ trigger:'#publico', start:'top 65%', once:true } });
    const dock = $('.accessory-dock');
    gsap.fromTo(dock, { clipPath:'inset(0 0 100% 0)' }, { clipPath:'inset(0 0 0% 0)', duration:1, ease:'power3.out', scrollTrigger:{ trigger:'#acessorios', start:'top 85%', toggleActions:'play none none reverse' } });
    gsap.to(dock, { opacity:0, ease:'none', scrollTrigger:{ trigger:'#acessorios', start:'65% top', end:'bottom 10%', scrub:.3 } });
    const story = $('.story-stage');
    const panels = gsap.utils.toArray('.mvv-panel', page);
    const paths = gsap.utils.toArray('.flow-path', page);
    const nodes = gsap.utils.toArray('.business-node', page);
    gsap.set(paths, { strokeDasharray:1, strokeDashoffset:1 });
    gsap.set(nodes, { autoAlpha:0 });
    gsap.set('.business-explanation', { autoAlpha:0 });
    function diagramTimeline() {
      const tl = gsap.timeline({ defaults:{ ease:'none' } });
      tl.set(paths, { strokeDasharray:1, strokeDashoffset:1 }, 0)
        .set(nodes, { autoAlpha:0 }, 0)
        .set('#handoff-line', { opacity:1 }, 0)
        .set('.business-diagram', { scale:1, filter:'blur(0px)', opacity:1 }, 0)
        .to('.node-supplier', { autoAlpha:1, duration:8 }, 0)
        .to('#handoff-line', { opacity:.2, duration:8 }, 0)
        .to('.flow-supplier', { strokeDashoffset:0, duration:16 }, 8)
        .to('.node-facility', { autoAlpha:1, duration:6 }, 24)
        .to('.flow-client', { strokeDashoffset:0, duration:16 }, 30)
        .to('.node-client', { autoAlpha:1, duration:6 }, 46)
        .to('.flow-stock', { strokeDashoffset:0, duration:14 }, 54)
        .to('.node-stock', { autoAlpha:1, duration:6 }, 68)
        .to('.flow-drop', { strokeDashoffset:0, duration:14 }, 74)
        .to('.node-drop', { autoAlpha:1, duration:6 }, 88)
        .to('.business-explanation', { autoAlpha:1, duration:6 }, 94);
      return tl;
    }
    if (desktop) {
      story.classList.add('is-cinematic');
      gsap.set(panels, { autoAlpha:0 });
      gsap.set('.mvv-content', { autoAlpha:0 });
      gsap.set('.mvv-word', { autoAlpha:0, scale:.5, xPercent:-50, yPercent:-50, transformOrigin:'0 0' });
      gsap.set('.business-label', { autoAlpha:0 });
      // Canonical supplier path is already at its final coordinates in the DOM.
      // Only its parent transform changes; no second element is swapped into place.
      gsap.set('.shared-line-pivot', { svgOrigin:'260 240', x:-170, y:-80, rotation:90, scaleX:0 });
      const mvv = gsap.timeline({ defaults:{ ease:'none' } });
      mvv.set('.shared-line-pivot', { svgOrigin:'260 240', x:-170, y:-80, rotation:90, scaleX:0 }, 0);
      const beats = [
        { at:0, peak:8, label:14, read:26, exit:33, end:38, side:-40 },
        { at:33, peak:41, label:47, read:59, exit:66, end:71, side:40 },
        { at:66, peak:74, label:80, read:92, exit:96, end:100, side:-40 }
      ];
      panels.forEach((panel, i) => {
        const b=beats[i], word=panel.querySelector('.mvv-word'), content=panel.querySelector('.mvv-content');
        mvv.set(panel, { autoAlpha:1, filter:'blur(0px)', scale:1 }, b.at)
          .set(word, { autoAlpha:0, scale:.5, x:0, y:0, xPercent:-50, yPercent:-50 }, b.at)
          .to(word, { autoAlpha:1, scale:1.4, duration:b.peak-b.at }, b.at)
          .to(word, { scale:.3, x:() => -story.clientWidth*.32, y:() => -story.clientHeight*.17, xPercent:0, yPercent:0, duration:b.label-b.peak }, b.peak)
          .fromTo(content, { x:b.side, autoAlpha:0 }, { x:0, autoAlpha:1, duration:b.read-b.label }, b.label)
          .to(panel, { autoAlpha:0, filter:`blur(${i===2 ? 8 : 6}px)`, scale:i===2 ? 1 : .96, duration:b.end-b.exit }, b.exit);
      });
      mvv.to('.shared-line-pivot', { scaleX:300/140*.33, duration:25 }, 8)
        .to('.shared-line-pivot', { scaleX:300/140*.66, duration:33 }, 33)
        .to('.shared-line-pivot', { scaleX:300/140, duration:26 }, 66)
        .to('#handoff-line', { strokeWidth:2, duration:4 }, 92)
        .to('.shared-line-pivot', { x:0, y:0, rotation:0, scaleX:1, duration:4 }, 96);
      const diagram = diagramTimeline();
      diagram.set('.shared-line-pivot', { x:0, y:0, rotation:0, scaleX:1 }, 0)
        .to('.business-label', { autoAlpha:1, duration:8 }, 0)
        .to('.business-diagram', { scale:.92, filter:'blur(5px)', opacity:.15, duration:3 }, 97);
      // A single clock and pin prevent two independent scrub smoothers from drifting.
      const narrative = gsap.timeline({ scrollTrigger:{ id:'mvv-modelo', trigger:story, start:'top top', end:'+=3600', scrub:1, pin:true, anticipatePin:1, invalidateOnRefresh:true } });
      narrative.addLabel('mvv',0).add(mvv.duration(2600),0)
        .addLabel('handoff',2600).add(diagram.duration(1000),2600).addLabel('complete',3600);
    } else {
      panels.forEach(panel => gsap.from(panel, { opacity:0, duration:.8, ease:'power3.out', scrollTrigger:{ trigger:panel, start:'top 80%', once:true } }));
      // Complete once in 2.8s; no pin, no scrub, and no desktop exit fade.
      const diagram=diagramTimeline().duration(2.8);
      ScrollTrigger.create({ trigger:'.business-diagram', start:'top 75%', animation:diagram, once:true });
    }
    gsap.from('.capital-bar span', { scaleX:0, duration:.8, stagger:.2, ease:'power3.out', scrollTrigger:{ trigger:'.capital-distribution', start:'top 85%', once:true } });
    const closing=gsap.timeline({ defaults:{ ease:'power3.out' }, scrollTrigger:{ trigger:'.lp-final', start:'top 70%', once:true } });
    closing.fromTo('.lp-final', { backgroundColor:'#0c0d0e' }, { backgroundColor:'#000', duration:1 })
      .from('.lp-final-rule', { scaleX:0, duration:1.1 }, .2)
      .from('#final-title', { opacity:0, y:20, duration:1 }, .6)
      .from('.lp-final-button', { opacity:0, y:12, duration:.8 }, 1.3);
    const count = { value: counted ? 1500 : 0 };
    if (!counted) {
      number.textContent = '0';
      gsap.to(count, { value:1500, duration:1.2, ease:'power2.out', onStart:() => { counted = true; }, onUpdate:() => { number.textContent = Math.round(count.value).toLocaleString('pt-BR'); }, scrollTrigger:{ trigger:'#financeiro', start:'top 75%', once:true } });
    } else number.textContent = '1.500';
    // One timeline owns all scroll transforms. Positions are rebuilt after pin layout/resize.
    const journey = gsap.timeline({ paused:true, defaults:{ ease:'none' }, onUpdate:paintActor });
    let journeyTrigger;
    function buildJourney() {
      const w=innerWidth, h=innerHeight, aw=actor.offsetWidth, ah=actor.offsetHeight;
      const top = id => $(id).getBoundingClientRect().top + scrollY;
      const mStart=manifestoPin ? manifestoPin.start : top('#manifesto');
      const mEnd=manifestoPin ? manifestoPin.end : mStart+h*.3;
      const eStart=equipmentPin ? equipmentPin.start : top('#equipamentos');
      const eEnd=equipmentPin ? equipmentPin.end : eStart+h*.45;
      const aStart=top('#acessorios'), finish=top('#publico')-h*.1;
      const dockRect=dock.getBoundingClientRect();
      const dockScale=Math.min(.4,dockRect.width*.8/aw);
      const dockX=dockRect.left+dockRect.width/2-aw/2;
      const lineY=top('#acessorios')+$('.dock-rule').offsetTop;
      const landAt=aStart+h*.25;
      const landedY=lineY-landAt-ah/2-ah*.4*dockScale;
      const center=(w-aw)/2, right=w-aw*.9;
      const bottom=Math.max($('.lp-header').offsetHeight+24+Math.hypot(aw,ah)/2-ah/2,h-ah*.7);
      const frame=(x,y,scale,rotation=0,depth=0,opacity=1,hero=0) => ({ x,y,scale,rotation:desktop?rotation:rotation*.12,depth,opacity,hero });
      const frames=[
        [0,frame(right,bottom,1,-8,0,1,1)],
        [Math.min(hero.offsetHeight*.7,mStart*.7),frame(right+(desktop?60:30),bottom-(desktop?80:40),.85,15,0,1,1)],
        [mStart,frame(center,h*.45,.6,15,4)],
        [mEnd,frame(center+w*(desktop?.04:.02),h*.45,.6,45,4)],
        [mEnd+h*.55,frame(right,h*.6,.9,45)],
        [top('#apresentacao')+h*.65,frame(right,h*.72,.4,15)],
        [top('#suplementacao')-h*.2,frame(-w*(desktop?.3:.15),h*.62,.5,-20)],
        [top('#suplementacao')+h*.55,frame(center,h*.6,.9,0)],
        [eStart,frame(center,h*.45,.9,0)],
        [eEnd,frame(center,h*.45,desktop?1.4:1,desktop?240:0)],
        [aStart,frame(dockX,landedY-h*.16,.5,240,2)],
        [landAt,frame(dockX,landedY,dockScale,240,0)],
        [aStart+h*.65,frame(dockX,lineY-(aStart+h*.65)-ah/2-ah*.4*dockScale,dockScale,240,0)],
        [finish,frame(dockX,lineY-finish-ah/2,.15,240,8,0)]
      ];
      journey.clear();
      journey.set(state,frames[0][1],0);
      let previous=0;
      const actorState=state;
      frames.slice(1).forEach(([position,keyframe]) => {
        const at=Math.max(previous+1,position);
        journey.to(actorState,{...keyframe,duration:at-previous},previous);
        previous=at;
      });
      if (journeyTrigger) journey.progress(journeyTrigger.progress);
      else journey.progress(0);
      paintActor();
    }
    // Refresh pin metrics before measuring a continuous path across their spacers.
    ScrollTrigger.refresh();
    buildJourney();
    journeyTrigger=ScrollTrigger.create({ animation:journey, start:0, end:() => $('#publico').getBoundingClientRect().top+scrollY-innerHeight*.1, scrub:desktop?.65:.3, invalidateOnRefresh:true, onUpdate:self => { actorActive=self.progress<1;stage.style.visibility=actorActive ? '' : 'hidden';threeActor?.setActive(actorActive);paintActor(); } });
    ScrollTrigger.addEventListener('refresh',buildJourney);
    let move, leave;
    if (desktop && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const rotateX=gsap.quickTo(pointer,'x',{ duration:.7,ease:'power3.out',onUpdate:paintActor });
      const rotateY=gsap.quickTo(pointer,'y',{ duration:.7,ease:'power3.out',onUpdate:paintActor });
      move=event => { if(scrollY>2){rotateX(0);rotateY(0);return;}const r=hero.getBoundingClientRect(); rotateY(gsap.utils.clamp(-4,4,((event.clientX-r.left)/r.width-.5)*8)); rotateX(gsap.utils.clamp(-4,4,-((event.clientY-r.top)/r.height-.5)*8)); };
      leave=() => { rotateX(0); rotateY(0); };
      hero.addEventListener('pointermove',move); hero.addEventListener('pointerleave',leave);
    }
    return () => {
      disposeActor();
      ScrollTrigger.removeEventListener('refresh',buildJourney);
      if (move) { hero.removeEventListener('pointermove',move); hero.removeEventListener('pointerleave',leave); }
      story.classList.remove('is-cinematic');
      stage.style.removeProperty('visibility');
      stage.classList.remove('is-persistent'); parent.insertBefore(stage,next);
      number.textContent='1.500';
    };
  });
})();
