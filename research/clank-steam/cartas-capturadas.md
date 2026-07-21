# Clank! A Deck-Building Adventure — cartas reais lidas do jogo oficial (Steam)

Ver [`COMO-JOGAR.md`](./COMO-JOGAR.md) nesta mesma pasta pra saber como continuar essa
pesquisa (navegação de menu, esquema de leitura da carta, técnica de compra).

Formato: Nome | Tipo | Custo | VP | Efeito | Texto

## Esquema de leitura da carta (resumo — detalhes completos em COMO-JOGAR.md)
- Topo-esquerda: ícones de EFEITO ao jogar (losango azul=Skill, bota=Boots, círculo vermelho=Swords) — só aparece se a carta gera recurso incondicional.
- Topo-direita (verde): VP (pontos de vitória).
- Baixo-direita (fita azul): CUSTO em Skill pra comprar (ou espada pra monstro, formato "2S").
- Reserva (pilhas fixas): número GRANDE no topo-esquerda = quantidade restante na pilha; os ícones de efeito ficam menores, abaixo desse número.
- Cartas iniciais (Burgle etc.): sem custo (não se compra), sem VP, só o ícone de efeito.
- Faixa "ADQUIRIR" na base: efeito que só acontece ao comprar a carta (separado do efeito de jogar).

## Baralho inicial (starting deck) — 100% confirmado

- Roubar = Burgle | Efeito: Skill+1
- Contornar = Sidestep | Efeito: Boots+1
- Rastejar = Scramble | Efeito: Skill+1, Boots+1
- Tropeçar = Stumble | Efeito: Clank+1 ("+1 Clank!")

## Reserva (pilhas fixas) — 100% confirmado, bate com engine/src/cards.ts atual

- Tomo Secreto (Secret Tome) | Qty 12 | Efeito: nenhum | VP 7 | Custo 7
- Explorar (Explore) | Qty 15 | Efeito: Skill+2, Boots+1 | Custo 3
- Mercenário (Mercenary) | Qty 14-15 | Efeito: Skill+1, Swords+2 | Custo 2
- Goblin | Monstro, nunca esgota | Custo Swords 2 | Efeito ao vencer: $1 | "(Não descarte após o combate.)"

## Dungeon Row — capturadas ao vivo (17 tipos)

- Capitão Rebelde (Rebel Captain) | Companheiro | Efeito: Skill+2 | VP 1 | Custo 3 | "Se houver outro companheiro em sua área de jogo, compre uma carta."
- Boticária (Apothecary) | Companheiro | Efeito: nenhum incondicional | VP 2 | Custo 3 | "Descarte uma carta para escolher uma das seguintes opções: 3 Swords -OU- $2 -OU- cura 1 (coração)."
- Colecionador de Gemas (Gem Collector) | Companheiro | Efeito: Skill+2 | VP 2 | Custo 4 | "-2 Clank! As gemas custam 2 Skill a menos neste turno."
- Corrida Frenética (Dead Run) | Efeito: Boots+2 | Custo 3 | "+2 Clank! Você não precisa parar nas Cavernas de Cristal neste turno."
- Altar | Dispositivo | Custo 2 | USE: $1 -OU- cura 1 (coração) | Efeito de chegada: "Devolva 3 cubos de dragão à bolsa." | "Um tributo a um deus esquecido, o altar pode acalmar a fúria do dragão. Um pouquinho."
- Cetro do Senhor dos Macacos (Scepter of the Ape Lord) | Custo 3 | VP 3 | "+3 Clank!" | "Toda a sociedade dos Senhores dos Macacos foi construída ao redor do número 3."
- Altar do Dragão (Dragon Shrine) | Dispositivo | Custo 4 | USE: 2 Skill -OU- Elimine uma carta em sua área de jogo ou pilha de descarte | **PERIGO**: "Enquanto esta carta permanecer na Fileira da Masmorra, os ataques do dragão compram +1 cubo."
- Fofoca (Tattle) | Custo 2 | Efeito: nenhum incondicional | "Todos os outros jogadores recebem +1 Clank!" | "Não há honra entre ladrões... mas há muita roupa suja."
- Furtividade (Sneak) | Custo 1 | Efeito: Boots+1 | "-2 Clank!" | "A escuridão é uma das maiores armas de um ladrão."
- Espada Cantante (Singing Sword) | Custo 5 | VP 2 | Efeito: Swords+2 | "+1 Clank!" | "Cuidado! Ela não tem dó."
- Rubi (Ruby) | Gema | Custo 6 | VP 6 | Efeito: "Compre uma carta." | ADQUIRIR: +2 Clank!
- Porta Animada (Animated Door) | Monstro | Custo Swords 1 | DERROTA: Boots+1 | Tem símbolo de Dragon Attack (dispara ataque do dragão ao ser revelada) | "Às vezes é a porta que bate em você."
- Troll das Cavernas (Cave Troll) | Monstro | Custo Swords 4 | Tipo especial "Subterrâneo" (Combata somente nas Profundezas) | DERROTA: $3 e compre duas cartas
- Esmeralda (Emerald) | Gema | Custo 5 | VP 5 | Efeito: "Compre uma carta." | ADQUIRIR: +2 Clank!
- Perspicácia (provável "Brilliance") | Custo 6 | Efeito: "Compre três cartas." | "Não se preocupe, tenho uma ideia."

