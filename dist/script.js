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
      return () => observer.disconnect();
    }
    const hero = $('#inicio'), manifesto = $('#manifesto'), equipment = $('#equipamentos');
    const actor = $('.lp-object-motion'), stage = $('.lp-object-stage');
    const parent = stage.parentNode, next = stage.nextSibling;
    page.appendChild(stage);
    stage.classList.add('is-persistent');
    const intro = gsap.timeline({ defaults:{ ease:'power3.out' } });
    intro.from('.lp-atmosphere', { opacity:0, duration:1.5 })
      .from('.lp-rule', { scaleX:0, duration:1.3 }, .2)
      .from('.lp-title-line', { opacity:0, y:20, filter:'blur(8px)', stagger:.25, duration:1.3 }, .4)
      .from('.lp-description', { opacity:0, duration:1 }, 1.6)
      .fromTo('.lp-object-entry', { opacity:0, scale:.92, rotation:-6 }, { opacity:1, scale:1, rotation:0, duration:1 }, .6);
    gsap.to('.lp-depth', { opacity:0, y:-30, ease:'none', scrollTrigger:{ trigger:hero, start:'40% top', end:'bottom top', scrub:.5 } });
    gsap.to('.lp-rule-depth', { scaleX:.15, ease:'none', scrollTrigger:{ trigger:hero, start:'40% top', end:'bottom top', scrub:.5 } });
    gsap.utils.toArray('.lp-hero-photo, .lp-photo img').forEach(photo => gsap.fromTo(photo, { y:0 }, {
      yPercent:desktop ? -10 : -3, ease:'none', scrollTrigger:{ trigger:photo.closest('section'), start:'top bottom', end:'bottom top', scrub:.6 }
    }));
    // Only these two sections pin, and only above 768px.
    const manifestoPin = desktop ? ScrollTrigger.create({ trigger:manifesto, start:'top top', end:() => '+=' + innerHeight * .7, pin:true }) : null;
    const equipmentPin = desktop ? ScrollTrigger.create({ trigger:equipment, start:'top top', end:() => '+=' + innerHeight, pin:true, anticipatePin:1 }) : null;
    const reveal = gsap.timeline({ scrollTrigger:{ trigger:manifesto, start:'top 65%', toggleActions:'play none none reverse' } });
    reveal.fromTo('#manifesto [data-reveal]', { clipPath:'inset(0 0 100% 0)', opacity:0 }, { clipPath:'inset(0 0 0% 0)', opacity:1, duration:1, stagger:.2, ease:'power3.out' });
    gsap.to('.lp-manifesto-inner', { y:-25, opacity:.15, scale:desktop ? .97 : 1, ease:'none', scrollTrigger:{ trigger:manifesto, start:() => manifestoPin ? manifestoPin.end : '60% top', end:() => manifestoPin ? manifestoPin.end + innerHeight*.6 : 'bottom top', scrub:.5 } });
    gsap.utils.toArray('[data-enter]', page).forEach(element => gsap.from(element, { opacity:0, x:-20, duration:1, ease:'power3.out', scrollTrigger:{ trigger:element, start:'top 85%', once:true } }));
    gsap.from('[data-audience]', { opacity:0, scale:desktop ? .97 : 1, duration:1.2, ease:'power3.out', scrollTrigger:{ trigger:'#publico', start:'top 70%', once:true } });
    const values = gsap.utils.toArray('.lp-value', page);
    values.forEach((value, i) => {
      const tl = gsap.timeline({ scrollTrigger:{ trigger:value, start:'top 70%', toggleActions:'play none none reverse' } });
      tl.fromTo(value, { y:30, opacity:0 }, { y:0, opacity:1, duration:.9, ease:'power3.out' });
      if (i) tl.to(values[i-1], { y:-30, opacity:0, duration:.9, ease:'power3.out' }, 0);
    });
    const count = { value: counted ? 1500 : 0 };
    if (!counted) {
      number.textContent = '0';
      gsap.to(count, { value:1500, duration:1.2, ease:'power2.out', onStart:() => { counted = true; }, onUpdate:() => { number.textContent = Math.round(count.value).toLocaleString('pt-BR'); }, scrollTrigger:{ trigger:'#financeiro', start:'top 75%', once:true } });
    } else number.textContent = '1.500';
    // One timeline owns all scroll transforms. Positions are rebuilt after pin layout/resize.
    const journey = gsap.timeline({ paused:true, defaults:{ ease:'none' } });
    let journeyTrigger;
    function buildJourney() {
      const w=innerWidth, h=innerHeight, aw=actor.offsetWidth, ah=actor.offsetHeight;
      const top = id => $(id).getBoundingClientRect().top + scrollY;
      const mStart=manifestoPin ? manifestoPin.start : top('#manifesto');
      const mEnd=manifestoPin ? manifestoPin.end : mStart+h*.3;
      const eStart=equipmentPin ? equipmentPin.start : top('#equipamentos');
      const eEnd=equipmentPin ? equipmentPin.end : eStart+h*.45;
      const aStart=top('#acessorios'), finish=top('#publico')-h*.1;
      const center=(w-aw)/2, right=w-aw*.86, bottom=h-ah*.65;
      const frame=(x,y,scale,rotation=0,blur=0,opacity=1) => ({ x,y,scale,rotation:desktop?rotation:0,filter:`blur(${desktop?blur:0}px)`,opacity });
      const frames=[
        [0,frame(right,bottom-40,1,-2)],
        [Math.min(hero.offsetHeight*.7,mStart*.7),frame(right+(desktop?60:10),bottom-(desktop?120:65),.85,15)],
        [mStart,frame(center,h*.45,.6,15,4)],
        [mEnd,frame(center+w*.04,h*.45,.6,45,4)],
        [mEnd+h*.55,frame(right,h*.6,.9,45)],
        [top('#apresentacao')+h*.65,frame(right,h*.72,.4,15)],
        [top('#suplementacao')-h*.2,frame(-w*.3,h*.62,.5,-20)],
        [top('#suplementacao')+h*.55,frame(center,h*.6,.9,0)],
        [eStart,frame(center,h*.45,.9,0)],
        [eEnd,frame(center,h*.45,desktop?1.4:1,desktop?210:0)],
        [aStart,frame(center+w*(desktop?.4:.18),h*.52,.6,210,6)],
        [aStart+h*.5,frame(right,h*.4,.4,210,3,.3)],
        [finish,frame(right,-ah,.15,210,8,0)]
      ];
      journey.clear();
      journey.set(actor,frames[0][1],0);
      let previous=0;
      frames.slice(1).forEach(([position,state]) => {
        const at=Math.max(previous+1,position);
        journey.to(actor,{...state,duration:at-previous},previous);
        previous=at;
      });
      if (journeyTrigger) journey.progress(journeyTrigger.progress);
    }
    // Refresh pin metrics before measuring a continuous path across their spacers.
    ScrollTrigger.refresh();
    buildJourney();
    journeyTrigger=ScrollTrigger.create({ animation:journey, start:0, end:() => $('#publico').getBoundingClientRect().top+scrollY-innerHeight*.1, scrub:desktop?.65:.3, invalidateOnRefresh:true });
    ScrollTrigger.addEventListener('refresh',buildJourney);
    let move, leave;
    if (desktop && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const rotateX=gsap.quickTo('.lp-weight','rotationX',{ duration:.7,ease:'power3.out' });
      const rotateY=gsap.quickTo('.lp-weight','rotationY',{ duration:.7,ease:'power3.out' });
      move=event => { const r=hero.getBoundingClientRect(); rotateY(gsap.utils.clamp(-4,4,((event.clientX-r.left)/r.width-.5)*8)); rotateX(gsap.utils.clamp(-4,4,-((event.clientY-r.top)/r.height-.5)*8)); };
      leave=() => { rotateX(0); rotateY(0); };
      hero.addEventListener('pointermove',move); hero.addEventListener('pointerleave',leave);
    }
    return () => {
      ScrollTrigger.removeEventListener('refresh',buildJourney);
      if (move) { hero.removeEventListener('pointermove',move); hero.removeEventListener('pointerleave',leave); }
      stage.classList.remove('is-persistent'); parent.insertBefore(stage,next);
      number.textContent='1.500';
    };
  });
})();
