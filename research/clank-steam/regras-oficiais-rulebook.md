# Regras oficiais — extraídas do manual em PDF (texto, não automação)

Fonte: manual oficial em inglês de *Clank! A Deck-Building Adventure*
(`https://cdn.1j1ju.com/medias/dc/cc/ae-clank-a-deck-building-adventure-rulebook.pdf`),
lido via `WebFetch` + `Read` (extração de texto puro do PDF — **muito mais barato** que
capturar tela via automação, e é uma fonte 100% oficial/autoritativa). Complementa
[`cartas-capturadas.md`](./cartas-capturadas.md), que tem as cartas lidas ao vivo no
Steam. O manual **não lista as ~68 cartas únicas da Dungeon Row** (isso só está
impresso nas cartas físicas), mas cobre praticamente todo o resto do regramento.

## Setup — coisas que confirmam ou corrigem o motor atual

- Cada jogador começa com **30 cubos de Clank!** na reserva pessoal (não é infinito).
- Baralho inicial real: **6 Burgle, 2 Stumble, 1 Cautious Advance, 1 Skillful Move**
  (10 cartas) — diferente do que temos hoje (4 cartas distintas x quantidade). Precisa
  conferir/ajustar `engine/src/cards.ts` quando for reverter pro conteúdo base:
  "Cautious Advance" e "Skillful Move" são nomes que ainda não vimos jogando (podem ser
  o que chamamos de "Contornar"/Sidestep e "Rastejar"/Scramble, ou cartas diferentes —
  precisa confirmar).
- **7 Artefatos** no total (valores 5 a 30 — bate com a escala já confirmada
  5/7/10/15/20/25/30). Com menos de 4 jogadores, remove-se Artefatos aleatoriamente
  antes de montar o tabuleiro (3 jogadores: remove 1; 2 jogadores: remove 2).
- **3 Ídolos de Macaco** (Monkey Idols) ficam na sala "Monkey Shrine" — mistério
  resolvido! Não são item de Mercado nem Segredo; são um terceiro tipo de token
  colecionável, aparentemente com valor de pontos próprio (visto "5" no diagrama do
  manual, a confirmar o valor exato).
- **Market**: 2 Master Keys, 2 Backpacks, 3 Crowns (10/9/8 pontos).
- **Mastery tokens**: um por jogador, ficam perto do canto superior esquerdo do
  tabuleiro (não são limitados/escassos — todo mundo pode ganhar o seu).
- **24 cubos de dragão** (pretos) no Saco do Dragão.
- Ordem de turno: 1º jogador começa com **3 Clank!**, 2º com **2**, 3º com **1**, 4º
  com **0** já na Área de Clank (vantagem de turno compensada por barulho inicial).
- Ao montar a Dungeon Row inicial (6 cartas), se alguma tiver o símbolo de Dragon
  Attack, ela é substituída até nenhuma ter o símbolo (evita ataque na primeira rodada).

## Ações do turno (Step 2: The Plan) — confirma o que já sabíamos + detalhes novos

- **Adquirir carta**: Dungeon Row = banner azul, paga com Skill. Reserva = banner
  amarelo, mesma coisa. Custo sempre no canto inferior direito.
- **Dispositivo (Device)**: banner roxo. Ao adquirir, executa o texto "Use" e vai
  direto pra pilha de descarte da MASMORRA (não pro seu próprio descarte — ou seja,
  Dispositivos **não entram no seu baralho**, diferente do que uma Gema ou Companheiro
  faz). Isso é uma correção importante pro motor se ele hoje trata Dispositivo igual a
  qualquer outra carta comprável.
- **Monstro**: banner vermelho, paga com Swords (não Skill). Recompensa = texto
  "Defeat", carta vai pra pilha de descarte da masmorra. **Goblin da Reserva é especial**:
  não é descartado ao ser derrotado, pode ser lutado várias vezes no mesmo turno — bate
  com o motor atual.
- **Mercado**: custo **fixo de 7 Ouro** pra qualquer item. Precisa estar numa sala de
  Mercado. Conferido contra `engine/src/game.ts` (`buyMarketItem`/`MARKET_ITEM_COST`) —
  **já bate certinho**, motor usa `player.gold` e custo 7, sem mudança necessária.
