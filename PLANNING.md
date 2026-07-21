# ClankWebGame — Plano de Projeto

Versão web do jogo de tabuleiro **Clank!** (Renegade Game Studios / Paul Dennen) para jogar com amigos remotamente, em tempo real, pelo navegador.

> ⚠️ **Nota de propriedade intelectual:** Clank! é uma marca e obra registrada da Renegade Game Studios. Este plano assume um projeto **pessoal, não-comercial, fechado (jogar só com amigos)** — sem monetização, sem distribuição pública, sem usar a arte oficial do jogo (produzir arte própria ou placeholders). Se algum dia quiser publicar/divulgar o projeto, será necessário trocar para um "reskin" com nome e tema próprios para evitar problemas de licenciamento.

---

## 0. Status atual (atualizado em 2026-07-20)

Referência de UX escolhida: [Uno Online (Blyster)](https://blyster.itch.io/uno-online) — HTML5, lobby por código, até 8 jogadores, também disponível como app Android. Confirma que **web-first + wrapper mobile depois** é o caminho certo (não precisa de engine de jogo dedicada).

**Decisões travadas:**
- Rede: **Colyseus** (não Firebase) — lógica de turnos e regras complexas de Clank! (mercado, dragão, combate) se encaixam melhor num servidor autoritativo com rooms do que em Firestore/Realtime DB.
- Renderização: **DOM + Tailwind + Framer Motion**, não Canvas/PixiJS — cartas de Clank! são pesadas em texto, e DOM dá texto nítido de graça em qualquer tamanho de tela (importante pra mobile) sem o custo de implementar um motor de renderização de canvas do zero.
- Mobile: **responsivo primeiro** (mesma base web funcionando bem no navegador do celular, como o Uno Online); empacotar como app (Capacitor) fica pra depois, só se fizer sentido publicar nas lojas.

**Feito:**
- Monorepo criado (`client/` React + TS + Vite + Tailwind v4 + Framer Motion, `server/` Colyseus + TS, **`engine/` TS puro**).
- `ClankRoom` funcional: criação de sala com código, entrada por código, lista de jogadores sincronizada em tempo real, log de eventos, toggle de "pronto" sincronizado entre clientes (placeholder de lobby — **não é mecânica do jogo**, só prova a sincronização em tempo real até o motor de regras estar plugado nele).
- Assets CC0 do Kenney integrados (peão, cartas, espada/escudo, caveira) — ver [CREDITS.md](./CREDITS.md). **Corrigido:** os ícones de dado foram removidos do projeto — Clank! não usa dados (ver seção 2).
- Testado localmente com 2 clientes simultâneos (2 abas do navegador) — sincronização em tempo real confirmada ponta a ponta.
- Testado em viewport mobile (375px) — sem overflow horizontal, alvos de toque grandes (botões `py-3`/`py-4`), respeita safe-area de notch (`env(safe-area-inset-top)`).
- **Motor de regras (`engine/`) — Marco 1 concluído:** baralho inicial (10 cartas), Dungeon Row de 5 posições com reposição, **Reserva separada** (pilhas fixas Goblin/Explore/Mercenary/Secret Tome, não embaralhadas — Goblin nunca esgota, as outras consomem a pilha até zerar), os 3 recursos reais do jogo (skill/swords/boots — sem dado), `playCard`, `acquireCard`, `acquireFromReserve`, `fightMonster` (paga swords → vai pro descarte da masmorra, não pro baralho do jogador — regra oficial), `endTurn` (descarta mão jogada, compra 5, zera recursos, passa a vez pulando nocauteados), reembaralhar descarte quando o monte de compra esvazia. 31 testes unitários (Vitest), todos passando.
- **Você conseguiu o "Clank! Card List" oficial do BoardGameGeek** (conta grátis) — confirmou a **composição exata do baralho de 100 cartas + 4 pilhas da Reserva** (todos os 68 nomes de carta únicos e quantas cópias de cada, em `engine/src/cards.ts` → `DUNGEON_DECK_CATALOG_REFERENCE`). Isso corrigiu um erro estrutural meu: Goblin/Explore/Mercenary/Secret Tome **não fazem parte** do baralho embaralhado — são a Reserva.
- **`engine/` plugado no `ClankRoom` — jogo jogável em rede de ponta a ponta.** Lobby (criar sala, pronto/não pronto) → "Começar partida" instancia o `GameEngine` de verdade → jogar carta, comprar da Dungeon Row/Reserva, lutar monstro, terminar turno, tudo via mensagens Colyseus. **Mãos são privadas** (cada cliente só recebe a própria mão por mensagem direcionada; o estado sincronizado publicamente só expõe contagem de cartas, recursos, Dungeon Row, Reserva e turno). Erros de regra (ex: skill insuficiente) viram mensagem pro jogador, sem derrubar a sala.
- **Testado com 2 clientes reais simultâneos, partida completa:** criar sala → pronto nos dois → começar → jogar 3 Burgle → comprar Explore da Reserva (15→14, skill gasto certo) → erro de skill insuficiente tratado corretamente → terminar turno → vez passa pro outro jogador → mão nova de 5 cartas. Tudo sincronizado em tempo real, mão do adversário nunca visível.
- Corrigido no caminho: bug real do Colyseus (`ArraySchema#splice()` não aceita inserir mais itens do que apaga — quebrava a sala inteira ao começar a partida) e `handleStartGame` agora tratado com try/catch pra nunca mais derrubar a sala.

> ⚠️ **Custo/efeito de cada carta ainda é placeholder — o PDF só tem nomes e quantidades, não o texto de cada carta.** Verificados de verdade: baralho inicial (100%) e o monstro **Orc Grunt** (2 swords → 3 gold). As outras 67 cartas do catálogo (Dragon Shrine, Shrine, Kobold, Watcher, Diamond, Ruby, Wizard, etc.) têm nome e quantidade reais mas nenhum efeito implementado ainda — ficam disponíveis em `DUNGEON_DECK_CATALOG_REFERENCE` como lista-mestra pra ir preenchendo aos poucos. `explore`, `mercenary`, `secret-tome`, `goblin`, `teleporter` continuam com efeito estimado (`verified: false`).

- **Tabuleiro (Marco 2) — implementado.** `engine/src/board.ts`: grafo de ~10 salas (entrada, mercado, 2 salas nas Profundezas com artefato), túneis com ícone de monstro (paga Swords ou leva dano) ou de pegada (2 Boots). ⚠️ **Layout ORIGINAL, não é o tabuleiro físico oficial** — não tenho como reproduzir a posição exata das salas sem fotos/scan do tabuleiro real; segue a mesma mecânica (confirmada) só com um traçado meu. `movePlayer` (gasta boots, resolve ícone de monstro) e `takeArtifact` (pega artefato da sala atual, ganha pontos, avança a Trilha de Fúria) implementados e testados.
- **Combate/dano (confirmado: trilha de vida = 10 espaços, enche = nocauteado)** — `movePlayer` aplica dano automaticamente quando não há swords pra pagar um túnel com monstro; `damagePlayer` marca nocaute ao encher a trilha.
- **Clank + saco do dragão (Marco 4) — implementado.** `triggerDragonAttack`: sorteia cubos (jogadores + cubos pretos neutros) em quantidade = posição na Trilha de Fúria menos 1 (confirmado: "5ª casa sorteia 4 cubos"); cubo de jogador = 1 dano + remove do Clank dele. Disparado automaticamente ao repor a Dungeon Row com uma carta que tenha o símbolo de ataque. ⚠️ **Não sei quais das 68 cartas reais têm esse símbolo** — uso uma estimativa (monstros + devices) só pra deixar o mecanismo testável; e a contagem de cubos pretos (24) também é estimada a partir da lista de componentes.
- Tudo isso testado com 2 clientes reais simultâneos: Brena jogou Sidestep, moveu de "Entrada da Mina" pra "Boca da Mina" gastando o boot certo, e a aba do Anderson viu a atualização (nova sala, novos túneis disponíveis) em tempo real.

- **Fim de jogo / Trilha de Contagem Regressiva — implementado.** `leaveDungeon` (só pela sala de Entrada, encerra o turno sozinho); a primeira saída começa a Trilha (5 casas — ⚠️ estimativa, só confirmei "5ª casa" como o fim); cada ataque do dragão depois disso avança a Trilha; no fim dela, todo mundo que ainda está dentro é nocauteado automaticamente. Partida termina quando todos saíram ou foram nocauteados; pontuação final = artefatos/coroas + Gold + valor das cartas no baralho (regra oficial: nocauteado sem nenhum artefato/coroa pontua 0 — "eliminado"; com artefato pontua normal — "resgatado").
- **Mercado de Gold — implementado.** `buyMarketItem`: Chave-mestra, Mochila e Coroas (10/9/8 pontos, na ordem — tudo confirmado), 7 Gold cada, só numa sala de Mercado. **Corrigido um bug real no caminho:** Gold estava dentro dos recursos por turno (`Resources`) e sendo zerado a cada `endTurn` — Gold é moeda persistente, não recurso de turno; movido pra um campo próprio em `PlayerState`.
- **Túneis com cadeado e de mão única — implementados.** Nova sala "Cofre Selado" (15 pontos de artefato) só acessível com a Chave-mestra; um "escorregador" de fuga de lá direto pra Entrada que só funciona nesse sentido.
- **Testado com 2 clientes reais, partida completa do início ao fim:** os dois jogadores saem pela Entrada assim que a partida começa (turno 1) → primeira saída dispara a Trilha de Contagem Regressiva (visível em tempo real nas duas abas, "1/5") → segunda saída termina a partida → tela de resultado aparece nas duas abas simultaneamente com ranking e vencedor. **Corrigido no caminho:** o mesmo bug do `ArraySchema#splice()` de antes, dessa vez na sincronização das coroas do Mercado.
- 58 testes unitários no motor (Vitest), todos passando — 12 novos cobrindo túneis com cadeado/mão única, Mercado, `leaveDungeon` e fim de jogo (incluindo a Trilha de Contagem Regressiva forçando nocaute em quem ficou pra trás).
- **Modo combinado (um processo só) — implementado.** O `server/` agora serve o `client/dist` (se existir) no mesmo processo Express/Colyseus — `npm run build:client && npm start` sobe front + back juntos numa porta só (`http://localhost:2567`). Testado de ponta a ponta (criar sala funcionou pela mesma porta que serve o HTML). Simplifica o deploy de amanhã: só precisa de **um** serviço de hospedagem, não dois. Corrigido no caminho: `server/package.json` tinha um `start` quebrado (`node dist/index.js` — o `@clank/engine` é consumido como TS puro via workspace, `node` puro não roda TS; trocado pra `tsx src/index.ts`, igual o `dev`).
- **Tabuleiro corrigido com uma foto real do tabuleiro oficial.** Você mandou fotos do tabuleiro físico do Clank! — confirmou vários mecanismos que eu tinha estimado (pegada = 2 Boots, caveira = 1 Sword ou 1 dano, cadeado = precisa da Chave-mestra, Mercado = 7 Gold) e corrigiu os **valores de artefato**, que agora são os reais (5/10/15/20/25/30 — troquei os 3 valores inventados que eu tinha pelos reais: `depths-west`=5, `depths-east`=15, `sealed-vault`=30). Também revelou que a **Trilha de Fúria avança mais quanto maior o artefato** (não é +1 fixo) — implementei em camadas (5-10→+1, 15-20→+2, 25-30→+3), minha melhor leitura da foto, ainda não é a escala exata confirmada. O layout de salas continua sendo meu (não uma cópia sala-por-sala — isso exigiria mapear cada conexão da foto uma por uma, risco alto de erro), mas agora as regras/números batem com o jogo real.

**Próximos passos (em ordem de prioridade — ver conversa):**
1. ~~Fim de jogo~~ ✅
2. ~~Mercado de ouro~~ ✅
3. ~~Túneis com cadeado e mão única~~ ✅
4. **Deploy real (hospedagem)** — pra jogar com os amigos pela internet de verdade. Preciso da sua decisão/conta em algum serviço (Railway/Fly.io/Render — agora só precisa de UM, já que front+back rodam juntos). Não crio conta em nada sozinho.
5. Confirmar quais cartas reais têm o símbolo de ataque do dragão.
6. Ir preenchendo custo/efeito real de mais cartas do `DUNGEON_DECK_CATALOG_REFERENCE`.
7. Renderizar o tabuleiro visualmente (SVG do grafo de salas, hoje é lista de botões) — agora com uma foto de referência real, isso fica bem mais fácil de fazer parecido com o jogo de verdade.
8. Cor/avatar por jogador.
9. Retestar mobile (não testado desde que tabuleiro/combate/mercado foram adicionados).
10. Reconexão robusta (fora do MVP original).

---

## 1. Objetivo

Recriar a experiência central de Clank! — deck-building + exploração de masmorra compartilhada + fuga do dragão — como um jogo web multiplayer em tempo real, para 2 a 4 jogadores, jogável por link (sem necessidade de instalar nada).

## 2. Regras oficiais (verificadas em fonte — não são suposição)

Fonte: [rulebook oficial](https://cdn.1j1ju.com/medias/dc/cc/ae-clank-a-deck-building-adventure-rulebook.pdf) e [resumo do UltraBoardGames](https://www.ultraboardgames.com/clank/game-rules.php). **Importante: Clank! não usa dados em nenhum momento.**

**Estrutura de turno (cada jogador, na sua vez):**
1. Joga as 5 cartas da mão, na ordem que quiser.
2. Gasta os recursos gerados (em qualquer combinação/ordem):
   - **Skill** → compra cartas do Mercado (Dungeon Row) ou da Reserva pro seu baralho.
   - **Swords** → luta contra monstros do Mercado/Reserva (em vez de comprá-los com Skill).
   - **Boots** → move o peão pelos túneis do tabuleiro, 1 boot por túnel (túneis com ícone de pegada custam 2; túneis com cadeado exigem chave-mestra; túneis com seta são de mão única).
3. Descarta a mão jogada e compra 5 cartas novas.
4. Repõe o Mercado; se algum símbolo de "ataque do dragão" aparecer nas cartas repostas, executa um ataque do dragão.

**Recursos não gastos no turno são perdidos** (não acumulam pro próximo turno).

**Saco do dragão (não é um dado, mas é sorteio aleatório):** todo Clank! (barulho) que os jogadores geram fica na "Área de Clank"; quando um ataque do dragão é acionado, todos esses cubos vão pro saco e sorteia-se uma quantidade de cubos **igual à posição atual na Trilha de Fúria** (não é fixo — sobe conforme artefatos são pegos ou segredos de "ovo de dragão" são revelados). Cubos pretos são neutros; cubos da cor de um jogador causam dano a esse jogador.

**Mercado:** custo fixo de 7 de ouro pra qualquer item (chave-mestra, mochila, coroas de 8-10 pontos). Precisa estar numa sala de Mercado pra comprar.

**Fim de jogo:** termina quando todos os jogadores saem da masmorra ou são nocauteados. Quem sai entra numa "Trilha de Contagem Regressiva" com ataques do dragão crescentes; na 5ª casa, o dragão nocauteia instantaneamente quem ainda estiver dentro. Pontuação = valor dos artefatos + tokens coletados + ouro + valor das cartas no baralho. Nocauteado sem artefato (ou ainda nas Profundezas) = eliminado; com artefato = resgatado e pontua.

## 3. Escopo do MVP

**Incluir no MVP:**
- Tabuleiro compartilhado (mina/masmorra) com salas conectadas por túneis coloridos/direcionais
- Deck-building: baralho inicial de 10 cartas, Dungeon Row (mercado) com reposição, mão de 5 cartas por turno
- Os 3 recursos reais do jogo — Skill (comprar), Swords (lutar), Boots (mover) — gerados pelas cartas jogadas, sem nenhum dado
- Combate contra monstros do Mercado/Reserva pagando Swords
- Coleta de artefatos/tokens nas Profundezas
- Saco do dragão com sorteio de cubos (quantidade = Trilha de Fúria) quando um ataque é acionado
- Trilha de Contagem Regressiva pro fim de jogo
- Sala de espera (lobby) com link de convite, até 4 jogadores

**Fora do MVP (fase 2+):**
- Expansões (Sunken Treasures, Catacombs, In Space!, Legacy)
- Modo solo / bots
- Chat de voz integrado (usar Discord externo no MVP)
- Ranking/temporadas
- Reconexão robusta após queda de internet

## 4. Stack técnica sugerida

- **Frontend:** React + TypeScript + Vite. Tabuleiro renderizado em SVG/Canvas (não precisa de engine de jogo pesada — é um jogo de tabuleiro, não de ação).
- **Estado do jogo / lógica de regras:** motor de jogo isolado em TypeScript puro (sem dependência de UI), testável unitariamente — importante porque as regras de Clank! têm bastante detalhe (mercado, dano, dragão, artefatos especiais).
- **Sincronização em tempo real:** WebSocket via **Colyseus** (framework de salas/estado autoritativo para jogos multiplayer) ou, alternativa mais simples, **Firebase Realtime Database/Firestore** (você já tem experiência de Firebase pelo BiblioUnifor) para sincronizar estado de sala + turnos.
- **Servidor autoritativo:** toda lógica de regras roda no servidor (evita trapaça e dessincronização); o cliente só renderiza estado e envia intenções ("comprar carta X", "mover para sala Y").
- **Hospedagem:** frontend estático (Vercel/Netlify) + backend Node (Railway/Fly.io) se usar Colyseus, ou 100% serverless se usar Firebase.

## 5. Modelagem de dados (visão geral)

- `Game`: id, status (lobby/em andamento/finalizado), jogadores, dragão (posição na Trilha de Fúria, cubos na Área de Clank vs. no Saco), Dungeon Row (mercado + reserva), pilha de masmorra, Trilha de Contagem Regressiva, turno atual.
- `Player`: id, nome, mão (5 cartas), baralho de compra, descarte, pawn no tabuleiro (sala atual), pontos de vida/dano, artefatos e tokens carregados, ouro, e os 3 recursos do turno atual — **skill, swords, boots** (sem dado nenhum).
- `Card`: id, tipo (habilidade/item/evento/monstro cortesia), custo (skill ou swords), efeitos ao jogar (boots, swords, skill, ouro, chaves, cubos de Clank gerados).
- `Board`: grafo de salas ligadas por túneis (cor/tipo: normal, pegada-dupla, cadeado, mão-única), localização de monstros/artefatos/segredos, salas de Mercado, entrada e Profundezas.

## 6. Marcos sugeridos

1. **Semana 1-2:** motor de regras em TS (deck-building genérico + cartas base de Clank!, recursos skill/swords/boots) com testes unitários, sem UI.
2. **Semana 3-4:** tabuleiro estático + renderização de mão/Dungeon Row, jogo local (hot-seat, sem rede).
3. **Semana 5-6:** camada de rede (lobby, sync de estado, turnos) — jogo jogável entre 2 abas/máquinas.
4. **Semana 7:** saco do dragão + ataques + Trilha de Contagem Regressiva.
5. **Semana 8:** polimento de UI, som, playtest com os amigos, ajustes de regra.

## 7. Riscos / decisões em aberto

- **Reprodução exata das cartas do jogo original** exige transcrever texto e efeitos de dezenas de cartas — trabalho manual considerável; considerar começar com um subconjunto (ex: baralho básico + mercado reduzido) e expandir depois.
- **Framework de rede:** Colyseus dá mais controle mas exige manter um servidor rodando; Firebase é mais rápido de prototipar mas menos ideal para lógica de turnos complexa (mitigar com Cloud Functions para validar jogadas).
- **Arte:** usar ícones/placeholders neutros (não escanear/copiar arte oficial) para manter o projeto seguro para uso privado.
