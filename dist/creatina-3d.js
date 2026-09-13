import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
const MODEL_URL = new URL('./assets/facilitygym_creatine.glb', import.meta.url);
const PARTS = ['Jar_Body','Jar_Gold_Ring','Jar_Label','Jar_Lid'];
const MATERIALS = ['MAT_body_softtouch','MAT_gold_ring','MAT_label','MAT_lid_brushed'];

export async function createCreatineActor(figure) {
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`GLB não disponível (HTTP ${response.status}).`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL('.',MODEL_URL).href);
  let renderer, observer, frame=0, resizeTimer, disposed=false, visible=true;
  const host=figure.querySelector('.model-host');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(min-width:769px) and (hover:hover) and (pointer:fine)');
  const materials=new Set(), geometries=new Set(), textures=new Set();
  gltf.scene.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);[].concat(node.material).forEach(m=>{materials.add(m);Object.values(m).forEach(t=>{if(t?.isTexture)textures.add(t);});});}});
  function release(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer?.dispose();renderer?.domElement.remove();}
  try {
    const root=gltf.scene.getObjectByName('Product_Root');
    if(!root)throw new Error('Product_Root ausente.');
    for(const name of PARTS)if(!root.getObjectByName(name))throw new Error(`Peça ausente: ${name}`);
    for(const name of MATERIALS)if(![...materials].some(m=>m.name===name))throw new Error(`Material ausente: ${name}`);
    const labelMaterial=[...materials].find(m=>m.name==='MAT_label');
    if(!labelMaterial.map?.image)throw new Error('Textura do rótulo não carregou.');
    // Keep authored materials, texture color spaces and child transforms unchanged.
    const scene=new THREE.Scene();
    const pivot=new THREE.Group();pivot.add(gltf.scene);scene.add(pivot);
    const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());
    const center=bounds.getCenter(new THREE.Vector3());
    if(size.length()===0)throw new Error('Modelo sem volume.');
    gltf.scene.position.sub(center);
    const camera=new THREE.PerspectiveCamera(37,1,.01,1000);
    const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,5,5);scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,.5);fill.position.set(4,1,4);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffffff,.6);rim.position.set(3,4,-3);scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff,0x202020,.4));
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
    renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
    const pose={x:0,y:0,scroll:0},target={x:0,y:0,scroll:0};
    let fit=1;
    function resize(){
      const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
      renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<=768?1:1.5));renderer.setSize(width,height,false);
      camera.aspect=width/height;camera.updateProjectionMatrix();
      const radius=size.length()/2,halfFov=THREE.MathUtils.degToRad(camera.fov/2);
      fit=radius/Math.sin(Math.min(halfFov,Math.atan(Math.tan(halfFov)*camera.aspect)))*1.08;
      camera.position.set(0,size.y*.025,fit);camera.lookAt(0,0,0);request();
    }
    function request(){if(!disposed&&visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw);}
    function draw(){
      frame=0;if(disposed||!visible||document.hidden)return;
      try{
        for(const k of Object.keys(pose))pose[k]+=(target[k]-pose[k])*.14;
        // The label occupies the +X/+Z quadrant; aim its bisector toward camera.
        // A small offset keeps depth visible without turning the label away.
        pivot.rotation.set(reduced.matches?0:pose.x,-Math.PI/4+.16+(reduced.matches?0:pose.y),0);
        pivot.position.y=reduced.matches?0:pose.scroll*size.y*.035;
        renderer.render(scene,camera);
        if(renderer.getContext().isContextLost())throw new Error('Contexto WebGL perdido.');
        figure.dataset.state='ready';
        if(Object.keys(pose).some(k=>Math.abs(target[k]-pose[k])>.0001))request();
      }catch(error){figure.dataset.state='fallback';dispose();console.warn('[FacilityGym loja]',error.message);}
    }
    function move(e){if(!fine.matches||reduced.matches)return;const r=figure.getBoundingClientRect();target.y=((e.clientX-r.left)/r.width-.5)*.08;target.x=-((e.clientY-r.top)/r.height-.5)*.05;request();}
    function leave(){target.x=target.y=0;request();}
    function scroll(){target.scroll=reduced.matches?0:Math.min(1,Math.max(0,scrollY/figure.closest('section').offsetHeight));request();}
    function onResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);}
    function preference(){pose.x=pose.y=target.x=target.y=0;if(reduced.matches)pose.scroll=target.scroll=0;scroll();}
    function lost(e){e.preventDefault();figure.dataset.state='fallback';dispose();}
    function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();}
    function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);clearTimeout(resizeTimer);observer?.disconnect();figure.removeEventListener('pointermove',move);figure.removeEventListener('pointerleave',leave);removeEventListener('scroll',scroll);removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preference);renderer.domElement.removeEventListener('webglcontextlost',lost);release();}
    observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)request();else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});observer.observe(figure);
    figure.addEventListener('pointermove',move);figure.addEventListener('pointerleave',leave);
    addEventListener('scroll',scroll,{passive:true});addEventListener('resize',onResize,{passive:true});document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',preference);renderer.domElement.addEventListener('webglcontextlost',lost);
    resize();scroll();
    return {dispose};
  }catch(error){release();throw error;}
}
