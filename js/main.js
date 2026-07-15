import * as THREE from '../vendor/three.module.js';

const WORLD_HALF = 18;
const PLAYER_Z = 6.2;
const TRACK_SPACING = 5.2;
const TRACK_COUNT = 30;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const rand = (min, max) => min + Math.random() * (max - min);

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }
  ensure() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      if (!this.ctx) this.ctx = new Ctx();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    } catch {
      return false;
    }
  }
  tone(freq, duration = 0.08, type = 'square', volume = 0.05, delay = 0) {
    if (this.muted || !this.ensure()) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
  startEngine() {
    if (this.muted || this.engineOsc || !this.ensure()) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 74;
    this.engineGain.gain.value = 0.016;
    this.engineOsc.connect(this.engineGain).connect(this.ctx.destination);
    this.engineOsc.start();
  }
  stopEngine() {
    if (!this.engineOsc) return;
    try { this.engineOsc.stop(); } catch {}
    this.engineOsc = null;
    this.engineGain = null;
  }
  startMusic() {
    if (this.muted || this.musicTimer) return;
    const notes = [220, 277, 330, 392, 330, 277, 247, 330, 196, 247, 294, 370, 294, 247, 220, 294];
    this.musicTimer = setInterval(() => {
      this.tone(notes[this.musicStep % notes.length], 0.10, 'square', 0.012);
      if (this.musicStep % 4 === 0) this.tone(notes[this.musicStep % notes.length] / 2, 0.18, 'triangle', 0.008);
      this.musicStep += 1;
    }, 170);
  }
  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
  shot(level) { this.tone(level >= 4 ? 820 : level >= 2 ? 670 : 520, 0.045, 'square', 0.035); }
  pickup() { this.tone(820, 0.10, 'triangle', 0.09); this.tone(1080, 0.09, 'triangle', 0.06, 0.07); }
  hit() { this.tone(95, 0.17, 'sawtooth', 0.13); }
  explode() { this.tone(58, 0.35, 'sawtooth', 0.18); this.tone(88, 0.24, 'square', 0.07, 0.03); }
  boss() { this.tone(110, 0.35, 'sawtooth', 0.11); this.tone(82, 0.35, 'square', 0.07, 0.16); }
}

class UI {
  constructor(game) {
    this.game = game;
    this.hud = document.querySelector('#hud');
    this.fuel = document.querySelector('#fuelSegments');
    this.lives = document.querySelector('#lives');
    this.shield = document.querySelector('#shield');
    this.weapon = document.querySelector('#weapon');
    this.bombs = document.querySelector('#bombs');
    this.stageNumber = document.querySelector('#stageNumber');
    this.score = document.querySelector('#score');
    this.menu = document.querySelector('#menu');
    this.pauseOverlay = document.querySelector('#pauseOverlay');
    this.gameOverOverlay = document.querySelector('#gameOverOverlay');
    this.messageEl = document.querySelector('#message');
    this.stageBanner = document.querySelector('#stageBanner');
    this.bossHud = document.querySelector('#bossHud');
    this.bossFill = document.querySelector('#bossFill');
    this.fireButton = document.querySelector('#fireButton');
    this.bombButton = document.querySelector('#bombButton');
    this.pauseButton = document.querySelector('#pauseButton');
    this.joystick = document.querySelector('#joystick');
    this.messageTimer = null;
    this.stageTimer = null;
    for (let i = 0; i < 12; i += 1) this.fuel.appendChild(document.createElement('i'));
  }
  start() {
    this.menu.classList.add('hidden');
    this.gameOverOverlay.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.fireButton.classList.remove('hidden');
    this.bombButton.classList.remove('hidden');
    this.pauseButton.classList.remove('hidden');
    this.joystick.classList.remove('hidden');
  }
  end(score, record) {
    this.hud.classList.add('hidden');
    this.fireButton.classList.add('hidden');
    this.bombButton.classList.add('hidden');
    this.pauseButton.classList.add('hidden');
    this.joystick.classList.add('hidden');
    this.bossHud.classList.add('hidden');
    document.querySelector('#finalScore').textContent = Math.floor(score);
    document.querySelector('#finalRecord').textContent = `Recorde: ${record}`;
    this.gameOverOverlay.classList.remove('hidden');
  }
  update() {
    const p = this.game.player;
    const active = Math.ceil(clamp(p.fuel, 0, 100) / 100 * 12);
    [...this.fuel.children].forEach((segment, index) => {
      segment.className = '';
      if (index < active) {
        segment.classList.add('on', index < 3 ? 'red' : index < 7 ? 'yellow' : 'green');
      }
    });
    this.lives.textContent = p.lives;
    this.shield.textContent = p.shield;
    this.weapon.textContent = p.weapon;
    this.bombs.textContent = p.bombs;
    this.stageNumber.textContent = this.game.stage;
    this.score.textContent = Math.floor(this.game.score);
    this.bombButton.disabled = p.bombs < 1;
    if (this.game.boss) {
      this.bossHud.classList.remove('hidden');
      this.bossFill.style.width = `${clamp(this.game.boss.hp / this.game.boss.maxHp, 0, 1) * 100}%`;
    } else {
      this.bossHud.classList.add('hidden');
    }
  }
  message(text, duration = 900) {
    this.messageEl.textContent = text;
    this.messageEl.style.opacity = '1';
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => { this.messageEl.style.opacity = '0'; }, duration);
  }
  stage(text) {
    this.stageBanner.textContent = text;
    this.stageBanner.style.opacity = '1';
    clearTimeout(this.stageTimer);
    this.stageTimer = setTimeout(() => { this.stageBanner.style.opacity = '0'; }, 1500);
  }
  paused(value) { this.pauseOverlay.classList.toggle('hidden', !value); }
}

function makeLabelTexture(label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(86, 68, 20, 128, 128, 122);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.08, color);
  gradient.addColorStop(1, '#07131c');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(128, 128, 108, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(220,248,255,.88)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 106px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 128, 132);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeWaterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, 512, 512);
  bg.addColorStop(0, '#117cb7');
  bg.addColorStop(0.5, '#1b94c9');
  bg.addColorStop(1, '#08689e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 18; y < 512; y += 34) {
    const offset = (y / 34) % 2 ? 18 : 0;
    for (let x = -40 + offset; x < 540; x += 70) {
      ctx.strokeStyle = 'rgba(184,241,255,.34)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 24, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 20);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  g.addColorStop(0, 'rgba(0,0,0,.56)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.52,
    metalness: options.metalness ?? 0.08,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    flatShading: true,
  });
}

function makeShadow(scaleX = 2.8, scaleZ = 1.2) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.55 }));
  sprite.scale.set(scaleX, scaleZ, 1);
  sprite.rotation.x = -Math.PI / 2;
  return sprite;
}

