async function startHotfix452() {
  try {
    const loaderUrl = new URL('./bootstrap-loader.js?v=4502', import.meta.url);
    const response = await fetch(loaderUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar bootstrap-loader.js: HTTP ${response.status}`);

    let source = await response.text();

    // Corrige os separadores do bloco de patches da versão 4.5.2.
    source = source.replace("] .join('\\\\n');".replace('] ', ']'), "].join('\\n');");
    source = source.replace(
      "extraPatches + '\\\\n\\\\n' + injectionMarker",
      "extraPatches + '\\n\\n' + injectionMarker"
    );

    // Mantém a resolução relativa de bootstrap.js baseada na URL real do loader.
    source = source.replaceAll('import.meta.url', JSON.stringify(loaderUrl.href));
    source += '\n//# sourceURL=sky-river-run-loader-entry-4502.js';

    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('Falha ao iniciar Sky River Run 4.5.2:', error);
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

startHotfix452();
