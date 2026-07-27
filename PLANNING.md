# ClankWebGame — Plano de Projeto

Versão web do jogo de tabuleiro **Clank!** (Renegade Game Studios / Paul Dennen) para jogar com amigos remotamente, em tempo real, pelo navegador. Regras/mecânica seguem o Clank! básico; o **conteúdo de cartas** (nomes, custos, efeitos) vem do **Clank! Catacombs** — jogo "irmão" standalone com o mesmo motor — desde 2026-07-21, ver seção 0.

> ⚠️ **Nota de propriedade intelectual:** Clank! é uma marca e obra registrada da Renegade Game Studios. Este plano assume um projeto **pessoal, não-comercial, fechado (jogar só com amigos)** — sem monetização, sem distribuição pública, sem usar a arte oficial do jogo (produzir arte própria ou placeholders). Se algum dia quiser publicar/divulgar o projeto, será necessário trocar para um "reskin" com nome e tema próprios para evitar problemas de licenciamento.

---

## 0. Status atual (atualizado em 2026-07-21)

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
- **Tabuleiro ajustado com uma foto real do tabuleiro oficial (2026-07-20).** Confirmou vários mecanismos que eu tinha estimado (pegada = 2 Boots, caveira = 1 Sword ou 1 dano, cadeado = precisa da Chave-mestra, Mercado = 7 Gold). O layout de salas continua sendo meu (não uma cópia sala-por-sala do tabuleiro físico).
- **Consegui e li o manual oficial em PDF na íntegra (12 páginas, via `Read` multimodal) — corrigiu vários erros meus (2026-07-21):**
  - Baralho inicial: os nomes reais são **"Cautious Advance"** e **"Skillful Move"** (eu tinha "Sidestep"/"Scramble", de fonte secundária errada — os efeitos numéricos já estavam certos).
  - Dungeon Row: **6 cartas visíveis**, não 5 (confirmado: "deal six cards").
  - **Trilha de Fúria avança SEMPRE +1 por artefato pego**, independente do valor — a escala em camadas (+1/+2/+3 por tamanho) que eu tinha implementado a partir de uma foto **estava errada**, revertida.
  - **Trilha de Contagem Regressiva redesenhada do zero** pra regra real: só o **primeiro** jogador a sair da masmorra ou ser nocauteado anda nela — e anda nos **próprios turnos seguintes** (em vez de jogar normalmente), não a cada ataque do dragão. Casas 2/3/4 disparam um ataque instantâneo do dragão com +1/+2/+3 cubos extras; casa 5 nocauteia na hora todo mundo que ainda está dentro.
  - Valores de artefato: o manual dá dois exemplos exatos (**7** e **25**) — usados agora em `depths-west` (7) e `sealed-vault` (25); `depths-east` (15) continua estimativa (zona intermediária).
  - Carta **"Move Silently"** adicionada 100% verificada (3 skill → 2 boots, -2 Clank), com exemplo de jogo completo no manual.
  - Referência completa de **Major/Minor Secrets** (tokens de sala) transcrita em `cards.ts` — ainda não implementados no motor (tabuleiro não modela tokens de sala).
  - 59 testes unitários passando depois das correções; typecheck limpo em `engine`/`server`/`client`.
