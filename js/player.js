export class Player {
  constructor(game, sprite) {
    this.game = game;
    this.sprite = sprite;
    this.reset();
  }
  reset() {
    this.x = this.game.width / 2;
    this.y = this.game.height * .76;
    this.targetX = this.x;
    this.targetY = this.y;
    this.tilt = 0;
    this.invulnerable = 0;
    this.life = 100;
    this.lives = 3;
    this.weapon = 1;
    this.bombs = 0;
  }
  update(dt, keys) {
    let dx=0,dy=0;
    if(keys.has("ArrowLeft")||keys.has("KeyA"))dx--;
    if(keys.has("ArrowRight")||keys.has("KeyD"))dx++;
    if(keys.has("ArrowUp")||keys.has("KeyW"))dy--;
    if(keys.has("ArrowDown")||keys.has("KeyS"))dy++;
    if(dx||dy){const m=Math.hypot(dx,dy)||1;this.targetX+=dx/m*310*dt;this.targetY+=dy/m*310*dt}
    this.targetY=Math.max(75,Math.min(this.game.height-48,this.targetY));
    const bounds=this.game.river.bounds(this.y,30);
    this.targetX=Math.max(bounds.left,Math.min(bounds.right,this.targetX));
    const nx=this.x+(this.targetX-this.x)*Math.min(1,dt*11);
    const ny=this.y+(this.targetY-this.y)*Math.min(1,dt*11);
    this.tilt=Math.max(-.22,Math.min(.22,(nx-this.x)*.025));
    this.x=nx;this.y=ny;this.invulnerable=Math.max(0,this.invulnerable-dt);this.game.effects.trail(this.x,this.y+28);
    const newBounds=this.game.river.bounds(this.y,24);
    if(this.x<newBounds.left){this.x=newBounds.left;this.damage(8)}
    if(this.x>newBounds.right){this.x=newBounds.right;this.damage(8)}
  }
  damage(amount) {
    if(this.invulnerable>0||!this.game.running)return;
    this.invulnerable=.75;this.life-=amount;this.game.effects.explode(this.x,this.y,12);
    this.game.audio.hit();this.game.shake=.8;navigator.vibrate?.(45);
    if(this.life<=0)this.game.loseLife();
  }
  draw(ctx) {
    if(!this.sprite.complete)return;
    const blink=this.invulnerable>0&&Math.floor(this.invulnerable*18)%2;
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.tilt);ctx.globalAlpha=blink?.42:1;
    ctx.shadowColor="rgba(0,0,0,.48)";ctx.shadowBlur=14;ctx.shadowOffsetY=10;
    const w=108,h=108;
    ctx.drawImage(this.sprite,-w/2,-h/2,w,h);
    ctx.restore();
  }
}
