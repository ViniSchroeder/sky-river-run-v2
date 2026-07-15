import {Player} from "./player.js";
import {River} from "./river.js";
import {EnemySystem} from "./enemies.js";
import {Effects} from "./effects.js";
import {UI} from "./ui.js";
import {AudioSystem} from "./audio.js";

const load=(src)=>{const i=new Image();i.src=src;return i};
const sprites={
 player:load("./assets/sprites/player_v22.png"),
 airplane:load("./assets/sprites/player_v22.png"),
 helicopter:load("./assets/sprites/helicopter.png"),
 ufo:load("./assets/sprites/ufo.png"),
 bird:load("./assets/sprites/helicopter.png"),
 boat:load("./assets/sprites/boat.png"),
 submarine:load("./assets/sprites/submarine.png"),
 truck:load("./assets/sprites/truck.png"),
 explosion:load("./assets/sprites/explosion.png"),
 cloud:load("./assets/sprites/cloud.png"),
 water:load("./assets/sprites/water_strip.png"),
 bank:load("./assets/sprites/riverbank_strip.png")
};

class Game {
 constructor(){
  this.canvas=document.querySelector("#game");this.ctx=this.canvas.getContext("2d",{alpha:false});this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.running=false;this.paused=false;this.time=0;this.score=0;this.speed=225;this.shake=0;this.record=Number(localStorage.getItem("sky-river-run-v2-record")||0);this.keys=new Set();this.firing=false;this.mobileFiring=false;this.fireTimer=0;this.bullets=[];this.pickups=[];this.pickupTimer=2;this.cloudTimer=7;this.level=1;
  this.audio=new AudioSystem();this.river=new River(this,sprites.water,sprites.bank);this.effects=new Effects(this,sprites.explosion,sprites.cloud);this.player=new Player(this,sprites.player);this.enemies=new EnemySystem(this,sprites);this.ui=new UI(this);this.bind();this.resize();document.querySelector("#record").textContent=this.record?`Recorde: ${this.record}`:"";requestAnimationFrame(t=>this.loop(t));
 }
 bind(){
  addEventListener("resize",()=>this.resize());
  addEventListener("keydown",e=>{if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code))e.preventDefault();this.keys.add(e.code);if(e.code==="Space")this.firing=true;if(e.code==="KeyB"&&!e.repeat)this.useBomb();if(e.code==="KeyP"&&!e.repeat)this.togglePause()});
  addEventListener("keyup",e=>{this.keys.delete(e.code);if(e.code==="Space")this.firing=false});
  let active=false;const target=e=>{const r=this.canvas.getBoundingClientRect();this.player.targetX=e.clientX-r.left;this.player.targetY=e.clientY-r.top};
  this.canvas.addEventListener("pointerdown",e=>{active=true;this.canvas.setPointerCapture?.(e.pointerId);if(this.running)target(e)});
  this.canvas.addEventListener("pointermove",e=>{if(active&&this.running)target(e)});
  this.canvas.addEventListener("pointerup",()=>active=false);this.canvas.addEventListener("pointercancel",()=>active=false);
  document.querySelector("#play").onclick=()=>this.start();document.querySelector("#restart").onclick=()=>this.start();document.querySelector("#resume").onclick=()=>this.togglePause(false);document.querySelector("#pause").onclick=()=>this.togglePause();document.querySelector("#fullscreen").onclick=()=>document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();
  document.querySelector("#sound").onclick=e=>{this.audio.muted=!this.audio.muted;e.currentTarget.textContent=this.audio.muted?"🔇":"🔊";if(this.audio.muted)this.audio.stop();else if(this.running&&!this.paused)this.audio.start()};
  const fire=document.querySelector("#fireButton");fire.onpointerdown=e=>{e.preventDefault();this.mobileFiring=true};["pointerup","pointercancel","pointerleave"].forEach(n=>fire.addEventListener(n,()=>this.mobileFiring=false));
  document.querySelector("#bombButton").onpointerdown=e=>{e.preventDefault();this.useBomb()};
  document.addEventListener("visibilitychange",()=>{if(document.hidden){this.firing=false;this.mobileFiring=false;this.audio.stop()}else if(this.running&&!this.paused)this.audio.start()});
 }
 resize(){this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.width*this.dpr;this.canvas.height=this.height*this.dpr;this.canvas.style.width=this.width+"px";this.canvas.style.height=this.height+"px"}
 start(){this.running=true;this.paused=false;this.time=0;this.score=0;this.speed=225;this.shake=0;this.fireTimer=0;this.bullets=[];this.pickups=[];this.pickupTimer=2;this.cloudTimer=7;this.level=1;this.player.reset();this.enemies.reset();this.effects.particles=[];this.effects.explosions=[];this.effects.clouds=[];this.ui.start();this.ui.update();this.audio.start()}
 togglePause(force){if(!this.running)return;this.paused=typeof force==="boolean"?!force:!this.paused;this.ui.paused(this.paused);if(this.paused)this.audio.stop();else this.audio.start()}
 fire(){const offsets=this.player.weapon===1?[0]:this.player.weapon===2?[-11,11]:[-17,0,17];for(const o of offsets)this.bullets.push({x:this.player.x+o,y:this.player.y-35,dead:false});this.audio.shot()}
 useBomb(){if(!this.running||this.paused||this.player.bombs<1)return;this.player.bombs--;this.shake=1.5;for(const e of this.enemies.items){if(!e.dead&&e.y>-80&&e.y<this.height*.82){e.dead=true;this.score+=Math.max(10,Math.floor(e.points*.35));this.effects.explode(e.x,e.y,18)}}for(const t of this.enemies.trucks){if(!t.dead){t.dead=true;this.score+=50;this.effects.explode(t.x,t.y,20)}}this.audio.explosion();this.ui.update()}
 loseLife(){this.player.lives--;this.effects.explode(this.player.x,this.player.y,34);this.audio.explosion();if(this.player.lives<=0){this.end();return}this.ui.message(`VIDAS: ${this.player.lives}`,1100);this.player.fuel=100;this.player.x=this.width/2;this.player.y=this.height*.76;this.player.targetX=this.player.x;this.player.targetY=this.player.y;this.player.invulnerable=2.2}
 end(){this.running=false;this.audio.stop();if(this.score>this.record){this.record=Math.floor(this.score);localStorage.setItem("sky-river-run-v2-record",String(this.record))}this.ui.gameOver(this.score,this.record)}
 spawnPickup(){
   const y=-50,b=this.river.bounds(y,70),r=Math.random();
   const type=r<.46?"fuel":r<.62?"bomb":r<.76?"repair":r<.89?"shield":"coin";
   const left=b.left+22,right=b.right-22;
   this.pickups.push({type,x:left+Math.random()*Math.max(1,right-left),y,dead:false,phase:Math.random()*Math.PI*2});
 }
 update(dt){this.river.update(dt);if(!this.running||this.paused)return;this.time+=dt;this.speed+=dt*2.4;this.score+=dt*13;
  const level=1+Math.floor(this.score/2500);
  if(level!==this.level){this.level=level;this.ui.message(`NÍVEL ${level}`,1200);this.speed+=18;}this.shake=Math.max(0,this.shake-dt*3);this.player.fuel-=dt*(3.5+Math.min(2.2,this.time/120));if(this.player.fuel<=0)this.loseLife();this.player.update(dt,this.keys);this.enemies.update(dt);this.effects.update(dt);
  this.fireTimer=Math.max(0,this.fireTimer-dt);if((this.firing||this.mobileFiring)&&this.fireTimer<=0){this.fire();this.fireTimer=Math.max(.08,.18-this.player.weapon*.025)}
  for(const b of this.bullets){b.y-=680*dt;this.enemies.hitBullet(b)}
  this.enemies.collidePlayer();this.bullets=this.bullets.filter(b=>!b.dead&&b.y>-40);
  this.pickupTimer-=dt;if(this.pickupTimer<=0){this.spawnPickup();this.pickupTimer=2.8+Math.random()*2.8}
  for(const p of this.pickups){
   p.y+=this.speed*dt;p.phase+=dt*4;
   const safe=this.river.bounds(p.y,55);
   p.x=Math.max(safe.left+18,Math.min(safe.right-18,p.x));
   if(!p.dead&&(p.x-this.player.x)**2+(p.y-this.player.y)**2<38**2){
     p.dead=true;
     if(p.type==="fuel"){this.player.fuel=Math.min(100,this.player.fuel+38);this.ui.message("+ COMBUSTÍVEL")}
     else if(p.type==="bomb"){this.player.bombs=Math.min(5,this.player.bombs+1);this.ui.message("+ BOMBA")}
     else if(p.type==="repair"){this.player.fuel=Math.min(100,this.player.fuel+20);this.ui.message("REPARO")}
     else if(p.type==="shield"){this.player.shield=Math.min(3,this.player.shield+1);this.ui.message("+ ESCUDO")}
     else if(p.type==="coin"){this.player.coins++;this.score+=75;this.ui.message("+ 75")}
     this.audio.pickup();
   }
  }
  this.pickups=this.pickups.filter(p=>!p.dead&&p.y<this.height+60);
  if(this.score>=3000){this.cloudTimer-=dt;if(this.cloudTimer<=0){this.effects.cloud();this.cloudTimer=6+Math.random()*7}}
  this.ui.update()
 }
 drawPickup(p){
   const y=p.y+Math.sin(p.phase||0)*3;
   const colors={fuel:"#e54b3f",bomb:"#3b83e8",repair:"#7ad65c",shield:"#42b7e8",coin:"#f5c33b"};
   const labels={fuel:"F",bomb:"B",repair:"🔧",shield:"S",coin:"$"};
   this.ctx.save();this.ctx.translate(p.x,y);this.ctx.fillStyle=colors[p.type]||"#fff";
   this.ctx.shadowColor=this.ctx.fillStyle;this.ctx.shadowBlur=14;this.ctx.beginPath();
   this.ctx.arc(0,0,17,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle="#fff";
   this.ctx.font=p.type==="repair"?"16px sans-serif":"bold 15px sans-serif";
   this.ctx.textAlign="center";this.ctx.textBaseline="middle";this.ctx.fillText(labels[p.type]||"?",0,1);this.ctx.restore();
 }
 draw(){const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);if(this.shake)c.translate((Math.random()-.5)*8*this.shake,(Math.random()-.5)*8*this.shake);this.river.draw(c,this.time,this.speed);this.enemies.draw(c);for(const p of this.pickups)this.drawPickup(p);c.strokeStyle="#ffe765";c.lineWidth=3;for(const b of this.bullets){c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x,b.y+14);c.stroke()}this.effects.drawUnder(c);this.player.draw(c);this.effects.drawClouds(c)}
 loop(now){const dt=Math.min(.045,Math.max(0,(now-(this.last||now))/1000));this.last=now;this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t))}
}
new Game();
