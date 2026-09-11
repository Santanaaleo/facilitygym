import * as THREE from './vendor/three.module.min.js';

import { GLTFLoader } from './vendor/GLTFLoader.js';

export const DUMBBELL_URL = new URL('./assets/facilitygym_dumbbell.glb', import.meta.url);
const requiredParts = ['Dumbbell_Bar','Dumbbell_Grip','Dumbbell_Head_L','Dumbbell_Head_R','Dumbbell_Ring_L','Dumbbell_Ring_R'];
const requiredMaterials = ['MAT_steel_bar','MAT_grip','MAT_rubber_head','MAT_gold_ring'];

function disposeGLTF(root) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(node=>{if(node.isMesh){geometries.add(node.geometry);for(const material of [].concat(node.material))materials.add(material);}});
  materials.forEach(material=>{for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
  geometries.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());
}

// No geometry is created, rebuilt, decimated or transformed. The authored root
// is the actor. Its local center is compensated in its position every frame.
export function prepareDumbbell(gltf) {
  const root=gltf.scene.getObjectByName('Dumbbell_Root');
  try {
    if(!root)throw new Error('Dumbbell_Root not found');
    for(const name of requiredParts)if(!root.getObjectByName(name)?.isMesh)throw new Error('Missing GLB part: '+name);
    const materials=new Set();let triangles=0;
    root.traverse(node=>{if(node.isMesh){[].concat(node.material).forEach(material=>materials.add(material));triangles+=(node.geometry.index?.count||node.geometry.attributes.position.count)/3;}});
    for(const name of requiredMaterials)if(![...materials].some(material=>material.name===name))throw new Error('Missing GLB material: '+name);
    root.removeFromParent();root.position.set(0,0,0);root.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(root);
    root.userData.localCenter=box.getCenter(new THREE.Vector3());
    root.userData.baseWidth=box.max.x-box.min.x;
    if(!(root.userData.baseWidth>0))throw new Error('Empty GLB bounds');
    // Small unbaked grip microtexture only. Original colors/material identities stay.
    const pixels=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const i=(y*64+x)*4,value=128+Math.round(15*Math.sin((x+y)*Math.PI/4)*Math.sin((x-y)*Math.PI/4));
      pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=255;
    }
    const micro=new THREE.DataTexture(pixels,64,64,THREE.RGBAFormat);
    micro.wrapS=micro.wrapT=THREE.RepeatWrapping;micro.repeat.set(6,2);micro.needsUpdate=true;
    materials.forEach(material=>{
      material.emissive?.set(0x000000);
      if(material.name==='MAT_grip'){material.bumpMap=micro;material.bumpScale=root.userData.baseWidth*.00035;}
      if(material.name==='MAT_rubber_head')material.roughness=.78;
      if(material.name==='MAT_gold_ring')material.roughness=.34;
    });
    root.userData.materials=[...materials];root.userData.triangles=triangles;
    root.userData.dispose=()=>disposeGLTF(root);
    return root;
  }catch(error){disposeGLTF(root||gltf.scene);throw error;}
}

export async function loadDumbbell(url=DUMBBELL_URL,signal) {
  const response=await fetch(url,{signal});
  if(!response.ok)throw new Error('GLB HTTP '+response.status);
  const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),new URL('.',url).href);
  if(signal?.aborted){disposeGLTF(gltf.scene);throw new Error('GLB load cancelled');}
  return prepareDumbbell(gltf);
}

// Orthographic camera maps the existing narrative's CSS-pixel coordinates to
// scene coordinates exactly. No DOM transform is applied to the canvas.
export function applyActorPose(model, pose, view, baseWidth) {
  const {state,entry,pointer}=pose;
  const staticMode=view.reduced;
  const scale=staticMode ? Math.min(view.width*.85,380)/baseWidth : view.actorWidth/baseWidth*state.scale*entry.scale;
  model.scale.setScalar(scale);
  const mouse=staticMode?0:Math.max(0,1-view.scroll/48);
  model.rotation.set(.16+((staticMode?0:state.tiltX||0)+pointer.x*mouse)*Math.PI/180,.28+((staticMode?0:state.yaw||0)+pointer.y*mouse)*Math.PI/180,staticMode?0:(state.rotation+entry.rotation)*Math.PI/180,'XYZ');
  model.position.set(staticMode?0:state.x+view.actorWidth/2-view.width/2,staticMode?0:view.height/2-state.y-view.actorHeight/2,staticMode?0:-state.depth*12);
  const centerOffset=model.userData.localCenter.clone().multiplyScalar(scale).applyEuler(model.rotation);
  model.position.sub(centerOffset);
  model.updateMatrixWorld(true);
  if(!staticMode && state.hero>0.5) {
    const bounds=new THREE.Box3().setFromObject(model);
    const ceiling=view.height/2-view.headerBottom-24;
    if(bounds.max.y>ceiling) model.position.y-=bounds.max.y-ceiling;
    model.updateMatrixWorld(true);
  }
  const opacity=staticMode?1:state.opacity*entry.opacity*Math.max(.35,1-state.depth*.085);
  model.userData.materials.forEach(material=>{material.transparent=true;material.opacity=opacity;});
}

