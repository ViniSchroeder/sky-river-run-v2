async function startGameModule() {
  try {
    const mainUrl = new URL('./main.js?v=4112', import.meta.url);
    const response = await fetch(mainUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar main.js: HTTP ${response.status}`);

    let code = await response.text();
    const threeUrl = new URL('../vendor/three.module.js?v=4112', import.meta.url).href;

    code = code.replace(
      "import * as THREE from '../vendor/three.module.js';",
      `import * as THREE from ${JSON.stringify(threeUrl)};`
    );

    code = code.replaceAll(
      'enemy.root.userData.rotor?.rotation.y += dt * 23;',
      'if (enemy.root.userData.rotor) enemy.root.userData.rotor.rotation.y += dt * 23;'
    );
    code = code.replaceAll(
      'enemy.root.userData.tailRotor?.rotation.x += dt * 28;',
      'if (enemy.root.userData.tailRotor) enemy.root.userData.tailRotor.rotation.x += dt * 28;'
    );
    code = code.replaceAll(
      'boss.root.userData.propeller?.rotation.z += dt * 31;',
      'if (boss.root.userData.propeller) boss.root.userData.propeller.rotation.z += dt * 31;'
    );
    code = code.replaceAll(
      'this.playerObject.userData.propeller?.rotation.z += dt * 34;',
      'if (this.playerObject.userData.propeller) this.playerObject.userData.propeller.rotation.z += dt * 34;'
    );

    code += '\n//# sourceURL=sky-river-run-main-fixed.js';
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
