async function startGameModule() {
  try {
    const mainUrl = new URL('./main.js?v=4402', import.meta.url);
    const response = await fetch(mainUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar main.js: HTTP ${response.status}`);

    let code = await response.text();
    const threeUrl = new URL('../vendor/three.module.js?v=4402', import.meta.url).href;

    code = code.replace(
      "import * as THREE from '../vendor/three.module.js';",
      `import * as THREE from ${JSON.stringify(threeUrl)};`
    );

    // Corrige atribuições incompatíveis com optional chaining em alguns navegadores.
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

    // Corrige o travamento ao atingir inimigos que usam materiais sem emissive.
    code = code.replace(
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
}`
    );

    code += '\n//# sourceURL=sky-river-run-main-fixed-4402.js';
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
