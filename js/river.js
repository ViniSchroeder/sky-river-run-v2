export class River {
  constructor(game, water, bank){this.game=game;this.phase=0;this.water=water;this.bank=bank;this.scroll=0}
  center(y){const n=y/Math.max(1,this.game.height),w=n*2.9+this.phase;return this.game.width*.5+Math.sin(w)*this.game.width*.14+Math.sin(w*2.1)*this.game.width*.04}
  half(y){const n=y/Math.max(1,this.game.height),w=n*4+this.phase*.8;return Math.max(this.game.width*.19,this.game.width*.31+Math.sin(w)*this.game.width*.04)}
  bounds(y,margin=0){const c=this.center(y),h=Math.max(34,this.half(y)-margin);return{left:c-h,right:c+h}}
  update(dt){this.phase+=dt*.18;this.scroll=(this.scroll+this.game.speed*dt)%128}
  draw(ctx){
    ctx.fillStyle="#225f35";ctx.fillRect(0,0,this.game.width,this.game.height);
    ctx.beginPath();
    for(let y=-32;y<=this.game.height+32;y+=16){const c=this.center(y),h=this.half(y);y===-32?ctx.moveTo(c-h,y):ctx.lineTo(c-h,y)}
    for(let y=this.game.height+32;y>=-32;y-=16){const c=this.center(y),h=this.half(y);ctx.lineTo(c+h,y)}
    ctx.closePath();ctx.fillStyle="#1767a5";ctx.fill();
    ctx.save();ctx.clip();
    if(this.water.complete){
      const p=ctx.createPattern(this.water,"repeat");
      ctx.translate(0,this.scroll);ctx.fillStyle=p;ctx.fillRect(0,-128,this.game.width,this.game.height+256);
      ctx.translate(0,-this.scroll);
    }
    ctx.restore();
    if(this.bank.complete){
      for(let y=-128+this.scroll;y<this.game.height+128;y+=128){
        const c=this.center(y),h=this.half(y);
        ctx.drawImage(this.bank,c-h-36,y-64,40,128);
        ctx.save();ctx.translate(c+h+36,y);ctx.scale(-1,1);ctx.drawImage(this.bank,-40,-64,40,128);ctx.restore();
      }
    }
  }
}
