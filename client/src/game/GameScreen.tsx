import { motion, AnimatePresence } from "framer-motion";
import { BOARD, getCard, HEALTH_TRACK_SIZE } from "@clank/engine";
import type { RoomSnapshot } from "./useClankRoom";
import { cardImageUrl } from "./cardImages";
import {
  artifactImageUrl,
  backpackImageUrl,
  crownImageUrl,
  masterKeyImageUrl,
  monkeyIdolImageUrl,
} from "./tokenImages";
import { BoardMap } from "./BoardMap";
import { Avatar, ChoiceModal } from "../App";

export interface GameScreenProps {
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

export const RESOURCE_LABELS: Record<"skill" | "swords" | "boots" | "gold", string> = {
  skill: "Skill",
  swords: "Swords",
  boots: "Boots",
  gold: "Gold",
};

export function cardName(id: string): string {
  if (!id) return "";
  try {
    return getCard(id).name;
  } catch {
    return id;
  }
}

export function GameScreen({
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
  const myRoom = me ? BOARD.rooms[me.roomId] : undefined;
  const hasUnclaimedArtifact = !!myRoom?.artifactValue && !snapshot.claimedArtifacts[myRoom.id];
  const unclaimedMonkeyIdol = myRoom?.monkeyIdolNames?.find((n) => !snapshot.claimedMonkeyIdols[n]);
  const canLeaveDungeon = !!myRoom?.isEntrance;
  const artifactLimit = me?.hasBackpack ? 2 : 1;
  const atArtifactLimit = (me?.artifactsCarried ?? 0) >= artifactLimit;

  return (
    <main className="flex h-dvh w-dvw overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      
      {/* LEFT SIDEBAR: Dragon + Players */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center border-b border-slate-800 bg-slate-950 p-4">
          <div className="relative mb-2 h-20 w-20 rounded-full border-4 border-slate-800 bg-slate-900 shadow-inner flex items-center justify-center overflow-hidden">
             {/* Simulação da cabeça do dragão */}
             <span className="text-4xl filter grayscale contrast-125 sepia hover:grayscale-0 transition-all duration-500">🐉</span>
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Fúria do Dragão</p>
          <div className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold text-amber-500">
            {snapshot.dragonRageTrack} 
            <span className="text-sm text-slate-500">(sorteia {Math.max(0, snapshot.dragonRageTrack - 1)})</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {snapshot.players.map((p) => (
            <div key={p.id} className={`relative flex flex-col gap-2 rounded-xl border p-3 shadow-sm ${p.id === snapshot.currentPlayerId ? 'border-amber-500/50 bg-slate-800/80 ring-1 ring-amber-500/30' : 'border-slate-700/50 bg-slate-800/30'}`}>
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
              <div className="flex items-center justify-between text-xs font-mono font-semibold bg-slate-950/50 rounded-lg p-1.5 border border-slate-700/50">
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
            </div>
          ))}
        </div>
        
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <button onClick={onLeave} className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 active:bg-slate-700 transition-colors">
            Abandonar Partida
          </button>
        </div>
      </aside>

      {/* CENTER: Board + Bottom Panel */}
      <section className="flex flex-1 flex-col relative overflow-hidden bg-slate-950">
        
        <AnimatePresence>
          {isMyTurn && snapshot.pendingChoice && (
            <ChoiceModal choice={snapshot.pendingChoice} onChoose={onResolveChoice} />
          )}
        </AnimatePresence>

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
            onRoomClick={isMyTurn ? onMovePlayer : undefined}
          />
          
          <AnimatePresence>
            {actionError && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className="absolute top-6 left-1/2 z-50 rounded-xl bg-red-950/90 px-6 py-3 text-sm font-semibold text-red-200 shadow-2xl ring-1 ring-red-500/50 backdrop-blur-sm pointer-events-none"
              >
                {actionError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Actions overlay for current room */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
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
            {unclaimedMonkeyIdol && (
              <button
                onClick={onTakeMonkeyIdol}
                disabled={!isMyTurn}
                className="flex items-center gap-2 rounded-xl bg-fuchsia-600/90 px-4 py-2 text-sm font-bold text-fuchsia-50 shadow-lg backdrop-blur hover:bg-fuchsia-500 active:scale-95 disabled:opacity-40 transition-all"
              >
                {monkeyIdolImageUrl(unclaimedMonkeyIdol) ? (
                  <img src={monkeyIdolImageUrl(unclaimedMonkeyIdol)} alt="" className="h-6 w-6 object-contain drop-shadow" />
                ) : "🐒"}
                Pegar {unclaimedMonkeyIdol}
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
        <div className="relative flex shrink-0 h-48 border-t border-slate-800 bg-slate-900 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] z-20">
           
           {/* Cards Hand */}
           <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 flex items-end pb-2" style={{ scrollbarWidth: 'none' }}>
             <div className="flex items-end gap-[-4rem] h-full pt-4">
                {hand.map((cardId, i) => {
                  const url = cardImageUrl(cardId);
                  return (
                    <motion.button
                      key={`${cardId}-${i}`}
                      onClick={() => onPlayCard(cardId)}
                      disabled={!isMyTurn}
                      whileHover={{ y: -20, rotate: -2, zIndex: 30 }}
                      className="group relative -ml-12 first:ml-0 rounded-lg shadow-2xl transition-all duration-300 disabled:opacity-80"
                      style={{ 
                        transformOrigin: 'bottom center',
                        zIndex: i 
                      }}
                    >
                      {url ? (
                         <img src={url} alt={cardName(cardId)} className="w-32 h-auto rounded-lg ring-1 ring-black/40 group-hover:ring-amber-400 group-hover:ring-2" />
                      ) : (
                         <div className="w-32 h-44 bg-slate-700 rounded-lg border-2 border-slate-600 flex flex-col items-center justify-center p-2 text-center group-hover:border-amber-400">
                           <span className="font-bold text-sm text-slate-200">{cardName(cardId)}</span>
                         </div>
                      )}
                      {/* Badge "Jogar" on hover */}
                      <div className="absolute inset-x-0 bottom-2 opacity-0 group-hover:opacity-100 flex justify-center transition-opacity">
                         <span className="bg-amber-500 text-amber-950 font-bold text-xs px-3 py-1 rounded-full shadow-lg">Jogar</span>
                      </div>
                    </motion.button>
                  )
                })}
             </div>
           </div>

           {/* Resources / End Turn */}
           {me && (
             <div className="w-[340px] shrink-0 border-l border-slate-800 bg-slate-950/50 p-4 flex flex-col justify-between">
                <div className="grid grid-cols-4 gap-2">
                  {(["skill", "swords", "boots", "gold"] as const).map((key) => (
                    <div key={key} className="flex flex-col items-center justify-center rounded-lg bg-slate-800/80 py-2 border border-slate-700/50 shadow-inner">
                      <span className="text-xl font-bold text-amber-400">{me[key]}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">{RESOURCE_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onEndTurn}
                  disabled={!isMyTurn}
                  className="w-full mt-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 px-4 py-3 text-sm font-bold text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:from-amber-300 hover:to-amber-500 active:scale-95 disabled:opacity-30 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none transition-all uppercase tracking-widest"
                >
                  Terminar Turno
                </button>
             </div>
           )}

        </div>
      </section>

      {/* RIGHT SIDEBAR: Dungeon Row & Market */}
      <aside className="flex w-72 shrink-0 flex-col border-l border-slate-800 bg-slate-900 z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col h-full overflow-y-auto p-3 gap-4" style={{ scrollbarWidth: 'thin' }}>
          
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
                  <img src={masterKeyImageUrl} className="h-8 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Chave</span>
                </button>
                <button
                  onClick={() => onBuyMarketItem("backpack")}
                  disabled={!isMyTurn || !snapshot.marketBackpackAvailable || !!me?.hasBackpack}
                  className="group flex-1 flex flex-col items-center p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 hover:border-amber-500/50 disabled:opacity-40 transition-colors"
                >
                  <img src={backpackImageUrl} className="h-8 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">Mochila</span>
                </button>
                <button
                  onClick={() => onBuyMarketItem("crown")}
                  disabled={!isMyTurn || snapshot.marketCrownsAvailable.length === 0}
                  className="group flex-1 flex flex-col items-center p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 hover:border-amber-500/50 disabled:opacity-40 transition-colors"
                >
                  {snapshot.marketCrownsAvailable[0] !== undefined && (
                    <img src={crownImageUrl(snapshot.marketCrownsAvailable[0])} className="h-8 mb-1 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-bold">Coroa</span>
                </button>
              </div>
            </div>
          )}

          {/* Dungeon Row */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Masmorra</h3>
            <div className="grid grid-cols-2 gap-2">
              {snapshot.dungeonRowSlots.map((cardId, slotIndex) => {
                if (!cardId) {
                  return (
                    <div key={slotIndex} className="h-32 rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-600">Vazio</span>
                    </div>
                  );
                }
                const card = getCard(cardId);
                const isMonster = card.kind === "monster";
                const url = cardImageUrl(cardId);
                
                return (
                  <button
                    key={slotIndex}
                    onClick={() => (isMonster ? onFightMonster(slotIndex) : onAcquireCard(slotIndex))}
                    disabled={!isMyTurn}
                    className="relative group h-32 rounded-lg border border-slate-700 bg-slate-800 overflow-hidden hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] disabled:opacity-60 transition-all active:scale-95 flex flex-col"
                  >
                    {url ? (
                      <div className="flex-1 bg-cover bg-center bg-no-repeat w-full" style={{ backgroundImage: `url(${url})` }}></div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-1">
                        <span className="text-[10px] font-bold text-slate-300 leading-tight text-center">{card.name}</span>
                      </div>
                    )}
                    <div className={`h-8 flex items-center justify-center font-bold text-xs ${isMonster ? 'bg-red-900/90 text-red-200' : 'bg-indigo-900/90 text-indigo-200'} backdrop-blur w-full border-t border-slate-900/50`}>
                      {isMonster ? `${card.swordCost ?? 0} ⚔` : `${card.skillCost ?? 0} ✦`}
                    </div>
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                      <span className="bg-amber-500 text-amber-950 px-2 py-1 rounded text-xs font-bold">
                        {isMonster ? 'Atacar' : 'Comprar'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reserve */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Reserva</h3>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(snapshot.reserveRemaining).map(([cardId, remaining]) => {
                const card = getCard(cardId);
                const isMonster = card.kind === "monster";
                const url = cardImageUrl(cardId);
                
                return (
                  <button
                    key={cardId}
                    onClick={() => onAcquireFromReserve(cardId)}
                    disabled={!isMyTurn || remaining <= 0}
                    title={`${card.name} (${remaining} restantes)`}
                    className="relative group aspect-[2/3] rounded-lg border border-slate-700 bg-slate-800 overflow-hidden hover:border-amber-400 disabled:opacity-40 transition-all active:scale-95"
                  >
                    {url ? (
                       <img src={url} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center p-1 bg-slate-700"><span className="text-[9px] font-bold text-slate-300 leading-tight text-center">{card.name}</span></div>
                    )}
                    <div className="absolute top-1 right-1 bg-slate-950/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-700">
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
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </aside>
    </main>
  );
}
