const CFG={bird:{hp:1,points:20,size:36},airplane:{hp:2,points:70,size:46},helicopter:{hp:4,points:130,size:54},ufo:{hp:7,points:360,size:52},boat:{hp:3,points:85,size:48},submarine:{hp:5,points:190,size:50},truck:{hp:3,points:165,size:50}};
export class EnemySystem{
  constructor(game,sprites){this.game=game;this.sprites=sprites;this.reset()}
  reset(){this.items=[];this.trucks=[];this.timer=.75;this.lateral=3;this.water=4.2;this.bridge=8}
  add(type,x,y,movement="vertical"){const c=CFG[type];this.items.push({type,x,y,movement,hp:c.hp,points:c.points,size:c.size,vx:(Math.random()-.5)*80,emerged:type!=="submarine",emerge:1+Math.random()*2.4,dead:false})}
  spawnVertical(){const y=-80,b=this.game.river.bounds(y,90),r=Math.random(),type=r>.97?"ufo":r>.78?"helicopter":r>.42?"airplane":"bird";this.add(type,b.left+Math.random()*(b.right-b.left),y)}
  spawnLateral(){const r=Math.random(),type=r>.92?"ufo":r>.68?"helicopter":r>.35?"airplane":"bird",left=Math.random()<.5;this.add(type,left?-80:this.game.width+80,this.game.height*(.18+Math.random()*.48),"lateral");this.items.at(-1).vx=(left?1:-1)*(135+Math.random()*90)}
  spawnWater(){const y=-80,b=this.game.river.bounds(y,96),type=Math.random()<.67?"boat":"submarine";this.add(type,b.left+Math.random()*(b.right-b.left),y)}
  spawnTruck(){const y=-60,b=this.game.river.bounds(y,20);this.trucks.push({y,x:b.left,direction:1,speed:58+Math.random()*22,hp:3,points:165,dead:false})}
  update(dt){
    this.timer-=dt;this.lateral-=dt;this.water-=dt;this.bridge-=dt;
    if(this.timer<=0){this.spawnVertical();this.timer=.76+Math.random()*.7-Math.min(.3,this.game.time/100)}
    if(this.lateral<=0){this.spawnLateral();this.lateral=2.8+Math.random()*3.4}
    if(this.water<=0){this.spawnWater();this.water=4+Math.random()*4}
    if(this.bridge<=0){this.spawnTruck();this.bridge=8+Math.random()*5}
    for(const e of this.items){if(e.movement==="lateral"){e.x+=e.vx*dt;e.y+=this.game.speed*.08*dt}else{e.y+=this.game.speed*dt;e.x+=e.vx*dt*.15}if(e.type==="submarine"&&!e.emerged){e.emerge-=dt;if(e.emerge<=0)e.emerged=true}}
    for(const t of this.trucks){t.y+=this.game.speed*dt;const b=this.game.river.bounds(t.y,20);t.x+=t.direction*t.speed*dt;if(t.x>b.right+30||t.x<b.left-30)t.direction*=-1}
    this.items=this.items.filter(e=>!e.dead&&e.y<this.game.height+120&&e.x>-150&&e.x<this.game.width+150);this.trucks=this.trucks.filter(t=>!t.dead&&t.y<this.game.height+100)
  }
  hitBullet(b){
    for(const e of this.items){if(e.dead||!e.emerged)continue;if((b.x-e.x)**2+(b.y-e.y)**2<(e.size*.45)**2){b.dead=true;e.hp-=Math.max(1,b.power||1);if(e.hp<=0){e.dead=true;this.game.score+=e.points;this.game.effects.explode(e.x,e.y,20);if(e.type==="helicopter"&&this.game.player.weapon<2){this.game.player.weapon=2;this.game.ui.message("TIRO DUPLO!")}if(e.type==="ufo"&&this.game.player.weapon<3){this.game.player.weapon=3;this.game.ui.message("TIRO TRIPLO!")}}return}}
    for(const t of this.trucks){if(t.dead)continue;if((b.x-t.x)**2+(b.y-t.y)**2<30**2){b.dead=true;t.hp-=Math.max(1,b.power||1);if(t.hp<=0){t.dead=true;this.game.score+=t.points;this.game.player.weapon=Math.min(5,this.game.player.weapon+1);this.game.effects.explode(t.x,t.y,20);this.game.ui.message(`TIRO NÍVEL ${this.game.player.weapon}!`) }return}}
  }
  collidePlayer(){const p=this.game.player;for(const e of this.items){if(e.dead||!e.emerged)continue;if((p.x-e.x)**2+(p.y-e.y)**2<(22+e.size*.38)**2)p.damage(e.type==="ufo"?28:e.type==="submarine"?26:18)}}
  draw(ctx){
    ctx.imageSmoothingEnabled=false;
    for(const e of this.items){if(e.type==="submarine"&&!e.emerged){ctx.globalAlpha=.3;ctx.fillStyle="#143b59";ctx.fillRect(e.x-24,e.y-6,48,12);ctx.globalAlpha=1;continue}const img=this.sprites[e.type]||this.sprites.airplane;if(!img?.complete)continue;ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));if(e.movement==="lateral")ctx.rotate(e.vx>0?Math.PI/2:-Math.PI/2);ctx.drawImage(img,-e.size/2,-e.size/2,e.size,e.size);ctx.restore()}
    for(const t of this.trucks){const img=this.sprites.truck;if(!img.complete)continue;ctx.save();ctx.translate(Math.round(t.x),Math.round(t.y));if(t.direction<0)ctx.scale(-1,1);ctx.drawImage(img,-38,-24,76,48);ctx.restore()}
  }
}
