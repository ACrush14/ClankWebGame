# Pesquisa: Clank! A Deck-Building Adventure (Steam/físico) → ClankWebGame

Esta pasta reúne tudo que foi levantado sobre o **Clank! A Deck-Building Adventure**
oficial (versão base, sem expansões), com o objetivo de corrigir/completar
`engine/src/cards.ts` e `engine/src/board.ts` do ClankWebGame — que hoje ainda têm
conteúdo temporário baseado na expansão **Catacombs** (usada por engano numa sessão
anterior, antes de perceber que a versão de referência é a base).

## ⭐ Status: catálogo de cartas essencialmente COMPLETO

Depois de várias etapas (automação no Steam, manual oficial em PDF, fotos de cartas
físicas no BGG), o usuário fechou o trabalho montando **uma planilha própria com o
catálogo quase completo do jogo base**, cruzando fotos reais das cartas físicas. Ver
[`planilha-usuario.csv`](./planilha-usuario.csv) — é a fonte mais completa e confiável
que temos agora, e deve ser tratada como **fonte primária** para a eventual reversão do
motor pro conteúdo base.

**Arquivos desta pasta:**
- [`README.md`](./README.md) — este arquivo. Visão geral e status.
- [`planilha-usuario.csv`](./planilha-usuario.csv) — **fonte primária.** Catálogo
  quase completo (baralho inicial, Reserva, Dungeon Deck inteiro, Artefatos com nome,
  Ídolos de Macaco, Segredos Maiores/Menores, itens de Mercado, Mastery), com
  quantidade, custo, efeito (Mana=Skill gerado, Bota=Boots gerado, Ataque=Swords
  gerado/custo de monstro, Clank, Pontos=VP, Moedas=Gold), nota de texto e link da foto
  oficial da carta. Ver seção "Como ler a planilha" abaixo.
- [`cartas-capturadas.md`](./cartas-capturadas.md) — dados capturados manualmente
  antes da planilha (Steam + fotos BGG avulsas), com anotações extras de mecânica
  (Danger vs Dragon Attack, túneis com dano, etc.) que a planilha não detalha.
- [`catalogo-nomes-quantidades.md`](./catalogo-nomes-quantidades.md) — catálogo de
  nomes+quantidades (parcialmente superado pela planilha, mas mantido por causa das
  anotações de progresso incremental).
- [`regras-oficiais-rulebook.md`](./regras-oficiais-rulebook.md) — regras extraídas do
  manual oficial em PDF (Segredos, Mercado, glossário de termos, Countdown Track).
- [`COMO-JOGAR.md`](./COMO-JOGAR.md) — guia operacional de automação de tela (só
  necessário se for preciso voltar a jogar o Steam pra confirmar algo pontual).

## Como ler a planilha (`planilha-usuario.csv`)

Colunas: `Nome Ingles, Nome Portugues, Quantidade, Tipo, Custo, Mana, Bota, Ataque,
Clank, Pontos, Moedas, Nota, Imagem`.

- **Custo**: custo em Skill pra adquirir (Devices e cartas amarelas/azuis). Pra
  monstros (Tipo="Carta Vermelha Monstro"), esse campo é 0 e o custo real em Swords
  está na coluna **Ataque**.
- **Mana / Bota / Ataque / Clank / Moedas**: recursos gerados ao JOGAR a carta (Skill /
  Boots / Swords / Clank! / Gold respectivamente) — exceto pra monstros, onde Ataque =
  custo em Swords pra derrotar, e os outros números (Moedas/Clank) geralmente
  representam a recompensa de derrota (ver coluna Nota pra confirmar o texto exato).
- **Pontos**: VP impresso na carta (pontos no fim de jogo).
- **Nota**: texto/efeito condicional em português, geralmente mais completo/confiável
  que os números nas colunas (ex: recompensas de derrota de monstro).
