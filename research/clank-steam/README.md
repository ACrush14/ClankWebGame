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

## ⚠️ Discrepância encontrada — precisa confirmar

- **Tattle (Fofoca)**: nossa captura ao vivo no Steam registrou Custo=2, sem efeito
  incondicional. A planilha (baseada na foto física) registra **Custo=3, Mana=2**
  (ou seja, a carta também dá Skill+2 ao jogar, além do "+1 Clank pra todos os outros").
  Como a planilha vem de foto da carta física (fonte mais confiável que uma dedução ao
  vivo), tratar `Custo=3, Skill+2` como o valor correto — mas vale conferir de novo se
  possível.

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

## Próximos passos

1. Revisar a planilha em busca de mais discrepâncias (comparar com
   `cartas-capturadas.md` onde os dois se sobrepõem).
2. Reescrever `engine/src/cards.ts` e `engine/src/board.ts` pro conteúdo base usando a
   planilha como fonte primária — agora todas as mecânicas de suporte já existem no
   motor, é "só" trocar os dados.
3. Adicionar UI no client pra pegar Ídolo de Macaco (`take_monkey_idol` já existe no
   servidor).