export function createDumbbellActor({stage,fallback,pose,getView,gsap,onFailure}) {
  let renderer, model, camera, scene, frame=0, resizeTimer=0, stopped=false, active=true, initialized=false;
  let renderSamples=0, renderCost=0, slowFrames=0, previousFrame=0;
  const blend={value:0};let fade;const loading=new AbortController();
  const report={renderer:'Three.js r180',frames:0,averageRenderMs:0,drawCalls:0,triangles:0,status:'loading'};
  function release() {
    cancelAnimationFrame(frame);frame=0;clearTimeout(resizeTimer);
    loading.abort();fade?.kill();renderer?.domElement.remove();model?.userData.dispose();renderer?.dispose();
  }
  function fail(reason) {
    if(stopped)return;
    stopped=true;report.status='fallback';
    fallback.style.removeProperty('display');fallback.style.removeProperty('opacity');
    release();removeListeners();onFailure?.(reason);
  }
  function resize() {
    if(stopped)return;
    const v=getView();
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,v.mobile?1:1.5));
    renderer.setSize(v.width,v.height,false);
    camera.left=-v.width/2;camera.right=v.width/2;camera.top=v.height/2;camera.bottom=-v.height/2;
    camera.updateProjectionMatrix();requestRender();
  }
  function onResize() { clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,150); }
  function onVisibility() { if(document.hidden){cancelAnimationFrame(frame);frame=0;}else requestRender(); }
  function onContextLost(event) { event.preventDefault();fail('WebGL context lost'); }
  function removeListeners() {
    removeEventListener('resize',onResize);document.removeEventListener('visibilitychange',onVisibility);
    renderer?.domElement.removeEventListener('webglcontextlost',onContextLost);
  }
  function draw() {
    frame=0;if(stopped||!active||!model||document.hidden)return;
    try {
      const view=getView(), started=performance.now();
      applyActorPose(model,pose,view,model.userData.baseWidth);
      renderer.render(scene,camera);
      if(renderer.getContext().isContextLost())throw new Error('WebGL context lost');
      const cost=performance.now()-started;
      report.frames++;report.drawCalls=renderer.info.render.calls;report.triangles=renderer.info.render.triangles;
      // Rendering only on demand: idle gaps are not counted as poor FPS.
      if(initialized && view.mobile){
        renderCost+=cost;renderSamples++;
        const interval=started-previousFrame;
        if(interval>45 && interval<150)slowFrames++;
        if(renderSamples>=45 && (renderCost/renderSamples>18 || slowFrames>30)){
          fail('Mobile render budget exceeded');return;
        }
      }
      previousFrame=started;report.averageRenderMs=renderSamples?renderCost/renderSamples:cost;
      if(!initialized && (view.reduced || pose.state.opacity*pose.entry.opacity>.02)){
        initialized=true;report.status='ready';
        // Reveal only after a successful frame, never on import/load alone.
        fade=gsap.to(blend,{value:1,duration:.65,ease:'power2.out',onUpdate:()=>{
          renderer.domElement.style.opacity=String(blend.value);
          fallback.style.opacity=String(1-blend.value);
        },onComplete:()=>{if(!stopped)fallback.style.display='none';}});
      }
    }catch(error){fail(error.message);}
  }
  function requestRender() { if(!stopped&&model&&active&&!document.hidden&&!frame)frame=requestAnimationFrame(draw); }
  try {
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.debug.onShaderError=()=>{throw new Error('WebGL shader compilation failed');};
    renderer.domElement.className='lp-object-canvas';renderer.domElement.setAttribute('aria-hidden','true');
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,3000);camera.position.z=1000;
    loadDumbbell(DUMBBELL_URL,loading.signal).then(loaded=>{
      if(stopped){loaded.userData.dispose();return;}
      model=loaded;scene.add(model);report.model=model.name;report.triangles=model.userData.triangles;
      report.status=active?'loaded':'paused';requestRender();
    }).catch(error=>{if(!stopped)fail(error.message);});
    const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,5,6);scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,.5);fill.position.set(4,1,3);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffffff,.65);rim.position.set(2,3,-5);scene.add(rim);
    scene.add(new THREE.AmbientLight(0xffffff,.12));
    renderer.domElement.addEventListener('webglcontextlost',onContextLost);
    addEventListener('resize',onResize,{passive:true});document.addEventListener('visibilitychange',onVisibility);
    stage.appendChild(renderer.domElement);resize();
  }catch(error){fail(error.message);}
  return {
    update:requestRender,
    setActive(value){
      if(stopped||active===value)return;active=value;
      if(value){stage.appendChild(renderer.domElement);report.status='ready';requestRender();}
      else {cancelAnimationFrame(frame);frame=0;renderer.domElement.remove();report.status='paused';}
    },
    get diagnostics(){return {...report};},
    dispose(){if(stopped)return;stopped=true;release();removeListeners();fallback.style.removeProperty('display');fallback.style.removeProperty('opacity');}
  };
}
