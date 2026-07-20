import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useClankRoom } from "./game/useClankRoom";

export default function App() {
  const { room, snapshot, error, connecting, createRoom, joinRoom, toggleReady, startGame, leaveRoom } =
    useClankRoom();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");

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

  return (
    <LobbyScreen
      roomId={room.roomId}
      snapshot={snapshot}
      onToggleReady={toggleReady}
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
  snapshot: {
    players: { id: string; name: string; connected: boolean; ready: boolean }[];
    phase: "lobby" | "playing";
    log: string[];
  };
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeave: () => void;
}

function LobbyScreen({ roomId, snapshot, onToggleReady, onStartGame, onLeave }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);

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
                    <img src="/assets/kenney/board-game-icons/pawn.png" alt="" className="h-5 w-5 opacity-80" />
                    <span className={p.connected ? "" : "text-slate-500 line-through"}>{p.name}</span>
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

        <section className="grid grid-cols-2 gap-3">
          <button
            onClick={onToggleReady}
            className="rounded-xl bg-slate-700 px-4 py-4 text-base font-semibold active:scale-[0.98]"
          >
            Pronto / Não pronto
          </button>
          <button
            onClick={onStartGame}
            disabled={snapshot.phase === "playing" || !allReady}
            className="rounded-xl bg-amber-500 px-4 py-4 text-base font-semibold text-slate-950 active:scale-[0.98] disabled:opacity-50"
          >
            {snapshot.phase === "playing" ? "Em andamento" : "Começar partida"}
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
