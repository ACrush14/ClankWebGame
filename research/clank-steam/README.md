# Pesquisa: Clank! A Deck-Building Adventure (Steam) → ClankWebGame

Esta pasta reúne tudo que foi levantado jogando o **Clank! A Deck-Building Adventure**
oficial (versão base, sem expansões) no Steam, via automação de tela, com o objetivo de
corrigir/completar `engine/src/cards.ts` e `engine/src/board.ts` do ClankWebGame — que
hoje ainda têm conteúdo temporário baseado na expansão **Catacombs** (usada por engano
numa sessão anterior, antes de perceber que a versão de referência é a base + Steam).

**Arquivos desta pasta:**
- [`README.md`](./README.md) — este arquivo. Visão geral, progresso e o que falta.
- [`COMO-JOGAR.md`](./COMO-JOGAR.md) — guia operacional de automação: como navegar os
  menus, ler uma carta na tela, comprar da fileira, mover o personagem, etc. Ler antes de
  retomar qualquer sessão de automação.
- [`cartas-capturadas.md`](./cartas-capturadas.md) — dados brutos de cada carta lida
  (nome, custo, efeito, texto, VP), no formato como foram sendo capturadas ao vivo.
- [`regras-oficiais-rulebook.md`](./regras-oficiais-rulebook.md) — regras extraídas do
  **manual oficial em PDF** (via `WebFetch`/`Read`, texto puro — bem mais barato que
  automação de tela). Não tem as ~68 cartas da Dungeon Row (isso só está nas cartas
  físicas), mas cobre praticamente todo o resto do regramento com precisão de fonte
  oficial: Segredos Maiores/Menores, itens de Mercado, glossário de termos (Acquire vs
  Arrive, Danger, Trash, Teleport), Trilha de Contagem Regressiva em detalhe, e a
  resolução do mistério dos Ídolos de Macaco.

## Por que essa pesquisa existe

O motor (`engine/src/`) foi inicialmente escrito com dados da expansão Catacombs (que
tem planilha pública completa). Depois de comparar com a memória do usuário sobre o jogo
físico que ele tem em casa — sem prisioneiros/fantasmas, mas com Cavernas de Cristal e
Ídolos de Macaco — ficou claro que a referência certa é o jogo **base**, confirmado por
captura de tela do menu "CRIAR PARTIDA" do Steam mostrando **"Clank! A Deck-Building
Adventure"**. Só que não há uma planilha pronta e confiável do jogo base com
custo/efeito/texto de cada carta — por isso a estratégia virou "jogar e ler direto da
tela", usando automação de mouse/teclado (`mcp__computer-use__*`) para abrir partidas,
ler os popups de carta e ir catalogando.

## Progresso atual

| Categoria | Status |
|---|---|
| Baralho inicial (4 cartas) | ✅ 100% confirmado |
| Reserva (4 pilhas fixas) | ✅ 100% confirmado — bate com o motor atual |
| Dungeon Row (cartas variáveis) | 🟡 18 tipos capturados de ~68 do catálogo antigo (~26%) |
| Regras/mecânicas distintas do motor atual | 🟡 5 diferenças confirmadas (ver abaixo) |
| Reversão de `cards.ts`/`board.ts` pro conteúdo base | ⏸️ Ainda **não iniciada** — aguardando catálogo mais completo antes de reescrever o motor |

## Baralho inicial (100% confirmado)

| Nome (PT, no jogo) | = carta oficial (EN) | Efeito |
|---|---|---|
| Roubar | Burgle | Skill +1 |
| Contornar | Sidestep | Boots +1 |
| Rastejar | Scramble | Skill +1, Boots +1 |
| Tropeçar | Stumble | Clank! +1 |

## Reserva — pilhas fixas (100% confirmado, já bate com `engine/src/cards.ts`)

| Nome | Tipo | Qtd | Efeito | VP | Custo |
|---|---|---|---|---|---|
| Tomo Secreto (Secret Tome) | — | 12 | nenhum | 7 | 7 |
| Explorar (Explore) | — | 15 | Skill+2, Boots+1 | — | 3 |
| Mercenário (Mercenary) | Companheiro | ~14 | Skill+1, Swords+2 | — | 2 |
| Goblin | Monstro | ∞ (nunca esgota) | DERROTA: $1 (não descarta após o combate) | — | 2 Swords |

## Dungeon Row — capturadas ao vivo (18 tipos)

