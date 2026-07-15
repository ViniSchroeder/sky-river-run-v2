export class AudioSystem {
  constructor(){this.ctx=null;this.muted=false;this.engine=null;this.engineGain=null}
  ensure(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;if(!this.ctx)this.ctx=new C();if(this.ctx.state==="suspended")this.ctx.resume();return true}catch{return false}}
  tone(f,d=.08,type="square",v=.06){if(this.muted||!this.ensure())return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d)}
  start(){if(this.muted||this.engine||!this.ensure())return;this.engine=this.ctx.createOscillator();this.engineGain=this.ctx.createGain();this.engine.type="sawtooth";this.engine.frequency.value=76;this.engineGain.gain.value=.022;this.engine.connect(this.engineGain).connect(this.ctx.destination);this.engine.start()}
  stop(){if(this.engine){try{this.engine.stop()}catch{}this.engine=null;this.engineGain=null}}
  shot(){this.tone(510,.045,"square",.025)} hit(){this.tone(100,.2,"sawtooth",.15)} pickup(){this.tone(820,.15,"triangle",.13)} explosion(){this.tone(65,.38,"sawtooth",.22)}
}
