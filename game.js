"use strict";
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}addEventListener('resize',resize);resize();

const $=id=>document.getElementById(id);
let running=false,yaw=0,pitch=-0.08,player={x:0,z:18,y:0,hp:100,ammo:30,reserve:120,kills:0},keys={},enemies=[],loot=[],shots=[];
let zone={x:0,z:0,r:54,time:150};
const rnd=(a,b)=>a+Math.random*(b-a); 
function randName(){return ['REDK1LL','Shadow','Ghost47','Viper','Raptor','Nova','Blaze','Storm','Wolf','Ace'][Math.floor(Math.random()*10)]}
function reset(){player={x:0,z:18,y:0,hp:100,ammo:30,reserve:120,kills:0};yaw=-0.08;pitch=-0.08;zone={x:0,z:0,r:54,time:150};enemies=[];
const opening=[[-9,8],[10,6],[17,15],[-15,-4],[25,-18]];
opening.forEach((p,i)=>enemies.push({x:p[0],z:p[1],hp:70,alive:true,name:randName(),angle:0,flash:0,move:rnd(0,6)}));
for(let i=0;i<18;i++) enemies.push({x:rnd(-48,48),z:rnd(-48,48),hp:70,alive:true,name:randName(),angle:0,flash:0,move:rnd(0,6)});loot=[];for(let i=0;i<18;i++)loot.push({x:rnd(-45,45),z:rnd(-45,45),type:Math.random()<.7?'ammo':'med'});shots=[]}
function start(){reset();running=true;$('startScreen').classList.add('hidden');$('endScreen').classList.add('hidden');$('crosshair').style.display='block';$('alive').textContent='24';updateHud()}reset();
$('startBtn').onclick=start;$('againBtn').onclick=start;

addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='r')reload()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('mousedown',e=>{if(running)fire()});addEventListener('mousemove',e=>{if(running&&document.pointerLockElement===canvas){yaw+=e.movementX*.0025;pitch=Math.max(-.45,Math.min(.35,pitch+e.movementY*.002))}});
canvas.addEventListener('click',()=>{if(running&&matchMedia('(pointer:fine)').matches)canvas.requestPointerLock&&canvas.requestPointerLock()});

let stickActive=false,stickOrigin={x:0,y:0};const stick=$('stick');stick.addEventListener('pointerdown',e=>{stickActive=true;stick.setPointerCapture(e.pointerId);const r=stick.getBoundingRect();stickOrigin={x:r.left+r.width/2,y:r.top+r.width/2}});stick.addEventListener('pointermove',e=>{if(!stickActive)return;let dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y;const l=Math.hypot(dx,dy)||1;if(l>38){dx*=38/l;dy*=38/l}$('stickKnob').style.transform=`translate(${dx}px,${dy}px)`;keys._touchX=dx/38;keys._touchY=dy/38});stick.addEventListener('pointerup',()=>{stickActive=false;$('stickKnob').style.transform='';keys._touchX=0;keys._touchY=0});
$('fireBtn').addEventListener('pointerdown',e=>{e.preventDefault();fire()});$('reloadBtn').onclick=reload;$('jumpBtn').onclick=()=>{if(player.y===0)player.y=1.8};$('crouchBtn').onclick=()=>{player.y=player.y<.3?-.35:0};

function reload(){if(player.reserve<=0||player.ammo===30)return;const need=30-player.ammo,take=Math.min(need,player.reserve);player.ammo+=take;player.reserve-=take;showMessage('RELOADING');updateHud()}
function fire(){if(!running)return;if(player.ammo<=0){reload();return}player.ammo--;shots.push({x:player.x,z:player.z,a:yaw,t:.12});updateHud();let best=null,bestAng=99;for(const en of enemies){if(!en.alive)continue;let dx=en.x-player.x,dz=en.z-player.z,d=Math.hypot(dx,dz);let a=Math.atan2(dx,dz)-yaw;while(a<-Math.PI)a+=Math.PI*2;while(a>Math.PI)a-=Math.PI*2;if(d<42&&Math.abs(a)<.035&&Math.abs(a)<bestAng){bestAng=Math.abs(a);best=en}}if(best){best.hp-=34;best.flash=.12;if(best.hp<=0){best.alive=false;player.kills++;showMessage('ENEMY ELIMINATED +1');if(enemies.filter(e=>e.alive).length===0)end(true)}}}
function showMessage(s){$('message').textContent=s;clearTimeout(showMessage.t);showMessage.t=setTimeout(()=>{$('message').textContent=''},1600)}
function updateHud(){ $('ammo').textContent=player.ammo;$('reserve').textContent='/ '+player.reserve;$('kills').textContent=player.kills;$('healthFill').style.width=Math.max(0,player.hp)+'%';$('healthText').textContent=Math.ceil(player.hp)+' HP';$('alive').textContent=enemies.filter(e=>e.alive).length+1}
function end(win){running=false;const screen=$('endScreen');screen.classList.remove('hidden');$('crosshair').style.display='none';$('resultTitle').textContent=win?'BOOYAH!':'ELIMINATED';$('resultSub').textContent=win?'WINNER WINNER CHICKEN DINNER':'BETTER LUCK NEXT MATCH';$('finalKills').textContent=player.kills;$('finalAlive').textContent=win?'1':String(enemies.filter(e=>e.alive).length+1);if(document.pointerLockElement)document.exitPointerLock()}