- **Mover por túnel**: 1 Boot = 1 túnel. Regras especiais de túnel:
  - Ícone de pegada duplicada = custa 2 Boots.
  - **Ícone de monstro no túnel** = causa dano igual ao número mostrado; **cada Sword
    usado reduz 1 de dano** (mas Swords não são obrigatórios pra atravessar). Motor
    atual não modela isso — é a explicação completa do que vimos ao vivo no Steam (o
    aviso de "vai receber dano" + bloqueio se não tiver Swords suficiente e pouca vida).
  - Ícone de cadeado = precisa ter um Master Key.
  - Túnel em forma de seta = só pode ser usado na direção da seta.
  - Túneis que saem pela borda do tabuleiro ("wrap-around") conectam ao lado oposto, e
    só custam 1 Boot normal (não é caso especial de custo).
- **Pegar token ao entrar numa sala**: só 1 por entrada (se a sala tiver mais de um,
  precisa sair e reentrar pra pegar outro). Pegar Artefato avança a Trilha de Fúria em
  1 espaço. Não pode pegar Artefato se já tiver um (a menos que tenha Backpack).
- **Caverna de Cristal**: ao entrar, fica exausto e não pode mais usar Boots no
  resto do turno — só pode se mover de novo via Teletransporte. Bate 100% com o que já
  implementamos (`isCrystalCave`).

## Recursos e Clank!

- Ouro (Gold) vale 1 ponto no fim de jogo; usado também pra comprar no Mercado.
- Clank! negativo: remove cubos da Área de Clank; se não tiver cubos lá pra remover,
  o efeito negativo é perdido (não vira "crédito" pra depois). Clank! negativo sobrando
  no fim do turno também é perdido.
- **Ficou sem cubos de Clank! na reserva pessoal?** Não pode mais escolher levar dano
  ao atravessar túnel de monstro, MAS também não pode ser forçado a gerar mais Clank! —
  fica "imune" até recuperar cubos curando dano.

## Vida, nocaute e fim de jogo

- Dano vai pro "Medidor de Vida" (Health Meter) da cor do jogador, da esquerda pra
  direita. Dano de ataque de dragão usa cubos que saíram do Saco do Dragão; dano por
  escolher atravessar túnel de monstro sem Sword usa cubos da própria reserva pessoal
  (não pode escolher isso se encheria o medidor por completo).
- Curar = devolve 1 cubo da cor do próprio Medidor de Vida pra reserva pessoal (pode
  ser usado de novo depois para gerar Clank!).
- **Nocaute**: se já tiver pego um Artefato e já tiver escapado da zona "Profundezas",
  é resgatado e conta pontos normalmente. Se não tem Artefato, ou ainda está nas
  Profundezas, está eliminado (não conta pontos).
- **Mastery**: só pra quem volta com o Artefato até a entrada (fora da masmorra) ANTES
  de ser nocauteado — token extra de 20 pontos. Bate 100% com `MASTERY_BONUS` do motor.

## Trilha de Contagem Regressiva (Countdown Track) — detalhe exato

- Só o **primeiro** jogador a sair da masmorra ou ser nocauteado usa a trilha (os
  outros que saem depois não usam).
- A cada turno seguinte, esse jogador não joga cartas normalmente — só avança 1 espaço
  na trilha e executa o efeito do espaço:
  - Espaço 2: ataque de dragão instantâneo, **+1 cubo extra**.
  - Espaço 3: ataque de dragão instantâneo, **+2 cubos extra**.
  - Espaço 4: ataque de dragão instantâneo, **+3 cubos extra**.
  - Espaço 5: o dragão nocauteia **instantaneamente todo mundo que ainda estiver na
    masmorra**.
- Jogadores fora da masmorra/nocauteados não geram mais Clank!, não são afetados por
  cartas "todos os jogadores", e cubos da cor deles no Saco do Dragão não causam dano
  (tratados como cubos pretos).

**Conferido contra `engine/src/game.ts` (`processCountdownStep`) — já bate 100% certinho**,
inclusive o nocaute geral no espaço final. Sem mudança necessária.

## Pontuação final

Soma: valor do Artefato + pontos de outros tokens (Segredos, Ídolos de Macaco, Chalice
etc.) + Ouro acumulado (1 ponto por Ouro) + pontos impressos nas cartas do baralho
(canto superior direito). Empate = desempate pelo Artefato de maior valor.

## Glossário oficial (Advanced Maneuvers) — termos e timing exatos

- **Acquire**: efeito que só acontece **uma vez**, ao comprar a carta da Dungeon Row
  (não quando jogada depois da mão).
- **Arrive**: efeito que acontece quando a carta é **revelada** (antes de qualquer
  ataque de dragão que também tenha sido disparado na mesma reposição de fileira).
