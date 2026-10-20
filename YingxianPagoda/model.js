import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e9e6de');
scene.fog = new THREE.Fog('#e9e6de', 180, 420);
const stage = $('stage');
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true}); }
catch(e) { $('loading').innerHTML='此浏览器无法启用 WebGL。请用支持 WebGL 的现代浏览器打开。'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
stage.appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label','应县木塔三维模型，可拖动旋转、滚轮缩放');
const camera = new THREE.PerspectiveCamera(35,1,.1,700);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.07; controls.minDistance=12; controls.maxDistance=220;
controls.maxPolarAngle=Math.PI*.49; controls.target.set(0,31,0); controls.autoRotateSpeed=.4;
const hemi=new THREE.HemisphereLight(0xf9f5e9,0x6e6555,2.7); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2d4,3.3); sun.position.set(-55,95,65); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-55,right:55,top:95,bottom:-50,near:1,far:230}); sun.shadow.bias=-.0002; sun.shadow.normalBias=.06; scene.add(sun);
const fill=new THREE.DirectionalLight(0xe5edff,1.1); fill.position.set(50,50,-40); scene.add(fill);

// Units are metres; overall height follows the published 67.31 m datum.
const model=new THREE.Group(); model.name='应县木塔 · 佛宫寺释迦塔'; scene.add(model);
const levels=[], roofGroups=[], wallGroups=[], labels=[];
const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.87,...opts});
function grainTexture(){const c=document.createElement('canvas'); c.width=128;c.height=512;const x=c.getContext('2d');x.fillStyle='#b7a48d';x.fillRect(0,0,128,512);let s=91;function rand(){s=(s*16807)%2147483647;return s/2147483647;}for(let i=0;i<450;i++){const xx=rand()*128;x.strokeStyle=`rgba(57,34,20,${rand()*.15})`;x.lineWidth=rand()*1.5;x.beginPath();x.moveTo(xx,0);for(let y=0;y<=512;y+=16)x.lineTo(xx+Math.sin(y*.02+i)*1.3,y);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
const grain=grainTexture();
const mats={wood:mat('#925a36',{map:grain}),edge:mat('#bb8150',{map:grain}),dark:mat('#523a29',{map:grain}),red:mat('#9c4939'),plaster:mat('#c3a58a'),tile:mat('#4e534e'),ridge:mat('#696e62'),stone:mat('#aaa494'),stone2:mat('#c3bdad'),black:mat('#282c27'),gold:mat('#9e8853',{metalness:.4,roughness:.6}),paint:mat('#607363')};
const geometries={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,10),tile:new THREE.CylinderGeometry(1,1,1,5),ball:new THREE.SphereGeometry(1,10,7)};
const buckets=new Map();const dummy=new THREE.Object3D();const q=new THREE.Quaternion();const UP=new THREE.Vector3(0,1,0);
function part(parent,kind,material,p,s,quaternion){let key=parent.uuid+kind+material;let b=buckets.get(key);if(!b){b={parent,kind,material,items:[]};buckets.set(key,b);}dummy.position.set(...p);dummy.scale.set(...s);dummy.quaternion.copy(quaternion||new THREE.Quaternion());dummy.updateMatrix();b.items.push(dummy.matrix.clone());}
function box(parent,material,p,s,angle=0){q.setFromAxisAngle(UP,angle);part(parent,'box',material,p,s,q);}
function beam(parent,material,a,b,width=.18,depth=width,round=false){let av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);q.setFromUnitVectors(UP,v.clone().normalize());part(parent,round?'cyl':'box',material,av.add(bv).multiplyScalar(.5).toArray(),[width,v.length(),depth],q);}
function cylinder(parent,material,x,y,z,r,h){part(parent,'cyl',material,[x,y,z],[r,h,r]);}
function ball(parent,material,p,s){part(parent,'ball',material,p,s);}
function group(name,parent=model){let g=new THREE.Group();g.name=name;parent.add(g);return g;}
const angle0=Math.PI/8;
const vert=(r,i,y=0)=>[Math.sin(angle0+i*Math.PI/4)*r,y,Math.cos(angle0+i*Math.PI/4)*r];
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function ring(parent,r,y,w,h,material='wood'){for(let i=0;i<8;i++)beam(parent,material,vert(r,i,y),vert(r,i+1,y),w,h);}
function octagon(parent,r,y,height,material){const geo=new THREE.CylinderGeometry(r,r,height,8);geo.rotateY(angle0);const mesh=new THREE.Mesh(geo,mats[material]);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function bracket(parent,x,y,z,a,scale=1){const g=parent;function local(u,v,w){return[x+Math.cos(a)*u+Math.sin(a)*w,y+v,z-Math.sin(a)*u+Math.cos(a)*w];}box(g,'dark',local(0,0,0),[.62*scale,.35*scale,.65*scale],a);for(let j=0;j<3;j++){const v=(.32+j*.34)*scale,span=(1.15+j*.48)*scale,rad=(.35+j*.36)*scale;box(g,j%2?'edge':'wood',local(0,v,rad),[span,.2*scale,.3*scale],a);box(g,'wood',local(0,v+.12,rad*.5),[.25*scale,.23*scale,(1+j*.56)*scale],a);for(const u of [-span*.37,span*.37]){box(g,'edge',local(u,v+.19,rad),[.3*scale,.23*scale,.4*scale],a);}}beam(g,'dark',local(0,.25,-.3*scale),local(0,1.2*scale,1.45*scale),.18*scale,.22*scale);}
function bracketsRing(parent,r,y,n=5,scale=1){for(let i=0;i<8;i++){const a=vert(r,i,y),b=vert(r,i+1,y);for(let k=0;k<n;k++){const p=lerp(a,b,k/n),rot=Math.atan2(p[0],p[2]);bracket(parent,p[0],p[1],p[2],rot,scale);}}}
function rail(parent,r,y){ring(parent,r,y+.16,.18,.2,'dark');ring(parent,r,y+1.35,.15,.16,'edge');ring(parent,r,y+.77,.1,.13,'wood');for(let i=0;i<8;i++){const a=vert(r,i,y),b=vert(r,i+1,y);for(let k=0;k<=10;k++){const p=lerp(a,b,k/10);box(parent,k%5===0?'edge':'wood',[p[0],y+.75,p[2]],[k%5===0?.2:.105,1.4,k%5===0?.2:.105]);}for(let k=0;k<5;k++){let p=lerp(a,b,(k+.5)/5);box(parent,'wood',[p[0],y+.41,p[2]],[.3,.36,.18],Math.atan2(p[0],p[2]));}}}

// Double platform, individual coursed blocks, and front stair.
const base=group('石砌台基');box(base,'stone',[0,.75,0],[42,1.5,42]);box(base,'stone2',[0,1.6,0],[42.6,.2,42.6]);octagon(base,19.2,2.8,2.2,'stone');octagon(base,19.65,3.92,.24,'stone2');
for(let row=0;row<3;row++)for(let side=0;side<4;side++)for(let k=0;k<18;k++){const t=-20.5+(k+.5)*41/18+(row%2)*.4;let p=side%2?[21.035,.26+row*.48,t]:[t,.26+row*.48,21.035];if(side>1)p[side%2?0:2]*=-1;box(base,'stone2',p,side%2?[.02,.025,2.1]:[2.1,.025,.02]);}
for(let i=0;i<8;i++){const a=vert(19.24,i),b=vert(19.24,i+1);for(let k=0;k<9;k++){const p=lerp(a,b,(k+.5)/9);box(base,'stone2',[p[0],2.8,p[2]],[.025,2,.025]);}}
for(let i=0;i<16;i++)box(base,i%2?'stone':'stone2',[0,(i+1)*.125,26.5-i*.57],[6,(i+1)*.25,.7]);
for(let i=0;i<8;i++)box(base,'stone2',[0,1.75+(i+1)*.14,20.5-i*.37],[5,(i+1)*.28,.44]);

// Curved octagonal roof: tiled panels, raised hips, eave fascia and exposed rafters.
function roof(parent,name,rOuter,rInner,y,rise){const g=group(name,parent);roofGroups.push(g);const seg=14,cols=32;
function point(side,u,t,offset=0){const outer=lerp(vert(rOuter,side),vert(rOuter,side+1),u),inner=lerp(vert(rInner,side),vert(rInner,side+1),u);const corner=Math.pow(Math.abs(2*u-1),5);const lift=.57*Math.pow(1-t,4)*corner;return[outer[0]*(1-t)+inner[0]*t,y+rise*Math.pow(t,1.7)+lift+offset,outer[2]*(1-t)+inner[2]*t];}
for(let side=0;side<8;side++){
 const pos=[],uv=[],indices=[];
 for(let j=0;j<=seg;j++)for(let k=0;k<=cols;k++){pos.push(...point(side,k/cols,j/seg));uv.push(k/cols,j/seg);}
 for(let j=0;j<seg;j++)for(let k=0;k<cols;k++){let a=j*(cols+1)+k,b=a+cols+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 const material=mats.tile.clone();material.side=THREE.DoubleSide;const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
 const width=2*rOuter*Math.sin(Math.PI/8),count=Math.round(width/.29);
 for(let k=0;k<=count;k++)for(let j=0;j<seg;j++){const a=point(side,k/count,j/seg,.07),b=point(side,k/count,(j+1)/seg,.07);const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));q.setFromUnitVectors(UP,v.clone().normalize());part(g,'tile',(k%5===0)?'ridge':'tile',lerp(a,b,.5),[.075,v.length()+.035,.075],q);}
 // Transverse tile courses and a double fascia line.
 for(let j=1;j<seg;j++)for(let k=0;k<8;k++)beam(g,'tile',point(side,k/8,j/seg,.025),point(side,(k+1)/8,j/seg,.025),.035,.035,true);
 for(let k=0;k<12;k++){beam(g,'edge',point(side,k/12,0,-.15),point(side,(k+1)/12,0,-.15),.15,.17);beam(g,'dark',point(side,k/12,0,-.34),point(side,(k+1)/12,0,-.34),.11,.11);}
 for(let k=0;k<=count;k++){const a=point(side,k/count,0,-.29),b=point(side,k/count,.32,-.29);beam(g,'wood',a,b,.09,.12);ball(g,'ridge',point(side,k/count,0,.02),[.095,.09,.095]);}
 for(let j=0;j<seg;j++)beam(g,'ridge',point(side,0,j/seg,.16),point(side,0,(j+1)/seg,.16),.16,.16,true);
 const tip=point(side,0,0);beam(g,'ridge',[tip[0]*.97,tip[1]+.1,tip[2]*.97],[tip[0]*1.02,tip[1]+.75,tip[2]*1.02],.13,.13,true);
 // Small suspended wind bell, geometrically simplified.
 cylinder(g,'dark',tip[0]*.99,tip[1]-.65,tip[2]*.99,.035,.6);ball(g,'gold',[tip[0]*.99,tip[1]-1.02,tip[2]*.99],[.17,.22,.17]);
}
return g;}