- **Imagem**: link direto pra foto oficial da carta física (útil pra conferir algo
  visualmente sem reabrir o Steam).
- Linhas de **Artefato** (Ring/Banana/Shield/Armor/Vase/Orb/Cross): resolvem os nomes
  dos 7 artefatos da escala 5/7/10/15/20/25/30 — confirmado: Anel=5, Cruz=7, Vaso=10,
  Banana=15, Escudo=20, Armadura=25, Orbe=30.
- Linhas de **Idolo do macaco**: resolvem o mistério dos Ídolos de Macaco — 3 tipos
  (Macaco Surdo/Cego/Mudo), 1 de cada, cada um vale 5 pontos.
- Linhas de **Bonus Grande/Bonus Pequeno**: são os Segredos Maiores/Menores do manual
  oficial, já traduzidos e com quantidades reais.

## ✅ Discrepância da Tattle — RESOLVIDA (2026-07-24)

O usuário mandou foto nítida da carta física: **Custo 2, VP 3, sem Skill incondicional**
— a planilha estava errada (tinha Custo 3 + Skill+2, provável cruzamento com outra
linha). Corrigido em `cards.ts` e confirmado ao vivo no client (comprada com sucesso por
2 Skill, sem crash).

## Por que essa pesquisa existe

O motor (`engine/src/`) foi inicialmente escrito com dados da expansão Catacombs (que
tem planilha pública completa). Depois de comparar com a memória do usuário sobre o jogo
físico que ele tem em casa — sem prisioneiros/fantasmas, mas com Cavernas de Cristal e
Ídolos de Macaco — ficou claro que a referência certa é o jogo **base**.

## Mecânicas — status (2026-07-24: as 7 pendentes foram implementadas no motor)

1. ✅ **Cura (heal)** — `CardEffects.heal` reduz `damage` (nunca abaixo de 0). Aplicado
   em `applyEffects`. Card de teste: `skeleton-priest` (DEFEAT: ♥, +1 Clank!).
2. ✅ **PERIGO (Danger) ≠ Dragon Attack symbol** — `CardDefinition.isDanger`; cada carta
   com Danger na Dungeon Row soma +1 cubo em TODO ataque (`countDangerCards` em
   `game.ts`), diferente de `triggersDragonAttack` (disparo único ao revelar). Card de
   teste: `the-warden`.
3. ✅ **Efeito de "chegada"/ARRIVE** — `CardDefinition.arriveEffects`, aplicado a TODOS
   os jogadores em `refillDungeonSlot`, ANTES de qualquer Dragon Attack disparado pela
   mesma reposição (ordem confirmada no manual). Cards de teste: `skeleton-priest`,
   `archoverlord`. ⚠️ Exceção documentada: o "devolva 3 cubos à bolsa" do Shrine/
   Thieves' Shrine não foi modelado — o motor não mantém um pool persistente de cubos
   entre ataques (sorteia direto da contagem de Clank! + uma constante de cubos
   pretos), então não há estado de onde "devolver" cubos reduziria ameaça futura.
4. ✅ **Gemas têm custo de ruído na aquisição** — já era suportado pelo campo genérico
   `acquireEffects.clank`, sem mudança de código necessária (só falta popular os dados
   reais das Gemas quando `cards.ts` for revertido pro jogo base).
5. ✅ **Marcadores de localização em monstros/devices** — `CardDefinition.requiresRoomFlag`
   ("isDepths" | "isCrystalCave"), checado em `acquireCard`/`fightMonster`/
   `acquireFromReserve` via `checkRoomRequirement`. Cards de teste: `crystal-kobold`
   (Crystal Cave), `the-warden` (Deep/Profundezas).
6. ✅ **Artefatos têm nome e não só valor** — `RoomDefinition.artifactName` +
   `ARTIFACT_NAMES_BY_VALUE` (tabela completa dos 7 valores) em `board.ts`. As 3 salas
   de artefato existentes já têm nome (Cruz=7, Banana=15, Armadura=25).
