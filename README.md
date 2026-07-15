# Sky River Run 4.1 — 3D Rebuild

Reconstrução integral do jogo em WebGL/Three.js, sem reaproveitar os sprites ampliados da versão anterior.

## O que muda

- Modelos 3D procedurais para avião, aeronaves inimigas, helicópteros, barcos, submarinos, discos voadores, caminhões e chefe.
- Rio com largura variável e curvas reais; o centro da tela não é permanentemente seguro.
- Colisão real com as margens.
- Água animada com reflexos e textura em movimento.
- Pontes tridimensionais com caminhões trafegando somente sobre a ponte.
- Pontes funcionam como obstáculos e podem ser destruídas com bomba.
- Itens claramente identificados por letras e cores: combustível, escudo, reparo, bomba, moeda, upgrade e vida.
- Chefe com barra de energia, reação visual a impactos e dois padrões de ataque.
- Nuvens 3D grandes e translúcidas passando sobre a câmera.
- Explosões com partículas e iluminação.
- Som de motor, efeitos e trilha retrô gerados pelo navegador.
- Joystick translúcido para celular.

## Publicação

Substitua os arquivos do repositório, faça commit e push. A Vercel publicará o mesmo projeto automaticamente.


## 4.1.1
- Corrige o arquivo main.js truncado no repositório.
- Inclui o módulo local completo three.core.js.
- Atualiza o cache para 4110.
