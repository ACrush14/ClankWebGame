# Como jogar o Clank! oficial no Steam (via automação de tela)

Guia operacional pra retomar a pesquisa de cartas/regras do jogo oficial "Clank! A
Deck-Building Adventure" no Steam, usando as ferramentas de automação de tela
(`mcp__computer-use__*`). Escrito pra sobreviver a uma compactação de contexto — leia
isto antes de continuar a sessão de pesquisa.

## Onde está o jogo

- Instalado em `D:\SteamLibrary\steamapps\common\Clank`.
- O processo real do jogo roda como `clank.exe` (separado do launcher "Hydra" —
  `c:\program files\hydra\hydra.exe` — que também aparece na lista de apps instalados
  como "Clank"). **Precisa pedir acesso aos DOIS** via `request_access`:
  `["Clank", "clank.exe"]`.
- O jogo abre na tela secundária ("LG FULL HD" neste PC) — use `switch_display` se não
  aparecer na tela principal.
- Se a janela aparecer preta/em branco: clique nela uma vez pra forçar o render, depois
  tire outro screenshot.

## ⚠️ Antes de começar: checar com o usuário

A automação mexe no mouse/teclado de verdade — pode atrapalhar se o usuário estiver
usando o PC pra outra coisa (estudando, em chamada, etc.) ao mesmo tempo. **Sempre
pergunte antes de retomar** se não tiver certeza que é um bom momento.

## Navegação pelos menus

Fluxo pra começar uma partida nova (a mais rápida pra ver conteúdo novo da Dungeon Row):

1. Menu principal → **JOGO LOCAL**
2. → **PASSAR E JOGAR** (Pass and Play — modo hotseat local, 2+ jogadores, sem precisar
   de internet/outro jogador de verdade). Também existe "JOGO INDIVIDUAL" (1 jogador vs
   IA) — mais simples mas só um baralho jogando por vez.
3. Escolher jogadores (ex: Jogador 1 vermelho, Jogador 2 verde), dificuldade da IA
   (irrelevante se não tiver IA no jogo), **Tabuleiro** (dois oficiais: "Castelo" e
   "Montículos e Covas", + opção "Aleatório").
4. **CRIAR PARTIDA** → aparece uma tela "PASSAR PARA JOGADOR X" a cada troca de turno
   (mecânica de hotseat de verdade) — clicar **OK** pra continuar.

Cada partida nova sorteia uma Dungeon Row inicial de 6 cartas diferentes — reiniciar
partidas é uma forma válida (se lenta) de ver cartas novas sem precisar comprar nada.

## Lendo uma carta (clique simples)

Clicar em qualquer carta (da mão, da Dungeon Row, da Reserva) abre um popup grande com
o texto completo. Pra fechar o popup, clique em qualquer área vazia do tabuleiro (ex:
`(200, 500)`).

### Esquema de leitura do popup (confirmado testando cartas conhecidas)

- **Topo-esquerda**: ícones do EFEITO ao jogar a carta — losango azul = Skill, bota
  laranja = Boots, círculo vermelho riscado = Swords. Cada ícone repetido = +1 daquele
  recurso (ex: 2 ícones de espada = Swords+2). Só aparece se a carta tiver efeito
  incondicional; cartas sem efeito direto (só texto condicional) não mostram nada aqui.
- **Topo-direita (círculo verde)**: VP (pontos de vitória no fim de jogo).
- **Baixo-direita (fita azul)**: CUSTO em Skill pra comprar (ou em Swords pra monstro,
  aí some com "S" tipo "2S").
- **Reserva (pilhas fixas — Tomo Secreto/Explorar/Mercenário/Goblin)**: mostra um número
  GRANDE no topo-esquerda = quantidade restante na pilha; os ícones de efeito ficam
  menores, logo abaixo desse número.
- **Cartas do baralho inicial** (Burgle etc.): sem custo (nunca se compram), sem VP, só
  o ícone de efeito.