const bases=[4,18,27,36,45],radii=[11.6,11.1,10.5,9.8,9.05],eaves=[15,24,33,42,51],outers=[15.7,14.7,13.8,13,12.1];
function facade(parent,walls,r,bottom,top,ground){
 const h=top-bottom;
 for(let side=0;side<8;side++){
 const a=vert(r,side,bottom),b=vert(r,side+1,bottom),faceAngle=(side+1)*Math.PI/4;
 for(let k=0;k<3;k++){
 const p=lerp(a,b,k/3);cylinder(parent,'wood',p[0],bottom+h/2,p[2],ground?.29:.24,h);cylinder(parent,'stone2',p[0],bottom+.16,p[2],.38,.32);
 }
 const bayWidth=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b))/3;
 for(let k=0;k<3;k++){
 const p=lerp(a,b,(k+.5)/3);const doorway=ground&&(side===7||side===3)&&k===1;
 if(ground){
 if(!doorway)box(walls,'red',[p[0],bottom+h*.38,p[2]],[bayWidth-.35,h*.76,.32],faceAngle);
 if(doorway){box(walls,'black',[p[0],bottom+2.15,p[2]],[bayWidth-.4,4.3,.15],faceAngle);box(parent,'edge',[p[0],bottom+4.3,p[2]],[bayWidth,.28,.5],faceAngle);}
 }else{
 box(walls,'dark',[p[0],bottom+h*.48,p[2]],[bayWidth-.3,h*.79,.18],faceAngle);
 box(walls,'wood',[p[0],bottom+.55,p[2]],[bayWidth-.31,1,.25],faceAngle);
 for(let v=0;v<8;v++){const off=(v/7-.5)*(bayWidth-.5);box(walls,'edge',[p[0]+Math.cos(faceAngle)*off,bottom+h*.57,p[2]-Math.sin(faceAngle)*off],[.065,h*.57,.3],faceAngle);}
 for(let v=0;v<5;v++)box(walls,'wood',[p[0],bottom+1.3+v*(h-1.8)/5,p[2]],[bayWidth-.3,.07,.31],faceAngle);
 }
 }
 beam(parent,'edge',[...a.slice(0,1),top,a[2]],[b[0],top,b[2]],.4,.45);
 beam(parent,'dark',[a[0],top-.55,a[2]],[b[0],top-.55,b[2]],.25,.3);
 }
}
for(let level=0;level<5;level++){
 const g=group(`第${level+1}明层`);levels.push(g);g.userData.index=level;
 const walls=group('墙体与格扇',g);wallGroups.push(walls);const r=radii[level],bottom=bases[level],top=eaves[level]-1.3;
 octagon(g,r+.35,bottom-.14,.28,'dark');
 facade(g,walls,r,bottom,top,level===0);
 // Eight inner columns and radial connecting beams form the inner and outer rings.
 const inner=r*.55;
 for(let i=0;i<8;i++){const p=vert(inner,i),p2=vert(r,i);cylinder(g,'dark',p[0],(bottom+top)/2,p[2],.32,top-bottom);beam(g,'wood',[p[0],top-.25,p[2]],[p2[0],top-.25,p2[2]],.38,.5);}
 ring(g,inner,top-.25,.4,.5,'dark');ring(g,r,top+.2,.35,.5);
 if(level>0){octagon(g,r+1.15,bottom-.35,.26,'wood');rail(g,r+1.1,bottom);bracketsRing(g,r-.15,bottom-1.5,3,.67);}
 bracketsRing(g,r,top+.15,6,.8);
 if(level<4){
 const darkLayer=group(`第${level+1}暗层 · 梁枋与斜撑`,g);const yy=eaves[level]+2.25,rr=r-.3;
 ring(darkLayer,rr,yy,.35,.35);ring(darkLayer,rr,yy+.65,.25,.3);
 for(let i=0;i<8;i++){const p=vert(rr,i);cylinder(darkLayer,'dark',p[0],(top+yy+.65)/2,p[2],.22,yy+.65-top);const p2=vert(rr,i+1);beam(darkLayer,'wood',[p[0],top+1,p[2]],[p2[0],yy+.6,p2[2]],.19,.22);}
 for(let i=0;i<8;i++){const a=vert(rr,i,yy),b=vert(rr,i+1,yy+.65);beam(darkLayer,'wood',a,b,.18,.2);const p=vert(rr,i,yy+.65),p2=vert(inner,i,yy-.2);beam(darkLayer,'wood',p,p2,.25,.28);}
 }
 roof(g,`第${level+1}层屋面`,outers[level],level===4?.75:r-.8,eaves[level],level===4?6.31:3);
}
// First-storey peripheral colonnade and its additional eave.
const annex=group('底层副阶周匝',levels[0]);
for(let i=0;i<8;i++)for(let k=0;k<3;k++){const p=lerp(vert(15.135,i),vert(15.135,i+1),k/3);cylinder(annex,'wood',p[0],6.25,p[2],.25,4.5);cylinder(annex,'stone2',p[0],4.2,p[2],.4,.4);}
ring(annex,15.135,8.35,.32,.35);bracketsRing(annex,15.135,8.35,5,.65);roof(annex,'底层副阶屋面',18.1,11.7,9.5,3.2);