function createPlaneModel(colors = { body: 0xe24a3f, trim: 0xffcf57 }, player = false) {
  const group = new THREE.Group();
  const bodyMat = material(colors.body, { roughness: 0.34, metalness: 0.18 });
  const trimMat = material(colors.trim, { roughness: 0.42 });
  const darkMat = material(0x172532, { roughness: 0.7 });
  const glassMat = material(player ? 0x55caff : 0x8fd5ed, { roughness: 0.12, metalness: 0.24, emissive: 0x0c3144, emissiveIntensity: 0.35 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.48, 2.8, 10), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.y = 1.25;
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.82, 10), trimMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 1.25, -1.78);
  group.add(nose);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.16, 0.72), bodyMat);
  wing.position.set(0, 1.15, -0.16);
  group.add(wing);

  const wingStripeL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.74), trimMat);
  wingStripeL.position.set(-1.05, 1.17, -0.16);
  group.add(wingStripeL);
  const wingStripeR = wingStripeL.clone();
  wingStripeR.position.x = 1.05;
  group.add(wingStripeR);

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 0.48), bodyMat);
  tailWing.position.set(0, 1.18, 1.1);
  group.add(tailWing);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.62), bodyMat);
  fin.position.set(0, 1.56, 1.05);
  group.add(fin);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.37, 12, 8), glassMat);
  canopy.scale.set(0.72, 0.52, 1.25);
  canopy.position.set(0, 1.55, -0.42);
  group.add(canopy);

  const propeller = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), darkMat);
  propeller.add(hub);
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.13), darkMat);
  propeller.add(blade1);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.13), darkMat);
  propeller.add(blade2);
  propeller.position.set(0, 1.25, -2.18);
  group.add(propeller);

  const shadow = makeShadow(player ? 3.4 : 2.8, player ? 1.5 : 1.2);
  shadow.position.set(0, 0.10, 0.35);
  group.add(shadow);

  group.userData.propeller = propeller;
  group.userData.materials = [bodyMat, trimMat, glassMat];
  return group;
}

function createHelicopter() {
  const group = new THREE.Group();
  const green = material(0x486f42, { roughness: 0.58 });
  const dark = material(0x172532, { roughness: 0.8 });
  const glass = material(0x62c8ea, { emissive: 0x123241, emissiveIntensity: 0.25, roughness: 0.18 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), green);
  body.scale.set(1.15, 0.72, 1.5);
  body.position.y = 1.15;
  group.add(body);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 8), glass);
  cockpit.scale.set(0.9, 0.72, 0.75);
  cockpit.position.set(0, 1.23, -0.65);
  group.add(cockpit);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 2.25), green);
  tail.position.set(0, 1.18, 1.45);
  group.add(tail);
  const rotor = new THREE.Group();
  const rotorA = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.13), dark);
  const rotorB = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 3.6), dark);
  rotor.add(rotorA, rotorB);
  rotor.position.y = 1.92;
  group.add(rotor);
  const tailRotor = new THREE.Group();
  const trA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.05, 0.12), dark);
  const trB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.05), dark);
  tailRotor.add(trA, trB);
  tailRotor.position.set(0.14, 1.25, 2.58);
  group.add(tailRotor);
  const shadow = makeShadow(2.4, 1.15);
  shadow.position.y = 0.10;
  group.add(shadow);
  group.userData.rotor = rotor;
  group.userData.tailRotor = tailRotor;
  group.userData.materials = [green, glass];
  return group;
}

function createBoat() {
  const group = new THREE.Group();
  const hullMat = material(0xe4e7e8, { roughness: 0.45 });
  const redMat = material(0xc63d3d, { roughness: 0.5 });
  const darkMat = material(0x1b2935, { roughness: 0.8 });
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.86, 2.9, 4), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.rotation.z = Math.PI / 4;
  hull.position.y = 0.35;
  group.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 0.95), redMat);
  cabin.position.set(0, 0.74, 0.15);
  group.add(cabin);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.08), darkMat);
  windshield.position.set(0, 0.8, -0.36);
  group.add(windshield);
  group.userData.materials = [hullMat, redMat];
  return group;
}

function createSubmarine() {
  const group = new THREE.Group();
  const hullMat = material(0x394c59, { roughness: 0.48, metalness: 0.18 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 2.1, 6, 10), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.35;
  group.add(hull);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.48, 0.62), hullMat);
  tower.position.set(0, 0.78, 0.08);
  group.add(tower);
  const scope = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 6, 10, Math.PI), hullMat);
  scope.rotation.z = Math.PI / 2;
  scope.position.set(0, 1.12, 0.05);
  group.add(scope);
  group.userData.materials = [hullMat];
  return group;
}

function createUfo() {
  const group = new THREE.Group();
  const metalMat = material(0xaab7c0, { roughness: 0.18, metalness: 0.82 });
  const glowMat = material(0x74edff, { emissive: 0x32c9e8, emissiveIntensity: 1.2, roughness: 0.1 });
  const disk = new THREE.Mesh(new THREE.SphereGeometry(0.92, 16, 10), metalMat);
  disk.scale.y = 0.28;
  disk.position.y = 1.1;
  group.add(disk);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 8), glowMat);
  dome.scale.y = 0.58;
  dome.position.y = 1.34;
  group.add(dome);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.09, 8, 20), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.0;
  group.add(ring);
  const shadow = makeShadow(2.4, 1.15);
  shadow.position.y = 0.10;
  group.add(shadow);
  group.userData.materials = [metalMat, glowMat];
  return group;
}

function createTruck() {
  const group = new THREE.Group();
  const orange = material(0xd47b2d, { roughness: 0.56 });
  const white = material(0xdfe7eb, { roughness: 0.46 });
  const dark = material(0x182632, { roughness: 0.82 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.9), orange);
  box.position.set(-0.35, 0.72, 0);
  group.add(box);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.86), white);
  cab.position.set(0.78, 0.7, 0);
  group.add(cab);
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 10);
  for (const x of [-0.7, 0.65]) {
    for (const z of [-0.48, 0.48]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      group.add(wheel);
    }
  }
  group.userData.materials = [orange, white];
  return group;
}

function createBridge() {
  const group = new THREE.Group();
  const span = new THREE.Group();
  group.add(span);
  const deckMat = material(0x737c83, { roughness: 0.62, metalness: 0.16 });
  const railMat = material(0xb4c0c7, { roughness: 0.5, metalness: 0.35 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1, 0.28, 1.7), deckMat);
  deck.position.y = 0.48;
  span.add(deck);
  const rail1 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.18, 0.12), railMat);
  rail1.position.set(0, 0.82, -0.78);
  span.add(rail1);
  const rail2 = rail1.clone();
  rail2.position.z = 0.78;
  span.add(rail2);
  const supports = new THREE.Group();
  for (let i = -5; i <= 5; i += 1) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.22), railMat);
    support.position.set(i, -0.1, 0);
    supports.add(support);
  }
  span.add(supports);
  group.userData.span = span;
  group.userData.deck = deck;
  group.userData.rails = [rail1, rail2];
  return group;
}

function createBoss() {
  const group = createPlaneModel({ body: 0x7d858d, trim: 0xb43f3f }, false);
  group.scale.set(2.6, 2.1, 2.6);
  const engineMat = material(0x26343f, { roughness: 0.5, metalness: 0.22 });
  for (const x of [-1.2, 1.2]) {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.25, 10), engineMat);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(x, 1.1, -0.15);
    group.add(nacelle);
  }
  group.userData.materials.push(engineMat);
  return group;
}

function setFlash(object, active) {
  for (const mat of object.userData.materials ?? []) {
    mat.emissive.set(active ? 0xffffff : 0x000000);
    mat.emissiveIntensity = active ? 1.4 : 0;
  }
}
class Game {
  constructor() {
    this.host = document.querySelector('#game');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9ed8ee);
    this.scene.fog = new THREE.Fog(0x8fcbe1, 42, 112);

    this.camera = new THREE.OrthographicCamera(-10, 10, 15, -15, 0.1, 180);
    this.camera.position.set(0, 19.5, 21.5);
    this.camera.lookAt(0, 0, -5);

