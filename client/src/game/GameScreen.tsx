import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { BLACK_CUBE_COUNT, BOARD, getCard, HEALTH_TRACK_SIZE, RAGE_TRACK_CUBES } from "@clank/engine";
import type { RoomSnapshot } from "./useClankRoom";
import { cardImageUrl } from "./cardImages";
import { artifactImageUrl, backpackImageUrl, crownImageUrl, masterKeyImageUrl } from "./tokenImages";
import { BoardMap } from "./BoardMap";
import { Avatar, ChoiceModal } from "../App";

export interface GameScreenProps {
  mySessionId: string;
  snapshot: RoomSnapshot;
  hand: string[];
  actionError: string | null;
  onPlayCard: (cardId: string) => void;
  onPlayAllCards: () => void;
  onAcquireCard: (slotIndex: number) => void;
  onFightMonster: (slotIndex: number) => void;
  onAcquireFromReserve: (cardId: string) => void;
  onMovePlayer: (toRoomId: string) => void;
  onTeleportTo: (toRoomId: string) => void;
  onTakeArtifact: () => void;
  onResolveChoice: (optionIndex: number) => void;
  onLeaveDungeon: () => void;
  onBuyMarketItem: (item: "key" | "backpack" | "crown") => void;
  onEndTurn: () => void;
  onLeave: () => void;
}

export const RESOURCE_LABELS: Record<"skill" | "swords" | "boots" | "gold", string> = {
  skill: "Skill",
  swords: "Swords",
  boots: "Boots",
  gold: "Gold",
};

/** Nome em português quando disponível (ver `descriptionPt`/`nomePt` em engine/src/cards.ts) — cai pro nome oficial (inglês) se a carta for desconhecida. */
export function cardName(id: string): string {
  if (!id) return "";
  try {
    return getCard(id).nomePt;
  } catch {
    return id;
  }
}

/**
 * Botão "ⓘ" sobreposto no canto de uma carta — abre `CardDetailModal` com o nome e a
 * descrição em português (`descriptionPt`, ver engine/src/cards.ts). Existe porque a
 * arte real das cartas (foto do card físico) só tem o texto em inglês, e nos tamanhos
 * usados no hand/Dungeon Row/Reserva o texto impresso fica pequeno/cortado demais pra
 * ler — isso dá uma forma de ler a descrição de qualquer tamanho de tela, sem depender
 * de hover (que não existe em touch).
 */
function InfoButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      aria-label="Ver detalhes da carta"
      className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950/80 text-[11px] font-bold text-amber-300 ring-1 ring-amber-400/40 active:scale-90"
    >
      i
    </button>
  );
}

/** Modal de detalhes de uma carta — arte grande + nome e descrição em português. */
function CardDetailModal({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const card = getCard(cardId);
  const url = cardImageUrl(cardId);
  const isMonster = card.kind === "monster";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-slate-900 p-4 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-100">{card.nomePt}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-sm text-slate-400 active:bg-slate-700"
          >
            ✕
          </button>
        </div>
        {url && (
          <img src={url} alt={card.nomePt} className="mx-auto max-h-72 w-auto rounded-lg ring-1 ring-black/40" />
        )}
        <p className="text-sm leading-relaxed text-slate-300">{card.descriptionPt}</p>
        <p className="text-xs font-semibold text-amber-400">
          {isMonster ? `Custo pra vencer: ${card.swordCost ?? 0} Swords` : `Custo pra adquirir: ${card.skillCost ?? 0} Skill`}
          {card.points ? ` · ${card.points} pontos no fim de jogo` : ""}
        </p>
      </motion.div>
    </motion.div>
  );
}

interface HoverInfo {
  cardId: string;
  rect: DOMRect;
}

/**
 * Tooltip de hover (mouse) com nome, custo e descrição em português — renderizado via
 * portal direto em `document.body` de propósito: os cards ficam dentro de containers
 * com `overflow-x-auto`/`overflow-y-auto` (mão, Masmorra, Reserva), e um tooltip
 * absolutamente posicionado DENTRO desses containers seria cortado pelo overflow
 * mesmo com z-index alto. Só existe em telas com mouse de verdade (desktop) — em
 * touch não há `onMouseEnter` de verdade, por isso o botão "ⓘ"/modal continua sendo o
 * caminho principal pra ler a carta no celular.
 */
