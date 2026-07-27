import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BOARD, getCard, HEALTH_TRACK_SIZE } from "@clank/engine";
import { useClankRoom } from "./game/useClankRoom";
import type { ChoiceIcon, PendingChoiceSnapshot, RoomSnapshot } from "./game/useClankRoom";
import { BoardMap } from "./game/BoardMap";
import { PLAYER_COLORS } from "./game/playerColors";

function cardName(id: string): string {
  if (!id) return "";
  try {
    return getCard(id).name;
  } catch {
    return id;
  }
}

/** Avatar sem arte oficial: círculo colorido com a inicial do nome. */
function Avatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const dims = size === "md" ? "h-8 w-8 text-sm" : "h-5 w-5 text-[10px]";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-bold text-slate-950`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}

const CHOICE_ICON_EMOJI: Record<ChoiceIcon, string> = {
  skill: "💎",
  swords: "⚔️",
  boots: "👢",
  gold: "💰",
  clank: "🔔",
  heal: "❤️",
  drawCards: "🃏",
};

/**
 * Overlay bloqueante pra escolhas "X -OU- Y" (ex: Shrine "USE: $1 -OU- cura 1") — o
 * jogador precisa escolher uma opção antes de fazer qualquer outra ação (o motor já
 * bloqueia isso do lado do servidor; este modal só torna a escolha visível/clicável).
 */
function ChoiceModal({
  choice,
  onChoose,
}: {
  choice: PendingChoiceSnapshot;
  onChoose: (optionIndex: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl bg-slate-900 p-5 shadow-2xl ring-1 ring-white/10"
      >
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{choice.cardName}</p>
        <p className="mb-4 text-lg font-bold text-slate-100">Escolha um efeito</p>
        <div className="flex flex-col gap-2">
          {choice.options.map((option, i) => (
            <button
              key={i}
              onClick={() => onChoose(i)}
              className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-left active:scale-[0.98] active:bg-slate-700"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <span className="text-xl">{CHOICE_ICON_EMOJI[option.icon]}</span>
                {option.label}
              </span>
              <span className="text-lg font-bold text-amber-400">+{option.amount}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const {
    room,
    snapshot,
    hand,
    error,
    actionError,
    connecting,
    reconnecting,
    createRoom,
    joinRoom,
    toggleReady,
    setColor,
    startGame,
    playCard,
    acquireCard,
    fightMonster,
    acquireFromReserve,
    movePlayer,
    takeArtifact,
    takeMonkeyIdol,
    resolveChoice,
    leaveDungeon,
    buyMarketItem,
    endTurn,
    leaveRoom,
  } = useClankRoom();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  if (reconnecting && (!room || !snapshot)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 text-slate-100">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-400" />
          <p className="text-sm text-slate-400">Reconectando à sala...</p>
        </div>
      </main>
    );
  }

  if (!room || !snapshot) {
    return (
      <HomeScreen
        name={name}
        joinCode={joinCode}
        connecting={connecting}
        error={error}
        onNameChange={setName}
        onJoinCodeChange={setJoinCode}
        onCreate={() => createRoom(name || "Jogador")}
        onJoin={() => joinRoom(joinCode, name || "Jogador")}
      />
    );
  }

  if (snapshot.phase === "ended") {
    return <EndScreen snapshot={snapshot} onLeave={leaveRoom} />;
  }

  if (snapshot.phase === "playing") {
    return (
      <GameScreen
        mySessionId={room.sessionId}
        snapshot={snapshot}
        hand={hand}
        actionError={actionError}
        onPlayCard={playCard}
        onAcquireCard={acquireCard}
        onFightMonster={fightMonster}
        onAcquireFromReserve={acquireFromReserve}
        onMovePlayer={movePlayer}
        onTakeArtifact={takeArtifact}
        onTakeMonkeyIdol={takeMonkeyIdol}
        onResolveChoice={resolveChoice}
        onLeaveDungeon={leaveDungeon}
        onBuyMarketItem={buyMarketItem}
        onEndTurn={endTurn}
        onLeave={leaveRoom}
      />
    );
  }

  return (
    <LobbyScreen
      roomId={room.roomId}
      mySessionId={room.sessionId}
      snapshot={snapshot}
      onToggleReady={toggleReady}
      onSetColor={setColor}
      onStartGame={startGame}
      onLeave={leaveRoom}
    />
  );
}

interface HomeScreenProps {
  name: string;
  joinCode: string;
  connecting: boolean;
  error: string | null;
  onNameChange: (v: string) => void;
  onJoinCodeChange: (v: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

function HomeScreen({
  name,
  joinCode,
  connecting,
  error,
  onNameChange,
  onJoinCodeChange,
  onCreate,
  onJoin,
}: HomeScreenProps) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-100">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-amber-400">Clank Web</h1>
          <p className="text-sm text-slate-400">Fuja da mina com o tesouro antes do dragão acordar.</p>
        </header>

        <div className="space-y-3 rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <label className="block text-sm font-medium text-slate-300">
            Seu nome
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              maxLength={20}
              placeholder="Ex: Anderson"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 outline-none focus:border-amber-400"
            />
          </label>

          <button
            onClick={onCreate}
            disabled={connecting}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-50"
          >
            Criar sala nova
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="h-px flex-1 bg-slate-700" />
            ou entre com um código
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => onJoinCodeChange(e.target.value)}
              placeholder="Código da sala"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-100 outline-none focus:border-amber-400"
            />
            <button
              onClick={onJoin}
              disabled={connecting || !joinCode.trim()}
              className="shrink-0 rounded-xl bg-slate-700 px-4 py-3 text-base font-semibold text-slate-100 active:scale-[0.98] disabled:opacity-50"
            >
              Entrar
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </main>
  );
}

interface LobbyScreenProps {
  roomId: string;
  mySessionId: string;
  snapshot: RoomSnapshot;
  onToggleReady: () => void;
  onSetColor: (color: string) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

function LobbyScreen({ roomId, mySessionId, snapshot, onToggleReady, onSetColor, onStartGame, onLeave }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const me = snapshot.players.find((p) => p.id === mySessionId);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex: contexto não seguro) — sem-op, o código continua visível na tela
    }
  };

  const allReady = snapshot.players.length > 0 && snapshot.players.every((p) => p.ready);

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-100">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">Código da sala</p>
            <button
              onClick={copyCode}
              className="font-mono text-lg font-bold tracking-widest text-amber-400"
            >
              {roomId} {copied ? "✓" : "⧉"}
            </button>
          </div>
          <button onClick={onLeave} className="rounded-lg px-3 py-2 text-sm text-slate-400 active:bg-slate-800">
            Sair
          </button>
        </header>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Jogadores ({snapshot.players.length}/4)
          </h2>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {snapshot.players.map((p) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    <Avatar name={p.name} color={p.color} />
                    <span className={p.connected ? "" : "text-slate-500 line-through"}>
                      {p.name}
                      {!p.connected && " (desconectado)"}
                    </span>
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      p.ready ? "bg-emerald-600 text-emerald-50" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {p.ready ? "Pronto" : "Aguardando"}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>

        {me && (
          <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
            <h2 className="mb-2 text-sm font-semibold text-slate-300">Sua cor</h2>
            <div className="flex gap-2">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSetColor(c.hex)}
                  aria-label={`Escolher cor ${c.id}`}
                  className={`h-11 w-11 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 active:scale-95 ${
                    me.color === c.hex ? "ring-white" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={onToggleReady}
            className="rounded-xl bg-slate-700 px-4 py-4 text-base font-semibold active:scale-[0.98]"
          >
            Pronto / Não pronto
          </button>
          <button
            onClick={onStartGame}
            disabled={!allReady}
            className="rounded-xl bg-amber-500 px-4 py-4 text-base font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-50"
          >
            Começar partida
          </button>
        </section>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Eventos</h2>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-400">
            {snapshot.log.length === 0 && <li className="italic">Nenhum evento ainda.</li>}
            {[...snapshot.log].reverse().map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

interface GameScreenProps {
  mySessionId: string;
  snapshot: RoomSnapshot;
  hand: string[];
  actionError: string | null;
  onPlayCard: (cardId: string) => void;
  onAcquireCard: (slotIndex: number) => void;
  onFightMonster: (slotIndex: number) => void;
  onAcquireFromReserve: (cardId: string) => void;
  onMovePlayer: (toRoomId: string) => void;
  onTakeArtifact: () => void;
  onTakeMonkeyIdol: () => void;
  onResolveChoice: (optionIndex: number) => void;
  onLeaveDungeon: () => void;
  onBuyMarketItem: (item: "key" | "backpack" | "crown") => void;
  onEndTurn: () => void;
  onLeave: () => void;
}

const RESOURCE_LABELS: Record<"skill" | "swords" | "boots" | "gold", string> = {
  skill: "Skill",
  swords: "Swords",
  boots: "Boots",
  gold: "Gold",
};

function GameScreen({
  mySessionId,
  snapshot,
  hand,
  actionError,
  onPlayCard,
  onAcquireCard,
  onFightMonster,
  onAcquireFromReserve,
  onMovePlayer,
  onTakeArtifact,
  onTakeMonkeyIdol,
  onResolveChoice,
  onLeaveDungeon,
  onBuyMarketItem,
  onEndTurn,
  onLeave,
}: GameScreenProps) {
  const isMyTurn = snapshot.currentPlayerId === mySessionId;
  const me = snapshot.players.find((p) => p.id === mySessionId);
  const currentPlayerName = snapshot.players.find((p) => p.id === snapshot.currentPlayerId)?.name ?? "?";
  const myRoom = me ? BOARD.rooms[me.roomId] : undefined;
  const hasUnclaimedArtifact = !!myRoom?.artifactValue && !snapshot.claimedArtifacts[myRoom.id];
  const unclaimedMonkeyIdol = myRoom?.monkeyIdolNames?.find((n) => !snapshot.claimedMonkeyIdols[n]);
  const canLeaveDungeon = !!myRoom?.isEntrance;
  const artifactLimit = me?.hasBackpack ? 2 : 1;
  const atArtifactLimit = (me?.artifactsCarried ?? 0) >= artifactLimit;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-100">
      <div className="mx-auto flex max-w-md flex-col gap-4 pb-8">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar
              name={currentPlayerName}
              color={snapshot.players.find((p) => p.id === snapshot.currentPlayerId)?.color ?? "#64748b"}
              size="md"
            />
            <div>
              <p className="text-xs text-slate-400">Turno {snapshot.turnNumber}</p>
              <p className={`text-lg font-bold ${isMyTurn ? "text-amber-400" : "text-slate-100"}`}>
                {isMyTurn ? "Sua vez!" : `Vez de ${currentPlayerName}`}
              </p>
            </div>
          </div>
          <button onClick={onLeave} className="rounded-lg px-3 py-2 text-sm text-slate-400 active:bg-slate-800">
            Sair
          </button>
        </header>

        <AnimatePresence>
          {isMyTurn && snapshot.pendingChoice && (
            <ChoiceModal choice={snapshot.pendingChoice} onChoose={onResolveChoice} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {actionError && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-red-900/60 px-4 py-2 text-sm text-red-200 ring-1 ring-red-700"
            >
              {actionError}
            </motion.p>
          )}
        </AnimatePresence>

        {me && (
          <section className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-900/70 p-3 shadow-xl ring-1 ring-white/10">
            {(["skill", "swords", "boots", "gold"] as const).map((key) => (
              <div key={key} className="flex flex-col items-center rounded-xl bg-slate-800 py-2">
                <span className="text-lg font-bold text-amber-400">{me[key]}</span>
                <span className="text-[10px] uppercase text-slate-400">{RESOURCE_LABELS[key]}</span>
              </div>
            ))}
          </section>
        )}

        {me && (
          <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Vida</span>
              <span>
                {HEALTH_TRACK_SIZE - me.damage}/{HEALTH_TRACK_SIZE}
              </span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${((HEALTH_TRACK_SIZE - me.damage) / HEALTH_TRACK_SIZE) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Fúria do dragão (sorteia {Math.max(0, snapshot.dragonRageTrack - 1)} cubo(s))</span>
              <span className="font-mono text-amber-400">{snapshot.dragonRageTrack}</span>
            </div>
            {snapshot.countdownTrack > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs text-red-300">
                <span>
                  ⏳ Contagem regressiva —{" "}
                  {snapshot.players.find((p) => p.id === snapshot.countdownPlayerId)?.name ?? "alguém"} anda nela a
                  cada turno seu; corra pra fora!
                </span>
                <span className="font-mono">{snapshot.countdownTrack}/5</span>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Tabuleiro — {myRoom?.name ?? "?"}
          </h2>
          <div className="mb-3 rounded-xl bg-slate-950/60 p-2">
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
              onRoomClick={isMyTurn ? onMovePlayer : undefined}
            />
          </div>
          {hasUnclaimedArtifact && (
            <button
              onClick={onTakeArtifact}
              disabled={!isMyTurn || atArtifactLimit}
              title={atArtifactLimit ? `Você já carrega o máximo de artefatos (${artifactLimit})` : undefined}
              className="mb-2 w-full rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-40"
            >
              {atArtifactLimit
                ? `Máximo de artefatos carregados (${me?.artifactsCarried}/${artifactLimit})`
                : `Pegar artefato (${myRoom!.artifactValue} pts) — ${me?.artifactsCarried ?? 0}/${artifactLimit}`}
            </button>
          )}
          {unclaimedMonkeyIdol && (
            <button
              onClick={onTakeMonkeyIdol}
              disabled={!isMyTurn}
              className="mb-2 w-full rounded-xl bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-fuchsia-50 active:scale-[0.98] disabled:opacity-40"
            >
              🐒 Pegar {unclaimedMonkeyIdol} (5 pts)
            </button>
          )}
          {canLeaveDungeon && (
            <button
              onClick={onLeaveDungeon}
              disabled={!isMyTurn}
              className="mb-2 w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-50 active:scale-[0.98] disabled:opacity-40"
            >
              Sair da masmorra
            </button>
          )}
          <ul className="grid grid-cols-1 gap-2">
            {myRoom?.tunnels.map((tunnel) => {
              const targetRoom = BOARD.rooms[tunnel.to];
              const bootCost = tunnel.icon?.footprint ? 2 : 1;
              return (
                <li
                  key={tunnel.to}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2"
                >
                  <span className="text-sm">
                    {targetRoom?.name ?? tunnel.to}
                    {tunnel.icon?.monsterSwordCost && (
                      <span className="ml-1 text-red-400">👹{tunnel.icon.monsterSwordCost}⚔</span>
                    )}
                    {tunnel.icon?.locked && <span className="ml-1 text-amber-300">🔒</span>}
                  </span>
                  <button
                    onClick={() => onMovePlayer(tunnel.to)}
                    disabled={!isMyTurn}
                    className="shrink-0 rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-semibold active:scale-95 disabled:opacity-40"
                  >
                    Ir ({bootCost}👢)
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {myRoom?.isMarket && (
          <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
            <h2 className="mb-2 text-sm font-semibold text-slate-300">Mercado (7💰 cada item)</h2>
            <ul className="grid grid-cols-1 gap-2">
              <li className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                <span className="text-sm">Chave-mestra {me?.hasMasterKey && "✓"}</span>
                <button
                  onClick={() => onBuyMarketItem("key")}
                  disabled={!isMyTurn || !snapshot.marketKeyAvailable || !!me?.hasMasterKey}
                  className="shrink-0 rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-semibold active:scale-95 disabled:opacity-40"
                >
                  {snapshot.marketKeyAvailable ? "Comprar" : "Esgotado"}
                </button>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                <span className="text-sm">Mochila {me?.hasBackpack && "✓"}</span>
                <button
                  onClick={() => onBuyMarketItem("backpack")}
                  disabled={!isMyTurn || !snapshot.marketBackpackAvailable || !!me?.hasBackpack}
                  className="shrink-0 rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-semibold active:scale-95 disabled:opacity-40"
                >
                  {snapshot.marketBackpackAvailable ? "Comprar" : "Esgotado"}
                </button>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                <span className="text-sm">
                  Coroa {snapshot.marketCrownsAvailable[0] !== undefined && `(${snapshot.marketCrownsAvailable[0]} pts)`}
                </span>
                <button
                  onClick={() => onBuyMarketItem("crown")}
                  disabled={!isMyTurn || snapshot.marketCrownsAvailable.length === 0}
                  className="shrink-0 rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-semibold active:scale-95 disabled:opacity-40"
                >
                  {snapshot.marketCrownsAvailable.length > 0 ? "Comprar" : "Esgotado"}
                </button>
              </li>
            </ul>
          </section>
        )}

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Dungeon Row</h2>
          <ul className="grid grid-cols-1 gap-2">
            {snapshot.dungeonRowSlots.map((cardId, slotIndex) => {
              if (!cardId) {
                return (
                  <li key={slotIndex} className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-600">
                    (vazio)
                  </li>
                );
              }
              const card = getCard(cardId);
              const isMonster = card.kind === "monster";
              return (
                <li
                  key={slotIndex}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2"
                >
                  <span className="text-sm">{card.name}</span>
                  <button
                    onClick={() => (isMonster ? onFightMonster(slotIndex) : onAcquireCard(slotIndex))}
                    disabled={!isMyTurn}
                    className="shrink-0 rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-semibold active:scale-95 disabled:opacity-40"
                  >
                    {isMonster ? `Lutar (${card.swordCost ?? 0}⚔)` : `Comprar (${card.skillCost ?? 0}✦)`}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Reserva</h2>
          <ul className="grid grid-cols-1 gap-2">
            {Object.entries(snapshot.reserveRemaining).map(([cardId, remaining]) => {
              const card = getCard(cardId);
              const isMonster = card.kind === "monster";
              return (
                <li
                  key={cardId}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2"
                >
                  <span className="text-sm">
                    {card.name} <span className="text-slate-500">×{remaining}</span>
                  </span>
                  <button
                    onClick={() => onAcquireFromReserve(cardId)}
                    disabled={!isMyTurn || remaining <= 0}
                    className="shrink-0 rounded-lg bg-slate-700 px-3 py-2.5 text-xs font-semibold active:scale-95 disabled:opacity-40"
                  >
                    {isMonster ? `Lutar (${card.swordCost ?? 0}⚔)` : `Comprar (${card.skillCost ?? 0}✦)`}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Sua mão</h2>
          <ul className="grid grid-cols-1 gap-2">
            {hand.map((cardId, i) => (
              <li key={`${cardId}-${i}`} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                <span className="text-sm">{cardName(cardId)}</span>
                <button
                  onClick={() => onPlayCard(cardId)}
                  disabled={!isMyTurn}
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-2.5 text-xs font-semibold text-slate-950 active:scale-95 disabled:opacity-40"
                >
                  Jogar
                </button>
              </li>
            ))}
          </ul>
        </section>

        <button
          onClick={onEndTurn}
          disabled={!isMyTurn}
          className="rounded-xl bg-amber-500 px-4 py-4 text-base font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-40"
        >
          Terminar turno
        </button>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Jogadores</h2>
          <ul className="space-y-2">
            {snapshot.players.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Avatar name={p.name} color={p.color} />
                  {p.name}
                  {!p.connected && <span className="text-slate-500">(desconectado)</span>}
                  {p.knockedOut && <span className="text-red-400">(nocauteado)</span>}
                  {p.hasLeftDungeon && <span className="text-emerald-400">(escapou)</span>}
                </span>
                <span className="text-slate-400">
                  {BOARD.rooms[p.roomId]?.name ?? p.roomId} · {HEALTH_TRACK_SIZE - p.damage}❤ · {p.points}pts ·{" "}
                  <img
                    src="/assets/kenney/board-game-icons/skull.png"
                    alt="clank"
                    className="inline h-3 w-3 opacity-70"
                  />{" "}
                  {p.clank}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Eventos</h2>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-400">
            {snapshot.log.length === 0 && <li className="italic">Nenhum evento ainda.</li>}
            {[...snapshot.log].reverse().map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

interface EndScreenProps {
  snapshot: RoomSnapshot;
  onLeave: () => void;
}

function EndScreen({ snapshot, onLeave }: EndScreenProps) {
  const ranked = [...snapshot.players].sort((a, b) => b.finalScore - a.finalScore);
  const winner = ranked[0];

  return (
    <main className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-[max(1rem,env(safe-area-inset-top))] text-slate-100">
      <div className="w-full max-w-sm space-y-6">
        <header className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-amber-400">Partida encerrada!</h1>
          {winner && (
            <p className="text-sm text-slate-400">
              {winner.name} venceu com {winner.finalScore} pontos.
            </p>
          )}
        </header>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <ul className="space-y-2">
            {ranked.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  i === 0 ? "bg-amber-500 text-slate-950" : "bg-slate-800"
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  {i === 0 ? "🏆" : `${i + 1}º`}
                  <Avatar name={p.name} color={p.color} />
                  {p.name}
                  {p.knockedOut && p.points === 0 && (
                    <span className={i === 0 ? "text-slate-800" : "text-red-400"}>(eliminado)</span>
                  )}
                </span>
                <span className="font-mono">{p.finalScore} pts</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-slate-900/70 p-4 shadow-xl ring-1 ring-white/10">
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Eventos</h2>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-slate-400">
            {[...snapshot.log].reverse().map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <button
          onClick={onLeave}
          className="w-full rounded-xl bg-slate-700 px-4 py-3 text-base font-semibold active:scale-[0.98]"
        >
          Sair da sala
        </button>
      </div>
    </main>
  );
}