7. ✅ **Ídolos de Macaco** — nova sala `monkey-shrine` (posição no grafo provisória),
   `GameEngine.takeMonkeyIdol`, `PlayerState.monkeyIdolsHeld`, `MONKEY_IDOL_VALUE=5`.
   Mensagem `take_monkey_idol` já wireada no `ClankRoom.ts` (servidor) — **falta UI no
   client** pra chamar essa ação (fora do escopo deste round, é polish de interface).

Testes novos em `engine/test/game.test.ts` (12 casos) cobrindo as 6 mecânicas com
código (a #4 não precisou de teste novo, já era coberta pelos testes de Gema/acquire
existentes). Suite completa: 77 testes passando.

## `cards.ts`/`board.ts` — reversão pro jogo base concluída (2026-07-24)

- `engine/src/cards.ts` reescrito do zero: baralho inicial + Reserva (já estavam
  corretos) + ~55 tipos de carta da Dungeon Row com custo/efeito/VP/quantidade reais,
  usando a planilha como fonte primária. Cada carta guarda o texto oficial completo num
  comentário `// Nota:`, incluindo o que não dá pra modelar ainda (escolhas "-OU-",
  bônus condicionais a ter artefato/coroa/companheiro/ídolo, teleporte, "trash"
  específico, bônus escalável, efeito só nos outros jogadores).
- `engine/src/board.ts`: nomes de sala trocados do tema Catacombs pra flavor genérico
  (o grafo continua pequeno/fixo, não é cópia do tabuleiro físico — ver aviso abaixo).
- Suite de testes atualizada (62 testes em `game.test.ts`, todos os ids de carta
  trocados pros equivalentes do jogo base) — 75 testes passando no total.
- ⚠️ Discrepância ainda não resolvida: custo de Tattle (Steam ao vivo disse 2, a
  planilha diz 3 + Skill+2) — usei o valor da planilha.

### `board.ts` — expandido com foto real do tabuleiro (2026-07-24)

O usuário mandou uma foto de cima do lado "Castelo" do tabuleiro físico. A partir dela,
adicionei (de forma ADITIVA — nenhuma sala/id que já existia foi removida ou renomeada,
então nenhum teste antigo quebrou):

- Mais 2 salas de Caverna de Cristal (`crystal-cave-2`, `crystal-cave-3`).
- Mais 2 salas de Artefato: **20 (Escudo)** e **30 (Orbe)**, nítidos na foto (depois os
  outros 2 que faltavam — 5 e 10 — foram confirmados por posição, ver seção abaixo:
  agora são os 7 valores completos).
- **Fonte de Cura** (`isFountainOfHealing`) — mecânica CONFIRMADA no manual oficial
  ("When you enter a room with a Fountain of Healing, heal 1 damage") que já estava
  documentada desde a leitura do manual mas nunca tinha sido implementada. Duas salas
  novas (`healing-spring-1`, `healing-spring-2`) e a cura acontece em `movePlayer`.
- **Esgotamento de Boots na Caverna de Cristal** — outra regra confirmada no manual que
  estava documentada mas não implementada; agora `movePlayer` zera os Boots restantes
  ao entrar numa sala com `isCrystalCave`.
- Posição mais realista do Santuário dos Macacos e do Mercado (2 salas de Mercado
  conectadas, refletindo as 4 barracas ao redor do "$7" central na foto).
- Cliente (`BoardMap.tsx`) atualizado com posição de todas as salas novas + cor própria
  pra Fonte de Cura (rosa/vermelho).

**⚠️ Ainda é uma simplificação, não 1:1**: a foto mostra ícone de monstro em quase todo
túnel (bem mais denso do que o grafo assumia antes) — usei custo 1 Sword como estimativa
nos túneis novos, já que a resolução da foto não deixa ler o número exato em cada ícone
individualmente. O lado "Montículos e Covas" (verso do tabuleiro) continua sem
cobertura — não foi fotografado. 9 testes novos adicionados (Fonte de Cura, esgotamento
de Boots), suite completa agora com **78 testes passando**.

