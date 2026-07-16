async function loadPatchedBootstrap() {
  try {
    const sourceUrl = new URL('./bootstrap.js?v=4500', import.meta.url);
    const response = await fetch(sourceUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar bootstrap.js: HTTP ${response.status}`);

    let source = await response.text();

    // Corrige o template literal aninhado que quebrava o parser na linha da rajada do chefe.
    source = source.replace(
      'this.ui.message(`RAJADA ${volley}`, 600);',
      "this.ui.message('RAJADA ' + volley, 600);"
    );

    // O bootstrap será executado por Blob; preserve a base original para resolver main.js e Three.js.
    source = source.replaceAll('import.meta.url', JSON.stringify(sourceUrl.href));
    source += '\n//# sourceURL=sky-river-run-bootstrap-fixed-4501.js';

    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('Falha ao carregar Sky River Run 4.5.1:', error);
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