- **Tabuleiro renderizado como mapa SVG (item 7) — implementado (2026-07-21).** `client/src/game/BoardMap.tsx`: grafo de salas/túneis desenhado com cores por tipo de sala, ícones de túnel (monstro+custo, pegada, cadeado, mão-única tracejado), círculos de artefato com o valor, e tokens de jogador na sala atual; clicar numa sala alcançável move o jogador (mesma ação do botão "Ir"). Testado manualmente rodando client+server localmente. **Ainda não é uma cópia do layout físico** — mesma limitação do grafo em si (ver acima).
- **PIVOT pro Clank! Catacombs pro conteúdo de cartas (itens 5 e 6 resolvidos, 2026-07-21).** Bati numa parede real tentando achar dados completos de carta do Clank! básico (BGG bloqueia scraping/exige login, Scribd exige login) — documentado e reportado a você. Você foi no BGG, achou e me passou uma planilha comunitária completa (`Clank!_Catacombs_Card_List.xlsx`) — só que do **Clank! Catacombs**, o jogo "irmão" standalone (mesmo motor: Skill/Swords/Boots, Saco do Dragão, Trilha de Fúria, símbolo de "Dragon Attack" — só muda o tema, masmorra de anões em vez de covil de dragão, e o roster de cartas). Perguntei se você queria caçar o equivalente do jogo básico ou usar os dados do Catacombs — você escolheu **usar o Catacombs**. Resultado:
  - Reescrevi `engine/src/cards.ts` inteiro com as **79 cartas reais do Catacombs** (nome, custo, Skill/Swords/Boots diretos, VP, símbolo de Dragon Attack, quantidade — 100% conferidos contra a planilha). O texto oficial completo de cada carta fica num comentário `// Texto oficial (...)` acima da definição — nada foi perdido.
  - Efeitos mecânicos (`playEffects`/`acquireEffects`) foram preenchidos com um parser conservador que só assume cláusulas de recurso simples e SEM condicional/escolha (ex: "+1 Clank!", "$2", "Draw a card.") — qualquer coisa com "if/may/choose/-or-/each other/lockpick/prisoner/tile/etc." fica só no texto, não é executada. Isso significa: toda carta faz PELO MENOS seu efeito numérico direto (Skill/Swords/Boots/VP), mas bônus condicionais/temáticos do Catacombs (lockpicks, prisioneiros, ladrilhos, Wayshrines, fantasmas, ídolo de macaco) **não estão implementados** — o motor não modela esses conceitos ainda.
  - **Corrigi um bug real no caminho:** Devices agora vão pro descarte da MASMORRA ao serem adquiridos, não pro baralho do jogador (regra oficial: "do not become part of your deck") — antes disso `acquireCard` tratava Device igual a item normal.
  - **Também descobri e reverti outro erro meu**: os nomes reais das cartas iniciais são **"Sidestep"/"Scramble"** (não "Cautious Advance"/"Skillful Move" como eu tinha "corrigido" ontem lendo o PDF do manual — aparentemente li errado; a planilha do Catacombs E a lista oficial do BGG concordam em "Sidestep"/"Scramble", então confiei nas duas fontes independentes em vez da minha própria leitura do PDF).
  - Reserva (Mercenary/Explore/Secret Tome/Goblin) também ganhou números reais do Catacombs (custos mudaram: Mercenary 2✦→2 skill+2 swords ao jogar, Explore 3✦, Secret Tome 7✦/7pts, Goblin 2⚔).
  - 60 testes unitários passando; testado manualmente rodando client+server localmente (Dungeon Row mostra cartas reais como "The Warden", "Skulker", "Skeleton" etc., custos batendo, Reserva com números certos).
  - `DUNGEON_DECK_CATALOG_REFERENCE` (nomes do jogo básico) e `MAJOR_SECRETS_REFERENCE`/`MINOR_SECRETS_REFERENCE` (Secrets do jogo básico) ficaram marcados como legado no arquivo — não usados, só referência caso o projeto volte pro jogo básico algum dia.

**Próximos passos (em ordem de prioridade — ver conversa; reordenado em 2026-07-21 pra priorizar completar o JOGO antes do deploy real):**
1. ~~Fim de jogo~~ ✅
2. ~~Mercado de ouro~~ ✅
3. ~~Túneis com cadeado e mão única~~ ✅
4. ~~Confirmar quais cartas reais têm o símbolo de ataque do dragão~~ ✅ (dados do Catacombs)
5. ~~Ir preenchendo custo/efeito real de mais cartas~~ ✅ (dados do Catacombs — efeitos condicionais/temáticos específicos do Catacombs ainda não implementados, ver item 8)
6. ~~Renderizar o tabuleiro visualmente (SVG do grafo de salas)~~ ✅
7. ~~`board.ts` re-temado pro Catacombs~~ ✅ (2026-07-21) — nomes de sala trocados pelos termos reais confirmados no texto das cartas (Entrada da Masmorra, Corredor de Pedra, Posto dos Esqueletos, Wayshrine Esquecido, Encruzilhada das Criptas, Túnel dos Prisioneiros, Caverna de Cristal, Câmara Selada). Só cosmético (você escolheu essa opção) — os `id`s internos e a arquitetura de grafo fixo não mudaram; o Catacombs de verdade usa um tabuleiro modular de ladrilhos (ver cartas Dusty Map/Marble Guardian/Sudden Movement/Animated Wall), que continua não implementado.
8. ~~Regra "só carrega 1 Artefato por vez (2 com a Mochila)"~~ ✅ (2026-07-21) — `PlayerState.artifactsCarried` novo; `takeArtifact` agora barra pegar um artefato a mais no limite (1, ou 2 com a Mochila). Continua banking os pontos na hora do jeito que já funcionava — não modelei "largar" um artefato ao ser nocauteado, isso não é regra confirmada.
9. ~~Bônus de 20 pontos por "Mastery"~~ ✅ (2026-07-21) — reconfirmei a regra exata via UltraBoardGames: *"If you make it all the way back [à Entrada] before being knocked out, you will receive a Mastery token worth an additional 20 points."* `computeFinalScores` agora soma +20 pra quem tem `hasLeftDungeon && artifactsCarried > 0`.
10. Mecânicas específicas do Catacombs — **parcial** (2026-07-21, bloqueado em parte pelo item 15). Você confirmou (por memória de ter jogado) que a sua versão **não tinha prisioneiros/fantasmas** — as cartas que citam isso (Diversion, Riot, The Warden, White/Black Tourmaline) ficam sem esse bônus condicional aplicado, de propósito. Mas tinha "cabines da masmorra" (ainda não sei a que se refere — não modelado), Caverna de Cristal e Ídolos de Macaco:
    - ~~Caverna de Cristal~~ ✅ — `RoomDefinition.isCrystalCave` adicionado; "Lie in Wait" agora dá -2 Clank extra quando jogada lá (`applyRoomConditionalEffects` em game.ts).
    - Ídolo de Macaco — **bloqueado**: "Boots of the Ape Lord" e "Thirst for Adventure" citam "se você tiver um Ídolo de Macaco", mas eu não sei ONDE/COMO um jogador consegue um na sua versão (token de sala? carta de Reserva? Secret?). Preciso dessa informação antes de implementar — do contrário a checagem "se você tiver" nunca seria verdadeira (nada concede o idolo).
    - Lockpicks, Wayshrines, "major secret" — ainda não confirmados nem implementados (você não mencionou se tinha esses na sua versão).
