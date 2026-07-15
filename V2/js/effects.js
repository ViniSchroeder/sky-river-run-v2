export class Effects {
  constructor(game, explosionSprite, cloudSprite){this.game=game;this.explosionSprite=explosionSprite;this.cloudSprite=cloudSprite;this.particles=[];this.explosions=[];this.clouds=[]}
  explode(x,y,amount=20){this.explosions.push({x,y,life:.45,max:.45,size:45});for(let i=0;i<amount;i++)this.particles.push({x,y,vx:(Math.random()-.5)*320,vy:(Math.random()-.5)*320,life:.65,max:.65,size:2+Math.random()*4})}
  cloud(){this.clouds.push({x:Math.random()*this.game.width,y:-130,size:140+Math.random()*100,v:100+Math.random()*80,a:.68+Math.random()*.18})}
  update(dt){for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}for(const e of this.explosions)e.life-=dt;for(const c of this.clouds)c.y+=(this.game.speed*.45+c.v)*dt;this.particles=this.particles.filter(p=>p.life>0);this.explosions=this.explosions.filter(e=>e.life>0);this.clouds=this.clouds.filter(c=>c.y-c.size<this.game.height+140)}
  drawUnder(ctx){for(const p of this.particles){const a=p.life/p.max;ctx.fillStyle=`rgba(255,150,55,${a})`;ctx.shadowColor=`rgba(255,120,35,${a})`;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,p.size*a,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}for(const e of this.explosions){const a=e.life/e.max;ctx.save();ctx.globalAlpha=a;if(this.explosionSprite.complete)ctx.drawImage(this.explosionSprite,e.x-e.size/2,e.y-e.size/2,e.size,e.size);ctx.restore()}}
  drawClouds(ctx){for(const c of this.clouds){ctx.save();ctx.globalAlpha=c.a;if(this.cloudSprite.complete)ctx.drawImage(this.cloudSprite,c.x-c.size/2,c.y-c.size*.35,c.size,c.size*.65);ctx.restore()}}
}