## ✅ Todos os 7 Artefatos confirmados (2026-07-24)

O usuário confirmou por posição (print anotado do Steam): Artefato de **5** fica perto
da esquerda, o de **10** fica na parte de baixo à direita, dentro/perto do Mercado. Duas
novas salas (`depths-ring`, `depths-vase`) fecham a escala completa: 5/7/10/15/20/25/30.

## ✅ Mecânica de escolha "X -OU- Y" implementada (2026-07-24)

Pedido do usuário: representar cartas com efeito "escolha X -OU- Y" mostrando ícone +
quantidade, clicável. Implementado ponta a ponta:
- **Motor**: `CardDefinition.playChoices`/`acquireChoices` (lista de `{icon, amount,
  label}`); ao jogar/adquirir uma carta com escolha, o motor cria um `PendingChoice` em
  vez de aplicar o efeito na hora — **nenhuma outra ação é permitida** até o jogador
  chamar `resolveChoice(playerId, optionIndex)`. 7 testes novos, cobrindo criação da
  escolha, bloqueio de outras ações, resolução correta de cada opção, e erros (índice
  inválido, sem escolha pendente).
- **Cartas conectadas**: Shrine (USE: $1 -OU- cura 1) e Apothecary (Swords+3 -OU- $2
  -OU- cura 1 — ignora o requisito de descartar uma carta antes, que não é modelado).
  Outras cartas com "-OU-" (Dragon Shrine, Mister Whiskers, Underworld Dealing, Wand of
  Wind) continuam sem escolha modelada porque pelo menos um dos lados envolve uma
  mecânica que o motor não tem (trash, disparar ataque do dragão como escolha, compra
  aninhada, segredo de sala) — forçar só metade da escolha seria enganoso.
- **Servidor**: `pendingChoiceJson` sincronizado (JSON simples, sem schema aninhado) +
  mensagem `resolve_choice`.
- **Client**: modal bloqueante (`ChoiceModal` em `App.tsx`) com um botão por opção,
  emoji do ícone + quantidade — testado ao vivo no navegador (jogo carrega, todas as
  salas novas aparecem no mapa, Tattle compra corretamente com o custo certo).
  ⚠️ Não consegui presenciar o modal abrindo ao vivo por causa da aleatoriedade da
  Dungeon Row (Shrine/Apothecary não apareceram nas ~3 rodadas testadas) — a lógica em
  si está coberta por 7 testes de unidade no motor, e o componente segue exatamente o
  mesmo padrão já comprovado do banner de erro existente.
- Também aproveitei pra ligar `take_monkey_idol`/`takeMonkeyIdol` no client (server já
  tinha, faltava só o botão) — testado ao vivo, aparece corretamente quando a sala tem
  Ídolo disponível.

## ✅ Arte real integrada no client (2026-07-27)

