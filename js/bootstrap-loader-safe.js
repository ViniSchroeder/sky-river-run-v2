async function loadSkyRiverRunSafe() {
  try {
    const baseUrl = new URL('./js/', window.location.href);
    const legacyLoaderUrl = new URL('bootstrap-loader.js?v=4600', baseUrl);
    const bootstrapUrl = new URL('bootstrap.js?v=4607', baseUrl);
    const mobilePatchUrl = new URL('patches-4603.js?v=4603', baseUrl);
    const controlPatchUrl = new URL('patches-4604.js?v=4604', baseUrl);
    const joystickFixUrl = new URL('patches-4605.js?v=4605', baseUrl);
    const stagePatchUrl = new URL('patches-4606.js?v=4606', baseUrl);
    const aerialSpawnPatchUrl = new URL('patches-4607.js?v=4607', baseUrl);

    const [legacyResponse, bootstrapResponse, mobilePatchResponse, controlPatchResponse, joystickFixResponse, stagePatchResponse, aerialSpawnPatchResponse] = await Promise.all([
      fetch(legacyLoaderUrl.href, { cache: 'no-store' }),
      fetch(bootstrapUrl.href, { cache: 'no-store' }),
      fetch(mobilePatchUrl.href, { cache: 'no-store' }),
      fetch(controlPatchUrl.href, { cache: 'no-store' }),
      fetch(joystickFixUrl.href, { cache: 'no-store' }),
      fetch(stagePatchUrl.href, { cache: 'no-store' }),
      fetch(aerialSpawnPatchUrl.href, { cache: 'no-store' }),
    ]);

    if (!legacyResponse.ok) throw new Error(`Falha ao carregar patches anteriores: HTTP ${legacyResponse.status}`);
    if (!bootstrapResponse.ok) throw new Error(`Falha ao carregar bootstrap.js: HTTP ${bootstrapResponse.status}`);
    if (!mobilePatchResponse.ok) throw new Error(`Falha ao carregar ajustes móveis: HTTP ${mobilePatchResponse.status}`);
    if (!controlPatchResponse.ok) throw new Error(`Falha ao carregar calibração 4.6.4: HTTP ${controlPatchResponse.status}`);
    if (!joystickFixResponse.ok) throw new Error(`Falha ao carregar correção 4.6.5: HTTP ${joystickFixResponse.status}`);
    if (!stagePatchResponse.ok) throw new Error(`Falha ao carregar atualização 4.6.6: HTTP ${stagePatchResponse.status}`);
    if (!aerialSpawnPatchResponse.ok) throw new Error(`Falha ao carregar atualização 4.6.7: HTTP ${aerialSpawnPatchResponse.status}`);

    const legacySource = await legacyResponse.text();
    let source = await bootstrapResponse.text();
    const mobilePatches = await mobilePatchResponse.text();
    const controlPatches = await controlPatchResponse.text();
    const joystickFixPatches = await joystickFixResponse.text();
    const stagePatches = await stagePatchResponse.text();
    const aerialSpawnPatches = await aerialSpawnPatchResponse.text();

    const assignmentMarker = 'const extraPatches = ';
    const assignmentIndex = legacySource.indexOf(assignmentMarker);
    if (assignmentIndex < 0) throw new Error('Pacote de patches da versão anterior não encontrado');

    let cursor = assignmentIndex + assignmentMarker.length;
    while (/\s/.test(legacySource[cursor] ?? '')) cursor += 1;
    if (legacySource[cursor] !== '"') throw new Error('Formato dos patches anteriores não reconhecido');

    const literalStart = cursor;
    cursor += 1;
    let escaped = false;
    while (cursor < legacySource.length) {
      const char = legacySource[cursor];
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        break;
      }
      cursor += 1;
    }
    if (cursor >= legacySource.length) throw new Error('Pacote de patches incompleto');

    const extraPatches = JSON.parse(legacySource.slice(literalStart, cursor + 1));

    source = source.replace(
      'this.ui.message(`RAJADA ${volley}`, 600);',
      "this.ui.message('RAJADA ' + volley, 600);"
    );
    source = source.replace('fogNear: 24, fogFar: 82', 'fogNear: 18, fogFar: 70');

    const hotfixPatches = [
      "    replaceEvery(",
      "      '    boss.phase += dt;',",
      "      '    boss.fuelSupplyTimer = (boss.fuelSupplyTimer ?? 30) - dt;\\n    boss.bombSupplyTimer = (boss.bombSupplyTimer ?? 20) - dt;\\n    if (boss.fuelSupplyTimer <= 0) {\\n      boss.fuelSupplyTimer += 30;\\n      this.spawnItem(null, -36, \\\'fuel\\\');\\n      this.ui.message(\\\'SUPRIMENTO DE COMBUSTÍVEL\\\', 850);\\n    }\\n    if (boss.bombSupplyTimer <= 0) {\\n      boss.bombSupplyTimer += 20;\\n      this.spawnItem(null, -34, \\\'bomb\\\');\\n      this.ui.message(\\\'BOMBA DE APOIO\\\', 850);\\n    }\\n    boss.phase += dt;',",
      "      'suprimentos periódicos durante o chefe'",
      "    );",
      "    replaceEvery(",
      "      '    if (this.boss) this.damageBoss(22);',",
      "      '    if (this.boss) {\\n      const bombDamage = Math.min(260, 95 + this.stage * 22);\\n      this.damageBoss(bombDamage);\\n      this.spawnExplosion(this.boss.root.position.x, this.boss.root.position.z, 1.35);\\n      this.ui.message(\\\'BOMBA · DANO PESADO\\\', 700);\\n    }',",
      "      'bombas mais fortes contra chefes'",
      "    );",
      "    replaceEvery(",
      "      '    const podCount = 1 + tier;',",
      "      '    const podCount = tier === 0 ? 0 : tier * 2;',",
      "      'remove caixa assimétrica do primeiro chefe'",
      "    );",
    ].join('\n');

    const insertionMarker = 'const blobUrl = URL.createObjectURL';
    const insertionIndex = source.indexOf(insertionMarker);
    if (insertionIndex < 0) throw new Error('Ponto seguro de injeção não encontrado');

    source = source.slice(0, insertionIndex)
      + extraPatches + '\n\n'
      + hotfixPatches + '\n\n'
      + mobilePatches + '\n\n'
      + controlPatches + '\n\n'
      + joystickFixPatches + '\n\n'
      + stagePatches + '\n\n'
      + aerialSpawnPatches + '\n\n    '
      + source.slice(insertionIndex);
    source = source.replaceAll('v=4500', 'v=4607');
    source = source.replaceAll('import.meta.url', JSON.stringify(bootstrapUrl.href));
    source += '\n//# sourceURL=sky-river-run-bootstrap-safe-4607.js';

    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('Falha ao carregar Sky River Run 4.6.7:', error);
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

loadSkyRiverRunSafe();
