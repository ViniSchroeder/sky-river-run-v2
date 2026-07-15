import {Player} from "./player.js";
import {River} from "./river.js";
import {EnemySystem} from "./enemies.js";
import {Effects} from "./effects.js";
import {UI} from "./ui.js";
import {AudioSystem} from "./audio.js";

const load=(src)=>{const i=new Image();i.src=src;return i};
const sprites={
 player:load("./assets/sprites/player.png"),
 airplane:load("./assets/sprites/player.png"),
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
  this.canvas=document.querySelector("#game");this.ctx=this.canvas.getContext("2d",{alpha:false});this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.running=false;this.paused=false;this.time=0;this.score=0;this.speed=225;this.shake=0;this.record=Number(localStorage.getItem("sky-river-run-v2-record")||0);this.keys=new Set();this.firing=false;this.mobileFiring=false;this.fireTimer=0;this.bullets=[];this.pickups=[];this.pickupTimer=2;this.cloudTimer=7;
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
 start(){this.running=true;this.paused=false;this.time=0;this.score=0;this.speed=225;this.shake=0;this.fireTimer=0;this.bullets=[];this.pickups=[];this.pickupTimer=2;this.cloudTimer=7;this.player.reset();this.enemies.reset();this.effects.particles=[];this.effects.explosions=[];this.effects.clouds=[];this.ui.start();this.ui.update();this.audio.start()}
 togglePause(force){if(!this.running)return;this.paused=typeof force==="boolean"?!force:!this.paused;this.ui.paused(this.paused);if(this.paused)this.audio.stop();else this.audio.start()}
 fire(){const offsets=this.player.weapon===1?[0]:this.player.weapon===2?[-11,11]:[-17,0,17];for(const o of offsets)this.bullets.push({x:this.player.x+o,y:this.player.y-35,dead:false});this.audio.shot()}
 useBomb(){if(!this.running||this.paused||this.player.bombs<1)return;this.player.bombs--;this.shake=1.5;for(const e of this.enemies.items){if(!e.dead&&e.y>-80&&e.y<this.height*.82){e.dead=true;this.score+=Math.max(10,Math.floor(e.points*.35));this.effects.explode(e.x,e.y,18)}}for(const t of this.enemies.trucks){if(!t.dead){t.dead=true;this.score+=50;this.effects.explode(t.x,t.y,20)}}this.audio.explosion();this.ui.update()}
 loseLife(){this.player.lives--;this.effects.explode(this.player.x,this.player.y,34);this.audio.explosion();if(this.player.lives<=0){this.end();return}this.ui.message(`VIDAS: ${this.player.lives}`,1100);this.player.life=100;this.player.x=this.width/2;this.player.y=this.height*.76;this.player.targetX=this.player.x;this.player.targetY=this.player.y;this.player.invulnerable=2.2}
 end(){this.running=false;this.audio.stop();if(this.score>this.record){this.record=Math.floor(this.score);localStorage.setItem("sky-river-run-v2-record",String(this.record))}this.ui.gameOver(this.score,this.record)}
 spawnPickup(){const b=this.river.bounds(-50,45),type=Math.random()<.72?"life":"bomb";this.pickups.push({type,x:b.left+Math.random()*(b.right-b.left),y:-50,dead:false})}
 update(dt){this.river.update(dt);if(!this.running||this.paused)return;this.time+=dt;this.speed+=dt*2.4;this.score+=dt*13;this.shake=Math.max(0,this.shake-dt*3);this.player.life-=dt*3.5;if(this.player.life<=0)this.loseLife();this.player.update(dt,this.keys);this.enemies.update(dt);this.effects.update(dt);
  this.fireTimer=Math.max(0,this.fireTimer-dt);if((this.firing||this.mobileFiring)&&this.fireTimer<=0){this.fire();this.fireTimer=Math.max(.08,.18-this.player.weapon*.025)}
  for(const b of this.bullets){b.y-=680*dt;this.enemies.hitBullet(b)}
  this.enemies.collidePlayer();this.bullets=this.bullets.filter(b=>!b.dead&&b.y>-40);
  this.pickupTimer-=dt;if(this.pickupTimer<=0){this.spawnPickup();this.pickupTimer=2.8+Math.random()*2.8}
  for(const p of this.pickups){p.y+=this.speed*dt;if(!p.dead&&(p.x-this.player.x)**2+(p.y-this.player.y)**2<38**2){p.dead=true;if(p.type==="life"){this.player.life=Math.min(100,this.player.life+35);this.ui.message("+ VIDA")}else{this.player.bombs=Math.min(5,this.player.bombs+1);this.ui.message("+ BOMBA")}this.audio.pickup()}}
  this.pickups=this.pickups.filter(p=>!p.dead&&p.y<this.height+60);
  if(this.score>=3000){this.cloudTimer-=dt;if(this.cloudTimer<=0){this.effects.cloud();this.cloudTimer=6+Math.random()*7}}
  this.ui.update()
 }
 drawPickup(p){this.ctx.save();this.ctx.translate(p.x,p.y);this.ctx.fillStyle=p.type==="life"?"#35d36b":"#3b83e8";this.ctx.shadowColor=this.ctx.fillStyle;this.ctx.shadowBlur=14;this.ctx.beginPath();this.ctx.arc(0,0,16,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle="#fff";this.ctx.font="bold 15px sans-serif";this.ctx.textAlign="center";this.ctx.textBaseline="middle";this.ctx.fillText(p.type==="life"?"♥":"B",0,1);this.ctx.restore()}
 draw(){const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);if(this.shake)c.translate((Math.random()-.5)*8*this.shake,(Math.random()-.5)*8*this.shake);this.river.draw(c,this.time,this.speed);this.enemies.draw(c);for(const p of this.pickups)this.drawPickup(p);c.strokeStyle="#ffe765";c.lineWidth=3;for(const b of this.bullets){c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x,b.y+14);c.stroke()}this.effects.drawUnder(c);this.player.draw(c);this.effects.drawClouds(c)}
 loop(now){const dt=Math.min(.045,Math.max(0,(now-(this.last||now))/1000));this.last=now;this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t))}
}
new Game();
