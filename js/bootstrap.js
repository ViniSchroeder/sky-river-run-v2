async function startGameModule() {
  try {
    const mainUrl = new URL('./main.js?v=4500', import.meta.url);
    const response = await fetch(mainUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar main.js: HTTP ${response.status}`);

    let code = await response.text();
    const threeUrl = new URL('../vendor/three.module.js?v=4500', import.meta.url).href;

    const replaceOnce = (pattern, replacement, label) => {
      const next = code.replace(pattern, replacement);
      if (next === code) console.warn(`Patch não localizado: ${label}`);
      code = next;
    };
    const replaceEvery = (search, replacement, label) => {
      const next = code.replaceAll(search, replacement);
      if (next === code) console.warn(`Patch não localizado: ${label}`);
      code = next;
    };

    replaceOnce(
      "import * as THREE from '../vendor/three.module.js';",
      `import * as THREE from ${JSON.stringify(threeUrl)};`,
      'Three.js local'
    );

    replaceEvery(
      'enemy.root.userData.rotor?.rotation.y += dt * 23;',
      'if (enemy.root.userData.rotor) enemy.root.userData.rotor.rotation.y += dt * 23;',
      'rotor compatível'
    );
    replaceEvery(
      'enemy.root.userData.tailRotor?.rotation.x += dt * 28;',
      'if (enemy.root.userData.tailRotor) enemy.root.userData.tailRotor.rotation.x += dt * 28;',
      'rotor traseiro compatível'
    );
    replaceEvery(
      'boss.root.userData.propeller?.rotation.z += dt * 31;',
      'if (boss.root.userData.propeller) boss.root.userData.propeller.rotation.z += dt * 31;',
      'hélice do chefe compatível'
    );
    replaceEvery(
      'this.playerObject.userData.propeller?.rotation.z += dt * 34;',
      'if (this.playerObject.userData.propeller) this.playerObject.userData.propeller.rotation.z += dt * 34;',
      'hélice do jogador compatível'
    );

    replaceOnce(
      /function setFlash\(object, active\) \{[\s\S]*?\n\}/,
      `function setFlash(object, active) {
  if (!object) return;
  const seen = new Set();
  const apply = (mat) => {
    if (!mat || seen.has(mat)) return;
    seen.add(mat);
    if (mat.emissive && typeof mat.emissive.set === 'function') {
      mat.emissive.set(active ? 0xffffff : 0x000000);
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = active ? 1.4 : 0;
    }
  };
  for (const mat of object.userData?.materials ?? []) apply(mat);
  object.traverse?.((child) => {
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) apply(mat);
  });
}`,
      'setFlash seguro'
    );

    replaceOnce('      this.musicStep = 0;\n', '      this.musicStep = 0;\n      this.stage = 1;\n', 'estado musical por fase');
    replaceOnce(
      /  startMusic\(\) \{[\s\S]*?\n  \}\n  stopMusic\(\) \{/,
      `  startMusic() {
    if (this.muted || this.musicTimer) return;
    const songs = [
      [220,277,330,392,330,277,247,330,196,247,294,370,294,247,220,294],
      [196,233,294,349,294,233,220,262,175,220,262,330,262,220,196,247],
      [262,330,392,523,440,392,330,294,247,294,370,440,392,330,294,262],
      [165,196,247,294,247,196,175,220,147,175,220,262,220,175,165,196],
      [185,220,277,330,277,220,196,247,165,196,247,294,247,196,185,220],
    ];
    const notes = songs[(this.stage - 1) % songs.length];
    const tempo = [170,155,190,145,210][(this.stage - 1) % 5];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      const note = notes[this.musicStep % notes.length];
      this.tone(note, 0.10, this.stage % 2 === 0 ? 'triangle' : 'square', 0.013);
      if (this.musicStep % 4 === 0) this.tone(note / 2, 0.20, 'triangle', 0.009);
      if (this.stage % 5 === 4 && this.musicStep % 8 === 4) this.tone(note * 1.5, 0.08, 'sine', 0.007);
      this.musicStep += 1;
    }, tempo);
  }
  stopMusic() {`,
      'trilhas por fase'
    );
    replaceOnce(
      /  boss\(\) \{ this\.tone\(110, 0\.35, 'sawtooth', 0\.11\); this\.tone\(82, 0\.35, 'square', 0\.07, 0\.16\); \}\n\}/,
      `  setStage(stage) {
    this.stage = stage;
    if (this.musicTimer) {
      this.stopMusic();
      this.startMusic();
    }
  }
  enemyDestroyed(type) {
    if (type === 'plane') { this.tone(260, .11, 'square', .08); this.tone(120, .18, 'sawtooth', .08, .04); return; }
    if (type === 'helicopter') { this.tone(92, .22, 'sawtooth', .12); this.tone(48, .30, 'square', .08, .05); return; }
    if (type === 'boat') { this.tone(76, .28, 'triangle', .11); this.tone(130, .15, 'square', .06, .05); return; }
    if (type === 'submarine') { this.tone(310, .12, 'sine', .09); this.tone(58, .38, 'sawtooth', .12, .08); return; }
    if (type === 'ufo') { this.tone(920, .10, 'sine', .09); this.tone(460, .20, 'square', .09, .05); return; }
    if (type === 'bird') { this.tone(1250, .06, 'sine', .07); this.tone(1550, .07, 'triangle', .06, .06); return; }
    if (type === 'truck') { this.tone(105, .22, 'square', .11); this.tone(62, .32, 'sawtooth', .10, .04); return; }
    this.explode();
  }
  bridge() { this.tone(82, .30, 'square', .08); this.tone(123, .18, 'triangle', .05, .08); }
  bird() { this.tone(1180, .05, 'sine', .035); this.tone(1440, .06, 'triangle', .03, .05); }
  upgrade() { this.tone(660, .10, 'triangle', .10); this.tone(880, .12, 'triangle', .09, .09); this.tone(1320, .16, 'sine', .08, .18); }
  boss() { this.tone(110, 0.35, 'sawtooth', 0.11); this.tone(82, 0.35, 'square', 0.07, 0.16); }
}`,
      'efeitos sonoros específicos'
    );

    replaceEvery('this.mouseControl.z = clamp(this.mousePoint.z, -5.5, 11.2);', 'this.mouseControl.z = clamp(this.mousePoint.z, -15.5, 12.2);', 'alcance vertical do mouse');
    replaceEvery('this.player.targetZ = clamp(this.player.targetZ, -5.5, 11.2);', 'this.player.targetZ = clamp(this.player.targetZ, -15.5, 12.2);', 'alcance vertical do avião');
    replaceEvery('this.player.targetX += dx / len * 21.5 * dt;', 'this.player.targetX += dx / len * 27.5 * dt;', 'agilidade horizontal');
    replaceEvery('this.player.targetZ += dz / len * 11.5 * dt;', 'this.player.targetZ += dz / len * 18.5 * dt;', 'agilidade vertical');
    replaceEvery('Math.min(1, dt * 17)', 'Math.min(1, dt * 20)', 'resposta de movimento');

    replaceOnce(
      "{ name: 'NEBLINA · PONTOS CEGOS', biome: 'fog', ground: 0x607665, side: 0x35483d, leaves: [0x506b58, 0x637b68, 0x425a4a], sky: 0xb9c6c5, fog: 0xcbd3d1, water: 0x719ba4, sun: 1.5, weather: 'fog', fogNear: 8, fogFar: 38 },",
      "{ name: 'NEBLINA · BANCOS LOCALIZADOS', biome: 'fog', ground: 0x607665, side: 0x35483d, leaves: [0x506b58, 0x637b68, 0x425a4a], sky: 0xaebfc2, fog: 0xb8c5c3, water: 0x719ba4, sun: 1.75, weather: 'fog', fogNear: 24, fogFar: 82 },",
      'neblina translúcida'
    );
    replaceOnce(
      '    this.ui.stage(`FASE ${this.stage} · ${theme.name}`);',
      '    this.audio.setStage(this.stage);\n    this.ui.stage(`FASE ${this.stage} · ${theme.name}`);',
      'música por fase'
    );

    replaceOnce(
      /function createTruck\(\) \{[\s\S]*?\n\}\n\nfunction createBridge/,
      `function createTruck() {
  const group = new THREE.Group();
  const orange = material(0xe8892f, { roughness: 0.42, metalness: 0.12, emissive: 0x3a1602, emissiveIntensity: 0.12 });
  const white = material(0xf0f4f6, { roughness: 0.34, metalness: 0.16 });
  const dark = material(0x15232f, { roughness: 0.78 });
  const glass = material(0x66b8d7, { roughness: 0.12, metalness: 0.34, emissive: 0x103e55, emissiveIntensity: 0.22 });
  const chrome = material(0xb8c3ca, { roughness: 0.24, metalness: 0.78 });
  const headlight = material(0xfff1a6, { emissive: 0xffc843, emissiveIntensity: 2.3, roughness: 0.08 });
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.92, 1.06), orange);
  cargo.position.set(-0.50, 0.84, 0);
  group.add(cargo);
  for (const x of [-1.18, -0.78, -0.38, 0.02]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.98, 1.10), chrome);
    rib.position.set(x, 0.85, 0);
    group.add(rib);
  }
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.88, 1.02), white);
  cab.position.set(0.94, 0.81, 0);
  group.add(cab);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.40, 0.76), glass);
  windshield.position.set(1.42, 0.96, 0);
  group.add(windshield);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.30, 0.64), chrome);
  grille.position.set(1.43, 0.58, 0);
  group.add(grille);
  for (const z of [-0.34, 0.34]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), headlight);
    lamp.position.set(1.47, 0.72, z);
    group.add(lamp);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.20, 12);
  for (const x of [-0.95, -0.15, 0.88]) {
    for (const z of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x, 0.35, z);
      group.add(wheel);
    }
  }
  const shadow = makeShadow(1.9, 0.85);
  shadow.position.y = 0.08;
  group.add(shadow);
  group.userData.materials = [orange, white, glass, chrome, headlight];
  return group;
}