// Simplified radial roof trusses support the summit in structural view.
for(let i=0;i<8;i++){beam(levels[4],'dark',vert(8.7,i,50.2),vert(.6,i,57),.26,.32);beam(levels[4],'wood',vert(8.7,i,50.2),vert(8.7,i+1,50.2),.3,.4);}
cylinder(levels[4],'dark',0,54.7,0,.24,4.6);

// Iron finial: inverted bowl, stacked rings, central shaft and tip.
const finial=group('塔刹',levels[4]);octagon(finial,1.25,57.6,.58,'black');ball(finial,'black',[0,58.3,0],[1.12,.85,1.12]);cylinder(finial,'black',0,62.4,0,.15,8.3);
for(let i=0;i<7;i++){const torus=new THREE.Mesh(new THREE.TorusGeometry(1.02-i*.092,.09,6,32),mats.black);torus.rotation.x=Math.PI/2;torus.position.y=59.2+i*.77;finial.add(torus);}
ball(finial,'gold',[0,65.3,0],[.37,.46,.37]);const tip=new THREE.Mesh(new THREE.ConeGeometry(.2,1.55,10),mats.black);tip.position.y=66.535;finial.add(tip);
for(let i=0;i<4;i++){const a=vert(6.5,i*2,54.1);beam(finial,'black',a,[0,62.8,0],.028,.028,true);}

