# Sky River Run 2.2

Reestruturação completa do jogo com arquitetura modular e sprites.

## Estrutura

- `index.html`
- `assets/sprites`
- `assets/sounds`
- `assets/music`
- `assets/fonts`
- `css/styles.css`
- `js/game.js`
- `js/player.js`
- `js/enemies.js`
- `js/river.js`
- `js/effects.js`
- `js/ui.js`
- `js/audio.js`
- `manifest.webmanifest`
- `sw.js`
- `vercel.json`

## Principais recursos

- Sprites integrados ao jogador, inimigos, barcos, submarinos, caminhões, explosões e nuvens.
- Barra de vida visual:
  - verde quando cheia;
  - amarela na metade;
  - vermelha quando baixa.
- Três vidas.
- Tiro contínuo ao segurar Espaço ou o botão de fogo.
- Tiro duplo e triplo por upgrades.
- Inimigos verticais e laterais.
- Barcos, submarinos e caminhões.
- Nuvens após 3.000 pontos.
- PWA básica e publicação estática na Vercel.

## Publicação

Apague os arquivos antigos do repositório ou crie um novo repositório para a versão 2.0.
Envie todo o conteúdo desta pasta, preservando as pastas.
Na Vercel use Framework Preset `Other`, Root Directory `./` e nenhum comando de build.


## V2.2
- Barra de combustível corrigida no desktop e mobile.
- Novo avião superior.
- Itens sempre dentro do rio.
- Combustível, bombas, reparo, escudo e moedas.
- Progressão de níveis e dificuldade.