function HoverCardTooltip({ hover }: { hover: HoverInfo | null }) {
  if (!hover) return null;
  const card = getCard(hover.cardId);
  const isMonster = card.kind === "monster";
  const top = Math.max(8, hover.rect.top - 8);
  const left = Math.min(Math.max(140, hover.rect.left + hover.rect.width / 2), window.innerWidth - 140);

  return createPortal(
    <div
      className="pointer-events-none fixed z-[70] w-64 -translate-x-1/2 -translate-y-full rounded-xl bg-slate-950/95 p-3 text-left shadow-2xl ring-1 ring-amber-400/30"
      style={{ top, left }}
    >
      <p className="text-sm font-bold text-slate-100">{card.nomePt}</p>
      <p className="text-xs font-semibold text-amber-400">
        {isMonster ? `${card.swordCost ?? 0} Swords pra vencer` : `${card.skillCost ?? 0} Skill pra adquirir`}
        {card.points ? ` · ${card.points} pts` : ""}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{card.descriptionPt}</p>
    </div>,
    document.body,
  );
}

/**
 * Trilha de vida em pips (pedido de playtest: "colocar cubos coloridos... vida em
 * pips") — em vez de só o número, mostra os HEALTH_TRACK_SIZE espaços da trilha real,
 * preenchidos (vida restante) ou vazios/escuros (dano já sofrido).
 */
