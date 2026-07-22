# Catálogo completo de nomes + quantidades (Dungeon Deck, 100 cartas)

Fonte: imagem "Clank! Card List" enviada pelo usuário (documento comunitário, ex.
Scribd) — lista de **nomes e quantidades** de todas as cartas do jogo base. Não tem
custo/efeito/texto (isso continua vindo só do Steam ou das cartas físicas), mas resolve
de vez a dúvida "quais são as ~68 cartas e quantas cópias existem de cada".

Custo praticamente zero (uma imagem, lida uma vez) comparado à automação de tela — ver
[`README.md`](./README.md#por-que-essa-pesquisa-existe) pra contexto de por que isso
importa.

## Baralhos iniciais — CONFIRMADO, bate 100% com `engine/src/cards.ts`

| Carta | Qtd total (4 baralhos) | Qtd por jogador |
|---|---|---|
| Burgle (Roubar) | 24 | 6 |
| Stumble (Tropeçar) | 8 | 2 |
| Scramble (Rastejar) | 4 | 1 |
| Sidestep (Contornar) | 4 | 1 |

`STARTING_DECK_COUNTS` em `engine/src/cards.ts:57` já tem exatamente
`burgle:6, scramble:1, sidestep:1, stumble:2` — **nenhuma mudança necessária**.

## Reserva — confirmado, bate com o motor

| Carta | Qtd |
|---|---|
| Secret Tome (Tomo Secreto) | 12 |
| Explore (Explorar) | 15 |
| Mercenary (Mercenário) | 15 |
| Goblin | 1 (carta única, nunca esgota/descarta) |

## Dungeon Deck (100 cartas) — Devices

| Carta | Qtd | Status |
|---|---|---|
| Dragon Shrine | 2 | ✅ capturada = "Altar do Dragão" |
| Shrine | 3 | ✅ capturada = "Altar" (resolve nome genérico "Shrine" = nosso "Altar") |
| Ladder | 2 | ❌ ainda não vista |
| Teleporter | 3 | ❌ ainda não vista |
| Vault, The | 1 | ❌ ainda não vista |

## Dungeon Deck — Monstros

| Carta | Qtd | Status |
|---|---|---|
| Animated Door | 2 | ✅ capturada = "Porta Animada" |
| Belcher | 2 | ✅ capturada = "Arrotador" |
| Cave Troll | 2 | ✅ capturada = "Troll das Cavernas" |
| Orc Grunt | 3 | ✅ capturada = "Soldado Orc" |
| Crystal Golem | 2 | ❌ ainda não vista |
| Kobold | 3 | ❌ ainda não vista |
| Ogre | 2 | ❌ ainda não vista |
| Overlord | 2 | ❌ ainda não vista |
| Watcher | 3 | ❌ ainda não vista |

## Dungeon Deck — demais cartas (Companheiros/Itens/Gemas/Eventos)

| Carta | Qtd | Status |
|---|---|---|
| Rebel Captain | 1 | ✅ capturada = "Capitão Rebelde" |
| Apothecary | 1 | ✅ capturada = "Boticária" |
| Gem Collector | 1 | ✅ capturada = "Colecionador de Gemas" |
| Dead Run | 2 | ✅ capturada = "Corrida Frenética" |
| Scepter of the Ape Lord | 1 | ✅ capturada = "Cetro do Senhor dos Macacos" |
| Tattle | 2 | ✅ capturada = "Fofoca" |
| Sneak | 2 | ✅ capturada = "Furtividade" |
| Singing Sword | 1 | ✅ capturada = "Espada Cantante" |
| Ruby | 2 | ✅ capturada = "Rubi" |
| Emerald | 2 | ✅ capturada = "Esmeralda" |
| Brilliance | 1 | ✅ capturada = "Perspicácia" |
| Sapphire | 3 | ✅ capturada = "Safira" |
| Search | 2 | ✅ capturada = "Procurar" |
| Sleight of Hand | 2 | ✅ capturada = "Prestidigitação" |
| Amulet of Vigor | 1 | ❌ |
| Archaeologist | 2 | ❌ |
| Boots of Swiftness | 1 | ❌ |
| Bracers of Agility | 2 | ❌ |
| Cleric of the Sun | 2 | ❌ (já tínhamos ouvido falar via "Clériga do Sol", cura — confirma que existe) |
| Diamond | 1 | ❌ |
| Dragon's Eye | 1 | ❌ |
| Duke, The | 1 | ❌ |
| Dwarven Peddler | 1 | ❌ |
| Elven Boots | 1 | ❌ |
| Elven Cloak | 2 | ❌ |
| Elven Dagger | 1 | ❌ |
| Flying Carpet | 2 | ❌ |
| Invoker of the Ancients | 1 | ❌ |
| Kobold Merchant | 1 | ❌ |
| Lucky Coin | 2 | ❌ |
| Master Burglar | 2 | ❌ |
| Mister Whiskers | 1 | ❌ |
| Move Silently | 2 | ❌ (texto já conhecido via manual oficial: Boots+2, -2 Clank!) |
| Monkey Bot 3000 | 1 | ❌ |
| Mountain King, The | 1 | ❌ (texto parcial já conhecido via manual: "se tiver uma coroa, +1 Sword +1 Boot") |
| Pickaxe | 2 | ❌ |
| Queen of Hearts, The | 1 | ❌ |
| Rebel Miner | 1 | ❌ |
| Rebel Scout | 1 | ❌ (texto parcial já conhecido via manual: "se tiver outro companheiro em jogo, compre uma carta") |
| Rebel Soldier | 1 | ❌ |
| Silver Spear | 2 | ❌ |
| Swagger | 2 | ❌ |
| Treasure Hunter | 2 | ❌ |
| Treasure Map | 1 | ❌ |
| Tunnel Guide | 2 | ❌ |
| Underworld Dealing | 1 | ❌ |
| Wand of Recall | 2 | ❌ |
| Wand of Wind | 1 | ❌ |
| Wizard | 1 | ❌ |

## Resumo do progresso (atualizado)

- **21 tipos únicos já 100% capturados** (custo+efeito+texto completo, via Steam).
- **~30 tipos ainda faltando** só o custo/efeito/texto — mas agora sabemos exatamente
  quais são e quantas cópias de cada existem, então dá pra parar de "adivinhar" e ir
  direto atrás deles quando voltar a jogar.
- Resolvido: "Shrine" da lista = nossa "Altar"; "Soldado Orc" = "Orc Grunt".
