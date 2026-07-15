export class Player {
  constructor(game, sprite) { this.game=game; this.sprite=sprite; this.reset(); }
  reset() {
    this.x=this.game.width/2; this.y=this.game.height*.76;
    this.targetX=this.x; this.targetY=this.y; this.tilt=0; this.invulnerable=0;
    this.fuel=100; this.lives=3; this.weapon=1; this.bombs=0; this.shield=0; this.coins=0;
  }
  update(dt,keys) {
    let dx=0,dy=0;
    if(keys.has("ArrowLeft")||keys.has("KeyA"))dx--;
    if(keys.has("ArrowRight")||keys.has("KeyD"))dx++;
    if(keys.has("ArrowUp")||keys.has("KeyW"))dy--;
    if(keys.has("ArrowDown")||keys.has("KeyS"))dy++;
    if(dx||dy){const m=Math.hypot(dx,dy)||1;this.targetX+=dx/m*320*dt;this.targetY+=dy/m*320*dt}
    this.targetY=Math.max(78,Math.min(this.game.height-54,this.targetY));
    const b=this.game.river.bounds(this.y,38);
    this.targetX=Math.max(b.left,Math.min(b.right,this.targetX));
    const nx=this.x+(this.targetX-this.x)*Math.min(1,dt*11);
    const ny=this.y+(this.targetY-this.y)*Math.min(1,dt*11);
    this.tilt=Math.max(-.25,Math.min(.25,(nx-this.x)*.025));
    this.x=nx;this.y=ny;this.invulnerable=Math.max(0,this.invulnerable-dt);
    const nb=this.game.river.bounds(this.y,30);
    if(this.x<nb.left){this.x=nb.left;this.damage(8)}
    if(this.x>nb.right){this.x=nb.right;this.damage(8)}
  }
  damage(amount) {
    if(this.invulnerable>0||!this.game.running)return;
    if(this.shield>0){this.shield--;this.invulnerable=.55;this.game.ui.message("ESCUDO!");this.game.audio.hit();return}
    this.invulnerable=.75;this.fuel-=amount;this.game.effects.explode(this.x,this.y,12);
    this.game.audio.hit();this.game.shake=.8;navigator.vibrate?.(45);
    if(this.fuel<=0)this.game.loseLife();
  }
  draw(ctx) {
    if(!this.sprite.complete)return;
    const blink=this.invulnerable>0&&Math.floor(this.invulnerable*18)%2;
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.tilt);ctx.globalAlpha=blink?.42:1;
    ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=16;ctx.shadowOffsetY=11;
    ctx.drawImage(this.sprite,-59,-59,118,118);ctx.restore();
  }
}