## Cartas ainda faltando (dos 68 tipos do catálogo antigo, ~47 restantes)

Amulet of Vigor, Archaeologist, Boots of Swiftness, Bracers of Agility,
Diamond, Dragon's Eye, The Duke, Dwarven Peddler, Elven Boots, Elven Cloak, Elven
Dagger, Flying Carpet, Invoker of the Ancients, Kobold Merchant, Lucky Coin,
Master Burglar, Mister Whiskers, Move Silently, Monkey Bot 3000, Mountain King,
Pickaxe, Queen of Hearts, Rebel Miner, Rebel Scout, Rebel Soldier, Sapphire, Search,
Silver Spear, Swagger, Treasure Hunter, Treasure Map, Tunnel Guide,
Underworld Dealing, Wand of Recall, Wand of Wind, Wizard, Ladder, Shrine, Teleporter,
Vault The, Belcher, Crystal Golem, Kobold, Ogre, Orc Grunt
(já tinha, verificado em sessão anterior), Overlord, Watcher.

## Observações de regras confirmadas ao vivo

- Dungeon Row tem 6 cartas (confirmado visualmente, bate com o motor `DUNGEON_ROW_SIZE`).
- Reserva tem 4 pilhas fixas, Goblin nunca esgota (infinito) — bate 100% com o motor.
- Existe a regra "precisa parar na Caverna de Cristal" (Corrida Frenética bypassa) — confirma que essa regra existe no jogo básico também, não só no Catacombs.
- Existe mecânica de **CURA** (coração/heart) em pelo menos 3 cartas vistas (Boticária, Altar, Clériga do Sol) — motor atual NÃO tem cura implementada (só dano sobe, nunca desce). Precisa de um novo campo/efeito `heal` se for reimplementar pro jogo básico.
- Existe efeito de "chegada"/"revelar" em Dispositivos tipo "devolva 3 cubos de dragão à bolsa" — reduz ameaça, oposto do "Danger: puxe +1 cubo".
- **PERIGO (Danger) é DIFERENTE do símbolo de Dragon Attack**: Danger é passivo/persistente (aumenta o total de cubos sorteados em TODO ataque do dragão enquanto a carta ficar na fileira sem ser comprada); Dragon Attack dispara um ataque IMEDIATO só uma vez, quando a carta é revelada pra repor a fileira. Motor atual só modela o segundo — precisaria de um campo novo tipo `dangerBonus` ou similar pra reimplementar Danger.
- Cartas do tipo "Gema" têm efeito de "ADQUIRIR: +2 Clank!" — custo extra em barulho só ao comprar, separado do efeito de jogar depois.
- Dois tabuleiros oficiais: "Castelo" e "Montículos e Covas", mais opção "Aleatório".
- Existe o marcador de tipo **"Subterrâneo"** em monstros (visto em "Troll das Cavernas"): "Combata somente nas Profundezas" — ou seja, esses monstros só podem ser enfrentados se o jogador estiver numa sala da zona "Profundezas" (parte mais funda do mapa), não em qualquer lugar da fileira. Regra que o motor atual não modela (`fightMonster` não distingue localização).
