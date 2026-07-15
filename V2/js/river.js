export class River {
  constructor(game, water, bank) {this.game=game;this.phase=0;this.water=water;this.bank=bank}
  center(y){const n=y/Math.max(1,this.game.height),w=n*2.8+this.phase;return this.game.width*.5+Math.sin(w)*this.game.width*.14+Math.sin(w*2.25)*this.game.width*.045}
  half(y){const n=y/Math.max(1,this.game.height),w=n*4.2+this.phase*.8;return Math.max(this.game.width*.18,this.game.width*.30+Math.sin(w)*this.game.width*.043)}
  bounds(y,margin=0){const c=this.center(y),h=Math.max(30,this.half(y)-margin);return{left:c-h,right:c+h}}
  update(dt){this.phase+=dt*.18}
  draw(ctx,time,speed){
    const g=ctx.createLinearGradient(0,0,0,this.game.height);g.addColorStop(0,"#4f8e4c");g.addColorStop(1,"#24592f");ctx.fillStyle=g;ctx.fillRect(0,0,this.game.width,this.game.height);
    ctx.beginPath();
    for(let y=-30;y<=this.game.height+30;y+=18){const c=this.center(y),h=this.half(y);y===-30?ctx.moveTo(c-h,y):ctx.lineTo(c-h,y)}
    for(let y=this.game.height+30;y>=-30;y-=18){const c=this.center(y),h=this.half(y);ctx.lineTo(c+h,y)}
    ctx.closePath();
    const rg=ctx.createLinearGradient(0,0,this.game.width,0);rg.addColorStop(0,"#14395d");rg.addColorStop(.35,"#237ba9");rg.addColorStop(.5,"#50add0");rg.addColorStop(.65,"#237ba9");rg.addColorStop(1,"#14395d");ctx.fillStyle=rg;ctx.fill();
    ctx.save();ctx.clip();ctx.globalAlpha=.20;
    if(this.water.complete){const pattern=ctx.createPattern(this.water,"repeat");ctx.fillStyle=pattern;ctx.translate(0,(time*speed*.4)%105);ctx.fillRect(0,-110,this.game.width,this.game.height+220)}
    ctx.restore();
    ctx.fillStyle="#1d4f2a";
    for(let y=20;y<this.game.height;y+=54){const c=this.center(y),h=this.half(y);ctx.beginPath();ctx.arc(c-h-14,y,13,0,Math.PI*2);ctx.arc(c+h+14,y+18,13,0,Math.PI*2);ctx.fill()}
  }
}