function LifeTrack({ damage }: { damage: number }) {
  return (
    <div className="flex items-center gap-[2px]" title={`Vida: ${HEALTH_TRACK_SIZE - damage}/${HEALTH_TRACK_SIZE}`}>
      {Array.from({ length: HEALTH_TRACK_SIZE }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-1.5 rounded-sm ${i < HEALTH_TRACK_SIZE - damage ? "bg-emerald-400" : "bg-slate-700"}`}
        />
      ))}
    </div>
  );
}

/**
 * Cubos de Clank! do jogador, coloridos com a cor dele — pedido de playtest ("cubos
 * coloridos" pra visualizar o que cada jogador tem no saco do dragão). Limita a
 * exibição pra não estourar o layout com muitos cubos (ex: alguém com Clank alto).
 */
const MAX_VISIBLE_CLANK_CUBES = 10;
function ClankCubes({ count, color }: { count: number; color: string }) {
  const visible = Math.min(count, MAX_VISIBLE_CLANK_CUBES);
  const overflow = count - visible;
  return (
    <div className="flex flex-wrap items-center gap-[2px]" title={`Clank!: ${count}`}>
      {Array.from({ length: visible }, (_, i) => (
        <span key={i} className="h-2.5 w-2.5 rounded-sm ring-1 ring-black/30" style={{ backgroundColor: color }} />
      ))}
      {overflow > 0 && <span className="text-[10px] font-bold text-slate-400">+{overflow}</span>}
    </div>
  );
}

const TUTORIAL_SEEN_KEY = "clank_tutorial_seen";

/**
 * Modal de boas-vindas / tutorial — pedido de playtest ("precisa de historinha o
 * jogo... um tutorialzinho"). Mostra uma vez (guardado em localStorage) na primeira
 * partida, e pode ser reaberto a qualquer momento pelo botão "?" no topo.
 */
function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 px-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-slate-900 p-5 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-bold text-slate-100">🐉 Fuja da Masmorra!</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-sm text-slate-400 active:bg-slate-700"
          >
            ✕
          </button>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          Explore a masmorra, junte um <strong className="text-amber-400">Artefato</strong> e volte
          pra Entrada antes que o Dragão acorde. Quanto mais fundo, mais valioso — mas também mais
          perigoso.
        </p>
        <div className="rounded-xl bg-slate-800/60 p-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">No seu turno</p>
          <ul className="space-y-1 text-sm text-slate-300">
            <li>🃏 Jogue cartas da mão pra ganhar Skill/Swords/Boots/Gold.</li>
            <li>🛒 Use Skill pra comprar cartas da Masmorra ou Reserva.</li>
            <li>⚔️ Use Swords pra derrotar monstros.</li>
            <li>👣 Use Boots pra se mover pelos túneis do mapa.</li>
          </ul>
        </div>
        <div className="rounded-xl bg-red-950/40 p-3 ring-1 ring-red-500/20">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-red-300/80">Cuidado com o Clank!</p>
          <p className="text-sm text-slate-300">
            Várias cartas geram Clank! (barulho) — os cubos coloridos que aparecem no seu perfil.
            De vez em quando o Dragão ataca e sorteia cubos de um saco; se sair o SEU cubo, você
            leva dano. Quanto mais Clank! você tiver, mais chance de ser atingido.
          </p>
        </div>
        <div className="rounded-xl bg-emerald-950/30 p-3 ring-1 ring-emerald-500/20">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300/80">Fim de jogo</p>
          <p className="text-sm text-slate-300">
            Volte pra Entrada carregando um Artefato pra escapar (e ganhar um bônus de pontos). Se
            todo mundo escapar ou ser nocauteado, a partida acaba — quem tiver mais pontos vence.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-amber-950 active:scale-[0.98]"
        >
          Entendi, vamos lá!
        </button>
      </motion.div>
    </motion.div>
  );
}

export function GameScreen({
  mySessionId,
  snapshot,
  hand,
  actionError,
  onPlayCard,
  onPlayAllCards,
  onAcquireCard,
  onFightMonster,
  onAcquireFromReserve,
  onMovePlayer,
  onTeleportTo,
  onTakeArtifact,
  onResolveChoice,
  onLeaveDungeon,
  onBuyMarketItem,
  onEndTurn,
  onLeave,
}: GameScreenProps) {
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return !localStorage.getItem(TUTORIAL_SEEN_KEY);
    } catch {
      return false;
    }
  });
  const closeTutorial = () => {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    } catch {
      // localStorage indisponível -- sem-op, só reaparece toda vez
    }
  };
  const showHover = (cardId: string) => (e: React.MouseEvent<HTMLElement>) =>
    setHover({ cardId, rect: e.currentTarget.getBoundingClientRect() });
  const hideHover = () => setHover(null);
  const isMyTurn = snapshot.currentPlayerId === mySessionId;
  const me = snapshot.players.find((p) => p.id === mySessionId);
  const currentPlayer = snapshot.players.find((p) => p.id === snapshot.currentPlayerId);
  const totalPlayerClank = snapshot.players.reduce((sum, p) => sum + p.clank, 0);
  const bagCubeCount = totalPlayerClank + snapshot.blackCubesInBag;
  const myRoom = me ? BOARD.rooms[me.roomId] : undefined;
  const hasUnclaimedArtifact = !!myRoom?.artifactValue && !snapshot.claimedArtifacts[myRoom.id];
  const canLeaveDungeon = !!myRoom?.isEntrance;
  const artifactLimit = me?.hasBackpack ? 2 : 1;

  // Flash de "comprado"/"derrotado" na Masmorra: compara o snapshot anterior dos slots
  // com o atual — qualquer slot cujo cardId mudou teve sua carta anterior comprada
  // (se não era monstro) ou derrotada (se era), então acende um flash rápido nele.
  const prevSlotsRef = useRef<string[]>([]);
  const [dungeonFlashes, setDungeonFlashes] = useState<Record<number, "bought" | "defeated">>({});
  useEffect(() => {
    const prev = prevSlotsRef.current;
    const curr = snapshot.dungeonRowSlots;
    const next: Record<number, "bought" | "defeated"> = {};
    curr.forEach((cardId, i) => {
      const prevId = prev[i];
      if (prevId && cardId !== prevId) {
        try {
          next[i] = getCard(prevId).kind === "monster" ? "defeated" : "bought";
        } catch {
          // carta antiga desconhecida -- ignora o flash pra esse slot
        }
      }
    });
    prevSlotsRef.current = curr;
    if (Object.keys(next).length === 0) return;
    setDungeonFlashes(next);
    const timer = setTimeout(() => setDungeonFlashes({}), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.dungeonRowSlots.join(",")]);
  const atArtifactLimit = (me?.artifactsCarried ?? 0) >= artifactLimit;

  // Chave estável por carta na mão: usar `${cardId}-${index}` quebra o AnimatePresence
  // quando uma carta no meio da mão é jogada — todo card DEPOIS dela muda de índice e
  // vira "remove+add" em vez de continuar sendo o mesmo card, gerando fantasmas na tela.
  // Aqui cada slot da mão recebe uma chave estável entre renders (casada por cardId,
  // na ordem em que já apareciam), então só a carta realmente jogada sai da lista.
  const handKeysRef = useRef<{ cardId: string; key: string }[]>([]);
  const nextHandKeyRef = useRef(0);
  const keyedHand = useMemo(() => {
    const available = new Map<string, string[]>();
    for (const { cardId, key } of handKeysRef.current) {
      const list = available.get(cardId) ?? [];
      list.push(key);
      available.set(cardId, list);
    }
    const next = hand.map((cardId) => {
      const list = available.get(cardId);
      const key = list && list.length > 0 ? list.shift()! : `hand-${nextHandKeyRef.current++}`;
      return { cardId, key };
    });
    handKeysRef.current = next;
    return next;
  }, [hand]);

  return (
    <main className="flex h-dvh w-dvw flex-col overflow-y-auto bg-slate-950 font-sans text-slate-100 select-none md:flex-row md:overflow-hidden">
      {/* Sem AnimatePresence: exit nunca completa nesse ambiente (ver nota grande mais abaixo,
          na mão) — aqui seria pior que fantasma, travaria a tela inteira (modal em tela cheia
          que nunca some ao fechar). Sem exit, fecha instantâneo; entrada continua animada. */}
      {detailCardId && <CardDetailModal cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
      {showTutorial && <WelcomeModal onClose={closeTutorial} />}
      <HoverCardTooltip hover={hover} />

      {/* LEFT SIDEBAR: Dragon + Players */}
      <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900 z-10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] md:h-full md:w-64 md:border-b-0 md:border-r md:shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center border-b border-slate-800 bg-slate-950 p-4">
          <div className="relative mb-2 h-20 w-20 rounded-full border-4 border-slate-800 bg-slate-900 shadow-inner flex items-center justify-center overflow-hidden">
             {/* Simulação da cabeça do dragão */}
             <span className="text-4xl filter grayscale contrast-125 sepia hover:grayscale-0 transition-all duration-500">🐉</span>
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Fúria do Dragão</p>
          <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold text-amber-500">
            {snapshot.dragonRageTrack}
            <span className="text-sm text-slate-500">
              (sorteia {RAGE_TRACK_CUBES[Math.min(RAGE_TRACK_CUBES.length, Math.max(1, snapshot.dragonRageTrack)) - 1] ?? 0})
            </span>
          </div>
          <div
            className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400"
            title={`Cubos no saco agora: ${bagCubeCount} (${totalPlayerClank} de jogadores + ${snapshot.blackCubesInBag}/${BLACK_CUBE_COUNT} pretos restantes)`}
          >
            🎒 <span className="font-mono font-semibold text-slate-300">{bagCubeCount}</span> no saco
            <span className="text-slate-600">({snapshot.blackCubesInBag}/{BLACK_CUBE_COUNT} pretos)</span>
          </div>
        </div>

        <div className="flex max-h-40 flex-1 overflow-y-auto p-3 md:max-h-none space-x-3 md:space-x-0 md:space-y-3 flex md:block">
          {snapshot.players.map((p) => (
            <div key={p.id} className={`relative flex shrink-0 w-56 md:w-auto flex-col gap-2 rounded-xl border p-3 shadow-sm ${p.id === snapshot.currentPlayerId ? 'border-amber-500/50 bg-slate-800/80 ring-1 ring-amber-500/30' : 'border-slate-700/50 bg-slate-800/30'}`}>
              <div className="flex items-center gap-2">
                <Avatar name={p.name} color={p.color} size="md" />
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-tight truncate w-32">{p.name}</span>
                  <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
                    {p.id === snapshot.currentPlayerId ? 'Turno Atual' : p.knockedOut ? 'Nocauteado' : p.hasLeftDungeon ? 'Escapou' : 'Aguardando'}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5 rounded-lg border border-slate-700/50 bg-slate-950/50 p-1.5">
                <div className="flex items-center justify-between text-xs font-mono font-semibold">
                  <span className="flex items-center gap-1 text-emerald-400" title="Vida">
                    ❤ {HEALTH_TRACK_SIZE - p.damage}
                  </span>
                  <span className="flex items-center gap-1 text-amber-300" title="Pontos">
                    ★ {p.points}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300" title="Clank (Cubos)">
                    🔔 {p.clank}
                  </span>
                </div>
                <LifeTrack damage={p.damage} />
                {p.clank > 0 && <ClankCubes count={p.clank} color={p.color} />}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span title="Cartas na mão">✋ {p.handCount}</span>
                <span title="Cartas no monte de compra">🂠 {p.drawPileCount}</span>
                <span title="Cartas na pilha de descarte">🗑 {p.discardPileCount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Eventos ao vivo — antes só aparecia no lobby/fim de jogo, não durante a partida */}
        <div className="hidden max-h-40 flex-col border-t border-slate-800 bg-slate-950/50 p-3 md:flex">
          <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Eventos</h3>
          <ul className="flex-1 space-y-1 overflow-y-auto text-[11px] leading-tight text-slate-400">
            {snapshot.log.length === 0 && <li className="italic text-slate-600">Nenhum evento ainda.</li>}
            {[...snapshot.log].reverse().slice(0, 20).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="hidden border-t border-slate-800 bg-slate-950/50 p-3 md:flex md:gap-2">
          <button onClick={onLeave} className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 active:bg-slate-700 transition-colors">
            Abandonar Partida
          </button>
          <button
            onClick={() => setShowTutorial(true)}
            aria-label="Ajuda / tutorial"
            title="Como jogar"
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 active:bg-slate-700 transition-colors"
          >
            ?
          </button>
        </div>
      </aside>

      {/* CENTER: Board + Bottom Panel */}
      <section className="flex min-h-[60vh] flex-1 flex-col relative overflow-hidden bg-slate-950 md:min-h-0">

        {isMyTurn && snapshot.pendingChoice && (
          <ChoiceModal choice={snapshot.pendingChoice} onChoose={onResolveChoice} />
        )}

        {/* Banner de turno — bem visível quem está jogando agora, pedido explícito de playtest.
            Sem AnimatePresence/mode="wait": nesse ambiente o exit nunca completa, e com
            mode="wait" isso travaria o banner ANTIGO pra sempre (a troca de jogador nunca
            apareceria, já que o "wait" espera o exit terminar antes de montar o próximo). */}
        <motion.div
          key={snapshot.currentPlayerId}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-0 top-0 z-30 flex justify-center pt-2"
        >
          {isMyTurn ? (
            <span className="animate-pulse rounded-full bg-amber-500 px-5 py-1.5 text-sm font-black uppercase tracking-widest text-amber-950 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
              Sua vez!
            </span>
          ) : (
            <span
              className="flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-1.5 text-sm font-bold text-slate-100 shadow-lg ring-1 ring-white/10 backdrop-blur"
              style={{ boxShadow: currentPlayer ? `0 0 16px ${currentPlayer.color}55` : undefined }}
            >
              {currentPlayer && <Avatar name={currentPlayer.name} color={currentPlayer.color} />}
              Vez de {currentPlayer?.name ?? "?"}
            </span>
          )}
        </motion.div>

        {/* Board Area */}
        <div className="relative flex-1 overflow-hidden">
          <BoardMap
            players={snapshot.players.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              roomId: p.roomId,
              knockedOut: p.knockedOut,
              hasLeftDungeon: p.hasLeftDungeon,
            }))}
            claimedArtifacts={snapshot.claimedArtifacts}
            currentRoomId={myRoom?.id}
            reachableRoomIds={new Set(myRoom?.tunnels.map((t) => t.to) ?? [])}
            onRoomClick={isMyTurn ? (snapshot.pendingTeleport ? onTeleportTo : onMovePlayer) : undefined}
          />

          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              className="absolute top-6 left-1/2 z-50 rounded-xl bg-red-950/90 px-6 py-3 text-sm font-semibold text-red-200 shadow-2xl ring-1 ring-red-500/50 backdrop-blur-sm pointer-events-none"
            >
              {actionError}
            </motion.div>
          )}

          {isMyTurn && snapshot.pendingTeleport && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              className="absolute top-6 left-1/2 z-40 rounded-xl bg-indigo-950/90 px-6 py-3 text-center text-sm font-semibold text-indigo-200 shadow-2xl ring-1 ring-indigo-400/50 backdrop-blur-sm"
            >
              ✨ {snapshot.pendingTeleport.cardName}: escolha uma câmara adjacente no mapa pra teleportar.
            </motion.div>
          )}

          {/* Floating Actions overlay for current room */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2">
             {hasUnclaimedArtifact && (
              <button
                onClick={onTakeArtifact}
                disabled={!isMyTurn || atArtifactLimit}
                className="flex items-center gap-2 rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg backdrop-blur hover:bg-amber-400 active:scale-95 disabled:opacity-40 transition-all"
              >
                {artifactImageUrl(myRoom!.artifactValue!) && (
                  <img src={artifactImageUrl(myRoom!.artifactValue!)} alt="" className="h-6 w-6 object-contain drop-shadow" />
                )}
                Pegar Artefato ({myRoom!.artifactValue})
              </button>
            )}
            {canLeaveDungeon && (
              <button
                onClick={onLeaveDungeon}
                disabled={!isMyTurn}
                className="rounded-xl bg-emerald-600/90 px-4 py-2 text-sm font-bold text-emerald-50 shadow-lg backdrop-blur hover:bg-emerald-500 active:scale-95 disabled:opacity-40 transition-all"
              >
                Sair da Masmorra!
              </button>
            )}
          </div>
        </div>

        {/* Bottom Panel: Hand & Resources */}
        <div className="relative flex shrink-0 h-44 flex-col border-t border-slate-800 bg-slate-900 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-20 sm:h-48 sm:flex-row">

           {/* Cards Hand */}
           <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 sm:px-8 flex items-end pb-2" style={{ scrollbarWidth: 'none' }}>
             <div className="flex items-end h-full pt-4">
                {/*
                  Sem AnimatePresence aqui de propósito: descobri ao vivo (playtest 2026-07-28)
                  que o exit tracking dela nunca completa nessa combinação de React 19 +
                  framer-motion 12 — cartas jogadas ficam "fantasmas" na tela pra sempre
                  (visíveis e clicáveis, mesmo com handCount/hand já zerados). Sem exit, a
                  carta só some instantaneamente ao ser jogada; a entrada (initial/animate)
                  e o hover continuam normais.
                */}
                <>
                  {keyedHand.map(({ cardId, key }, i) => {
                    const url = cardImageUrl(cardId);
                    return (
                      <motion.div
                        key={key}
                        role="button"
                        tabIndex={isMyTurn ? 0 : -1}
                        aria-disabled={!isMyTurn}
                        aria-label={`Jogar ${cardName(cardId)}`}
                        initial={{ opacity: 0, y: 40, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        onClick={() => isMyTurn && onPlayCard(cardId)}
                        onKeyDown={(e) => {
                          if (isMyTurn && (e.key === "Enter" || e.key === " ")) onPlayCard(cardId);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setDetailCardId(cardId);
                        }}
                        onMouseEnter={showHover(cardId)}
                        onMouseLeave={hideHover}
                        whileHover={{ y: -30, scale: 1.35, rotate: -2, zIndex: 30 }}
                        whileTap={isMyTurn ? { scale: 0.95 } : undefined}
                        className={`group relative -ml-8 first:ml-0 sm:-ml-12 rounded-lg shadow-2xl transition-shadow ${isMyTurn ? "cursor-pointer" : "opacity-80 cursor-default"}`}
                        style={{
                          transformOrigin: 'bottom center',
                          zIndex: i,
                        }}
                      >
                        <InfoButton onClick={() => setDetailCardId(cardId)} />
                        {url ? (
                           <img src={url} alt={cardName(cardId)} className="w-24 h-auto rounded-lg ring-1 ring-black/40 group-hover:ring-amber-400 group-hover:ring-2 sm:w-32" />
                        ) : (
                           <div className="w-24 h-36 sm:w-32 sm:h-44 bg-slate-700 rounded-lg border-2 border-slate-600 flex flex-col items-center justify-center p-2 text-center group-hover:border-amber-400">
                             <span className="font-bold text-sm text-slate-200">{cardName(cardId)}</span>
                           </div>
                        )}
                        {/* Badge "Jogar" — no touch aparece junto com o botão de info, já que não existe hover de verdade */}
                        <div className="absolute inset-x-0 bottom-2 opacity-0 group-hover:opacity-100 flex justify-center transition-opacity">
                           <span className="bg-amber-500 text-amber-950 font-bold text-xs px-3 py-1 rounded-full shadow-lg">Jogar</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
             </div>
           </div>

           {/* Resources / End Turn */}
           {me && (
             <div className="w-full shrink-0 border-t border-slate-800 bg-slate-950/50 p-3 flex flex-row items-center gap-3 sm:w-[340px] sm:flex-col sm:items-stretch sm:justify-between sm:border-l sm:border-t-0 sm:p-4">
                <div className="grid flex-1 grid-cols-4 gap-2">
                  {(["skill", "swords", "boots", "gold"] as const).map((key) => (
                    <div key={key} className="flex flex-col items-center justify-center rounded-lg bg-slate-800/80 py-2 border border-slate-700/50 shadow-inner">
                      <motion.span
                        key={me[key]}
                        initial={{ scale: 1.4, color: "#fbbf24" }}
                        animate={{ scale: 1, color: "#fbbf24" }}
                        className="text-xl font-bold"
                      >
                        {me[key]}
                      </motion.span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">{RESOURCE_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 gap-2 sm:mt-3 sm:flex-col">
                  {hand.length > 1 && (
                    <button
                      onClick={onPlayAllCards}
                      disabled={!isMyTurn}
                      title="Joga todas as cartas da mão, na ordem"
                      className="rounded-xl bg-slate-700 px-3 py-3 text-xs font-bold text-slate-200 active:scale-95 disabled:opacity-30 sm:w-full"
                    >
                      Jogar Todas
                    </button>
                  )}
                  <button
                    onClick={onEndTurn}
                    disabled={!isMyTurn}
                    className="flex-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-3 text-sm font-bold text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:from-amber-300 hover:to-amber-500 active:scale-95 disabled:opacity-30 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none transition-all uppercase tracking-widest sm:w-full"
                  >
                    Terminar Turno
                  </button>
                </div>
             </div>
           )}

        </div>
      </section>

      {/* RIGHT SIDEBAR: Dungeon Row & Market */}
      <aside className="flex w-full shrink-0 flex-col border-t border-slate-800 bg-slate-900 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] md:h-full md:w-72 md:border-t-0 md:border-l md:shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="flex max-h-[45vh] flex-col overflow-y-auto p-3 gap-4 md:max-h-none md:h-full" style={{ scrollbarWidth: 'thin' }}>

          {/* Market area */}
          {myRoom?.isMarket && (
            <div className="rounded-xl border border-amber-600/30 bg-amber-900/10 p-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3 flex items-center justify-between">
                Mercado <span>(7💰)</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => onBuyMarketItem("key")}
                  disabled={!isMyTurn || !snapshot.marketKeyAvailable || !!me?.hasMasterKey}
                  className="group flex-1 flex flex-col items-center p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 hover:border-amber-500/50 disabled:opacity-40 transition-colors"
                >
                  <img src={masterKeyImageUrl} alt="" className="h-8 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Chave</span>
                </button>
                <button
                  onClick={() => onBuyMarketItem("backpack")}
                  disabled={!isMyTurn || !snapshot.marketBackpackAvailable || !!me?.hasBackpack}
                  className="group flex-1 flex flex-col items-center p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 hover:border-amber-500/50 disabled:opacity-40 transition-colors"
                >
                  <img src={backpackImageUrl} alt="" className="h-8 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Mochila</span>
                </button>
                <button
                  onClick={() => onBuyMarketItem("crown")}
                  disabled={!isMyTurn || snapshot.marketCrownsAvailable.length === 0}
                  className="group flex-1 flex flex-col items-center p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 hover:border-amber-500/50 disabled:opacity-40 transition-colors"
                >
                  {snapshot.marketCrownsAvailable[0] !== undefined && (
                    <img src={crownImageUrl(snapshot.marketCrownsAvailable[0])} alt="" className="h-8 mb-1 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-bold">Coroa</span>
                </button>
              </div>
            </div>
          )}

          {/* Dungeon Row */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Masmorra</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-2">
              {/* Sem AnimatePresence: mesmo problema da mão (exit nunca completa nesse
                  ambiente) — aqui travaria o card antigo visível pra sempre ocupando uma
                  célula extra do grid a cada compra/derrota, bagunçando o layout de vez. */}
              {snapshot.dungeonRowSlots.map((cardId, slotIndex) => {
                  if (!cardId) {
                    return (
                      <div key={slotIndex} className="aspect-[2/3] rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600">Vazio</span>
                      </div>
                    );
                  }
                  const card = getCard(cardId);
                  const isMonster = card.kind === "monster";
                  const url = cardImageUrl(cardId);

                  return (
                    <motion.div
                      key={`${slotIndex}-${cardId}`}
                      layout
                      role="button"
                      tabIndex={isMyTurn ? 0 : -1}
                      aria-disabled={!isMyTurn}
                      aria-label={`${isMonster ? "Atacar" : "Comprar"} ${card.nomePt}`}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => isMyTurn && (isMonster ? onFightMonster(slotIndex) : onAcquireCard(slotIndex))}
                      onKeyDown={(e) => {
                        if (!isMyTurn || (e.key !== "Enter" && e.key !== " ")) return;
                        isMonster ? onFightMonster(slotIndex) : onAcquireCard(slotIndex);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setDetailCardId(cardId);
                      }}
                      onMouseEnter={showHover(cardId)}
                      onMouseLeave={hideHover}
                      whileHover={{ scale: 1.18, zIndex: 40 }}
                      className={`relative group aspect-[2/3] rounded-lg border border-slate-700 bg-slate-800 overflow-hidden hover:border-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-[border-color,box-shadow] active:scale-95 flex flex-col ${isMyTurn ? "cursor-pointer" : "opacity-60 cursor-default"}`}
                    >
                      <InfoButton onClick={() => setDetailCardId(cardId)} />
                      {url ? (
                        <img src={url} alt={card.nomePt} className="w-full flex-1 object-contain bg-slate-950" />
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-1">
                          <span className="text-[10px] font-bold text-slate-300 leading-tight text-center">{card.nomePt}</span>
                        </div>
                      )}
                      <div className={`shrink-0 h-6 flex items-center justify-center font-bold text-xs ${isMonster ? 'bg-red-900/90 text-red-200' : 'bg-indigo-900/90 text-indigo-200'} backdrop-blur w-full border-t border-slate-900/50`}>
                        {isMonster ? `${card.swordCost ?? 0} ⚔` : `${card.skillCost ?? 0} ✦`}
                      </div>
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                        <span className="bg-amber-500 text-amber-950 px-2 py-1 rounded text-xs font-bold">
                          {isMonster ? 'Atacar' : 'Comprar'}
                        </span>
                      </div>
                      {/* Flash de "comprada"/"derrotado" -- acende quando ESSE slot acabou de
                          trocar de carta. Sem AnimatePresence/exit (mesmo motivo de cima) —
                          o próprio `animate` já desvanece pra opacity 0 antes do estado
                          limpar (800ms), então não perde o efeito visual removendo o exit. */}
                      {dungeonFlashes[slotIndex] && (
                        <motion.div
                          initial={{ opacity: 0.95 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.75 }}
                          className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg text-center text-xs font-black uppercase leading-tight tracking-wide ${
                            dungeonFlashes[slotIndex] === "bought" ? "bg-amber-400/60 text-amber-950" : "bg-red-500/60 text-red-950"
                          }`}
                        >
                          {dungeonFlashes[slotIndex] === "bought" ? "Comprada!" : "Derrotado!"}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </div>

          {/* Reserve */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Reserva</h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-3">
              {Object.entries(snapshot.reserveRemaining).map(([cardId, remaining]) => {
                const card = getCard(cardId);
                const isMonster = card.kind === "monster";
                const url = cardImageUrl(cardId);

                const canAct = isMyTurn && remaining > 0;
                return (
                  <div
                    key={cardId}
                    role="button"
                    tabIndex={canAct ? 0 : -1}
                    aria-disabled={!canAct}
                    aria-label={`${isMonster ? "Lutar" : "Comprar"} ${card.nomePt}`}
                    onClick={() => canAct && onAcquireFromReserve(cardId)}
                    onKeyDown={(e) => {
                      if (canAct && (e.key === "Enter" || e.key === " ")) onAcquireFromReserve(cardId);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setDetailCardId(cardId);
                    }}
                    onMouseEnter={showHover(cardId)}
                    onMouseLeave={hideHover}
                    className={`relative group aspect-[2/3] rounded-lg border border-slate-700 bg-slate-800 overflow-hidden hover:z-40 hover:scale-125 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-transform active:scale-95 ${canAct ? "cursor-pointer" : "opacity-40 cursor-default"}`}
                  >
                    <InfoButton onClick={() => setDetailCardId(cardId)} />
                    {url ? (
                       <img src={url} alt={card.nomePt} className="w-full h-full object-contain bg-slate-950" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center p-1 bg-slate-700"><span className="text-[9px] font-bold text-slate-300 leading-tight text-center">{card.nomePt}</span></div>
                    )}
                    <div className="absolute top-1 left-1 bg-slate-950/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-700">
                      x{remaining}
                    </div>
                    {!isMonster && (
                      <div className="absolute bottom-0 inset-x-0 h-5 flex items-center justify-center bg-slate-900/90 text-[10px] font-bold text-indigo-300 backdrop-blur">
                        {card.skillCost ?? 0} ✦
                      </div>
                    )}
                    {isMonster && (
                      <div className="absolute bottom-0 inset-x-0 h-5 flex items-center justify-center bg-slate-900/90 text-[10px] font-bold text-red-300 backdrop-blur">
                        {card.swordCost ?? 0} ⚔
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex gap-2 md:hidden">
            <button onClick={onLeave} className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 active:bg-slate-700">
              Abandonar Partida
            </button>
            <button
              onClick={() => setShowTutorial(true)}
              aria-label="Ajuda / tutorial"
              title="Como jogar"
              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 active:bg-slate-700"
            >
              ?
            </button>
          </div>
        </div>
      </aside>
    </main>
  );
}
