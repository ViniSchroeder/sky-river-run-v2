export class Effects {
  constructor(game,sheet,cloud){this.game=game;this.sheet=sheet;this.cloud=cloud;this.explosions=[];this.clouds=[]}
  explode(x,y,amount=20){this.explosions.push({x,y,life:.6,max:.6,size:96})}
  cloudSpawn(){this.clouds.push({x:Math.random()*this.game.width,y:-120,size:150+Math.random()*80,v:90+Math.random()*70,a:.55+Math.random()*.18})}
  update(dt){for(const e of this.explosions)e.life-=dt;for(const c of this.clouds)c.y+=(this.game.speed*.35+c.v)*dt;this.explosions=this.explosions.filter(e=>e.life>0);this.clouds=this.clouds.filter(c=>c.y-c.size<this.game.height+120)}
  drawUnder(ctx){for(const e of this.explosions){const p=1-e.life/e.max,frame=Math.min(7,Math.floor(p*8));ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=e.life/e.max;ctx.drawImage(this.sheet,frame*128,0,128,128,e.x-e.size/2,e.y-e.size/2,e.size,e.size);ctx.restore()}}
  drawClouds(ctx){for(const c of this.clouds){ctx.save();ctx.globalAlpha=c.a;ctx.imageSmoothingEnabled=false;ctx.drawImage(this.cloud,c.x-c.size/2,c.y-c.size*.35,c.size,c.size*.75);ctx.restore()}}
}