    const hemi = new THREE.HemisphereLight(0xdff7ff, 0x2c4f2d, 2.25);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff1cf, 3.4);
    this.sun.position.set(-10, 23, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -22;
    this.sun.shadow.camera.right = 22;
    this.sun.shadow.camera.top = 28;
    this.sun.shadow.camera.bottom = -24;
    this.scene.add(this.sun);

    this.audio = new RetroAudio();
    this.ui = new UI(this);
    this.clock = new THREE.Clock();
    this.keys = new Set();
    this.joystick = { x: 0, y: 0 };
    this.mobileFiring = false;
    this.firing = false;
    this.running = false;
    this.paused = false;
    this.record = Number(localStorage.getItem('sky-river-run-3d-record') || 0);
    document.querySelector('#recordText').textContent = this.record ? `Recorde: ${this.record}` : '';

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.effectRoot = new THREE.Group();
    this.scene.add(this.effectRoot);

    this.waterTexture = makeWaterTexture();
    const waterMaterial = new THREE.MeshStandardMaterial({
      map: this.waterTexture,
      color: 0x9fe5ff,
      roughness: 0.28,
      metalness: 0.05,
      transparent: true,
      opacity: 0.97,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_HALF * 2, 170), waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, 0, -45);
    this.water.receiveShadow = true;
    this.scene.add(this.water);

    this.groundMaterial = material(0x35a449, { roughness: 0.74 });
    this.groundSideMaterial = material(0x246c34, { roughness: 0.86 });
    this.treeTrunkMaterial = material(0x78543a, { roughness: 0.9 });
    this.treeLeafMaterials = [material(0x227c39, { roughness: 0.9 }), material(0x31944a, { roughness: 0.9 }), material(0x186a31, { roughness: 0.9 })];

    this.trackSegments = [];
    this.futureCenter = 0;
    this.futureWidth = 11;
    this.makeTrack();

    this.playerObject = createPlaneModel({ body: 0xe24a3f, trim: 0xffd45a }, true);
    this.playerObject.position.set(0, 0, PLAYER_Z);
    this.scene.add(this.playerObject);
    this.player = {
      x: 0,
      targetX: 0,
      z: PLAYER_Z,
      targetZ: PLAYER_Z,
      fuel: 100,
      lives: 3,
      shield: 0,
      bombs: 0,
      weapon: 1,
      invulnerable: 0,
      damageCooldown: 0,
    };

    this.enemyPlanePrototype = createPlaneModel({ body: 0xd63b3f, trim: 0xe8dd8c }, false);
    this.helicopterPrototype = createHelicopter();
    this.boatPrototype = createBoat();
    this.submarinePrototype = createSubmarine();
    this.ufoPrototype = createUfo();
    this.truckPrototype = createTruck();
    this.bossPrototype = createBoss();

    this.playerBullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.items = [];
    this.bridges = [];
    this.clouds = [];
    this.explosions = [];
    this.boss = null;

    this.bulletGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.75, 8);
    this.bulletGeometry.rotateX(Math.PI / 2);
    this.playerBulletMaterials = [
      material(0xfff3a0, { emissive: 0xff4b32, emissiveIntensity: 1.5, roughness: 0.12 }),
      material(0xffffff, { emissive: 0xffb139, emissiveIntensity: 1.7, roughness: 0.08 }),
      material(0xffffff, { emissive: 0x35dfff, emissiveIntensity: 2.0, roughness: 0.05 }),
    ];
    this.enemyBulletMaterial = material(0xff5c42, { emissive: 0xff2600, emissiveIntensity: 1.8, roughness: 0.08 });

    this.itemTypes = {
      fuel: { label: 'F', color: '#ef5e4f', message: 'COMBUSTÍVEL' },
      shield: { label: 'S', color: '#50b8ec', message: 'ESCUDO' },
      repair: { label: '+', color: '#65c85d', message: 'REPARO' },
      bomb: { label: 'B', color: '#6b70df', message: 'BOMBA' },
      coin: { label: '$', color: '#e3b832', message: '+100' },
      weapon: { label: 'W', color: '#bf68e6', message: 'UPGRADE' },
      life: { label: '1', color: '#e4587a', message: 'VIDA EXTRA' },
    };
    this.itemTextures = {};
    for (const [type, def] of Object.entries(this.itemTypes)) this.itemTextures[type] = makeLabelTexture(def.label, def.color);

    this.bindControls();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this.loop());
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  resize() {
    const aspect = innerWidth / innerHeight;
    const viewHeight = 29;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.left = -viewHeight * aspect / 2;
    this.camera.right = viewHeight * aspect / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  }

  bindControls() {
    addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
      if (event.code === 'Space') this.firing = true;
      if (event.code === 'KeyB' && !event.repeat) this.useBomb();
      if (event.code === 'KeyP' && !event.repeat) this.togglePause();
    });
    addEventListener('keyup', event => {
      this.keys.delete(event.code);
      if (event.code === 'Space') this.firing = false;
    });

    document.querySelector('#playButton').onclick = () => this.start();
    document.querySelector('#restartButton').onclick = () => this.start();
    document.querySelector('#pauseButton').onclick = () => this.togglePause();
    document.querySelector('#resumeButton').onclick = () => this.togglePause(false);
    document.querySelector('#fullscreenButton').onclick = () => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.();
    document.querySelector('#soundButton').onclick = event => {
      this.audio.muted = !this.audio.muted;
      event.currentTarget.textContent = this.audio.muted ? '🔇' : '🔊';
      if (this.audio.muted) {
        this.audio.stopEngine();
        this.audio.stopMusic();
      } else if (this.running && !this.paused) {
        this.audio.startEngine();
        this.audio.startMusic();
      }
    };

    const fireButton = document.querySelector('#fireButton');
    fireButton.addEventListener('pointerdown', event => { event.preventDefault(); this.mobileFiring = true; });
    for (const name of ['pointerup', 'pointercancel', 'pointerleave']) fireButton.addEventListener(name, () => { this.mobileFiring = false; });
    document.querySelector('#bombButton').addEventListener('pointerdown', event => { event.preventDefault(); this.useBomb(); });

    const joystick = document.querySelector('#joystick');
    const knob = document.querySelector('#joystickKnob');
    let active = false;
    const updateJoystick = event => {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const max = rect.width * 0.31;
      let dx = event.clientX - cx;
      let dy = event.clientY - cy;
      const length = Math.hypot(dx, dy) || 1;
      if (length > max) {
        dx = dx / length * max;
        dy = dy / length * max;
      }
      this.joystick.x = dx / max;
      this.joystick.y = dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    joystick.addEventListener('pointerdown', event => {
      active = true;
      joystick.setPointerCapture?.(event.pointerId);
      updateJoystick(event);
    });
    joystick.addEventListener('pointermove', event => { if (active) updateJoystick(event); });
    const resetJoystick = () => {
      active = false;
      this.joystick.x = 0;
      this.joystick.y = 0;
      knob.style.transform = 'translate(0,0)';
    };
    joystick.addEventListener('pointerup', resetJoystick);
    joystick.addEventListener('pointercancel', resetJoystick);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.running && !this.paused) this.togglePause(true);
    });
  }

  makeTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.8, 7), this.treeTrunkMaterial);
    trunk.position.y = 0.9;
    trunk.castShadow = true;
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(rand(0.42, 0.62), rand(1.3, 1.85), 8), this.treeLeafMaterials[Math.floor(Math.random() * this.treeLeafMaterials.length)]);
    leaves.position.y = 1.85;
    leaves.castShadow = true;
    group.add(leaves);
    return group;
  }

  makeTrackSegment(z, center, width) {
    const group = new THREE.Group();
    group.position.z = z;
    this.world.add(group);
    const left = new THREE.Mesh(new THREE.BoxGeometry(1, 0.78, TRACK_SPACING + 0.5), this.groundMaterial);
    const right = new THREE.Mesh(new THREE.BoxGeometry(1, 0.78, TRACK_SPACING + 0.5), this.groundMaterial);
    left.receiveShadow = right.receiveShadow = true;
    left.castShadow = right.castShadow = true;
    group.add(left, right);
    const trees = [];
    for (let i = 0; i < 5; i += 1) {
      const tree = this.makeTree();
      group.add(tree);
      trees.push(tree);
    }
    const segment = { group, left, right, trees, center, width };
    this.configureSegment(segment, center, width);
    return segment;
  }

  configureSegment(segment, center, width) {
    segment.center = center;
    segment.width = width;
    const leftBound = center - width / 2;
    const rightBound = center + width / 2;
    const leftWidth = Math.max(0.2, WORLD_HALF + leftBound);
    const rightWidth = Math.max(0.2, WORLD_HALF - rightBound);
    segment.left.scale.x = leftWidth;
    segment.left.position.set((-WORLD_HALF + leftBound) / 2, 0.39, 0);
    segment.right.scale.x = rightWidth;
    segment.right.position.set((rightBound + WORLD_HALF) / 2, 0.39, 0);
    segment.trees.forEach((tree, index) => {
      const side = index % 2 === 0 ? -1 : 1;
      const boundary = side < 0 ? leftBound : rightBound;
      tree.visible = Math.random() > 0.15;
      tree.position.set(boundary + side * rand(1.0, 5.8), 0, rand(-TRACK_SPACING * 0.42, TRACK_SPACING * 0.42));
      tree.scale.setScalar(rand(0.78, 1.28));
    });
  }

  makeTrack() {
    let center = 0;
    let width = 11.5;
    for (let i = 0; i < TRACK_COUNT; i += 1) {
      const z = 18 - i * TRACK_SPACING;
      center = clamp(center + rand(-0.52, 0.52), -5.2, 5.2);
      width = clamp(width + rand(-0.62, 0.62), 6.4, 14.5);
      this.trackSegments.push(this.makeTrackSegment(z, center, width));
    }
  }

  riverAt(z) {
    let nearest = this.trackSegments[0];
    let distance = Infinity;
    for (const segment of this.trackSegments) {
      const d = Math.abs(segment.group.position.z - z);
      if (d < distance) {
        distance = d;
        nearest = segment;
      }
    }
    return { center: nearest.center, width: nearest.width, left: nearest.center - nearest.width / 2, right: nearest.center + nearest.width / 2 };
  }

  recycleTrack() {
    for (const segment of this.trackSegments) {
      if (segment.group.position.z <= 22) continue;
      let farthest = this.trackSegments[0];
      for (const candidate of this.trackSegments) if (candidate.group.position.z < farthest.group.position.z) farthest = candidate;
      segment.group.position.z = farthest.group.position.z - TRACK_SPACING;
      const targetBias = Math.sin((this.stage + this.time * 0.012) * 1.7) * 0.4;
      const nextCenter = clamp(farthest.center + rand(-0.78, 0.78) + targetBias, -5.6, 5.6);
      const narrowingChance = Math.random() < 0.20 ? rand(-2.2, -0.7) : rand(-0.75, 0.75);
      const nextWidth = clamp(farthest.width + narrowingChance, 5.8, 14.8);
      this.configureSegment(segment, nextCenter, nextWidth);
    }
  }
  cloneRenderable(prototype) {
    const clone = prototype.clone(true);
    const materials = [];
    clone.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (Array.isArray(child.material)) child.material = child.material.map(mat => mat.clone());
      else child.material = child.material.clone();
      if (Array.isArray(child.material)) materials.push(...child.material);
      else materials.push(child.material);
    });
    clone.userData = { ...clone.userData, materials };
    let rotor = null;
    let tailRotor = null;
    let propeller = null;
    clone.traverse(child => {
      if (!child.isGroup) return;
      if (child.children.length === 3 && child.position.z < -1.5) propeller = child;
    });
    if (prototype.userData.rotor) {
      rotor = clone.children.find(child => child.isGroup && child.position.y > 1.7) ?? null;
      tailRotor = clone.children.find(child => child.isGroup && child.position.z > 2.2) ?? null;
    }
    clone.userData.rotor = rotor;
    clone.userData.tailRotor = tailRotor;
    clone.userData.propeller = propeller;
    return clone;
  }

  clearEntities() {
    for (const list of [this.enemies, this.items, this.playerBullets, this.enemyBullets, this.bridges, this.clouds, this.explosions]) {
      for (const entity of list) {
        const root = entity.root ?? entity.mesh ?? entity.group;
        if (root?.parent) root.parent.remove(root);
      }
      list.length = 0;
    }
    if (this.boss?.root?.parent) this.boss.root.parent.remove(this.boss.root);
    this.boss = null;
  }

  start() {
    this.clearEntities();
    this.running = true;
    this.paused = false;
    this.time = 0;
    this.stage = 1;
    this.stageTime = 0;
    this.score = 0;
    this.fireTimer = 0;
    this.enemySpawnTimer = 0.7;
    this.itemSpawnTimer = 2.5;
    this.bridgeSpawnTimer = 8;
    this.cloudSpawnTimer = 9;
    this.bossSpawned = false;
    this.shake = 0;
    Object.assign(this.player, {
      x: 0,
      targetX: 0,
      z: PLAYER_Z,
      targetZ: PLAYER_Z,
      fuel: 100,
      lives: 3,
      shield: 0,
      bombs: 0,
      weapon: 1,
      invulnerable: 0,
      damageCooldown: 0,
    });
    this.playerObject.position.set(0, 0, PLAYER_Z);
    this.playerObject.rotation.set(0, 0, 0);
    this.playerObject.visible = true;
    this.ui.start();
    this.ui.stage('FASE 1');
    this.ui.update();
    this.audio.startEngine();
    this.audio.startMusic();
    this.clock.getDelta();
  }

  togglePause(forcePause) {
    if (!this.running) return;
    this.paused = typeof forcePause === 'boolean' ? forcePause : !this.paused;
    this.ui.paused(this.paused);
    if (this.paused) {
      this.audio.stopEngine();
      this.audio.stopMusic();
    } else {
      this.audio.startEngine();
      this.audio.startMusic();
      this.clock.getDelta();
    }
  }

  spawnPlayerBullet(xOffset, zOffset, level) {
    const damage = Math.min(4, 1 + Math.floor((level - 1) / 2));
    const materialIndex = level >= 4 ? 2 : level >= 2 ? 1 : 0;
    const mesh = new THREE.Mesh(this.bulletGeometry, this.playerBulletMaterials[materialIndex]);
    mesh.scale.setScalar(level >= 5 ? 1.75 : level >= 3 ? 1.3 : 1);
    mesh.position.set(this.player.x + xOffset, 1.25, this.player.z - 1.4 + zOffset);
    mesh.castShadow = false;
    this.scene.add(mesh);
    this.playerBullets.push({ mesh, damage, speed: 23 + level * 0.8, dead: false });
  }

  firePlayer() {
    const level = this.player.weapon;
    const patterns = {
      1: [[0, 0]],
      2: [[-0.38, 0], [0.38, 0]],
      3: [[-0.55, 0], [0, -0.08], [0.55, 0]],
      4: [[-0.68, 0], [-0.22, -0.1], [0.22, -0.1], [0.68, 0]],
      5: [[-0.8, 0], [-0.4, -0.08], [0, -0.16], [0.4, -0.08], [0.8, 0]],
    };
    for (const [x, z] of patterns[level] ?? patterns[5]) this.spawnPlayerBullet(x, z, level);
    this.audio.shot(level);
  }

  spawnEnemyBullet(x, z, velocityX, velocityZ, scale = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 8, 6), this.enemyBulletMaterial);
    mesh.position.set(x, 1.1, z);
    this.scene.add(mesh);
    this.enemyBullets.push({ mesh, vx: velocityX, vz: velocityZ, damage: 12 + scale * 3, dead: false });
  }

  spawnEnemy(type = null) {
    if (this.boss) return;
    const z = rand(-70, -56);
    const river = this.riverAt(z);
    const roll = Math.random();
    const chosen = type ?? (roll < 0.35 ? 'plane' : roll < 0.57 ? 'helicopter' : roll < 0.74 ? 'boat' : roll < 0.88 ? 'submarine' : 'ufo');
    let root;
    let hp;
    let radius;
    let points;
    let altitude = 0;
    if (chosen === 'plane') {
      root = this.cloneRenderable(this.enemyPlanePrototype);
      hp = 2 + Math.floor(this.stage * 0.35);
      radius = 0.85;
      points = 90;
      altitude = 0;
    } else if (chosen === 'helicopter') {
      root = this.cloneRenderable(this.helicopterPrototype);
      hp = 4 + Math.floor(this.stage * 0.45);
      radius = 0.9;
      points = 150;
    } else if (chosen === 'boat') {
      root = this.cloneRenderable(this.boatPrototype);
      hp = 3 + Math.floor(this.stage * 0.35);
      radius = 0.82;
      points = 110;
    } else if (chosen === 'submarine') {
      root = this.cloneRenderable(this.submarinePrototype);
      hp = 5 + Math.floor(this.stage * 0.5);
      radius = 0.88;
      points = 230;
      root.position.y = -0.22;
      root.scale.y = 0.35;
    } else {
      root = this.cloneRenderable(this.ufoPrototype);
      hp = 7 + this.stage;
      radius = 0.9;
      points = 380;
    }
    root.position.x = rand(river.left + 1.2, river.right - 1.2);
    root.position.z = z;
    root.rotation.y = Math.PI;
    this.scene.add(root);
    this.enemies.push({
      type: chosen,
      root,
      hp,
      maxHp: hp,
      radius,
      points,
      phase: rand(0, Math.PI * 2),
      lateral: rand(-0.6, 0.6),
      shootTimer: rand(1.3, 3.1),
      emergeTimer: chosen === 'submarine' ? rand(1.4, 3.4) : 0,
      emerged: chosen !== 'submarine',
      flash: 0,
      dead: false,
      altitude,
    });
  }

  makeItemRoot(type) {
    const group = new THREE.Group();
    const colorMap = {
      fuel: 0xef5e4f,
      shield: 0x50b8ec,
      repair: 0x65c85d,
      bomb: 0x6b70df,
      coin: 0xe3b832,
      weapon: 0xbf68e6,
      life: 0xe4587a,
    };
    const coreMat = material(colorMap[type], { emissive: colorMap[type], emissiveIntensity: 0.65, roughness: 0.22, metalness: 0.25 });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), coreMat);
    core.position.y = 1.0;
    core.castShadow = true;
    group.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.055, 8, 20), material(0xe8fbff, { emissive: 0xaeefff, emissiveIntensity: 0.8, roughness: 0.15 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.0;
    group.add(ring);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.itemTextures[type], transparent: true, depthTest: false }));
    label.scale.set(0.85, 0.85, 1);
    label.position.set(0, 1.25, 0);
    group.add(label);
    group.userData.core = core;
    group.userData.ring = ring;
    return group;
  }

  spawnItem(x = null, z = -58, forcedType = null) {
    const river = this.riverAt(z);
    const roll = Math.random();
    const type = forcedType ?? (roll < 0.27 ? 'fuel' : roll < 0.42 ? 'shield' : roll < 0.56 ? 'repair' : roll < 0.68 ? 'bomb' : roll < 0.82 ? 'coin' : roll < 0.93 ? 'weapon' : 'life');
    const root = this.makeItemRoot(type);
    root.position.set(x ?? rand(river.left + 1.15, river.right - 1.15), 0, z);
    this.scene.add(root);
    this.items.push({ type, root, phase: rand(0, Math.PI * 2), dead: false });
  }

  spawnBridge() {
    if (this.boss || this.bridges.length > 0) return;
    const z = -72;
    const river = this.riverAt(z);
    const root = createBridge();
    root.position.set(river.center, 0, z);
    root.userData.span.scale.x = river.width + 3.2;
    this.scene.add(root);
    const truck = this.cloneRenderable(this.truckPrototype);
    truck.scale.setScalar(0.78);
    truck.position.set(-river.width / 2 - 1.0, 0.4, 0);
    root.add(truck);
    this.bridges.push({
      root,
      truck,
      truckHp: 4,
      truckDirection: 1,
      width: river.width,
      health: 20,
      destroyed: false,
      passedPlayer: false,
      dead: false,
    });
  }

  spawnCloud() {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: rand(0.58, 0.78), depthWrite: false });
    for (let i = 0; i < 7; i += 1) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(rand(1.2, 2.1), 12, 8), cloudMat);
      sphere.scale.y = rand(0.55, 0.82);
      sphere.position.set(rand(-2.8, 2.8), rand(-0.3, 0.5), rand(-1.2, 1.2));
      group.add(sphere);
    }
    group.position.set(rand(-9, 9), rand(5.0, 6.2), -78);
    group.scale.setScalar(rand(1.2, 1.8));
    this.scene.add(group);
    this.clouds.push({ root: group, drift: rand(-0.35, 0.35), dead: false });
  }

  spawnBoss() {
    if (this.boss) return;
    const root = this.cloneRenderable(this.bossPrototype);
    root.position.set(0, 0.25, -32);
    root.rotation.y = Math.PI;
    this.scene.add(root);
    const maxHp = 120 + this.stage * 35;
    this.boss = {
      root,
      hp: maxHp,
      maxHp,
      phase: 0,
      attackTimer: 1.15,
      aimedTimer: 2.2,
      flash: 0,
      radius: 2.2,
      dead: false,
    };
    this.audio.boss();
    this.ui.stage('CHEFE');
  }
  spawnExplosion(x, z, size = 1) {
    const group = new THREE.Group();
    const colors = [0xfff3a7, 0xffbd3c, 0xff6a38, 0x8b2e27];
    const particles = [];
    for (let i = 0; i < 18; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(rand(0.09, 0.22) * size, 7, 5), mat);
      mesh.position.set(0, 1.0, 0);
      const direction = new THREE.Vector3(rand(-1, 1), rand(0.2, 1.4), rand(-1, 1)).normalize().multiplyScalar(rand(1.8, 5.5) * size);
      group.add(mesh);
      particles.push({ mesh, velocity: direction, life: rand(0.42, 0.82) });
    }
    const light = new THREE.PointLight(0xff7b3d, 8 * size, 8 * size, 2);
    light.position.y = 1.2;
    group.add(light);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.explosions.push({ root: group, particles, light, life: 0.8, maxLife: 0.8 });
  }

  destroyEntity(entity) {
    entity.dead = true;
    if (entity.root?.parent) entity.root.parent.remove(entity.root);
  }

  damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    enemy.flash = 0.10;
    setFlash(enemy.root, true);
    if (enemy.hp > 0) return;
    enemy.dead = true;
    this.score += enemy.points;
    this.spawnExplosion(enemy.root.position.x, enemy.root.position.z, enemy.type === 'ufo' ? 1.2 : 0.9);
    this.audio.explode();
    if (Math.random() < 0.28) this.spawnItem(enemy.root.position.x, enemy.root.position.z);
    if (enemy.type === 'helicopter' && this.player.weapon < 2) {
      this.player.weapon = 2;
      this.ui.message('DISPARO DUPLO');
    }
    if (enemy.type === 'ufo' && this.player.weapon < 3) {
      this.player.weapon = 3;
      this.ui.message('DISPARO TRIPLO');
    }
    enemy.root.parent?.remove(enemy.root);
  }

  damageBoss(damage) {
    if (!this.boss || this.boss.dead) return;
    this.boss.hp -= damage;
    this.boss.flash = 0.12;
    setFlash(this.boss.root, true);
    this.boss.root.position.z += 0.08;
    this.shake = Math.max(this.shake, 0.28);
    if (this.boss.hp > 0) return;
    this.boss.dead = true;
    this.score += 5000 + this.stage * 800;
    this.spawnExplosion(this.boss.root.position.x, this.boss.root.position.z, 2.0);
    this.spawnExplosion(this.boss.root.position.x - 1.8, this.boss.root.position.z + 0.6, 1.25);
    this.spawnExplosion(this.boss.root.position.x + 1.8, this.boss.root.position.z + 0.6, 1.25);
    this.audio.explode();
    this.boss.root.parent?.remove(this.boss.root);
    this.boss = null;
    this.finishStage();
  }

  finishStage() {
    this.stage += 1;
    this.stageTime = 0;
    this.bossSpawned = false;
    this.player.fuel = Math.min(100, this.player.fuel + 35);
    this.player.shield = Math.min(3, this.player.shield + 1);
    this.ui.stage(`FASE ${this.stage}`);
  }

  useBomb() {
    if (!this.running || this.paused || this.player.bombs < 1) return;
    this.player.bombs -= 1;
    for (const enemy of this.enemies) {
      if (!enemy.dead) this.damageEnemy(enemy, 999);
    }
    for (const bullet of this.enemyBullets) bullet.dead = true;
    if (this.boss) this.damageBoss(22);
    const bridge = this.bridges.find(entry => !entry.destroyed && entry.root.position.z < this.player.z && entry.root.position.z > -25);
    if (bridge) this.destroyBridge(bridge);
    this.audio.explode();
    this.shake = 1.3;
    navigator.vibrate?.(80);
  }

  destroyBridge(bridge) {
    if (bridge.destroyed) return;
    bridge.destroyed = true;
    bridge.health = 0;
    this.spawnExplosion(bridge.root.position.x, bridge.root.position.z, 1.5);
    bridge.root.rotation.z = 0.16;
    bridge.root.rotation.x = -0.20;
    bridge.root.position.y = -0.35;
    bridge.truck.visible = false;
    this.score += 700;
    this.ui.message('PONTE DESTRUÍDA');
  }

  hitPlayer(damage) {
    if (this.player.invulnerable > 0 || !this.running) return;
    if (this.player.shield > 0) {
      this.player.shield -= 1;
      this.player.invulnerable = 0.65;
      this.ui.message('ESCUDO');
      this.audio.hit();
      return;
    }
    this.player.fuel -= damage;
    this.player.invulnerable = 0.85;
    this.spawnExplosion(this.player.x, this.player.z, 0.75);
    this.audio.hit();
    this.shake = 0.8;
    navigator.vibrate?.(55);
    if (this.player.fuel <= 0) this.loseLife();
  }

  loseLife() {
    this.player.lives -= 1;
    if (this.player.lives <= 0) {
      this.endGame();
      return;
    }
    this.player.fuel = 100;
    this.player.x = 0;
    this.player.targetX = 0;
    this.player.z = PLAYER_Z;
    this.player.targetZ = PLAYER_Z;
    this.player.invulnerable = 2.2;
    this.ui.message(`VIDAS ${this.player.lives}`, 1200);
  }

  endGame() {
    this.running = false;
    this.audio.stopEngine();
    this.audio.stopMusic();
    if (this.score > this.record) {
      this.record = Math.floor(this.score);
      localStorage.setItem('sky-river-run-3d-record', String(this.record));
    }
    this.ui.end(this.score, this.record);
  }

  collectItem(item) {
    const type = item.type;
    if (type === 'fuel') this.player.fuel = Math.min(100, this.player.fuel + 42);
    if (type === 'shield') this.player.shield = Math.min(3, this.player.shield + 1);
    if (type === 'repair') this.player.fuel = Math.min(100, this.player.fuel + 22);
    if (type === 'bomb') this.player.bombs = Math.min(5, this.player.bombs + 1);
    if (type === 'coin') this.score += 100;
    if (type === 'weapon') this.player.weapon = Math.min(5, this.player.weapon + 1);
    if (type === 'life') this.player.lives = Math.min(5, this.player.lives + 1);
    this.ui.message(this.itemTypes[type].message);
    this.audio.pickup();
    item.dead = true;
    item.root.parent?.remove(item.root);
  }

  bossAttack() {
    if (!this.boss) return;
    const origin = this.boss.root.position;
    for (let i = -3; i <= 3; i += 1) {
      this.spawnEnemyBullet(origin.x + i * 0.45, origin.z + 1.3, i * 0.62, 8.0, 1.05);
    }
  }

  bossAimedAttack() {
    if (!this.boss) return;
    const origin = this.boss.root.position;
    const dx = this.player.x - origin.x;
    const dz = this.player.z - origin.z;
    const len = Math.hypot(dx, dz) || 1;
    for (const spread of [-0.18, 0, 0.18]) {
      const angle = Math.atan2(dx, dz) + spread;
      this.spawnEnemyBullet(origin.x, origin.z + 1.4, Math.sin(angle) * 8.8, Math.cos(angle) * 8.8, spread === 0 ? 1.35 : 1.0);
    }
  }

  updateTrack(dt, scrollSpeed) {
    for (const segment of this.trackSegments) segment.group.position.z += scrollSpeed * dt;
    this.recycleTrack();
  }

  updatePlayer(dt) {
    let dx = this.joystick.x;
    let dz = this.joystick.y;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) dx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) dx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) dz -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) dz += 1;
    if (dx || dz) {
      const len = Math.hypot(dx, dz) || 1;
      this.player.targetX += dx / len * 8.3 * dt;
      this.player.targetZ += dz / len * 5.2 * dt;
    }
    this.player.targetZ = clamp(this.player.targetZ, 2.5, 9.5);
    const river = this.riverAt(this.player.z);
    const margin = 0.95;
    this.player.targetX = clamp(this.player.targetX, river.left + margin, river.right - margin);
    this.player.x = lerp(this.player.x, this.player.targetX, Math.min(1, dt * 11));
    this.player.z = lerp(this.player.z, this.player.targetZ, Math.min(1, dt * 11));
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.damageCooldown = Math.max(0, this.player.damageCooldown - dt);

    const currentRiver = this.riverAt(this.player.z);
    if (this.player.x < currentRiver.left + 0.72 || this.player.x > currentRiver.right - 0.72) {
      if (this.player.damageCooldown <= 0) {
        this.hitPlayer(10);
        this.player.damageCooldown = 0.42;
      }
      this.player.x = clamp(this.player.x, currentRiver.left + 0.58, currentRiver.right - 0.58);
      this.player.targetX = this.player.x;
    }

    this.playerObject.position.x = this.player.x;
    this.playerObject.position.z = this.player.z;
    this.playerObject.rotation.z = lerp(this.playerObject.rotation.z, -dx * 0.22, Math.min(1, dt * 9));
    this.playerObject.rotation.x = lerp(this.playerObject.rotation.x, dz * 0.08, Math.min(1, dt * 7));
    if (this.playerObject.userData.propeller) this.playerObject.userData.propeller.rotation.z += dt * 34;
    this.playerObject.visible = !(this.player.invulnerable > 0 && Math.floor(this.player.invulnerable * 16) % 2);
  }

  updateBullets(dt) {
    for (const bullet of this.playerBullets) {
      bullet.mesh.position.z -= bullet.speed * dt;
      if (bullet.mesh.position.z < -88) bullet.dead = true;
      for (const enemy of this.enemies) {
        if (bullet.dead || enemy.dead || !enemy.emerged) continue;
        const dx = bullet.mesh.position.x - enemy.root.position.x;
        const dz = bullet.mesh.position.z - enemy.root.position.z;
        if (dx * dx + dz * dz < enemy.radius * enemy.radius) {
          bullet.dead = true;
          this.damageEnemy(enemy, bullet.damage);
        }
      }
      if (!bullet.dead && this.boss) {
        const dx = bullet.mesh.position.x - this.boss.root.position.x;
        const dz = bullet.mesh.position.z - this.boss.root.position.z;
        if (dx * dx + dz * dz < this.boss.radius * this.boss.radius) {
          bullet.dead = true;
          this.damageBoss(bullet.damage);
        }
      }
      for (const bridge of this.bridges) {
        if (bullet.dead || bridge.destroyed || bridge.truckHp <= 0 || !bridge.truck.visible) continue;
        const worldTruck = new THREE.Vector3();
        bridge.truck.getWorldPosition(worldTruck);
        const dx = bullet.mesh.position.x - worldTruck.x;
        const dz = bullet.mesh.position.z - worldTruck.z;
        if (dx * dx + dz * dz < 0.75) {
          bullet.dead = true;
          bridge.truckHp -= bullet.damage;
          if (bridge.truckHp <= 0) {
            this.spawnExplosion(worldTruck.x, worldTruck.z, 0.85);
            bridge.truck.visible = false;
            this.score += 220;
            this.player.weapon = Math.min(5, this.player.weapon + 1);
            this.ui.message(`UPGRADE ${this.player.weapon}`);
          }
        }
      }
    }
    for (const bullet of this.enemyBullets) {
      bullet.mesh.position.x += bullet.vx * dt;
      bullet.mesh.position.z += bullet.vz * dt;
      const dx = bullet.mesh.position.x - this.player.x;
      const dz = bullet.mesh.position.z - this.player.z;
      if (dx * dx + dz * dz < 0.48) {
        bullet.dead = true;
        this.hitPlayer(bullet.damage);
      }
      if (Math.abs(bullet.mesh.position.x) > 22 || bullet.mesh.position.z > 24 || bullet.mesh.position.z < -90) bullet.dead = true;
    }
    this.playerBullets = this.playerBullets.filter(bullet => {
      if (!bullet.dead) return true;
      bullet.mesh.parent?.remove(bullet.mesh);
      return false;
    });
    this.enemyBullets = this.enemyBullets.filter(bullet => {
      if (!bullet.dead) return true;
      bullet.mesh.parent?.remove(bullet.mesh);
      return false;
    });
  }
  updateEnemies(dt, scrollSpeed) {
    for (const enemy of this.enemies) {
      enemy.phase += dt;
      enemy.root.position.z += scrollSpeed * dt;
      const river = this.riverAt(enemy.root.position.z);
      if (enemy.type === 'plane') {
        enemy.root.position.x += Math.sin(enemy.phase * 1.8) * 0.9 * dt + enemy.lateral * dt;
        enemy.root.position.x = clamp(enemy.root.position.x, river.left + 0.9, river.right - 0.9);
        if (enemy.root.userData.propeller) enemy.root.userData.propeller.rotation.z += dt * 29;
      } else if (enemy.type === 'helicopter') {
        enemy.root.position.x += Math.sin(enemy.phase * 2.2) * 1.6 * dt;
        enemy.root.position.x = clamp(enemy.root.position.x, river.left + 1.0, river.right - 1.0);
        enemy.root.userData.rotor?.rotation.y += dt * 23;
        enemy.root.userData.tailRotor?.rotation.x += dt * 28;
      } else if (enemy.type === 'boat') {
        enemy.root.position.x += Math.sin(enemy.phase * 1.25) * 0.35 * dt;
        enemy.root.position.x = clamp(enemy.root.position.x, river.left + 0.8, river.right - 0.8);
      } else if (enemy.type === 'submarine') {
        if (!enemy.emerged) {
          enemy.emergeTimer -= dt;
          enemy.root.position.y = -0.24;
          enemy.root.scale.y = 0.32;
          if (enemy.emergeTimer <= 0) enemy.emerged = true;
        } else {
          enemy.root.position.y = lerp(enemy.root.position.y, 0, Math.min(1, dt * 2.8));
          enemy.root.scale.y = lerp(enemy.root.scale.y, 1, Math.min(1, dt * 2.8));
        }
      } else if (enemy.type === 'ufo') {
        enemy.root.position.x += Math.sin(enemy.phase * 3.0) * 2.0 * dt;
        enemy.root.position.x = clamp(enemy.root.position.x, river.left + 0.9, river.right - 0.9);
        enemy.root.rotation.y += dt * 2.5;
      }

      enemy.shootTimer -= dt;
      if (enemy.emerged && enemy.root.position.z > -32 && enemy.root.position.z < 1 && enemy.shootTimer <= 0) {
        const dx = this.player.x - enemy.root.position.x;
        const dz = this.player.z - enemy.root.position.z;
        const len = Math.hypot(dx, dz) || 1;
        const shotSpeed = enemy.type === 'ufo' ? 8.2 : 6.8;
        this.spawnEnemyBullet(enemy.root.position.x, enemy.root.position.z + 0.8, dx / len * shotSpeed, dz / len * shotSpeed, enemy.type === 'ufo' ? 1.15 : 0.8);
        enemy.shootTimer = enemy.type === 'ufo' ? rand(0.9, 1.5) : rand(1.8, 3.2);
      }

      if (enemy.flash > 0) {
        enemy.flash -= dt;
        if (enemy.flash <= 0) setFlash(enemy.root, false);
      }

      const dx = enemy.root.position.x - this.player.x;
      const dz = enemy.root.position.z - this.player.z;
      if (enemy.emerged && dx * dx + dz * dz < (enemy.radius + 0.58) ** 2) {
        enemy.dead = true;
        this.hitPlayer(enemy.type === 'ufo' ? 28 : enemy.type === 'submarine' ? 24 : 18);
        this.spawnExplosion(enemy.root.position.x, enemy.root.position.z, 0.9);
      }
      if (enemy.root.position.z > 22) enemy.dead = true;
    }
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.dead) return true;
      enemy.root.parent?.remove(enemy.root);
      return false;
    });
  }

  updateItems(dt, scrollSpeed) {
    for (const item of this.items) {
      item.root.position.z += scrollSpeed * dt;
      item.phase += dt;
      const river = this.riverAt(item.root.position.z);
      item.root.position.x = clamp(item.root.position.x, river.left + 0.95, river.right - 0.95);
      item.root.position.y = 0.12 + Math.sin(item.phase * 3.5) * 0.22;
      item.root.rotation.y += dt * 1.8;
      item.root.userData.core.rotation.x += dt * 1.4;
      item.root.userData.ring.rotation.z += dt * 1.9;
      const dx = item.root.position.x - this.player.x;
      const dz = item.root.position.z - this.player.z;
      if (dx * dx + dz * dz < 0.78) this.collectItem(item);
      if (item.root.position.z > 22) item.dead = true;
    }
    this.items = this.items.filter(item => {
      if (!item.dead) return true;
      item.root.parent?.remove(item.root);
      return false;
    });
  }

  updateBridges(dt, scrollSpeed) {
    for (const bridge of this.bridges) {
      bridge.root.position.z += scrollSpeed * dt;
      const river = this.riverAt(bridge.root.position.z);
      bridge.root.position.x = river.center;
      bridge.root.userData.span.scale.x = river.width + 3.2;
      bridge.width = river.width;
      if (!bridge.destroyed && bridge.truck.visible) {
        bridge.truck.position.x += bridge.truckDirection * dt * 2.7;
        const limit = bridge.width / 2 + 1.0;
        if (bridge.truck.position.x > limit || bridge.truck.position.x < -limit) bridge.truckDirection *= -1;
        bridge.truck.rotation.y = bridge.truckDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      if (!bridge.destroyed && !bridge.passedPlayer && bridge.root.position.z > this.player.z - 0.5) {
        bridge.passedPlayer = true;
        this.hitPlayer(42);
        this.player.targetZ = Math.max(2.8, this.player.targetZ - 1.5);
        this.ui.message('PONTE NÃO DESTRUÍDA');
      }
      if (bridge.root.position.z > 24) bridge.dead = true;
    }
    this.bridges = this.bridges.filter(bridge => {
      if (!bridge.dead) return true;
      bridge.root.parent?.remove(bridge.root);
      return false;
    });
  }

  updateClouds(dt, scrollSpeed) {
    for (const cloud of this.clouds) {
      cloud.root.position.z += (scrollSpeed * 0.72 + 1.8) * dt;
      cloud.root.position.x += cloud.drift * dt;
      if (cloud.root.position.z > 26) cloud.dead = true;
    }
    this.clouds = this.clouds.filter(cloud => {
      if (!cloud.dead) return true;
      cloud.root.parent?.remove(cloud.root);
      return false;
    });
  }

  updateExplosions(dt) {
    for (const explosion of this.explosions) {
      explosion.life -= dt;
      for (const particle of explosion.particles) {
        particle.life -= dt;
        particle.velocity.y -= dt * 3.2;
        particle.mesh.position.addScaledVector(particle.velocity, dt);
        particle.mesh.material.opacity = clamp(particle.life / 0.82, 0, 1);
        particle.mesh.scale.multiplyScalar(1 + dt * 0.8);
      }
      explosion.light.intensity = 8 * clamp(explosion.life / explosion.maxLife, 0, 1);
      if (explosion.life <= 0) explosion.dead = true;
    }
    this.explosions = this.explosions.filter(explosion => {
      if (!explosion.dead) return true;
      explosion.root.parent?.remove(explosion.root);
      return false;
    });
  }

  updateBoss(dt) {
    if (!this.boss) return;
    const boss = this.boss;
    boss.phase += dt;
    boss.root.position.z = lerp(boss.root.position.z, -9.5, Math.min(1, dt * 1.7));
    boss.root.position.x = Math.sin(boss.phase * 0.72) * 5.8;
    boss.root.rotation.z = Math.sin(boss.phase * 0.72) * -0.12;
    boss.root.userData.propeller?.rotation.z += dt * 31;
    boss.attackTimer -= dt;
    boss.aimedTimer -= dt;
    if (boss.attackTimer <= 0) {
      this.bossAttack();
      boss.attackTimer = Math.max(0.48, 0.95 - this.stage * 0.04);
    }
    if (boss.aimedTimer <= 0) {
      this.bossAimedAttack();
      boss.aimedTimer = Math.max(1.35, 2.3 - this.stage * 0.08);
    }
    if (boss.flash > 0) {
      boss.flash -= dt;
      if (boss.flash <= 0) setFlash(boss.root, false);
    }
  }

  update(dt) {
    this.waterTexture.offset.y -= dt * (0.38 + this.stage * 0.015);
    this.playerObject.userData.propeller?.rotation.z += dt * 34;
    if (!this.running || this.paused) return;

    this.time += dt;
    this.stageTime += dt;
    this.score += dt * 14;
    const scrollSpeed = Math.min(12.8, 7.6 + this.stage * 0.55 + this.time * 0.012);
    this.player.fuel -= dt * (2.4 + this.stage * 0.18);
    if (this.player.fuel <= 0) this.loseLife();

    this.updateTrack(dt, scrollSpeed);
    this.updatePlayer(dt);

    this.fireTimer -= dt;
    if ((this.firing || this.mobileFiring) && this.fireTimer <= 0) {
      this.firePlayer();
      this.fireTimer = Math.max(0.075, 0.18 - this.player.weapon * 0.018);
    }

    this.enemySpawnTimer -= dt;
    if (!this.boss && this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer = Math.max(0.48, 1.08 - this.stage * 0.06) + rand(0.12, 0.62);
    }
    this.itemSpawnTimer -= dt;
    if (!this.boss && this.itemSpawnTimer <= 0) {
      this.spawnItem();
      this.itemSpawnTimer = rand(3.0, 5.1);
    }
    this.bridgeSpawnTimer -= dt;
    if (!this.boss && this.bridgeSpawnTimer <= 0) {
      this.spawnBridge();
      this.bridgeSpawnTimer = rand(13, 18);
    }
    this.cloudSpawnTimer -= dt;
    if (this.cloudSpawnTimer <= 0) {
      this.spawnCloud();
      this.cloudSpawnTimer = rand(12, 18);
    }
    if (this.stageTime > 38 && !this.boss && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnBoss();
    }

    this.updateBullets(dt);
    this.updateEnemies(dt, scrollSpeed);
    this.updateItems(dt, scrollSpeed);
    this.updateBridges(dt, scrollSpeed);
    this.updateClouds(dt, scrollSpeed);
    this.updateExplosions(dt);
    this.updateBoss(dt);
    this.shake = Math.max(0, this.shake - dt * 2.8);
    this.ui.update();
  }

  render() {
    const shakeAmount = this.shake * 0.22;
    this.camera.position.x = (Math.random() - 0.5) * shakeAmount;
    this.camera.position.y = 19.5 + (Math.random() - 0.5) * shakeAmount;
    this.camera.lookAt(0, 0, -5);
    this.renderer.render(this.scene, this.camera);
  }

  loop() {
    const dt = Math.min(0.04, this.clock.getDelta());
    this.update(dt);
    this.render();
  }
}

new Game();
