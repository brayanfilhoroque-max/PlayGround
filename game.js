import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const canvas = $('#game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9aa897);
scene.fog = new THREE.FogExp2(0x9aa897, 0.0085);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 450);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const hemi = new THREE.HemisphereLight(0xdce9da, 0x353c2d, 2.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c1, 3.2); sun.position.set(-38, 58, 24); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -70; sun.shadow.camera.right = 70; sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70; sun.shadow.bias = -0.0004; scene.add(sun);
const fill = new THREE.DirectionalLight(0xa6c8c0, 0.8); fill.position.set(45, 22, -35); scene.add(fill);

const MAPS = [
  { name: 'Cidade Abandonada', short: 'RUÍNAS URBANAS', desc: 'Concreto, becos e linhas de visão perigosas.', ground: 0x716e5b, fog: 0x929688, sky: 0x9fa99b, accent: 0x8e795b, kind: 'city', tree: 0x46523d },
  { name: 'Ilha da Bruma', short: 'ILHA TROPICAL', desc: 'Costa selvagem, mata fechada e vilas costeiras.', ground: 0x536947, fog: 0x9aa897, sky: 0xa2b4a1, accent: 0x887459, kind: 'island', tree: 0x254735 },
  { name: 'Deserto Extremo', short: 'AREIAS DE KADIR', desc: 'Calor severo, ruínas antigas e areia movediça.', ground: 0x9d8055, fog: 0xc3aa7e, sky: 0xc6ae89, accent: 0x796045, kind: 'desert', tree: 0x657343 },
  { name: 'Cidade Nevada', short: 'VALE CONGELADO', desc: 'Uma cidade isolada sob neve e gelo fino.', ground: 0x9eaba8, fog: 0xaabdc1, sky: 0xc6d4d7, accent: 0x687d7e, kind: 'snow', tree: 0x435c5d },
  { name: 'Zona Industrial', short: 'SETOR FERRO', desc: 'Galpões, pátios de carga e metal retorcido.', ground: 0x545e56, fog: 0x8b948b, sky: 0xa5aaa0, accent: 0x776b50, kind: 'industry', tree: 0x4b5748 }
];
let mapIndex = 1, selectedMap = 1, gameOn = false, paused = false, ended = false;
let mode = 'SOLO';
let player, playerGroup, gun, gumBarrier, gumAnim = null, zoneRing, zoneRadius = 92;
let enemies = [], buildings = [], pickups = [], particles = [], decor = [], keys = {}, touchMove = {};
let health = 100, armor = 65, ammo = 30, reserveAmmo = 180, kills = 0, alive = 50;
let gameTime = 0, lastShot = 0, reloadUntil = 0, jumpV = 0, grounded = true, crouched = false, sprinting = false;
let viewYaw = Math.PI;
let mapCanvas = $('#mini-canvas'), mapCtx = mapCanvas.getContext('2d');
let clock = new THREE.Clock();
const mat = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const makeBox = (w, h, d, material, x, y, z, parent = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material); o.position.set(x,y,z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };

function makeSoldier(color = 0x39463b, isPlayer = false) {
  const root = new THREE.Group();
  const gear = mat(color), dark = mat(0x202720), skin = mat(0xb78e6a), vest = mat(isPlayer ? 0x343d33 : 0x493a2b), boot = mat(0x191d19), visor = new THREE.MeshStandardMaterial({ color: 0x293d3b, metalness: .5, roughness: .25 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(.61,.78,.34), gear); torso.position.y=1.38; torso.castShadow=true; root.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(.66,.38,.38), vest); chest.position.set(0,1.43,.04); chest.castShadow=true; root.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22,12,10), skin); head.position.y=1.98; head.castShadow=true; root.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.245,12,8,0,Math.PI*2,0,Math.PI*.62), dark); helmet.position.y=2.06; helmet.castShadow=true; root.add(helmet);
  const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(.25,.07,.03), visor); visorMesh.position.set(0,1.99,.205); root.add(visorMesh);
  const armParts=[], legParts=[];
  for(const s of [-1,1]){
    const arm=new THREE.Mesh(new THREE.BoxGeometry(.2,.62,.22),gear);arm.position.set(s*.43,1.38,.02);arm.rotation.z=s*.1;arm.castShadow=true;root.add(arm);armParts.push(arm);
    const leg=new THREE.Mesh(new THREE.BoxGeometry(.25,.65,.27),dark);leg.position.set(s*.17,.57,0);leg.castShadow=true;root.add(leg);legParts.push(leg);
    const foot=new THREE.Mesh(new THREE.BoxGeometry(.28,.14,.4),boot);foot.position.set(s*.17,.18,.07);foot.castShadow=true;root.add(foot);
    const pouch=new THREE.Mesh(new THREE.BoxGeometry(.16,.18,.12),dark);pouch.position.set(s*.34,1.15,.22);root.add(pouch);
  }
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.36,.52,.2),dark);pack.position.set(0,1.4,-.23);root.add(pack);
  const weapon = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.12,.13,.8),mat(0x242922,.42,.55));body.position.z=.25;weapon.add(body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.5,8),mat(0x171b18,.3,.7));barrel.rotation.x=Math.PI/2;barrel.position.set(0,.01,.83);weapon.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.25),dark);stock.position.z=-.25;weapon.add(stock);
  weapon.position.set(.2,1.4,.34);weapon.rotation.x=.06;root.add(weapon);
  root.userData={arms:armParts,legs:legParts,weapon,phase:Math.random()*4,isPlayer};
  return root;
}