const worldObjects=[];
for(let i=0;i<10;i++)worldObjects.push({type:'house',x:rnd(-38,38),z:rnd(-38,38),s:rnd(5,8)});
for(let i=0;i<90;i++)worldObjects.push({type:Math.random()<.7?'tree':'rock',x:rnd(-55,55),z:rnd(-55,55),s:rnd(1,2.6)});

function project(x,y,z){let dx=x-player.x,dz=z-player.z,c=Math.cos(yaw),s=Math.sin(yaw);let rx=dx*c-dz*s,rzt=dz*c+dx*s;let sy=(y-player.y)+1.15-pitch*rzt*.05;let depth=rzt;if(depth<.25)return null;let f=W*.75;return{x:W/2+rx/depth*f,y:H*.48-sy/depth*f,depth,rzt}}

function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function drawWorld(){ctx.fillStyle='#70b8cf';ctx.fillRect(0,0,W,H);let horizon=H*.48;let g=ctx.createLinearGradient(0,horizon,0,H);g.addColorStop(0,'#819d65');g.addColorStop(.25,'#6c944e');g.addColorStop(1,'#477c3d');ctx.fillStyle=g;ctx.fillRect(0,horizon,W,H-horizon);
// sky sun and clouds
ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.arc(W*.78,H*.16,34,0,7);ctx.fill();ctx.fillStyle='#ffffff55';for(let i=0;i<7;i++){let x=(i*190-yaw*20)% (W+200)-100;ctx.beginPath();ctx.ellipse(x,H*(.12+(i%3)*.07),55,10,0,0,7);ctx.fill()}
// terrain grid
ctx.globalAlpha=.11;ctx.strokeStyle='#203b20';for(let z=-50;z<=50;z+=5){let a=project(-55,0,z),b=project(55,0,z);if(a&&b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}for(let x=-55;x<=55;x+=5){let a=project(x,0,-55),b=project(x,0,55);if(a&&b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}ctx.globalAlpha=1;

// objects and characters sorted far to near
let items=[];for(const o of worldObjects)items.push({...o,kind:'object'});for(const e of enemies)if(e.alive)items.push({type:'enemy',e,kind:'enemy',x:e.x,z:e.z,s:1});for(const l of loot)items.push({type:l.type,x:l.x,z:l.z,s:.8,kind:'loot'});
items.sort((a,b)=>{let da=(a.x-player.x)**2+(a.z-player.z)**2,db=(b.x-player.x)**2+(b.z-player.z)**2;return db-da});
for(const item of items)drawItem(item);
if(zone.r<54)drawZone();
for(const sh of shots){}
}
function drawZone(){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#4cc5ff';ctx.beginPath();ctx.arc(W/2,H*.48,Math.min(W,H)*zone.r/70,0,7);ctx.fill();ctx.strokeStyle='#62baff';ctx.lineWidth=3;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(W/2,H*.48,Math.min(W,H)*zone.r/70,0,7);ctx.stroke();ctx.restore()}
function drawItem(o){if(o.kind==='loot'){let p=project(o.x,.35,o.z);if(!p)return;let s=35/p.depth;ctx.fillStyle=o.type==='med'?'#c9e8dd':'#d5a94d';ctx.fillRect(p.x-s*.35,p.y-s*.5,s*.7,s*.7);ctx.fillStyle='#fff';ctx.fillRect(p.x-s*.05,p.y-s*.38,s*.1,s*.76);return}
if(o.kind==='enemy'){const e=o.e,p=project(e.x,1,e.z);if(!p)return;let s=Math.min(220,100/p.depth);drawPerson(p.x,p.y,s,e.flash>0?'#ff7c64':'#8fd05a',e.name)}
else if(o.type==='tree'){let p=project(o.x,0,o.z);if(!p)return;let s=o.s*115/p.depth;if(s<2)return;ctx.fillStyle='#70472b';ctx.fillRect(p.x-s*.08,p.y-s*.9,s*.16,s*.9);ctx.fillStyle='#315d32';ctx.beginPath();ctx.moveTo(p.x,p.y-s*1.8);ctx.lineTo(p.x-s*.75,p.y-s*.75);ctx.lineTo(p.x+s*.75,p.y-s*.75);ctx.closePath();ctx.fill();ctx.fillStyle='#4b813e';ctx.beginPath();ctx.moveTo(p.x,p.y-s*1.55);ctx.lineTo(p.x-s*.65,p.y-s*.4);ctx.lineTo(p.x+s*.65,p.y-s*.4);ctx.closePath();ctx.fill()}
else if(o.type==='rock'){let p=project(o.x,.3,o.z);if(!p)return;let s=o.s*75/p.depth;ctx.fillStyle='#69716a';ctx.beginPath();ctx.moveTo(p.x-s*.5,p.y);ctx.lineTo(p.x-s*.4,p.y-s*.45);ctx.lineTo(p.x+s*.05,p.y-s*.65);ctx.lineTo(p.x+s*.55,p.y-s*.35);ctx.lineTo(p.x+s*.45,p.y);ctx.fill()}
else if(o.type==='house'){let p=project(o.x,0,o.z);if(!p)return;let s=o.s*75/p.depth;if(s<3)return;let h=s*.9,w=s*1.25;ctx.fillStyle='#c58b57';ctx.fillRect(p.x-w/2,p.y-h,p.x+p.x?W:W,0);ctx.fillRect(p.x-w/2,p.y-h,w,h);ctx.fillStyle='#a76d43';ctx.fillRect(p.x-w*.08,p.y-h*.42,w*.16,h*.42);ctx.fillStyle='#dcba83';ctx.fillRect(p.x-w*.38,p.y-h*.7,w*.22,h*.22);ctx.fillStyle='#7a482f';ctx.beginPath();ctx.moveTo(p.x-w*.62,p.y-h);ctx.lineTo(p.x,p.y-h*1.42);ctx.lineTo(p.x+w*.62,p.y-h);ctx.fill()}}
function drawPerson(x,y,s,color,name){ctx.save();ctx.fillStyle='#26343a';ctx.beginPath();ctx.ellipse(x,y-s*.12,s*.28,s*.12,0,0,7);ctx.fill();ctx.fillStyle=color;ctx.fillRect(x-s*.22,y-s*.85,s*.44,s*.72);ctx.fillStyle='#b88c68';ctx.beginPath();ctx.arc(x,y-s*.95,s*.18,0,7);ctx.fill();ctx.fillStyle='#20272a';ctx.fillRect(x+s*.12,y-s*.68,s*.55,s*.09);ctx.fillStyle='#111';ctx.fillRect(x-s*.28,y-s*.25,s*.2,s*.32);ctx.fillRect(x+s*.08,y-s*.25,s*.2,s*.32);ctx.fillStyle='#fff';ctx.font=`${Math.max(8,s*.09)}px Arial`;ctx.textAlign='center';ctx.fillText(name,x,y-s*1.22);ctx.restore()}

let last=performance.now(),timerAcc=0,zoneAcc=0;
function update(dt){if(!running)return;let forward=(keys.w?1:0)-(keys.s?1:0)+(keys._touchY?-keys._touchY:0),side=(keys.d?1:0)-(keys.a?1:0)+(keys._touchX||0);if(forward||side){let sp=5*dt,a=yaw-Math.PI/2;let fx=Math.sin(yaw)*forward+Math.cos(yaw)*side,fz=Math.cos(yaw)*forward-Math.sin(yaw)*side;let nx=player.x+fx*sp,nz=player.z+fz*sp;if(Math.hypot(nx,nz)<56){player.x=nx;player.z=nz}}if(keys.arrowleft)yaw-=2*dt;if(keys.arrowright)yaw+=2*dt;if(player.y>0)player.y-=dt*2.5;if(player.y<0)player.y=0;for(const en of enemies){if(!en.alive)continue;en.flash=Math.max(0,en.flash-dt);let dx=player.x-en.x,dz=player.z-en.z,d=Math.hypot(dx,dz);if(d<24){en.angle=Math.atan2(dx,dz);if(d>10){en.x+=Math.sin(en.angle)*dt*.7;en.z+=Math.cos(en.angle)*dt*.7}else if(Math.random()<dt*.45){player.hp-=5;showMessage('YOU ARE TAKING DAMAGE');updateHud();if(player.hp<=0)end(false)}}else{en.move-=dt;if(en.move<=0){en.move=rnd(2,6);en.angle=rnd(-Math.PI,Math.PI)}en.x+=Math.sin(en.angle)*dt*.22;en.z+=Math.cos(en.angle)*dt*.22}}for(const l of loot){let d=Math.hypot(player.x-l.x,player.z-l.z);if(d<1.5){if(l.type==='ammo'){player.reserve=Math.min(180,player.reserve+30);showMessage('AMMO PICKED UP')}else{player.hp=Math.min(100,player.hp+25);showMessage('MEDKIT +25')}l.x=rnd(-45,45);l.z=rnd(-45,45);updateHud()}}timerAcc+=dt;if(timerAcc>.5){timerAcc=0;zone.time--;let m=Math.floor(zone.time/60),s=zone.time%60;$('timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');if(zone.time<=0){zone.time=150;zone.r=Math.max(18,zone.r-5)}const away=Math.hypot(player.x-zone.x,player.z-zone.z);if(away>zone.r){player.hp-=1.2*dt;updateHud();if(player.hp<=0)end(false)}}}
function frame(now){let dt=Math.min(.033,(now-last)/1000);last=now;update(dt);drawWorld();requestAnimationFrame(frame)}requestAnimationFrame(frame);