- **Faixa "ADQUIRIR" na base da carta**: alguns Companheiros/Gemas têm um efeito
  separado que só acontece ao COMPRAR a carta (não ao jogá-la depois) — ex: cura, ou
  "+2 Clank!" pras Gemas.
- **Ícone de escudo+cruz vermelha no canto**: marca "PERIGO" (Danger) — passa o mouse
  ou clica pra ver o tooltip exato. Confirmado num caso: "Enquanto esta carta permanecer
  na Fileira da Masmorra, os ataques do dragão compram +1 cubo." Isso é DIFERENTE do
  símbolo de "Dragon Attack" (que dispara um ataque IMEDIATO quando a carta é revelada
  pra repor a fileira) — são duas mecânicas distintas.
- **Botão "martelo"** (canto superior direito da fileira): alterna entre visão compacta
  e visão EXPANDIDA mostrando as 6 cartas da Dungeon Row + as 4 da Reserva todas de uma
  vez — muito mais rápido pra ler várias cartas em sequência do que abrir uma por uma.

## Jogar uma carta da mão

**Forma rápida (recomendada):** clicar no botão **"▶"** (triângulo azul, perto da mão,
ex: `(450, 705)`) joga TODAS as cartas da mão de uma vez, com animação. Confirma no
"Registro de ações" e nos recursos (Skill/Swords/Boots, barra inferior direita).

Forma manual (carta por carta, mais lenta): arrastar a carta da mão pra cima, em direção
ao tabuleiro (ex: de `(40, 610)` até `(400, 300)`). Um `left_click_drag` simples
(início→fim instantâneo) FUNCIONA pra isso — diferente de comprar da fileira, que
precisa do arrasto devagar (ver seção abaixo).

## Mover o personagem pelo tabuleiro

As salas adjacentes à posição atual do personagem aparecem com um **brilho/contorno
dourado**. Basta CLICAR nelas (clique simples, sem precisar arrastar) pra mover — gasta
Boots automaticamente (1, ou 2 se a sala tiver ícone de pegada). Confirmado testando.

## Jogar mais rápido: `computer_batch`

Sempre que possível, agrupe vários passos previsíveis numa única chamada de
`computer_batch` (ex: clicar em várias salas/cartas em sequência + só um screenshot no
final) em vez de uma chamada por ação — elimina round-trips desnecessários.

⚠️ Às vezes um processo do Windows (visto: "Textinputhost", provavelmente um teclado
virtual invisível) fica na frente e bloqueia cliques, mesmo a tela renderizando normal
nos prints. Se isso acontecer: tentar um clique simples em qualquer área vazia da tela
pra "destravar"; se persistir, avisar o usuário (ele consegue resolver manualmente mais
rápido do que ficar tentando `request_access`/`open_application` repetidamente).

## Comprar uma carta da Dungeon Row / Reserva — TÉCNICA CONFIRMADA

**Isto é o que trava mais tempo se você não souber**: um `left_click_drag` simples
(instantâneo, início→fim numa tacada só) **NÃO funciona** pra comprar — o jogo não
reconhece como um arrasto de verdade, só como um clique (abre o popup e nada mais).

