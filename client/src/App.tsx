import { useState } from "react";
import { motion } from "framer-motion";
import { useClankRoom } from "./game/useClankRoom";
import type { ChoiceIcon, PendingChoiceSnapshot, RoomSnapshot } from "./game/useClankRoom";
import { cardImageUrl } from "./game/cardImages";
import { choiceTokenImageUrl } from "./game/tokenImages";
import { PLAYER_COLORS } from "./game/playerColors";
import { GameScreen } from "./game/GameScreen";
/** Avatar sem arte oficial: círculo colorido com a inicial do nome. */
export function Avatar({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
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

/** Miniatura da carta — usa a arte real se tiver (ver `game/cardImages.ts`), senão um bloco cinza com a inicial. */
export function CardThumb({ cardId, name }: { cardId: string; name: string }) {
  const url = cardImageUrl(cardId);
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-black/40"
      />
    );
  }
  return (
    <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-slate-700 text-xs font-bold text-slate-400 ring-1 ring-black/40">
      {name.charAt(0)}
    </span>
  );
}

export const CHOICE_ICON_EMOJI: Record<ChoiceIcon, string> = {
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
export function ChoiceModal({
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
                {choiceTokenImageUrl(option.icon, option.amount) ? (
                  <img
                    src={choiceTokenImageUrl(option.icon, option.amount)}
                    alt=""
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                ) : (
                  <span className="text-xl">{CHOICE_ICON_EMOJI[option.icon]}</span>
                )}
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
    addBot,
    removeBot,
    setColor,
    startGame,
    playCard,
    playAllCards,
    acquireCard,
    fightMonster,
    acquireFromReserve,
    movePlayer,
    takeArtifact,
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
        onPlayAllCards={playAllCards}
        onAcquireCard={acquireCard}
        onFightMonster={fightMonster}
        onAcquireFromReserve={acquireFromReserve}
        onMovePlayer={movePlayer}
        onTakeArtifact={takeArtifact}
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
      roomCode={snapshot.roomCode}
      mySessionId={room.sessionId}
      snapshot={snapshot}
      onToggleReady={toggleReady}
      onAddBot={addBot}
      onRemoveBot={removeBot}
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
              onChange={(e) => onJoinCodeChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Código da sala"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-base tracking-widest text-slate-100 outline-none focus:border-amber-400"
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
  roomCode: string;
  mySessionId: string;
  snapshot: RoomSnapshot;
  onToggleReady: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onSetColor: (color: string) => void;
  onStartGame: () => void;
  onLeave: () => void;
}

function LobbyScreen({
  roomCode,
  mySessionId,
  snapshot,
  onToggleReady,
  onAddBot,
  onRemoveBot,
  onSetColor,
  onStartGame,
  onLeave,
}: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const me = snapshot.players.find((p) => p.id === mySessionId);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
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
              {roomCode} {copied ? "✓" : "⧉"}
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
          {/* Sem AnimatePresence: exit nunca completa nesse ambiente (framer-motion 12 +
              React 19) — remover um bot/jogador deixaria a linha antiga travada na tela
              pra sempre. Sem exit, a linha só some instantâneo; entrada continua animada. */}
          <ul className="space-y-2">
            {snapshot.players.map((p) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    <Avatar name={p.name} color={p.color} />
                    <span className={p.connected ? "" : "text-slate-500 line-through"}>
                      {p.name}
                      {p.isBot && " 🤖"}
                      {!p.connected && " (desconectado)"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        p.ready ? "bg-emerald-600 text-emerald-50" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {p.ready ? "Pronto" : "Aguardando"}
                    </span>
                    {p.isBot && (
                      <button
                        onClick={() => onRemoveBot(p.id)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-400 active:bg-slate-700"
                      >
                        Remover
                      </button>
                    )}
                  </span>
                </motion.li>
            ))}
          </ul>
          {snapshot.players.length < 4 && (
            <button
              onClick={onAddBot}
              className="mt-2 w-full rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold active:scale-[0.98]"
            >
              🤖 Adicionar Bot
            </button>
          )}
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