function plaque(parent,text,y,w,h,z){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle='#392b21';x.fillRect(0,0,1024,256);x.strokeStyle='#b69b69';x.lineWidth=11;x.strokeRect(12,12,1000,232);x.fillStyle='#cfbd8f';x.font='bold 145px "Songti SC", "Noto Serif CJK SC", serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,512,140,930);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.9}));mesh.position.set(0,y,z);parent.add(mesh);wallGroups.push(mesh);}
plaque(levels[0],'釋迦塔',7.8,4.3,1.15,11.6*Math.cos(Math.PI/8)+.24);
plaque(levels[1],'萬古觀瞻',22.2,5,1.4,11.1*Math.cos(Math.PI/8)+.3);
plaque(levels[2],'天下奇觀',31.25,5.2,1.45,10.5*Math.cos(Math.PI/8)+.3);

// Batch repeated components into InstancedMesh objects to keep rendering fast.
let componentCount=0;
for(const b of buckets.values()){const mesh=new THREE.InstancedMesh(geometries[b.kind],mats[b.material],b.items.length);mesh.name=`${b.material} · ${b.items.length} 构件`;for(let i=0;i<b.items.length;i++)mesh.setMatrixAt(i,b.items[i]);mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;b.parent.add(mesh);componentCount+=b.items.length;}
buckets.clear();
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.ShadowMaterial({color:0x65675c,opacity:.16}));ground.rotation.x=-Math.PI/2;ground.position.y=-.04;ground.receiveShadow=true;scene.add(ground);
// A quiet exhibition plinth outline, separate from the historical model.
const circle=new THREE.Mesh(new THREE.RingGeometry(31.5,31.56,128),mat('#b7b3a6'));circle.rotation.x=-Math.PI/2;circle.position.y=.015;scene.add(circle);

