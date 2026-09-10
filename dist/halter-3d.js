import * as THREE from './vendor/three.module.min.js';

// Original procedural asset. Replace this factory with a licensed, normalized GLB
// group later; the camera, renderer and GSAP narrative do not need to change.
export function createHexDumbbell() {
  const model = new THREE.Group();
  model.name = 'FacilityGym-Hex-Dumbbell';
  const data = new Uint8Array(64 * 128 * 4);
  for (let y=0;y<128;y++) for (let x=0;x<64;x++) {
    const i=(y*64+x)*4;
    const value=232+Math.round(12*Math.sin(y*2.37)+3*Math.sin(x*.16+y));
    data[i]=data[i+1]=data[i+2]=value; data[i+3]=255;
  }
  const brushed = new THREE.DataTexture(data,64,128,THREE.RGBAFormat);
  brushed.wrapS=brushed.wrapT=THREE.RepeatWrapping;
  brushed.needsUpdate=true;
  const headMaterial = new THREE.MeshStandardMaterial({ color:0x292c2e, metalness:.9, roughness:.65, roughnessMap:brushed, bumpMap:brushed, bumpScale:.003 });
  const shaftMaterial = new THREE.MeshStandardMaterial({ color:0x666a6c, metalness:.9, roughness:.4, roughnessMap:brushed, bumpMap:brushed, bumpScale:.0015 });
  const goldMaterial = new THREE.MeshStandardMaterial({ color:0xbc9d60, metalness:.98, roughness:.28 });
  const shape = new THREE.Shape();
  for(let i=0;i<6;i++) {
    const angle=Math.PI/6+i*Math.PI/3;
    const x=Math.cos(angle)*.48,y=Math.sin(angle)*.48;
    if(i===0) shape.moveTo(x,y); else shape.lineTo(x,y);
  }
  shape.closePath();
  const headGeometry = new THREE.ExtrudeGeometry(shape,{ depth:.36, bevelEnabled:true, bevelThickness:.02, bevelSize:.02, bevelSegments:3, steps:1, curveSegments:1 });
  headGeometry.translate(0,0,-.18);
  headGeometry.rotateY(Math.PI/2);
  for(const sign of [-1,1]) {
    const head=new THREE.Mesh(headGeometry,headMaterial);
    head.name=sign<0?'head-left':'head-right'; head.position.x=sign*1.6; model.add(head);
  }
  const shaftGeometry=new THREE.CylinderGeometry(1/4.8,1/4.8,2.82,32,1);
  shaftGeometry.rotateZ(Math.PI/2);
  const shaft=new THREE.Mesh(shaftGeometry,shaftMaterial);shaft.name='shaft';model.add(shaft);
  const ringGeometry=new THREE.CylinderGeometry(.229,.229,.035,32,1);
  ringGeometry.rotateZ(Math.PI/2);
  for(const sign of [-1,1]) {
    const ring=new THREE.Mesh(ringGeometry,goldMaterial);
    ring.name=sign<0?'gold-ring-left':'gold-ring-right';ring.position.x=sign*1.387;model.add(ring);
  }
  model.userData.materials=[headMaterial,shaftMaterial,goldMaterial];
  model.userData.dispose=() => {
    headGeometry.dispose();shaftGeometry.dispose();ringGeometry.dispose();
    model.userData.materials.forEach(material=>material.dispose());brushed.dispose();
  };
  return model;
}

// Orthographic camera maps the existing narrative's CSS-pixel coordinates to
// scene coordinates exactly. No DOM transform is applied to the canvas.
export function applyActorPose(model, pose, view, baseWidth) {
  const {state,entry,pointer}=pose;
  const staticMode=view.reduced;
  const scale=staticMode ? Math.min(view.width*.85,380)/baseWidth : view.actorWidth/baseWidth*state.scale*entry.scale;
  model.scale.setScalar(scale);
  const mouse=staticMode?0:Math.max(0,1-view.scroll/48);
  model.rotation.set(.16+(pointer.x*mouse*Math.PI/180),.28+(pointer.y*mouse*Math.PI/180),staticMode?0:(state.rotation+entry.rotation)*Math.PI/180,'XYZ');
  model.position.set(staticMode?0:state.x+view.actorWidth/2-view.width/2,staticMode?0:view.height/2-state.y-view.actorHeight/2,staticMode?0:-state.depth*12);
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
  const blend={value:0};let fade;
  const report={renderer:'Three.js r180',frames:0,averageRenderMs:0,drawCalls:0,triangles:0,status:'loading'};
  function release() {
    cancelAnimationFrame(frame);frame=0;clearTimeout(resizeTimer);
    fade?.kill();renderer?.domElement.remove();model?.userData.dispose();renderer?.dispose();
  }
  function fail(reason) {
    if(stopped)return;
    stopped=true;report.status='fallback';
    fallback.style.removeProperty('opacity');
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
    frame=0;if(stopped||!active||document.hidden)return;
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
      if(!initialized){
        initialized=true;report.status='ready';
        // Reveal only after a successful frame, never on import/load alone.
        fade=gsap.to(blend,{value:1,duration:.65,ease:'power2.out',onUpdate:()=>{
          renderer.domElement.style.opacity=String(blend.value);
          fallback.style.opacity=String(1-blend.value);
        }});
      }
    }catch(error){fail(error.message);}
  }
  function requestRender() { if(!stopped&&active&&!document.hidden&&!frame)frame=requestAnimationFrame(draw); }
  try {
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    renderer.debug.onShaderError=()=>{throw new Error('WebGL shader compilation failed');};
    renderer.domElement.className='lp-object-canvas';renderer.domElement.setAttribute('aria-hidden','true');
    scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,3000);camera.position.z=1000;
    model=createHexDumbbell();
    const box=new THREE.Box3().setFromObject(model);model.userData.baseWidth=box.max.x-box.min.x;
    scene.add(model);
    const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,5,6);scene.add(key);
    const fill=new THREE.DirectionalLight(0xffffff,.5);fill.position.set(4,1,3);scene.add(fill);
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
    dispose(){if(stopped)return;stopped=true;release();removeListeners();fallback.style.removeProperty('opacity');}
  };
}
