export class Player {
  constructor(game,sprites){this.game=game;this.sprites=sprites;this.reset()}
  reset(){this.x=this.game.width/2;this.y=this.game.height*.76;this.targetX=this.x;this.targetY=this.y;this.tilt=0;this.invulnerable=0;this.fuel=100;this.lives=3;this.weapon=1;this.bombs=0;this.shield=0;this.coins=0}
  update(dt,keys){
    let dx=this.game.joystick.x,dy=this.game.joystick.y;
    if(keys.has("ArrowLeft")||keys.has("KeyA"))dx--;
    if(keys.has("ArrowRight")||keys.has("KeyD"))dx++;
    if(keys.has("ArrowUp")||keys.has("KeyW"))dy--;
    if(keys.has("ArrowDown")||keys.has("KeyS"))dy++;
    if(dx||dy){const m=Math.hypot(dx,dy)||1;this.targetX+=dx/m*330*dt;this.targetY+=dy/m*330*dt}
    this.targetY=Math.max(82,Math.min(this.game.height-58,this.targetY));
    const b=this.game.river.bounds(this.y,44);this.targetX=Math.max(b.left,Math.min(b.right,this.targetX));
    const nx=this.x+(this.targetX-this.x)*Math.min(1,dt*12),ny=this.y+(this.targetY-this.y)*Math.min(1,dt*12);
    this.tilt=Math.max(-.3,Math.min(.3,(nx-this.x)*.03));this.x=nx;this.y=ny;this.invulnerable=Math.max(0,this.invulnerable-dt);
    const nb=this.game.river.bounds(this.y,36);if(this.x<nb.left){this.x=nb.left;this.damage(8)}if(this.x>nb.right){this.x=nb.right;this.damage(8)}
  }
  damage(amount){
    if(this.invulnerable>0||!this.game.running)return;
    if(this.shield>0){this.shield--;this.invulnerable=.6;this.game.ui.message("ESCUDO!");return}
    this.invulnerable=.75;this.fuel-=amount;this.game.effects.explode(this.x,this.y,16);this.game.shake=.85;if(this.fuel<=0)this.game.loseLife()
  }
  draw(ctx){
    const sprite=this.tilt<-.08?this.sprites.left:this.tilt>.08?this.sprites.right:this.sprites.normal;
    if(!sprite.complete)return;
    const blink=this.invulnerable>0&&Math.floor(this.invulnerable*18)%2;
    ctx.save();ctx.globalAlpha=blink?.4:1;ctx.shadowColor="rgba(0,0,0,.45)";ctx.shadowBlur=0;ctx.fillStyle="rgba(0,0,0,.35)";
    ctx.fillRect(Math.round(this.x-38),Math.round(this.y+28),76,10);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,Math.round(this.x-64),Math.round(this.y-60),128,120);ctx.restore()
  }
}