| Nome (PT) | Tipo | Custo | VP | Efeito ao jogar | Efeito extra |
|---|---|---|---|---|---|
| Capitão Rebelde (Rebel Captain) | Companheiro | 3 | 1 | Skill+2 | "Se houver outro companheiro em jogo, compre uma carta." |
| Boticária (Apothecary) | Companheiro | 3 | 2 | — | Descarte 1 carta → 3 Swords **ou** $2 **ou** cura 1 |
| Colecionador de Gemas (Gem Collector) | Companheiro | 4 | 2 | Skill+2 | -2 Clank!; gemas custam -2 Skill neste turno |
| Corrida Frenética (Dead Run) | — | 3 | — | Boots+2 | +2 Clank!; não precisa parar na Caverna de Cristal |
| Altar | Dispositivo | 2 | — | — | USE: $1 ou cura 1; CHEGADA: devolve 3 cubos de dragão à bolsa |
| Cetro do Senhor dos Macacos (Scepter of the Ape Lord) | — | 3 | 3 | +3 Clank! | — |
| Altar do Dragão (Dragon Shrine) | Dispositivo | 4 | — | — | USE: 2 Skill ou elimine 1 carta; **PERIGO**: dragão compra +1 cubo enquanto ficar na fileira |
| Fofoca (Tattle) | — | 2 | — | — | Todos os outros jogadores recebem +1 Clank! |
| Furtividade (Sneak) | — | 1 | — | Boots+1 | -2 Clank! |
| Espada Cantante (Singing Sword) | — | 5 | 2 | Swords+2 | +1 Clank! |
| Rubi (Ruby) | Gema | 6 | 6 | Compre 1 carta | ADQUIRIR: +2 Clank! |
| Esmeralda (Emerald) | Gema | 5 | 5 | Compre 1 carta | ADQUIRIR: +2 Clank! |
| Perspicácia (prov. *Brilliance*) | — | 6 | — | Compre 3 cartas | — |
| Porta Animada (Animated Door) | Monstro | 1 Sword | — | — | DERROTA: Boots+1; dispara Dragon Attack |
| Arrotador (Belcher) | Monstro | 2 Swords | — | — | DERROTA: $4, +2 Clank!; dispara Dragon Attack |
| Troll das Cavernas (Cave Troll) | Monstro, **Subterrâneo** | 4 Swords | — | — | Só combatível nas Profundezas; DERROTA: $3 + compre 2 cartas |

*(Faltam ~47 tipos do catálogo antigo de 68 — lista completa dos nomes ainda não vistos
em [`cartas-capturadas.md`](./cartas-capturadas.md#cartas-ainda-faltando).)*

## Regras/mecânicas confirmadas que o motor atual ainda não modela

1. **Cura (heal)** — pelo menos 3 cartas vistas até agora dão a opção de curar 1
   coração (Boticária, Altar, e uma terceira não capturada ainda). O motor
   (`engine/src/game.ts`) só tem `damage` subindo, nunca descendo.
2. **PERIGO (Danger) ≠ Dragon Attack symbol** — são duas mecânicas distintas:
   - *Dragon Attack symbol*: dispara um ataque do dragão IMEDIATO, uma única vez, quando
     a carta é revelada pra repor a fileira. **Já implementado** (`triggersDragonAttack`).
   - *Danger*: efeito PASSIVO/PERSISTENTE — enquanto a carta ficar na fileira sem ser
     comprada, todo ataque do dragão (de qualquer jogador, a qualquer momento) compra +1
     cubo extra. **Não implementado ainda.**
3. **Efeito de "chegada" em Dispositivos** — ex: Altar devolve 3 cubos de dragão à
   bolsa assim que é adquirido (reduz ameaça — o oposto do Danger). Não modelado.
4. **Gemas têm custo de ruído na aquisição** — "ADQUIRIR: +2 Clank!" é um efeito
   separado do efeito de jogar depois (que normalmente é "compre uma carta"). Não
   modelado como campo próprio hoje.
5. **Marcador "Subterrâneo" em monstros** — alguns monstros (ex: Troll das Cavernas) só
   podem ser combatidos se o jogador estiver numa sala da zona "Profundezas", não em
   qualquer sala. `fightMonster` hoje não distingue localização do jogador.

Regras já confirmadas e que **batem** com o motor atual (nenhuma mudança necessária):
- Dungeon Row com 6 cartas, Reserva com 4 pilhas fixas, Goblin infinito.
- Regra de "precisa parar na Caverna de Cristal" (bypassada por Corrida Frenética) —
  existe no jogo base, não é exclusiva do Catacombs.
- Escala de valores de artefato 5/7/10/15/20/25/30 (confirmada por foto do jogo físico
  E visualmente no tabuleiro do Steam, que mostrou pelo menos 5/10/15/20/25).
- Dois tabuleiros oficiais: "Castelo" e "Montículos e Covas", + opção "Aleatório".

## Próximos passos

1. Continuar capturando os ~47 tipos de carta que faltam (jogar mais partidas,
   priorizando sempre comprar cartas novas — ver checklist de turno em
   [`COMO-JOGAR.md`](./COMO-JOGAR.md#estratégia-de-jogo-instrução-do-usuário)).
2. Quando o catálogo estiver "bom o suficiente" (decisão do usuário — não precisa ser
   100% dos 68 tipos), reescrever `engine/src/cards.ts` e `engine/src/board.ts` pro
   conteúdo do jogo base, e implementar as 5 mecânicas faltantes listadas acima
   (ao menos as que o usuário quiser no MVP — combinar com o escopo "básico, sem nada
   muito elaborado" definido em `PLANNING.md`).
3. Adicionar prints/capturas de tela reais quando o jogo estiver aberto de novo, pra
   ilustrar visualmente os esquemas de carta e o tabuleiro (pendente — ver `PLANNING.md`).