- **Danger**: por carta com esse marcador presente na Dungeon Row, puxa **1 cubo
  extra** do Saco do Dragão em TODO ataque de dragão. Bate 100% com o que já
  concluímos jogando.
- **Discard**: só pode descartar cartas da mão que ainda não jogou nesse turno; se um
  efeito pede pra descartar uma carta pra ganhar algo e você não tem carta pra
  descartar, não ganha o efeito.
- **Fountain of Healing**: sala especial — ao entrar, cura 1 dano.
- **Market (verso do tabuleiro)**: no lado "Montículos e Covas", o Mercado não é um
  bloco único de salas — fica espalhado em várias salas pelo mapa.
- **Order of Card Plays**: efeitos condicionais tipo "se você tiver outro Companheiro
  em jogo, compre uma carta" valem mesmo se você conseguir a condição DEPOIS de jogar a
  carta gatilho no mesmo turno (ex: joga o Companheiro A, depois o Companheiro B —
  ambos contam um pro outro).
- **Reserve**: Mercenary/Explore/Secret Tome são limitados de verdade (podem esgotar).
- **Teleport**: movimento especial pra qualquer sala CONECTADA à atual, sem gastar
  Boots, sem lutar monstro no caminho, e ignora cadeado/mão-única. Ainda assim, se você
  entrar numa Caverna de Cristal (mesmo por Teleporte), fica travado sem Boots o resto
  do turno.
- **Trash**: remove a carta escolhida do baralho PERMANENTEMENTE (volta pra caixa no
  fim do turno) — diferente de descartar.

## Field Reference Guide — Segredos e itens de Mercado (texto exato)

### Segredos Maiores (Major Secrets)
| Nome | Efeito |
|---|---|
| Potion of Greater Healing | Use no seu turno: cura 2 de dano (guarda até usar, depois volta pra caixa) |
| Greater Skill Boost | Ganha 5 Skill imediatamente, token volta pra caixa |
| Greater Treasure | Vale 5 Ouro; pode guardar até o fim do jogo ou gastar normalmente |
| Flash of Brilliance | Compra 3 cartas imediatamente, token volta pra caixa |
| Chalice | Guarda o token — vale 7 pontos no fim do jogo (NÃO é um Artefato) |

### Segredos Menores (Minor Secrets)
| Nome | Efeito |
|---|---|
| Potion of Healing | Use no seu turno: cura 1 de dano |
| Potion of Swiftness | Use no seu turno: ganha 1 Boot |
| Potion of Strength | Use no seu turno: ganha 2 Swords |
| Skill Boost | Ganha 2 Skill imediatamente, token volta pra caixa |
| Treasure | Vale 2 Ouro; pode guardar ou gastar normalmente |
| Magic Spring | No fim deste turno, elimina (trash) uma carta do descarte ou área de jogo |
| Dragon Egg | Guarda o token, vale 3 pontos; avança a Trilha de Fúria em 1 espaço |

### Itens de Mercado (custo fixo 7 Ouro cada)
| Nome | Efeito |
|---|---|
| Master Key | Permite usar túneis com cadeado (também vale 5 pontos no fim do jogo) |
| Backpack | Permite carregar um Artefato adicional (também vale 5 pontos no fim do jogo) |
| Crown | Vale os pontos mostrados (10/9/8) — cada jogador leva a mais valiosa disponível |

## Exemplos de carta citados no manual (texto exato, com efeito)

- **Stumble** — Efeito: +1 Clank!
- **Move Silently** — Efeito: Boots+2, -2 Clank! | "Silence is golden."
- **Mercenary** (Companheiro) — Efeito: Skill+1, Swords+2 | "I could help you out. But what's in it for me?" | Custo 2
- **Burgle** — Efeito: Skill+1
- **Orc Grunt** (Monstro) — DERROTA: $3 | "With their constant raids, the Orcs aim to squash the rebellion." | Custo 2 Swords
- **Kobold Merchant** (Companheiro) — Efeito: Skill+1 | "If you have an artifact, +$2" | Custo 3
- **Rebel Scout** (citado no glossário) — "If you have another companion in your play area, draw a card."
- **The Mountain King** (citado no glossário) — "If you have a crown, +1 Sword and +1 Boot."
- **Sleight of Hand** (citado no glossário) — "Discard a card to draw two cards." (bate com nossa "Prestidigitação")

*(Nota: "Orc Grunt" do manual tem o mesmíssimo texto de derrota "$3" e a mesma frase
de flavor que capturamos como "Soldado Orc" no Steam — confirma que são a MESMA carta,
só nome em PT diferente. Atualiza a entrada em `cartas-capturadas.md`.)*
