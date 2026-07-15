# Sky River Run 2.1

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


## Melhorias visuais da V2.1
- Avião com sprite HD e maior contraste.
- Água com textura, brilho e ondas.
- Margens mais detalhadas.
- Sombras reforçadas.
- Explosões animadas em 8 quadros.
- Fumaça de impacto e rastro.
- Nuvens translúcidas com deriva.
- HUD moderno e barra crítica pulsante.