O gesto que funciona (confirmado pelo usuário, testado com sucesso comprando "Espada
Cantante" — Skill caiu de 5 pra 0 e a carta saiu da fileira):

1. `mouse_move` até a carta que quer comprar.
2. `left_mouse_down` (segura o botão).
3. Vários `mouse_move` PEQUENOS e GRADUAIS (não um pulo só) em direção ao avatar do
   jogador da vez atual (círculo do retrato, canto inferior esquerdo da tela — ex:
   passos intermediários tipo `(1100,480)` → `(700,600)` → `(400,650)` → `(150,700)` →
   `(55,718)`). Durante o arrasto, uma miniatura da carta aparece seguindo o cursor —
   isso confirma que o arrasto está sendo reconhecido.
4. `left_mouse_up` em cima do avatar.

Se der certo: o recurso correspondente (Skill ou Swords) cai pelo valor do custo, e o
slot da fileira fica temporariamente vazio até ser reposto (a reposição parece
acontecer só na passagem de turno, não instantaneamente).

## Terminar o turno

Botão **"ENCERRAR TURNO"** (canto inferior direito). Se ainda tiver Boots sobrando,
aparece uma confirmação ("Você tem botas restantes. Quer mesmo encerrar o seu turno?")
— responder "SIM" pra continuar sem se mover.

### ⚠️ Bug/travamento confirmado: botão "ENCERRAR TURNO" fica em branco e não clica

Se você adquirir um Dispositivo com efeito de "USE" no momento da compra (ex: Altar —
"$1 -OU- cura 1") e escolher **"USAR MAIS TARDE"** em vez de usar na hora, o botão
"ENCERRAR TURNO" pode ficar renderizado como uma caixa vazia (sem texto) e PARAR de
responder a cliques — mesmo cliques em outros lugares da tela continuam funcionando
normalmente (não é o bug de foco do Windows/Textinputhost). **Solução**: clicar de novo
na miniatura do dispositivo pendente (fica numa "bandeja" perto do canto inferior
direito, com borda de fogo/destaque) pra abrir o popup de uso de novo, e dessa vez
escolher de fato uma das opções (ex: "$1") em vez de adiar — isso libera o botão de
encerrar turno imediatamente. Ainda não confirmei se dá pra encerrar o turno deixando o
dispositivo pendente de verdade (talvez seja assim mesmo por design, ou seja só um bug
de UI) — na dúvida, sempre resolva o "USE" pendente antes de tentar encerrar o turno.

## Outras telas úteis

- Ícone de **lista** (canto superior direito): "Registro de ações" — mostra o log de
  cartas jogadas/compradas na rodada, útil pra confirmar que uma ação realmente
  aconteceu.
- Ícone de **engrenagem**: configurações (Geral/Jogabilidade/Áudio) + Comentários/
  Desistir/Salvar e Sair. **Não tem galeria/enciclopédia de cartas aqui** — já
  confirmei isso, não vale a pena procurar de novo.
- As telas de **"REGRAS"** e **"ESQUEMA DO MAPA"** só existem na tela de configurações
  PRÉ-partida (antes de clicar "CRIAR PARTIDA"), não durante o jogo.

## Estratégia de jogo (instrução do usuário)

**Sempre que possível, priorize COMPRAR cartas novas da Dungeon Row/Reserva** (em vez
de só mover ou lutar) — o objetivo desta pesquisa é ver o máximo de cartas diferentes
possível, não vencer a partida. Depois de jogar a mão (botão ▶), gaste o Skill/Swords
gerado comprando/lutando algo na fileira antes de terminar o turno, sempre que o custo
permitir.

**⚠️ Também é obrigatório MOVER o personagem sempre que houver Boots sobrando** —
clicar nas salas adjacentes com brilho/contorno dourado (ver seção "Mover o personagem
pelo tabuleiro") ANTES de clicar em "ENCERRAR TURNO". Erro já cometido uma vez nesta
pesquisa: terminei o turno com Boots > 0 sem mover, só porque cliquei direto no botão
de encerrar e confirmei "SIM" no popup de aviso — o usuário corrigiu isso explicitamente.
Checklist de fim de turno, nesta ordem: (1) jogar a mão toda (▶), (2) comprar/lutar
enquanto o custo permitir, (3) **mover pelas salas adjacentes enquanto Boots > 0**, (4)
só então clicar "ENCERRAR TURNO".

## Onde estão os dados capturados até agora

Ver [`cartas-capturadas.md`](./cartas-capturadas.md) nesta mesma pasta — lista de todas
as cartas já lidas (nome, custo, efeito, texto), o catálogo de nomes ainda faltando, e
observações de regra confirmadas ao vivo (Danger vs Dragon Attack, mecânica de cura,
efeito de "ADQUIRIR" nas Gemas, etc.).