const state={mode:'complete',explode:0,auto:false,labels:true,view:'perspective'};
let cameraTween=null;
function setCamera(pos,target){cameraTween={from:camera.position.clone(),to:new THREE.Vector3(...pos),start:controls.target.clone(),end:new THREE.Vector3(...target),t:0};}
function reset(){state.view='perspective';setCamera([90,65,122],[0,31,0]);}
function setMode(mode){state.mode=mode;roofGroups.forEach(g=>g.visible=mode==='complete');wallGroups.forEach(g=>g.visible=mode!=='frame');document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});$('mode-note').textContent=mode==='complete'?'灰瓦、木柱与重叠出檐，构成辽代楼阁式塔的轮廓。':mode==='roofless'?'隐藏六重屋面，观察檐下斗拱与内外柱圈。':'隐藏屋面与围护，观察柱、梁、枋与暗层斜撑的组织。';}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
$('explode').addEventListener('input',e=>{state.explode=+e.target.value/100;$('explode-value').textContent=Math.round(state.explode*100)+'%';if(state.explode>.01)setCamera([110,85,155],[0,44,0]);else reset();});
$('rotate').addEventListener('click',()=>{state.auto=!state.auto;controls.autoRotate=state.auto;$('rotate').classList.toggle('active',state.auto);$('rotate').setAttribute('aria-pressed',String(state.auto));$('rotate').textContent=state.auto?'Ⅱ 暂停环绕':'↻ 自动环绕';});
$('reset').addEventListener('click',()=>{state.explode=0;$('explode').value=0;$('explode-value').textContent='0%';document.querySelectorAll('[data-floor]').forEach(b=>b.classList.remove('active'));reset();});
$('front').addEventListener('click',()=>setCamera([0,34,150],[0,31,0]));
$('top').addEventListener('click',()=>setCamera([0,135,.5],[0,18,0]));
$('annotations').addEventListener('change',e=>{state.labels=e.target.checked;});
document.querySelectorAll('[data-floor]').forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.floor;document.querySelectorAll('[data-floor]').forEach(el=>el.classList.toggle('active',el===b));setCamera([30,bases[i]+14+i*state.explode*7,48],[0,bases[i]+4+i*state.explode*7,0]);$('selected-note').textContent=['首层设副阶周匝，形成双重屋檐。','二层平座外挑，栏杆环绕八面。','三层正面悬「天下奇观」匾额。','第四明层之下为暗层，布置梁枋与斜撑。','顶层八角攒尖屋顶，上承金属塔刹。'][i];}));
const dialog=$('sources');$('info').addEventListener('click',()=>dialog.showModal());$('close-info').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);}
$('capture').addEventListener('click',()=>{renderer.render(scene,camera);renderer.domElement.toBlob(b=>{if(b)download(b,'应县木塔.png');});});
$('export').addEventListener('click',async()=>{const btn=$('export');btn.disabled=true;btn.textContent='正在导出…';try{const exporter=new GLTFExporter();const data=await exporter.parseAsync(model,{binary:true,onlyVisible:true});download(new Blob([data],{type:'model/gltf-binary'}),'yingxian-pagoda.glb');btn.textContent='已导出 GLB ✓';}catch(e){btn.textContent='导出失败，请重试';console.error(e);}finally{btn.disabled=false;setTimeout(()=>btn.textContent='↓ 导出模型',2500);}});
for(const [text,r,y,index] of [['塔刹',1.5,62,4],['八角攒尖顶',10.5,53.5,4],['平座栏杆',13,28,2],['副阶周匝',17.6,8,0]]){const el=document.createElement('div');el.className='annotation';el.innerHTML='<i></i><span>'+text+'</span>';$('labels').appendChild(el);labels.push({el,p:new THREE.Vector3(r,y,0),index});}
const p=new THREE.Vector3();let previous=performance.now();
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(stage);resize();camera.position.set(90,65,122);controls.target.set(0,31,0);controls.update();
renderer.domElement.addEventListener('pointerdown',()=>{cameraTween=null;});
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(cameraTween){cameraTween.t=Math.min(1,cameraTween.t+dt*1.7);const t=1-Math.pow(1-cameraTween.t,3);camera.position.lerpVectors(cameraTween.from,cameraTween.to,t);controls.target.lerpVectors(cameraTween.start,cameraTween.end,t);if(cameraTween.t===1)cameraTween=null;}
 levels.forEach((g,i)=>{g.position.y=THREE.MathUtils.damp(g.position.y,i*state.explode*7,7,dt);});controls.update();
 for(const l of labels){p.copy(l.p);p.y+=levels[l.index].position.y;p.project(camera);l.el.style.transform=`translate(${(p.x*.5+.5)*stage.clientWidth}px,${(-p.y*.5+.5)*stage.clientHeight}px)`;l.el.hidden=!state.labels||(l.el.textContent==='八角攒尖顶'&&state.mode!=='complete')||p.z>1||p.x> .88||p.x<-.85||p.y> .95||p.y<-.95;}
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);$('loading').classList.add('done');$('loading').setAttribute('aria-hidden','true');$('status').textContent='实时三维 · 可交互';$('component-count').textContent=componentCount.toLocaleString('zh-CN');
// Read-only diagnostics for local verification.
window.modelDiagnostics={height:67.31,clearStoreys:levels.length,roofCount:roofGroups.length,componentCount,threeRevision:THREE.REVISION};
