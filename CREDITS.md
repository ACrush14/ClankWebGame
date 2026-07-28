# Créditos de assets

## Arte oficial do Clank! (Renegade Game Studios) — usada como placeholder (2026-07-27)

**Atualização importante:** ao contrário do que a frase abaixo dizia antes, este projeto
**passou a usar fotos da arte oficial** das cartas, do tabuleiro físico e dos
tokens/artefatos do Clank!, a partir de fotos que o próprio usuário tirou do jogo físico
que ele possui. Isso só foi autorizado explicitamente pelo usuário (2026-07-24/27) porque
este é um **projeto pessoal, não-comercial, fechado** (repositório GitHub **privado**, só
pra jogar com amigos — ver nota de IP completa em [PLANNING.md](./PLANNING.md)). **Não
distribuir/publicar essas imagens fora desse uso** — se o projeto algum dia for tornado
público, essas artes precisam ser trocadas por um reskin próprio primeiro.

- **Cartas** (71/71 do jogo base): `client/src/assets/cards/<id>.png`, carregadas via
  `client/src/game/cardImages.ts` (`import.meta.glob`). Usadas em `App.tsx` (Dungeon Row,
  Reserva, mão do jogador) através do componente `CardThumb`.
- **Tabuleiro**: `client/src/assets/board/ClankBoardCastle.jpg` (foto do lado "Castelo"
  do tabuleiro físico), usada como pano de fundo atmosférico (opacidade 40% + véu escuro)
  atrás do grafo esquemático de salas em `client/src/game/BoardMap.tsx` — **não é
  alinhamento pixel-a-pixel**, o grafo de salas continua sendo um layout próprio.
- **Tokens/artefatos**: `client/src/assets/tokens/*.png`, mapeados em
  `client/src/game/tokenImages.ts` — os 7 Artefatos (Anel/Cruz/Vaso/Banana/Escudo/
  Armadura/Orbe), as 3 coroas (8/9/10), Chave-mestra, Mochila, os 3 Ídolos de Macaco, e
  alguns tokens de efeito secreto (Bota/Moeda/Cura/Mana/Dano/Cartas — só as combinações
  ícone+quantidade que têm arte exata; o resto cai pra emoji). Três imagens copiadas mas
  **ainda não usadas** por não haver mecânica implementada pra elas: `Chalice.png`,
  `EggDragon.png`, `MasteryToken.png`.
- Fotos originais (não recortadas/processadas) ficam em
  `D:\UNIFOR\Clones Github\ClankWebGame\images\` — **fora** das pastas versionadas do
  client, então precisam de uma decisão consciente antes do commit (ver
  `research/clank-steam/README.md`, seção sobre integração de arte, pra detalhes: hoje
  essa pasta NÃO está no `.gitignore`, mas é conteúdo bruto/redundante já que as versões
  processadas que o jogo realmente usa estão em `client/src/assets/`).

## Assets de terceiros sob licença livre (uso original do projeto, antes da arte oficial)

Os assets abaixo continuam no projeto (placeholders genéricos usados onde a arte oficial
ainda não cobre, ou como base do design original antes da autorização acima):

## [Board Game Icons](https://kenney.nl/assets/board-game-icons) — Kenney (kenney.nl)
- Licença: **CC0** (domínio público) — uso livre, atribuição não obrigatória.
- Usado para: peão de jogador, caveira (cubo do dragão), espada/escudo (combate futuro), cartas/baralho. **Sem dados** — Clank! não usa dados (ver seção de regras verificadas no [PLANNING.md](./PLANNING.md)); os ícones de dado do pack foram removidos por não se aplicarem ao jogo.
- Local: `client/public/assets/kenney/board-game-icons/`

## [Roguelike Caves & Dungeons](https://kenney.nl/assets/roguelike-caves-dungeons) — Kenney (kenney.nl)
- Licença: **CC0** (domínio público) — uso livre, atribuição não obrigatória.
- Reservado para o tabuleiro/mina (ainda não recortado em tiles individuais — ver `spritesheetInfo.txt` no mesmo pack).
- Local: `client/public/assets/kenney/roguelike-caves-dungeons/`

Créditos a Kenney não são obrigatórios pela licença, mas são dados aqui como boa prática.