function clearWorld(){
  for (const o of [...buildings,...pickups,...decor,...enemies.map(e=>e.group),...(gumBarrier?[gumBarrier]:[]),...(zoneRing?[zoneRing]:[])]) scene.remove(o);
  buildings=[];pickups=[];decor=[];enemies=[];gumBarrier=null;zoneRing=null;particles.forEach(p=>scene.remove(p.mesh));particles=[];
  if(playerGroup)scene.remove(playerGroup);
}
function buildWorld(index){
  clearWorld();mapIndex=index; const m=MAPS[index];
  scene.background.setHex(m.sky);scene.fog.color.setHex(m.fog);scene.fog.density=index===2?.006:index===3?.009:.008;
  hemi.color.setHex(index===3?0xe8f1f5:0xdce9da);sun.color.setHex(index===3?0xdbe7f3:index===2?0xffdda8:0xffe6c1);
  const groundMat=new THREE.MeshStandardMaterial({color:m.ground,roughness:index===3?.82:1,metalness:index===4?.08:0});const ground=new THREE.Mesh(new THREE.PlaneGeometry(260,260,28,28),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;
  const pos=ground.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);const broad=Math.sin(x*.022)*.55+Math.cos(y*.027)*.48+Math.sin((x-y)*.011)*.38;const detail=Math.sin(x*.09+Math.cos(y*.04))*Math.cos(y*.073)*.12;const relief= index===2?broad*1.35: index===3?broad*.38: broad*.7;pos.setZ(i,relief+detail*(index===2?1.4:.65))}ground.geometry.computeVertexNormals();scene.add(ground);buildings.push(ground);
  // A low-detail color breakup keeps the floor from reading like a flat color surface.
  const colorPatches=index===2?18:index===3?12:24;
  for(let i=0;i<colorPatches;i++){const r=rand(5,13),patch=new THREE.Mesh(new THREE.CircleGeometry(r,16),new THREE.MeshStandardMaterial({color:index===2?rand(0x99764f,0xb29364):index===3?rand(0x879694,0xb3c0bd):rand(0x46553e,0x65705a),roughness:1,transparent:true,opacity:.42,depthWrite:false}));patch.rotation.x=-Math.PI/2;patch.position.set(rand(-115,115),-.105,rand(-115,115));patch.scale.y=rand(.45,1);scene.add(patch);decor.push(patch)}
  // Each biome has its own readable layout and landmark language.
  if(index===0){
    for(let i=0;i<7;i++){
      const z=-85+i*28,x=i%2?-62:62;
      const h=rand(12,22);
      const tower=makeBox(10,h,10,mat(i%2?0x68645a:0x7a7567),x,h/2,z);
      buildings.push(tower);
      const bridgeSpan=i%2?36:46;
      const bridge=makeBox(bridgeSpan,.55,3,mat(0x454b44),x+(i%2?-bridgeSpan*.5:bridgeSpan*.5),h*.72,z);
      buildings.push(bridge);
    }
  }
  if(index===1){const waterMat=new THREE.MeshPhysicalMaterial({color:0x315d62,roughness:.18,metalness:.12,transparent:true,opacity:.88,clearcoat:.55,clearcoatRoughness:.12});const water=new THREE.Mesh(new THREE.PlaneGeometry(260,27,18,3),waterMat);water.rotation.x=-Math.PI/2;water.position.set(0,-.08,-111);scene.add(water);buildings.push(water);
    for(let i=0;i<8;i++){const pier=makeBox(4,.35,16,mat(0x71583d),rand(-95,95),.05,-93+rand(-3,7));buildings.push(pier);for(let p=-1;p<=1;p+=1){const plank=makeBox(.09,.05,15,mat(0x50422f),pier.position.x+p*1.1,.28,pier.position.z);buildings.push(plank)}}
    for(let i=0;i<10;i++){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rand(1.2,3.2),1),mat(rand(0x69726a,0x889087),.95,.05));rock.position.set(rand(-118,118),-.1,-98-rand(0,18));rock.scale.y=rand(.35,.7);rock.rotation.set(rand(0,.4),rand(0,3),rand(0,.3));scene.add(rock);decor.push(rock)}
  }
  if(index===2){
    for(let i=0;i<5;i++){const h=rand(6,11);const temple=new THREE.Mesh(new THREE.CylinderGeometry(10-i*.8,13-i*.5,h,8),mat(0xa78d61,.92,.02));temple.position.set(-70+i*35,h/2,55+(i%2)*18);temple.castShadow=true;temple.receiveShadow=true;scene.add(temple);buildings.push(temple);const crown=new THREE.Mesh(new THREE.CylinderGeometry(8-i*.5,9-i*.4,.45,8),mat(0x6f5c43,.82,.08));crown.position.set(temple.position.x,h+.2,temple.position.z);scene.add(crown);buildings.push(crown)}
  }
  if(index===3){
    for(let i=0;i<9;i++){const h=rand(5,8);const cabin=makeBox(11,h,9,mat(i%2?0x7f9293:0x9aa9a8,.72,.04),-80+i*20,h/2,-35+(i%3)*35);buildings.push(cabin);
      const snowRoof=new THREE.Mesh(new THREE.ConeGeometry(9,3.2,4),mat(0xe3e9e5,.68,.01));snowRoof.position.set(cabin.position.x,h+1.45,cabin.position.z);snowRoof.rotation.y=Math.PI/4;snowRoof.castShadow=true;scene.add(snowRoof);buildings.push(snowRoof)}
    for(let i=0;i<12;i++){const pine=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18,.32,2.4,7),mat(0x51453a));trunk.position.y=1.2;pine.add(trunk);for(let n=0;n<3;n++){const cone=new THREE.Mesh(new THREE.ConeGeometry(2-n*.35,2.8,8),mat(n===0?0x40595a:0x506966));cone.position.y=2.5+n*1.45;pine.add(cone)}pine.position.set(rand(-115,115),-.1,rand(-115,115));scene.add(pine);decor.push(pine)}
  }
  if(index===4){
    for(let i=0;i<6;i++){const hangar=makeBox(24,9,18,mat(i%2?0x59645d:0x6d7166),-75+i*30,4.5,50-(i%2)*70);buildings.push(hangar);
      for(let s=-1;s<=1;s+=2){const door=makeBox(.12,5,6,mat(0x303936),hangar.position.x+s*12,2.5,hangar.position.z+9.03);buildings.push(door)}}
  }
  if(index===2){for(let i=0;i<9;i++){const dune=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),mat(0xb19365));dune.scale.set(rand(13,26),rand(1.5,4),rand(10,20));dune.position.set(rand(-115,115),-1.6,rand(-115,115));scene.add(dune);decor.push(dune)}}
  if(index===3){for(let i=0;i<6;i++){const ice=new THREE.Mesh(new THREE.CircleGeometry(rand(5,12),24),new THREE.MeshStandardMaterial({color:0x77989a,roughness:.24,metalness:.3,transparent:true,opacity:.8}));ice.rotation.x=-Math.PI/2;ice.position.set(rand(-105,105),-.03,rand(-105,105));scene.add(ice);decor.push(ice)}}
  const roadMat=mat(index===2?0x76634b:index===3?0x667376:0x353b35, .96);
  makeBox(12,.04,225,roadMat,0,-.05,0);makeBox(225,.04,10,roadMat,0,-.045,0);
  const roofMats=[mat(m.accent),mat(index===2?0xa78a60:index===3?0x687d7e:0x575e55),mat(0x514f43)];
  for(let i=0;i<28;i++){
    const x=rand(-88,88),z=rand(-88,88); if(Math.abs(x)<12||Math.abs(z)<10)continue;
    const w=rand(7,15),d=rand(7,14),h=rand(index===0?8:4,index===0?21:10);
    const base=makeBox(w,h,d,roofMats[i%roofMats.length],x,h/2,z); buildings.push(base);
    const roof=makeBox(w+.3,.38,d+.3,mat(index===3?0x778481:index===2?0x7d6648:0x343b35),x,h+.15,z);buildings.push(roof);
    if(index===4){for(let c=0;c<2;c++){const win=makeBox(.13,rand(1,2),rand(1,2),mat(0x9e8750,.4,.3),x+(c?1:-1)*w*.3,h*.65,z+d/2+.03);buildings.push(win)}}
    if(index===0||index===1){for(let c=0;c<2;c++){const window=makeBox(1.2,1.4,.06,mat(index===1?0x52645b:0x303d3b,.3,.3),x+(c?1:-1)*w*.22,h*.62,z+d/2+.04);buildings.push(window)}}
    if(index===4){const chimney=makeBox(1.2,rand(4,9),1.2,mat(0x3e4742),x+w*.28,h+2,z-d*.2);buildings.push(chimney)}
  }
  // landmark silhouettes / containers and street furniture
  for(let i=0;i<16;i++){
    const x=rand(-95,95),z=rand(-95,95);if(Math.abs(x)<10&&Math.abs(z)<10)continue;
    if(index===4&&i<10){const c=makeBox(rand(5,9),2.6,2.4,mat([0x9b5938,0x596d65,0x77734d][i%3]),x,1.3,z);buildings.push(c);const seam=makeBox(.08,2.4,.04,mat(0x282e2a),x+2,1.3,z+1.23);buildings.push(seam)}
    else if(i%3===0){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.14,rand(4,7),7),mat(0x454a42,.8,.2));pole.position.set(x,2.5,z);pole.castShadow=true;scene.add(pole);decor.push(pole)}
  }
  // trees / scrub
  for(let i=0;i<58;i++){
    const x=rand(-112,112),z=rand(-112,112);if(Math.abs(x)<15&&Math.abs(z)<13)continue;
    const r=rand(.55,1.15), trunk=new THREE.Mesh(new THREE.CylinderGeometry(.17*r,.27*r,rand(2,3.8),7),mat(index===3?0x514c41:0x49392a));trunk.position.set(x,1.2,z);trunk.castShadow=true;scene.add(trunk);decor.push(trunk);
    const foliage=new THREE.Mesh(new THREE.ConeGeometry(rand(1.4,2.4),rand(3.2,5.4),7),mat(index===3?0x53696a:index===2?0x6a7443:m.tree));foliage.position.set(x,3.1,z);foliage.castShadow=true;scene.add(foliage);decor.push(foliage);
  }
  // distant ridgeline gives the map a strong horizon
  for(let i=0;i<14;i++){const ridge=new THREE.Mesh(new THREE.ConeGeometry(rand(14,24),rand(19,38),5),mat(index===2?0x9c815b:index===3?0xa9b8b8:index===1?0x49654b:0x555d52));ridge.position.set(-115+i*18,rand(7,12),-116);ridge.rotation.y=rand(0,1);scene.add(ridge);decor.push(ridge)}
  playerGroup=makeSoldier(0x465343,true);playerGroup.position.set(0,0,0);scene.add(playerGroup);player={pos:playerGroup.position,vel:new THREE.Vector3(),speed:7.8};
  // loot crates and ground pickups
  for(let i=0;i<15;i++){const x=rand(-75,75),z=rand(-75,75);if(Math.abs(x)<9&&Math.abs(z)<9)continue;const box=makeBox(.8,.65,.8,mat(i%3===0?0xc38b39:0x4b624a,.65,.2),x,.35,z);box.userData.pickup=true;pickups.push(box);const glow=new THREE.Mesh(new THREE.TorusGeometry(.56,.035,6,18),new THREE.MeshBasicMaterial({color:0xd8f05a,transparent:true,opacity:.7}));glow.rotation.x=Math.PI/2;glow.position.set(x,.04,z);scene.add(glow);decor.push(glow)}
  // Rival squads / training combatants
  for(let i=0;i<14;i++){const g=makeSoldier([0x5c4836,0x384b49,0x554b49,0x555745][i%4]);const a=rand(0,Math.PI*2),r=rand(28,94);g.position.set(Math.cos(a)*r,0,Math.sin(a)*r);scene.add(g);enemies.push({group:g,health:100,alive:true,think:rand(0,2),phase:rand(0,6),speed:rand(2.2,3.8),fire:rand(2,5),wander:new THREE.Vector3(rand(-1,1),0,rand(-1,1)).normalize()})}
  const ringGeo=new THREE.TorusGeometry(zoneRadius,.18,5,160);zoneRing=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0x8ee3ff,transparent:true,opacity:.75}));zoneRing.rotation.x=Math.PI/2;zoneRing.position.y=.35;scene.add(zoneRing);
  viewYaw=Math.PI;
  playerGroup.rotation.y=viewYaw;
}