function createBridge`,
      'caminhão detalhado'
    );
    replaceEvery('truck.scale.setScalar(0.78);', 'truck.scale.setScalar(1.12);', 'tamanho do caminhão');
    replaceEvery('truck.position.set(-river.width / 2 - 1.0, 0.4, 0);', 'truck.position.set(-river.width / 2 - 1.0, 0.56, 0);', 'posição do caminhão');
    replaceOnce('      passedPlayer: false,\n      dead: false,', '      passedPlayer: false,\n      soundPlayed: false,\n      dead: false,', 'estado sonoro da ponte');
    replaceOnce(
      '      bridge.width = river.width;\n      if (!bridge.destroyed && bridge.truck.visible) {',
      `      bridge.width = river.width;
      if (!bridge.soundPlayed && bridge.root.position.z > -24) {
        bridge.soundPlayed = true;
        this.audio.bridge();
      }
      if (!bridge.destroyed && bridge.truck.visible) {`,
      'som da ponte em aproximação'
    );

    replaceOnce(
      "      life: { label: '♥', color: '#e72f43', message: 'VIDA EXTRA' },",
      "      life: { label: '♥', color: '#e72f43', message: 'VIDA EXTRA' },\n      star: { label: '★', color: '#ffd84d', message: 'SUPER ESTRELA' },",
      'estrela de upgrade'
    );
    replaceOnce(
      "    else group = createGenericPickup(type, this.itemTextures[type]);",
      `    else {
      group = createGenericPickup(type, this.itemTextures[type]);
      if (type === 'star') {
        group.scale.setScalar(1.55);
        const glow = new THREE.PointLight(0xffd84d, 5.5, 8, 2);
        glow.position.y = 1.2;
        group.add(glow);
      }
    }`,
      'visual da estrela'
    );

    replaceEvery(
      '    this.ufoKills = 0;',
      '    this.ufoKills = 0;\n    this.bossKills = 0;\n    this.starUpgradeActive = false;',
      'contador de chefes'
    );
    replaceOnce(
      '    this.mouseControl.active = false;\n    Object.assign(this.player, {',
      `    this.mouseControl.active = false;
    this.playerObject.scale.setScalar(1);
    if (this.playerObject.userData.superGuns) {
      for (const gun of this.playerObject.userData.superGuns) gun.parent?.remove(gun);
      delete this.playerObject.userData.superGuns;
    }
    Object.assign(this.player, {`,
      'reset do super upgrade'
    );

    replaceOnce(
      /  firePlayer\(\) \{[\s\S]*?\n  \}\n\n  spawnEnemyBullet/,
      `  firePlayer() {
    const level = this.player.weapon;
    const patterns = {
      1: [[0, 0]],
      2: [[-0.38, 0], [0.38, 0]],
      3: [[-0.55, 0], [0, -0.08], [0.55, 0]],
      4: [[-0.68, 0], [-0.22, -0.1], [0.22, -0.1], [0.68, 0]],
      5: [[-0.8, 0], [-0.4, -0.08], [0, -0.16], [0.4, -0.08], [0.8, 0]],
      6: [[-1.38, 0.05], [-0.92, -0.02], [-0.46, -0.10], [0, -0.20], [0.46, -0.10], [0.92, -0.02], [1.38, 0.05]],
    };
    for (const [x, z] of patterns[level] ?? patterns[6]) this.spawnPlayerBullet(x, z, level);
    this.audio.shot(level);
  }

  spawnEnemyBullet`,
      'armas nas asas'
    );

    replaceOnce(
      /  collectItem\(item\) \{[\s\S]*?\n  \}\n\n  bossAttack/,
      `  collectItem(item) {
    const type = item.type;
    if (type === 'fuel') this.player.fuel = Math.min(100, this.player.fuel + 42);
    if (type === 'shield') this.player.shield = 5;
    if (type === 'repair') this.player.damage = Math.max(0, this.player.damage - 38);
    if (type === 'bomb') this.player.bombs = Math.min(5, this.player.bombs + 1);
    if (type === 'coin') this.score += 100;
    if (type === 'weapon') this.score += 250;
    if (type === 'life') this.player.lives = Math.min(5, this.player.lives + 1);
    if (type === 'star') {
      this.starUpgradeActive = true;
      this.player.weapon = 6;
      this.playerObject.scale.setScalar(1.28);
      if (!this.playerObject.userData.superGuns) {
        const gunMat = material(0xffd84d, { roughness: 0.18, metalness: 0.65, emissive: 0x7a4a00, emissiveIntensity: 0.65 });
        const guns = [];
        for (const x of [-1.34, 1.34]) {
          const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.95, 10), gunMat);
          pod.rotation.x = Math.PI / 2;
          pod.position.set(x, 0.95, -0.35);
          this.playerObject.add(pod);
          guns.push(pod);
        }
        this.playerObject.userData.superGuns = guns;
      }
      this.audio.upgrade();
      this.ui.message('SUPER ESTRELA · CANHÕES DE ASA', 2200);
    } else {
      this.ui.message(type === 'shield' ? 'ESCUDO 5 SEGUNDOS' : this.itemTypes[type].message);
      this.audio.pickup();
    }
    item.dead = true;
    item.root.parent?.remove(item.root);
  }

  bossAttack`,
      'coleta da super estrela'
    );

    replaceOnce(
      /  bossAttack\(\) \{[\s\S]*?\n  \}\n\n  bossAimedAttack/,
      `  bossAttack() {
    if (!this.boss) return;
    const boss = this.boss;
    const origin = boss.root.position;
    boss.volley += 1;
    const volley = boss.volley;
    const count = Math.min(15, 6 + volley);
    const speed = 7.0 + this.stage * 0.45 + volley * 0.42;
    const damage = Math.min(56, 16 + this.stage * 3 + volley * 3.5);
    const spreadWidth = 0.92 + Math.min(0.82, volley * 0.07);
    const baseScale = Math.min(3.2, 0.48 + volley * 0.18);
    for (let i = 0; i < count; i += 1) {
      const normalized = count === 1 ? 0 : i / (count - 1) * 2 - 1;
      const size = baseScale * (0.88 + Math.abs(normalized) * 0.12);
      this.spawnEnemyBullet(origin.x + normalized * 2.3, origin.z + 1.4, normalized * speed * spreadWidth, speed, size, damage);
    }
    const dx = this.player.x - origin.x;
    const dz = this.player.z - origin.z;
    const len = Math.hypot(dx, dz) || 1;
    this.spawnEnemyBullet(origin.x, origin.z + 1.5, dx / len * (speed + 2.2), dz / len * (speed + 2.2), Math.min(3.8, baseScale * 1.28), damage + 8);
    this.ui.message(`RAJADA ${volley}`, 600);
  }

  bossAimedAttack`,
      'projéteis crescentes do chefe'
    );

    replaceOnce(
      /  finishStage\(\) \{[\s\S]*?\n  \}\n\n  useBomb/,
      `  finishStage() {
    this.bossKills += 1;
    const grantStar = this.bossKills === 5 && !this.starUpgradeActive;
    this.stage += 1;
    this.stageTime = 0;
    this.bossSpawned = false;
    this.birdRewardStage = 0;
    this.lifeSpawnedStage = 0;
    this.resetStageSpawnPlan();
    this.player.fuel = Math.min(100, this.player.fuel + 35);
    this.player.damage = Math.max(0, this.player.damage - 28);
    this.applyStageTheme();
    if (grantStar) {
      this.spawnItem(null, -24, 'star');
      this.ui.message('SUPER ESTRELA LIBERADA', 2200);
    }
  }

  useBomb`,
      'estrela após cinco chefes'
    );

    replaceOnce(
      "    this.spawnExplosion(enemy.root.position.x, enemy.root.position.z, enemy.type === 'ufo' ? 1.2 : 0.9);\n    this.audio.explode();",
      "    this.spawnExplosion(enemy.root.position.x, enemy.root.position.z, enemy.type === 'ufo' ? 1.2 : 0.9);\n    this.audio.enemyDestroyed(enemy.type);",
      'som diferente por inimigo'
    );
    replaceOnce(
      '    this.scene.add(root);\n    this.enemies.push({\n      type: chosen,',
      "    this.scene.add(root);\n    if (chosen === 'bird') this.audio.bird();\n    this.enemies.push({\n      type: chosen,",
      'som das aves'
    );
    replaceOnce(
      "            this.spawnExplosion(worldTruck.x, worldTruck.z, 0.85);\n            bridge.truck.visible = false;",
      "            this.spawnExplosion(worldTruck.x, worldTruck.z, 0.85);\n            this.audio.enemyDestroyed('truck');\n            bridge.truck.visible = false;",
      'som do caminhão destruído'
    );
    replaceOnce(
      "    this.spawnExplosion(bridge.root.position.x, bridge.root.position.z, 1.5);",
      "    this.spawnExplosion(bridge.root.position.x, bridge.root.position.z, 1.5);\n    this.audio.bridge();",
      'som da ponte destruída'
    );

    code += '\n//# sourceURL=sky-river-run-main-fixed-4500.js';
    const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    await import(blobUrl);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Falha ao iniciar Sky River Run:', error);
    const menu = document.querySelector('#menu .menu-card');
    if (menu) {
      const warning = document.createElement('p');
      warning.style.color = '#ff8d7f';
      warning.style.fontWeight = '800';
      warning.textContent = `Erro de inicialização: ${error.message}`;
      menu.appendChild(warning);
    }
  }
}

startGameModule();