11. ~~Confirmar os valores reais de artefato do Clank! Catacombs~~ ✅ (2026-07-21) — você mandou foto dos tokens físicos de artefato: a escala real tem 7 valores (5, 7, 10, 15, 20, 25, 30). Os três já usados em `board.ts` (7/15/25) já batiam com essa escala.
12. ~~Cor/avatar por jogador~~ ✅ (2026-07-21) — sem arte oficial: avatar é um círculo colorido com a inicial do nome (`Avatar` em App.tsx). Paleta fixa de 6 cores (`client/src/game/playerColors.ts`); cada jogador recebe uma por padrão (por ordem de entrada) e pode trocar na Lobby (`set_color`, só antes da partida começar). Usado no mapa SVG, listas de jogadores e tela de fim de jogo.
13. ~~Retestar mobile~~ ✅ (2026-07-21) — testado em viewport 375×812 (Home, Lobby com seletor de cor, tela de jogo com mapa SVG, reconexão). Sem overflow horizontal em nenhuma tela. Achei e corrigi um problema real: os botões de ação compactos (Ir, Jogar, Lutar/Comprar) tinham só 28px de altura — aumentados pra 36px (`py-1.5` → `py-2.5`), mais perto do mínimo recomendado de toque em mobile.
14. ~~Reconexão robusta~~ ✅ (2026-07-21) — usa o suporte nativo do Colyseus (`allowReconnection`, 2 min de carência) + token de reconexão persistido no `localStorage` do cliente (tenta reconectar sozinho ao recarregar a página ou após queda de conexão; token é limpo ao clicar em "Sair" de propósito). Testado de ponta a ponta: recarreguei a página no meio de uma partida e o jogador voltou pro mesmo assento, com a MESMA mão (achei e corrigi um bug real no caminho: a mão não era reenviada na reconexão, já que é dado privado fora do schema sincronizado) e conseguiu continuar jogando normalmente. **Limitação conhecida:** se alguém ficar desconectado além dos 2 minutos durante o próprio turno, o jogo trava esperando a vez dele — não implementei um "pular turno de quem sumiu", isso é uma funcionalidade separada (forfeit/timeout de turno), fora do escopo de "reconectar direito".
15. **[QUASE COMPLETO] Levantar cartas/regras do Clank! base e reverter `engine/src/cards.ts`/`board.ts`.** (Atualizado 2026-07-24) O que começou como automação de tela no Steam (cara em tokens) foi substituído por fontes bem mais baratas: manual oficial em PDF, fotos de cartas físicas no BoardGameGeek, e principalmente **uma planilha própria que o usuário montou cruzando fotos oficiais das cartas** — fonte primária hoje. Ver [`research/clank-steam/README.md`](./research/clank-steam/README.md) e [`planilha-usuario.csv`](./research/clank-steam/planilha-usuario.csv).
    - Resolvido: mistério dos Ídolos de Macaco (3 tokens — Macaco Surdo/Cego/Mudo, 5 pontos cada), nomes dos 7 Artefatos (Anel=5, Cruz=7, Vaso=10, Banana=15, Escudo=20, Armadura=25, Orbe=30).
    - ~~As 7 mecânicas que o motor não modelava~~ ✅ (2026-07-24) — cura, PERIGO/Danger, efeito de chegada/ARRIVE, ruído das Gemas, restrição de localização "Deep"/Crystal Cave, nomes de Artefato, Ídolos de Macaco. Ver detalhes no README da pesquisa.
    - ~~Reescrever `cards.ts`/`board.ts` com os dados reais~~ ✅ (2026-07-24) — `cards.ts` inteiro reescrito (baralho inicial, Reserva, ~55 tipos de carta da Dungeon Row, cada um com o texto oficial completo em comentário, inclusive o que não dá pra modelar ainda — escolhas "-OU-", condicionais a artefato/coroa/companheiro/ídolo, teleporte, "trash" específico, bônus escalável). `board.ts` teve os nomes de sala trocados do tema Catacombs pro genérico. Suite de testes toda atualizada — 75 testes passando.
    - Uma discrepância pendente de confirmar: custo de "Tattle/Fofoca" (Steam ao vivo disse 2, a planilha/foto física diz 3 + Skill+2) — usei o valor da planilha, ver nota no README da pesquisa.
    - ~~`board.ts` continua sendo um grafo pequeno e fixo~~ **EXPANDIDO** (2026-07-24) — o usuário mandou foto de cima do lado "Castelo" do tabuleiro físico. Adicionei (aditivamente, sem quebrar nada que já existia) mais Cavernas de Cristal, mais 2 Artefatos (20/Escudo, 30/Orbe — total 5 dos 7 confirmados em sala), Fonte de Cura (mecânica real do manual, confirmada mas nunca implementada — cura 1 ao entrar), esgotamento de Boots ao entrar em Caverna de Cristal (idem, regra real nunca implementada), Mercado com 2 salas conectadas, e posição melhor do Santuário dos Macacos. Client (`BoardMap.tsx`) atualizado. Ainda não é 1:1 com o tabuleiro físico (ícones de monstro por túnel usam custo estimado; verso "Montículos e Covas" não fotografado; faltam os artefatos 5 e 10). Suite completa: 78 testes passando.
    - **Falta agora**: adicionar UI no client pra pegar Ídolo de Macaco (`take_monkey_idol` já existe no servidor, sala já aparece no mapa).
    - Achado de regra importante: existe mecânica de "PERIGO" (Danger) DIFERENTE do símbolo de "Dragon Attack" — Perigo é passivo ("enquanto a carta ficar na fileira, ataques do dragão compram +1 cubo extra"), Dragon Attack dispara ataque imediato ao ser revelada. Meu motor atual só modela o segundo.
    - Achado: existe mecânica de CURA (coração) em várias cartas — motor atual só modela dano subindo, nunca descendo.
    - Achado: cartas do tipo "Gema" têm efeito de "ADQUIRIR: +2 Clank!" (custo extra em barulho só ao comprar, separado do efeito de jogar).
    - Dois tabuleiros oficiais: "Castelo" e "Montículos e Covas".
    - **Técnica de compra de carta CONFIRMADA E FUNCIONANDO:** clicar e segurar (mouse down) na carta da fileira, arrastar BEM DEVAGAR com vários passos intermediários de movimento (não um arrasto instantâneo) até o avatar do jogador atual, soltar. Testado com sucesso comprando "Espada Cantante" (Skill caiu de 5 pra 0, carta saiu da fileira). Isso desbloqueia continuar a exploração de forma bem mais rápida daqui pra frente.
