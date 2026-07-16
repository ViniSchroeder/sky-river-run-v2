async function loadPatchedBootstrap() {
  try {
    const sourceUrl = new URL('./js/bootstrap.js?v=4503', window.location.href);
    const response = await fetch(sourceUrl.href, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar bootstrap.js: HTTP ${response.status}`);

    let source = await response.text();

    // Corrige o template literal aninhado que quebrava o parser na linha da rajada do chefe.
    source = source.replace(
      'this.ui.message(`RAJADA ${volley}`, 600);',
      "this.ui.message('RAJADA ' + volley, 600);"
    );

    // Ajusta a densidade 3D da neblina sem ocultar completamente o cenário.
    source = source.replace(
      "fogNear: 24, fogFar: 82",
      "fogNear: 18, fogFar: 70"
    );

    const extraPatches = [
      "    replaceEvery(",
      "      'bridge.truck.position.x += bridge.truckDirection * dt * 2.7;',",
      "      'bridge.truck.position.x += bridge.truckDirection * dt * 3.8;',",
      "      'caminhão atravessa a ponte'",
      "    );",
      "    replaceEvery(",
      "      'bridge.truck.rotation.y = bridge.truckDirection > 0 ? -Math.PI / 2 : Math.PI / 2;',",
      "      'bridge.truck.rotation.y = bridge.truckDirection > 0 ? 0 : Math.PI;',",
      "      'orientação correta do caminhão'",
      "    );",
      "    replaceEvery(",
      "      \"const type = forcedType ?? (roll < 0.31 ? 'fuel' : roll < 0.49 ? 'shield' : roll < 0.66 ? 'repair' : roll < 0.80 ? 'bomb' : 'coin');\",",
      "      \"const type = forcedType ?? (roll < 0.13 ? 'fuel' : roll < 0.29 ? 'shield' : roll < 0.39 ? 'repair' : roll < 0.54 ? 'bomb' : 'coin');\",",
      "      'itens de recuperação mais raros'",
      "    );",
      "    replaceEvery(",
      "      'this.itemSpawnTimer = rand(4.0, 6.2);',",
      "      'this.itemSpawnTimer = rand(7.5, 10.5);',",
      "      'intervalo maior entre itens'",
      "    );",
      "    replaceEvery(",
      "      'this.player.fuel -= dt * (2.4 + this.stage * 0.18);',",
      "      'this.player.fuel -= dt * (2.7 + this.stage * 0.22);',",
      "      'consumo de combustível mais desafiador'",
      "    );",
      "    replaceOnce(",
      "      /  resetStageSpawnPlan\\(\\) \\{[\\s\\S]*?\\n  \\}\\n\\n  updateGuaranteedSpawns/ ,",
      "      '  resetStageSpawnPlan() {\\n    this.stageItemPlan = [\\n      { time: 4.0, type: \\'bomb\\' },\\n      { time: 11.0, type: \\'fuel\\' },\\n      { time: 17.0, type: \\'bomb\\' },\\n      { time: 23.0, type: \\'life\\' },\\n      { time: 29.0, type: \\'repair\\' },\\n      { time: 36.0, type: \\'bomb\\' },\\n    ];\\n    this.stageItemCursor = 0;\\n    this.stageUfoPlan = [2.5, 8.5, 14.5, 21.5, 28.5, 35.0];\\n    this.stageUfoCursor = 0;\\n    this.lifeSpawnedStage = 0;\\n  }\\n\\n  updateGuaranteedSpawns',",
      "      'menos combustível e reparos garantidos'",
      "    );",
      "    replaceEvery(",
      "      '      damageCooldown: 0,',",
      "      '      damageCooldown: 0,\\n      respawnTimer: 0,',",
      "      'temporizador de renascimento'",
      "    );",
      "    replaceOnce(",
      "      /  loseLife\\(\\) \\{[\\s\\S]*?\\n  \\}\\n\\n  endGame/ ,",
      "      '  loseLife() {\\n    const deathX = this.player.x;\\n    const deathZ = this.player.z;\\n    this.player.lives -= 1;\\n    this.spawnExplosion(deathX, deathZ, 1.55);\\n    this.audio.explode();\\n    this.shake = Math.max(this.shake, 1.35);\\n    if (this.player.lives <= 0) {\\n      this.endGame();\\n      return;\\n    }\\n    this.player.fuel = 100;\\n    this.player.damage = 0;\\n    this.player.shield = 0;\\n    this.player.x = 0;\\n    this.player.targetX = 0;\\n    this.player.z = PLAYER_Z;\\n    this.player.targetZ = PLAYER_Z;\\n    this.player.invulnerable = 3.0;\\n    this.player.respawnTimer = 2.6;\\n    this.playerObject.position.set(0, 0, PLAYER_Z);\\n    this.playerObject.scale.setScalar(this.starUpgradeActive ? 0.92 : 0.72);\\n    this.playerObject.visible = false;\\n    this.ui.message(\\'NOVO AVIÃO · VIDAS \\' + this.player.lives, 1600);\\n  }\\n\\n  endGame',",
      "      'explosão e renascimento visível'",
      "    );",
      "    replaceEvery(",
      "      '    this.playerObject.visible = !(this.player.invulnerable > 0 && Math.floor(this.player.invulnerable * 16) % 2);',",
      "      '    if (this.player.respawnTimer > 0) {\\n      this.player.respawnTimer = Math.max(0, this.player.respawnTimer - dt);\\n      const respawnProgress = 1 - this.player.respawnTimer / 2.6;\\n      const fullScale = this.starUpgradeActive ? 1.28 : 1;\\n      this.playerObject.scale.setScalar(fullScale * (0.72 + respawnProgress * 0.28));\\n      const blinkRate = 8 + respawnProgress * 13;\\n      this.playerObject.visible = this.player.respawnTimer < 0.32 || Math.floor((2.6 - this.player.respawnTimer) * blinkRate) % 2 === 0;\\n    } else {\\n      this.playerObject.scale.setScalar(this.starUpgradeActive ? 1.28 : 1);\\n      this.playerObject.visible = !(this.player.invulnerable > 0 && Math.floor(this.player.invulnerable * 16) % 2);\\n    }',",
      "      'animação de renascimento piscando'",
      "    );"
    ].join('\n');

    const injectionMarker = "    code += '\\n//# sourceURL=sky-river-run-main-fixed-4500.js';";
    if (!source.includes(injectionMarker)) throw new Error('Ponto de injeção do bootstrap não encontrado');
    source = source.replace(injectionMarker, extraPatches + '\n\n' + injectionMarker);

    // O bootstrap será executado por Blob; preserve a base original para resolver main.js e Three.js.
    source = source.replaceAll('import.meta.url', JSON.stringify(sourceUrl.href));
    source += '\n//# sourceURL=sky-river-run-bootstrap-fixed-4503.js';

    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('Falha ao carregar Sky River Run 4.5.3:', error);
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

loadPatchedBootstrap();