function updateMapMenu(){const grid=$('#map-grid');grid.innerHTML='';MAPS.forEach((m,i)=>{const card=document.createElement('button');card.className='map-card'+(i===selectedMap?' selected':'');card.dataset.map=m.name;card.innerHTML=`<span class="map-visual"></span><span class="map-index">0${i+1} / 05</span><strong>${m.name.toUpperCase()}</strong><small>${m.short} · ${m.desc}</small>`;card.onclick=()=>{selectedMap=i;updateMapMenu()};grid.append(card)});}

function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2100)}
function showPanel(type){const data={armory:['ARSENAL','PREPARE SEU EQUIPAMENTO','Rifles versáteis para qualquer distância.'],store:['LOJA DE CAMPO','VISUAL SEM COMPROMISSO','Itens cosméticos. Sua presença, suas regras.'],pass:['PASSE DE TEMPORADA','FRONTEIRA SELVAGEM','Conclua missões e desbloqueie recompensas exclusivas.']}[type];$('#panel-kicker').textContent=type==='pass'?'TEMPORADA 04':'PERSONALIZAÇÃO';$('#panel-title').textContent=data[1];$('#panel-description').textContent=data[2];const items=type==='armory'?[['⌁','VETOR MK-II','RIFLE · EQUIPADO'],['◉','M7 SENTINELA','PRECISÃO · NÍVEL 2'],['◈','KIT DE CAMPO','RECUPERAÇÃO · 3 UN.']]:type==='store'?[['✧','VANGUARDA','VISUAL · 1.200 ◆'],['◇','PULSO DE JADE','TRILHA · 600 ◆'],['✦','NÉVOA TÁTICA','GESTO · 450 ◆']]:[['01','NÍVEL 24','RECOMPENSA ATUAL'],['✦','MISSÕES','3 DISPONÍVEIS'],['◈','PRÓXIMO NÍVEL','320 XP']];$('#panel-items').innerHTML=items.map(x=>`<div class="panel-item"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');$('#sub-panel').classList.remove('hidden')}

function deployGum(){if(!gameOn||paused||ended)return;if(gumBarrier&&gumBarrier.userData.life>0){showToast('BOLA DE CHICLETE JÁ ATIVA');return}const dir=new THREE.Vector3(Math.sin(viewYaw),0,Math.cos(viewYaw));const pos=player.pos.clone().add(dir.multiplyScalar(3.1));pos.y=.1;
  const group=new THREE.Group();group.position.copy(pos);group.rotation.y=viewYaw;scene.add(group);
  const bubbleMat=new THREE.MeshPhysicalMaterial({color:[0xf17cbe,0x91dc70,0x65c9e6][Math.floor(Math.random()*3)],roughness:.17,metalness:.05,clearcoat:1,clearcoatRoughness:.06,transmission:.07});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),bubbleMat);body.position.y=1.45;body.scale.set(.12,.12,.12);body.castShadow=true;group.add(body);
  const shine=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.48}));shine.scale.set(.10,.06,.025);shine.position.set(-.32,2.05,.48);group.add(shine);
  const tendril=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.8,5,9),bubbleMat);tendril.position.set(-.8,1.5,.05);tendril.rotation.z=1.1;tendril.scale.set(.2,.4,.2);group.add(tendril);
  group.userData={body,shine,tendril,life:17,age:0};gumBarrier=group;gumAnim=group.userData;
  for(let i=0;i<12;i++)spawnParticle(pos.clone().add(new THREE.Vector3(rand(-.8,.8),rand(.2,2),rand(-.4,.4))),bubbleMat.color,rand(.1,.28),rand(1,2));
  showToast('BOLA DE CHICLETE — BARREIRA ATIVA');
}
function spawnParticle(pos,color,size,life){const mesh=new THREE.Mesh(new THREE.SphereGeometry(size,8,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8}));mesh.position.copy(pos);scene.add(mesh);particles.push({mesh,vel:new THREE.Vector3(rand(-2,2),rand(1,4),rand(-2,2)),life,max:life});}
function shoot(){if(!gameOn||paused||ended)return;const now=performance.now();if(now-lastShot<155||reloadUntil>now)return;if(ammo<=0){reload();return}lastShot=now;ammo--;$('#ammo-count').textContent=ammo;
  // Shoot a visible tracer toward the center reticle and nearest forward rival.
  const origin=playerGroup.position.clone().add(new THREE.Vector3(0,1.55,0));const forward=new THREE.Vector3(Math.sin(viewYaw),0,Math.cos(viewYaw));let target=null,best=34;
  for(const e of enemies){if(!e.alive)continue;const v=e.group.position.clone().sub(origin);const dist=v.length();v.normalize();const dot=v.dot(forward);if(dot>.91&&dist<best){best=dist;target=e}}
  const end=target?target.group.position.clone().add(new THREE.Vector3(0,1.2,0)):origin.clone().add(forward.multiplyScalar(34));const geo=new THREE.BufferGeometry().setFromPoints([origin,end]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffdd94,transparent:true,opacity:.9}));scene.add(line);setTimeout(()=>{scene.remove(line);geo.dispose()},70);
  if(target){target.health-=34;spawnParticle(end,0xffc270,.12,.25);if(target.health<=0){target.alive=false;target.group.visible=false;kills++;alive=Math.max(1,alive-1);$('#kill-count').textContent=kills;$('#alive-count').textContent=alive;addFeed('VOCÊ',`RIVAL ${String(15-enemies.filter(e=>e.alive).length).padStart(2,'0')}`);showToast('ALVO ELIMINADO · +100 XP')}}
}
function addFeed(a,b){const d=document.createElement('div');d.className='kill-message';d.innerHTML=`<b>${a}</b> &nbsp;⌁&nbsp; ${b}`;$('#kill-feed').prepend(d);setTimeout(()=>d.remove(),4800)}
function reload(){if(ammo===30||reserveAmmo<=0)return;reloadUntil=performance.now()+1500;showToast('RECARREGANDO…');setTimeout(()=>{const n=Math.min(30-ammo,reserveAmmo);ammo+=n;reserveAmmo-=n;$('#ammo-count').textContent=ammo},1500)}
function takeDamage(amount){if(armor>0){const absorb=Math.min(armor,amount*.65);armor-=absorb;amount-=absorb}health=Math.max(0,health-amount);$('#health-value').textContent=Math.round(health);$('#armor-value').textContent=Math.round(armor);$('#health-bar').style.width=health+'%';$('#armor-bar').style.width=armor+'%';if(health<=0)finishGame(false)}
function finishGame(win){if(ended)return;ended=true;paused=true;$('#result-title').textContent=win?'VITÓRIA ROYALE':'ELIMINADO';$('#result-kicker').textContent=win?'SOBREVIVENTE FINAL':'FIM DE PARTIDA';$('#result-text').textContent=win?'A ilha agora é sua. Uma lenda nasceu.':'A ilha ainda guarda outras histórias.';$('#result-kills').textContent=kills;$('#result-time').textContent=formatTime(gameTime);$('#result-menu').classList.remove('hidden')}
const formatTime=(t)=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function updateMini(){const c=mapCtx;c.clearRect(0,0,168,168);c.fillStyle=mapIndex===2?'#a2895e':mapIndex===3?'#71878a':'#435b46';c.fillRect(0,0,168,168);c.strokeStyle='rgba(20,30,20,.7)';c.lineWidth=7;c.beginPath();c.moveTo(84,0);c.lineTo(84,168);c.moveTo(0,84);c.lineTo(168,84);c.stroke();for(const b of buildings){if(b.geometry.type==='PlaneGeometry')continue;c.fillStyle='#242d27';c.fillRect(84+b.position.x*.48-2,84+b.position.z*.48-2,4,4)}c.strokeStyle='#a4e7f2';c.lineWidth=1.5;c.beginPath();c.arc(84,84,zoneRadius*.48,0,Math.PI*2);c.stroke();for(const e of enemies){if(e.alive){c.fillStyle='#f17b65';c.beginPath();c.arc(84+e.group.position.x*.48,84+e.group.position.z*.48,2,0,Math.PI*2);c.fill()}}c.fillStyle='#d8f05a';c.beginPath();c.arc(84+player.pos.x*.48,84+player.pos.z*.48,3.5,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=1;c.stroke()}

function startGame(){selectedMap=mapIndex;buildWorld(mapIndex);gameOn=true;paused=false;ended=false;health=100;armor=65;ammo=30;reserveAmmo=180;kills=0;alive=50;gameTime=0;zoneRadius=92;$('#ammo-count').textContent=ammo;$('#health-value').textContent=health;$('#armor-value').textContent=armor;$('#health-bar').style.width='100%';$('#armor-bar').style.width='65%';$('#kill-count').textContent='0';$('#alive-count').textContent='50';$('#match-clock').textContent='00:00';$('#objective-title').textContent='ENCONTRE EQUIPAMENTO';$('#objective-sub').textContent=`${MAPS[mapIndex].name} · ${mode} · 50 JOGADORES`;$('#lobby').classList.add('hidden');$('#hud').classList.remove('hidden');$('#map-menu').classList.add('hidden');$('#sub-panel').classList.add('hidden');$('#pause-menu').classList.add('hidden');$('#result-menu').classList.add('hidden');showToast('OPERAÇÃO INICIADA · BOA SORTE');updateMini();}

$('#play-button').onclick=startGame;
$('#map-select').onclick=()=>{$('#map-menu').classList.remove('hidden');selectedMap=mapIndex;updateMapMenu()};
$('#close-maps').onclick=()=>$('#map-menu').classList.add('hidden');
$('#confirm-map').onclick=()=>{mapIndex=selectedMap;$('#map-name').textContent=MAPS[mapIndex].name.toUpperCase();buildWorld(mapIndex);$('#map-menu').classList.add('hidden');showToast(`${MAPS[mapIndex].name.toUpperCase()} SELECIONADO`)};
document.querySelectorAll('.mode-chip').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode-chip').forEach(x=>x.classList.remove('chosen'));b.classList.add('chosen');mode=b.dataset.mode});
document.querySelectorAll('.rail-item').forEach(b=>b.onclick=()=>{document.querySelectorAll('.rail-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.panel==='play'){$('#sub-panel').classList.add('hidden');return}showPanel(b.dataset.panel)});
$('#close-panel').onclick=()=>{$('#sub-panel').classList.add('hidden');document.querySelectorAll('.rail-item').forEach((x,i)=>x.classList.toggle('active',i===0))};
$('#pause-button').onclick=()=>{paused=true;$('#pause-menu').classList.remove('hidden')};$('#resume-button').onclick=()=>{paused=false;$('#pause-menu').classList.add('hidden')};$('#settings-button').onclick=()=>$('#sensitivity').classList.toggle('hidden');$('#sens-range').oninput=e=>$('#sens-value').textContent=e.target.value;$('#leave-button').onclick=()=>{gameOn=false;paused=false;$('#pause-menu').classList.add('hidden');$('#hud').classList.add('hidden');$('#lobby').classList.remove('hidden')};$('#return-lobby').onclick=()=>{gameOn=false;paused=false;$('#result-menu').classList.add('hidden');$('#hud').classList.add('hidden');$('#lobby').classList.remove('hidden')};
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&gameOn&&!ended){paused=!paused;$('#pause-menu').classList.toggle('hidden',!paused)}if(e.code==='KeyF')deployGum();if(e.code==='KeyR')reload();if(e.code==='KeyC')crouched=!crouched;if(e.code==='Space'&&grounded){jumpV=7;grounded=false}if(e.code==='Tab'&&gameOn){e.preventDefault();const p=pickups.find(p=>p.visible&&p.position.distanceTo(player.pos)<3.5);if(p){p.visible=false;ammo=Math.min(60,ammo+12);reserveAmmo+=30;armor=Math.min(100,armor+10);$('#ammo-count').textContent=ammo;$('#armor-value').textContent=Math.round(armor);$('#armor-bar').style.width=armor+'%';showToast('SUPRIMENTOS COLETADOS · +30 MUNIÇÃO')}else showToast('NENHUM SUPRIMENTO POR PERTO')}});
window.addEventListener('keyup',e=>keys[e.code]=false);
let lastTouchFire=0;document.querySelectorAll('[data-move]').forEach(b=>{const k=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();touchMove[k]=true;b.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>touchMove[k]=false))});document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();const a=b.dataset.action;if(a==='gum')deployGum();if(a==='jump'&&grounded){jumpV=7;grounded=false}if(a==='crouch')crouched=!crouched;if(a==='fire'){shoot();lastTouchFire=setInterval(()=>{if(!gameOn||paused){clearInterval(lastTouchFire);return}shoot()},170)}}));document.querySelectorAll('[data-action="fire"]').forEach(b=>['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>{clearInterval(lastTouchFire);lastTouchFire=0})));
let lookPointer=null;canvas.addEventListener('pointerdown',e=>{if(!gameOn||paused||ended)return;if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;lookPointer={id:e.pointerId,x:e.clientX,startX:e.clientX,moved:false,type:e.pointerType,button:e.button};canvas.setPointerCapture(e.pointerId);e.preventDefault()});canvas.addEventListener('pointermove',e=>{if(!lookPointer||e.pointerId!==lookPointer.id)return;const dx=e.clientX-lookPointer.x;if(Math.abs(e.clientX-lookPointer.startX)>5)lookPointer.moved=true;viewYaw-=dx*(lookPointer.type==='touch'?.006:.004)*($('#sens-range').value/55);lookPointer.x=e.clientX});const endLook=e=>{if(!lookPointer||e.pointerId!==lookPointer.id)return;if(lookPointer.type==='mouse'&&lookPointer.button===0&&!lookPointer.moved)shoot();lookPointer=null};canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',e=>{if(lookPointer?.id===e.pointerId)lookPointer=null});canvas.addEventListener('contextmenu',e=>e.preventDefault());

function update(dt){if(!gameOn||paused||ended)return;gameTime+=dt;$('#match-clock').textContent=formatTime(gameTime);
  const forward=(keys.KeyW||keys.ArrowUp||touchMove.forward?1:0)-(keys.KeyS||keys.ArrowDown||touchMove.back?1:0),side=(keys.KeyD||keys.ArrowRight||touchMove.right?1:0)-(keys.KeyA||keys.ArrowLeft||touchMove.left?1:0);
  sprinting=!!keys.ShiftLeft&&!crouched;const speed=crouched?3.5:sprinting?11.8:7.7;
  const fwd=new THREE.Vector3(Math.sin(viewYaw),0,Math.cos(viewYaw));const right=new THREE.Vector3(fwd.z,0,-fwd.x);const move=fwd.multiplyScalar(forward).add(right.multiplyScalar(side));playerGroup.rotation.y=viewYaw;if(move.lengthSq()>0){move.normalize();player.pos.addScaledVector(move,speed*dt);playerGroup.userData.phase+=dt*(sprinting?13:8)}else playerGroup.userData.phase+=dt*2;
  player.pos.x=clamp(player.pos.x,-120,120);player.pos.z=clamp(player.pos.z,-120,120);
  // Soft collision against large structures.
  for(const b of buildings){if(!b.visible||b.geometry.type==='PlaneGeometry'||b.geometry.type==='SphereGeometry'||b.geometry.type==='CircleGeometry')continue;const dx=player.pos.x-b.position.x,dz=player.pos.z-b.position.z;const bx=(b.geometry.parameters?.width||1)*.52,bz=(b.geometry.parameters?.depth||1)*.52;if(Math.abs(dx)<bx+.45&&Math.abs(dz)<bz+.45&&player.pos.y<(b.position.y+(b.geometry.parameters?.height||1))){if(Math.abs(dx/bx)>Math.abs(dz/bz))player.pos.x=b.position.x+Math.sign(dx||1)*(bx+.5);else player.pos.z=b.position.z+Math.sign(dz||1)*(bz+.5)}}
  if(!grounded){jumpV-=18*dt;player.pos.y+=jumpV*dt;if(player.pos.y<=0){player.pos.y=0;jumpV=0;grounded=true}}
  playerGroup.position.y=player.pos.y+(crouched?-.28:0);playerGroup.scale.y=crouched?.78:1;
  const phase=playerGroup.userData.phase;playerGroup.userData.legs.forEach((l,i)=>{l.rotation.x=(forward||side)?Math.sin(phase+i*Math.PI)*.52:0});playerGroup.userData.arms.forEach((a,i)=>{a.rotation.x=(forward||side)?Math.sin(phase+i*Math.PI+Math.PI)*.35:0});
  // Follow camera shoulder view.
  const viewForward=new THREE.Vector3(Math.sin(viewYaw),0,Math.cos(viewYaw));const desired=player.pos.clone().addScaledVector(viewForward,-7.2);desired.y+=4.1;camera.position.lerp(desired,1-Math.exp(-4.2*dt));const cameraTarget=player.pos.clone().addScaledVector(viewForward,1.6);cameraTarget.y+=1.55;camera.lookAt(cameraTarget);
  enemies.forEach(e=>{if(!e.alive)return;e.phase+=dt*5;const diff=player.pos.clone().sub(e.group.position);const dist=diff.length();e.think-=dt;if(e.think<=0){e.think=rand(.9,2.6);if(dist<32)e.wander.copy(diff.normalize());else e.wander.set(rand(-1,1),0,rand(-1,1)).normalize()}
    if(dist>5&&dist<47)e.group.position.addScaledVector(e.wander,e.speed*dt);e.group.position.x=clamp(e.group.position.x,-115,115);e.group.position.z=clamp(e.group.position.z,-115,115);e.group.rotation.y=Math.atan2(e.wander.x,e.wander.z);e.group.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(e.phase+i*Math.PI)*.35);
    e.fire-=dt;if(dist<24&&e.fire<=0){e.fire=rand(2.8,5);if(Math.random()<.58){if(gumBarrier&&gumBarrier.position.distanceTo(e.group.position)<4){}else{takeDamage(rand(5,12));if(Math.random()<.25)addFeed(`RIVAL ${String(Math.floor(rand(10,49))).padStart(2,'0')}`,'VOCÊ')}}}
  });
  if(gumBarrier){const u=gumBarrier.userData;u.age+=dt;u.life-=dt;const grow=clamp(u.age/.52,0,1);const pulse=1+Math.sin(u.age*9)*.018;u.body.scale.set(1.7*grow*pulse,1.45*grow*pulse, .56*grow*pulse);u.body.position.y=1.4*grow;u.shine.scale.set(.15*grow,.10*grow,.035*grow);u.tendril.scale.set(.32*grow,.72*grow,.3*grow);u.tendril.rotation.z=Math.sin(u.age*5)*.24+1.05;if(u.life<3){const k=Math.max(0,u.life/3);u.body.material.opacity=k;u.body.material.transparent=true;u.body.scale.multiplyScalar(.995)}if(u.life<=0){scene.remove(gumBarrier);gumBarrier=null;showToast('CHICLETE DESFEITO')}}
  if(gameTime>65){zoneRadius=Math.max(25,92-(gameTime-65)*.25);zoneRing.scale.set(zoneRadius/92,zoneRadius/92,zoneRadius/92);if(Math.hypot(player.pos.x,player.pos.z)>zoneRadius){$('#zone-alert').classList.remove('hidden');takeDamage(2.7*dt)}else $('#zone-alert').classList.add('hidden')}
  pickups.forEach(p=>{if(p.visible)p.rotation.y+=dt*.7});particles.forEach((p,i)=>{p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);p.vel.y-=5*dt;p.mesh.material.opacity=Math.max(0,p.life/p.max);if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1)}});
  if(gameTime>130&&alive<=1)finishGame(true);if(Math.floor(gameTime)%3===0&&Math.floor(gameTime)!==update.lastMini){update.lastMini=Math.floor(gameTime);updateMini()}
}
function render(){requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera)}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))});
window.addEventListener('load',()=>{if(innerWidth<700)document.body.classList.add('mobile');buildWorld(mapIndex);camera.position.set(12,9,-16);camera.lookAt(0,1,0);render();});