16. Deploy real (hospedagem) — pra jogar com os amigos pela internet de verdade. Preciso da sua decisão/conta em algum serviço (Railway/Fly.io/Render — agora só precisa de UM, já que front+back rodam juntos). Não crio conta em nada sozinho.

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

**Saco do dragão (não é um dado, mas é sorteio aleatório):** todo Clank! (barulho) que os jogadores geram fica na "Área de Clank"; quando um ataque do dragão é acionado, todos esses cubos vão pro saco e sorteia-se uma quantidade de cubos **igual à posição atual na Trilha de Fúria menos 1**. A Trilha de Fúria avança **sempre +1 espaço** cada vez que um artefato é pego (não escala com o valor do artefato) ou quando um segredo "Dragon Egg" é revelado. Cubos pretos são neutros; cubos da cor de um jogador causam dano a esse jogador.

**Mercado:** custo fixo de 7 de ouro pra qualquer item (chave-mestra, mochila, coroas de 10/9/8 pontos, na ordem). Precisa estar numa sala de Mercado pra comprar.

**Fim de jogo:** termina quando todos os jogadores saem da masmorra ou são nocauteados. O **primeiro** jogador a sair ou ser nocauteado — só ele — entra na "Trilha de Contagem Regressiva": nos seus próprios turnos seguintes, em vez de jogar normalmente, ele anda uma casa na trilha. Casas 2/3/4 disparam um ataque instantâneo do dragão com +1/+2/+3 cubos extras (além do sorteio normal); a 5ª casa nocauteia instantaneamente todo mundo que ainda estiver dentro. Pontuação = valor dos artefatos + tokens coletados + ouro + valor das cartas no baralho. Nocauteado sem artefato (ou ainda nas Profundezas) = eliminado; com artefato = resgatado e pontua.

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