O usuário confirmou (2026-07-24) que podia usar a arte real das cartas/tabuleiro como
placeholder (projeto pessoal, sem restrição de IP — ver nota atualizada em
[PLANNING.md](../../PLANNING.md)) e depois mandou os arquivos de imagem em si
(2026-07-27), salvos em `D:\UNIFOR\Clones Github\ClankWebGame\images\`:

- **Cartas**: pasta `images/Cards/` com as 71 cartas do jogo base já recortadas
  individualmente em alta qualidade pelo próprio usuário (nomes em PascalCase com 2
  variações — `BolcherMonster.png` → `belcher`, `WizardCompanion].png` → `wizard`).
  Copiadas/renomeadas 1:1 pros `id`s de `cards.ts` (verificado por script: 71/71, zero
  faltando, zero sobrando) pra `client/src/assets/cards/<id>.png`.
  `client/src/game/cardImages.ts` usa `import.meta.glob("../assets/cards/*.png", {eager:
  true})` do Vite pra montar um mapa `id → URL` em build time; `cardImageUrl(id)` retorna
  `undefined` se não achar (fallback gracioso). Usado em `App.tsx` via componente
  `CardThumb` (bloco cinza com a inicial do nome quando não há imagem) nas 3 listas de
  carta: Dungeon Row, Reserva e mão do jogador.
  - *(Nota histórica: antes de receber esse recorte pronto, uma primeira rodada tentou
    recortar cartas de 15 fotos em lote via Python/Pillow/numpy/scipy — projeção de
    linha/coluna com fallback de divisão igual. Funcionou (`crop_cards2.py`, guardado só
    como referência técnica no scratchpad da sessão, não faz parte do repo) mas ficou
    obsoleto assim que o usuário mandou os recortes individuais de melhor qualidade.)*
- **Tabuleiro**: `images/ClankBoardCastle.jpg` (1500×1497px, foto do lado "Castelo" do
  tabuleiro físico) copiada pra `client/src/assets/board/ClankBoardCastle.jpg`. Em
  `client/src/game/BoardMap.tsx`, entra como `<img>` de fundo (opacidade 40%) com um véu
  escuro por cima (`bg-slate-950/45`), atrás do SVG do grafo esquemático de salas —
  **puramente atmosférico, sem alinhamento pixel-a-pixel** com as posições reais das
  salas na foto (o grafo continua sendo o layout próprio documentado nas seções acima).
- **Tokens/artefatos**: ~26 PNGs avulsos em `images/` (Crown8/9/10, MasterKey, Backpack,
  MasteryToken, MonkeyNoEars/Eyes/Mouth, 7 artefatos nomeados — Ring/Cross/Vase/Banana/
  Shield/Armor/Orb —, EggDragon, Chalice, e ~10 tokens de efeito secreto tipo
  `1Boot`/`2Coin`/`5Mana`/`3Cards`) copiados pra `client/src/assets/tokens/`.
  `client/src/game/tokenImages.ts` expõe:
  - `artifactImageUrl(value)` — mapeia os 7 valores (5/7/10/15/20/25/30) pro artefato
    certo, usando a tabela `ARTIFACT_NAMES_BY_VALUE` de `board.ts` como referência
    (Anel=5, Cruz=7, Vaso=10, Banana=15, Escudo=20, Armadura=25, Orbe=30). Usado nos
    círculos de sala com artefato em `BoardMap.tsx` (imagem 28×28 + valor numérico com
    contorno escuro por cima, pra continuar legível) e no botão "Pegar artefato".
  - `monkeyIdolImageUrl(name)` — mapeia os 3 nomes (`Macaco Surdo/Cego/Mudo`) pros PNGs
    `MonkeyNoEars/Eyes/Mouth`. Usado no botão "Pegar Ídolo de Macaco".
  - `crownImageUrl(value)` — mapeia 8/9/10 (== `CROWN_VALUES` de `types.ts`) pros PNGs
    `Crown8/9/10`. Usado na linha "Coroa" do Mercado.
  - `masterKeyImageUrl`/`backpackImageUrl` — exports diretos, usados nas linhas
    correspondentes do Mercado.
  - `choiceTokenImageUrl(icon, amount)` — só cobre as combinações ícone+quantidade que
    têm arte exata (`boots-1`, `gold-1/2/5`, `heal-1/2`, `skill-2/5`, `swords-2`,
    `drawCards-3`); qualquer outra combinação (ex: `swords-3` do Apothecary, ou
    `clank-*`, que não tem token físico nenhum) cai no fallback de emoji que já existia
    no `ChoiceModal`.
  - **3 imagens copiadas mas SEM uso ainda** (nenhuma mecânica implementada pra elas no
    motor): `Chalice.png`, `EggDragon.png`, `MasteryToken.png`. Ficam disponíveis em
    `client/src/assets/tokens/` pro dia que essas mecânicas forem implementadas.
- **Verificação feita:** `npx tsc --noEmit -p .` limpo em `client/` depois de cada etapa.
  Card art e tabuleiro confirmados ao vivo (client+server rodando local, sala criada,
  partida iniciada): `read_network_requests` mostrou todos os PNGs/JPG voltando `200
  OK`, e um `javascript_tool` checou `naturalWidth`/`naturalHeight`/`complete` de cada
  `<img>` renderizado (a ferramenta de screenshot do browser pane não funciona neste
  ambiente — "Browser pane is not displayed" — então a verificação visual foi feita por
  essas checagens indiretas em vez de olhar a tela de fato).
  ⚠️ **A verificação ao vivo dos tokens (artefatos no mapa, Mercado, Ídolo de Macaco,
  ChoiceModal) ficou pendente** — ver bloqueio abaixo.
- **Bloqueio de teste ao vivo (2026-07-27), não resolvido nesta sessão:** depois de
  reiniciar o client dev server (precisou trocar de porta, 5173→3002 --strictPort,
  porque outro projeto — VortexFullStack — já tinha um Vite ocupando 5173) e limpar
  `localStorage`/`sessionStorage` pra sair de um estado de reconexão travado ("seat
  reservation expired"), a tela de lobby parou de responder aos comandos de
  clique/digitação da ferramenta de automação (`mcp__Claude_Browser__*`): o campo de
  nome ficava com valor vazio mesmo depois do `type`/`form_input`, o botão "Criar sala
  nova" não disparava nenhuma requisição nova pro servidor Colyseus
  (`localhost:2567/matchmake/create/clank`), e não havia erro novo no console depois de
  um reload limpo. Ao mesmo tempo, `curl`/`tsc` confirmam que o client e o server
  continuam subindo e servindo normalmente — então **o mais provável é um problema da
  própria ferramenta de automação** (refs desatualizadas, timing entre `navigate` e o
  React montar, etc.), não um bug real do app. Não deu tempo de isolar a causa raiz.
  **Sugestão pra próxima sessão:** abrir uma aba nova (`tabs_create`) em vez de reusar a
  mesma aba entre reloads; sempre re-`read_page`/`find` logo antes de cada clique em vez
  de reusar refs de uma leitura antiga; se persistir, validar via
  `read_network_requests`/`javascript_tool` em vez de tentar de novo às cegas.

## Próximos passos

1. ~~Se o usuário mandar os arquivos de arte das cartas/tabuleiro: integrar no
   client~~ ✅ (2026-07-27, ver seção acima).
2. ~~Commit + push do trabalho de arte/tokens, e deploy real~~ ✅ (2026-07-27) — no ar em
   produção (Vercel + Railway), testado ao vivo com 2 abas reais. Ver item 16 do
   [PLANNING.md](../../PLANNING.md) pra detalhes de URLs/config.
3. A verificação ao vivo dos tokens específicos (artefatos, coroas, chave, mochila,
   ídolos, ChoiceModal) ainda não foi conferida visualmente com atenção — o teste em
   produção focou no fluxo de sala/código, não em cada token individualmente. Vale
   conferir quando for mexer no polish visual (ver item 17 do PLANNING.md).
4. Se quiser fechar o verso do tabuleiro ("Montículos e Covas"): mandar foto de cima.
5. Revisar a planilha em busca de mais discrepâncias, se sobrar tempo.

Demanda atual do projeto (front-end mais bonito/funcional, testar caminhos, playtest com
outras IAs) está registrada no item 17 do [PLANNING.md](../../PLANNING.md) — não é escopo
desta pasta de pesquisa (que é só sobre os dados de carta/tabuleiro), então não duplicado
aqui em detalhe.
