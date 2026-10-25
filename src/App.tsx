import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, LogIn, PlusCircle, AlertCircle, Smartphone, LogOut 
} from 'lucide-react';
import { GameRoom, NightStep, DayStep, RoleId } from './types/game';
import { api } from './utils/api';
import { TopBar } from './components/TopBar';
import { Lobby } from './components/Lobby';
import { PlayerCard } from './components/PlayerCard';
import { PlayerActionPanel } from './components/PlayerActionPanel';
import { ModeratorDashboard } from './components/ModeratorDashboard';
import { RoleRevealModal } from './components/RoleRevealModal';
import { RulesReferenceModal } from './components/RulesReferenceModal';
import { RoleDetailsModal } from './components/RoleDetailsModal';
import { GameHistoryModal } from './components/GameHistoryModal';
import { CompactHistoryTimeline } from './components/CompactHistoryTimeline';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PhaseTransitionOverlay } from './components/PhaseTransitionOverlay';
import { sounds } from './utils/audio';

export default function App() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'player' | 'moderator'>('player');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isRoleDetailsOpen, setIsRoleDetailsOpen] = useState(false);
  const [isRoleRevealOpen, setIsRoleRevealOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Phase transition state for dramatic dawn animation
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [transitionInfo, setTransitionInfo] = useState<{
    cycle: number;
    lastNightSaved?: boolean;
    killedPlayerName?: string;
  }>({ cycle: 1 });
  const prevStageRef = useRef<string | null>(null);

  useEffect(() => {
    const savedCode = localStorage.getItem('werewolf_room_code');
    const savedPlayerId = localStorage.getItem('werewolf_player_id');

    if (savedCode) {
      setLoading(true);
      api.getRoom(savedCode)
        .then(r => {
          setRoom(r);
          if (savedPlayerId && r.players.some(p => p.id === savedPlayerId)) {
            setCurrentPlayerId(savedPlayerId);
            const player = r.players.find(p => p.id === savedPlayerId);
            if (player?.isModerator) {
              setActiveTab('moderator');
            }
          } else if (r.players.length > 0) {
            setCurrentPlayerId(r.players[0].id);
          }
        })
        .catch(() => {
          localStorage.removeItem('werewolf_room_code');
          localStorage.removeItem('werewolf_player_id');
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const fetchLatestRoom = useCallback(async (code: string) => {
    try {
      const updated = await api.getRoom(code);
      setRoom(updated);

      if (updated.stage === 'GAME_OVER' && !isRoleRevealOpen) {
        setIsRoleRevealOpen(true);
        sounds.playVictory();
      }
    } catch {
      // Room polling fallback
    }
  }, [isRoleRevealOpen]);

  useEffect(() => {
    if (!room?.code) return;

    const unsubscribe = api.onBroadcast((broadcastCode) => {
      if (broadcastCode === room.code) {
        fetchLatestRoom(room.code);
      }
    });

    const interval = setInterval(() => {
      fetchLatestRoom(room.code);
    }, 1800);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [room?.code, fetchLatestRoom]);

  // Detect stage change from NIGHT or HUNTER_REVENGE to DAY
  useEffect(() => {
    if (!room) return;
    const prev = prevStageRef.current;
    const current = room.stage;

    if ((prev === 'NIGHT' || prev === 'HUNTER_REVENGE') && current === 'DAY') {
      const killedPlayer = room.lastNightKilledId
        ? room.players.find(p => p.id === room.lastNightKilledId)
        : undefined;

      setTransitionInfo({
        cycle: room.cycle,
        lastNightSaved: room.lastNightSaved,
        killedPlayerName: killedPlayer?.name,
      });
      setShowPhaseTransition(true);
    }

    prevStageRef.current = current;
  }, [room?.stage, room?.cycle, room?.lastNightKilledId, room?.lastNightSaved, room?.players]);

  const handleManualDawnTransition = () => {
    if (!room) return;
    const killedPlayer = room.lastNightKilledId
      ? room.players.find(p => p.id === room.lastNightKilledId)
      : undefined;

    setTransitionInfo({
      cycle: room.cycle,
      lastNightSaved: room.lastNightSaved,
      killedPlayerName: killedPlayer?.name,
    });
    setShowPhaseTransition(true);
  };

  const currentPlayer = room?.players.find(p => p.id === currentPlayerId) || room?.players[0];
  const isModerator = currentPlayer?.id === room?.moderatorId;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const name = playerName.trim() || 'Moderator';
      const result = await api.createRoom(name);
      setRoom(result.room);
      setCurrentPlayerId(result.playerId);
      setActiveTab('moderator');
      localStorage.setItem('werewolf_room_code', result.room.code);
      localStorage.setItem('werewolf_player_id', result.playerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Masukkan kode room');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const name = playerName.trim() || `Pemain ${Math.floor(Math.random() * 100)}`;
      const result = await api.joinRoom(joinCode.trim().toUpperCase(), name, false);
      setRoom(result.room);
      setCurrentPlayerId(result.playerId);
      setActiveTab('player');
      localStorage.setItem('werewolf_room_code', result.room.code);
      localStorage.setItem('werewolf_player_id', result.playerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung ke room');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoRoom = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.createRoom('Moderator');
      const code = res.room.code;
      const demoNames = ['Bima', 'Citra', 'Dimas', 'Eka', 'Fajar'];
      for (const name of demoNames) {
        await api.joinRoom(code, name, false);
      }
      const finalRoom = await api.getRoom(code);
      setRoom(finalRoom);
      setCurrentPlayerId(res.playerId);
      setActiveTab('moderator');
      localStorage.setItem('werewolf_room_code', code);
      localStorage.setItem('werewolf_player_id', res.playerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat demo');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimModerator = async () => {
    if (!room || !currentPlayerId) return;
    try {
      const updated = await api.setModerator(room.code, currentPlayerId);
      setRoom(updated);
      setActiveTab('moderator');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status moderator');
    }
  };

  const handleUpdateRoleConfig = async (config: Record<RoleId, number>) => {
    if (!room) return;
    const updated = await api.updateRoleConfig(room.code, config);
    setRoom(updated);
  };

  const handleSetModerator = async (targetPlayerId: string) => {
    if (!room) return;
    const updated = await api.setModerator(room.code, targetPlayerId);
    setRoom(updated);
  };

  const handleStartGame = async () => {
    if (!room) return;
    const updated = await api.startGame(room.code);
    setRoom(updated);
  };

  const handleNightStep = async (step: NightStep) => {
    if (!room) return;
    const updated = await api.setNightStep(room.code, step);
    setRoom(updated);
  };

  const handlePerformAction = async (actionType: string, targetId: string) => {
    if (!room || !currentPlayerId) return;
    const updated = await api.submitPlayerAction(room.code, currentPlayerId, actionType, targetId);
    setRoom(updated);
  };

  const handleResolveNight = async () => {
    if (!room) return;
    const updated = await api.resolveNight(room.code);
    setRoom(updated);
  };

  const handleHunterShoot = async (targetId: string) => {
    if (!room) return;
    const updated = await api.hunterRevenge(room.code, targetId);
    setRoom(updated);
  };

  const handleDayStep = async (step: DayStep) => {
    if (!room) return;
    const updated = await api.setDayStep(room.code, step);
    setRoom(updated);
  };

  const handleVoteLynch = async (targetId: string) => {
    if (!room || !currentPlayerId) return;
    const updated = await api.submitLynchVote(room.code, currentPlayerId, targetId);
    setRoom(updated);
  };

  const handleResolveDay = async (manualTargetId?: string) => {
    if (!room) return;
    const updated = await api.resolveDay(room.code, manualTargetId);
    setRoom(updated);
  };

  const handleUpdateTimer = async (seconds?: number, isRunning?: boolean) => {
    if (!room) return;
    const updated = await api.updateTimer(room.code, seconds, isRunning);
    setRoom(updated);
  };

  const handleResetGame = async () => {
    if (!room) return;
    const updated = await api.resetGame(room.code);
    setRoom(updated);
    setIsRoleRevealOpen(false);
  };

  const handleExitRoom = () => {
    localStorage.removeItem('werewolf_room_code');
    localStorage.removeItem('werewolf_player_id');
    setRoom(null);
    setCurrentPlayerId('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <TopBar
        roomCode={room?.code}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isModerator={isModerator}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={room?.deathHistory?.length || 0}
        onClaimModerator={handleClaimModerator}
        onExitRoom={() => setIsExitConfirmOpen(true)}
        stage={room?.stage}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 md:p-8 pb-24 md:pb-8 flex flex-col">
        {error && (
          <div className="mb-6 p-4 bg-slate-900 border border-rose-800 text-rose-300 rounded-2xl flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-slate-400 hover:text-white underline ml-2"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 1. WELCOME SCREEN */}
        {!room ? (
          <div className="max-w-xl mx-auto w-full my-auto py-8 space-y-8">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white uppercase">
                Werewolf Companion
              </h1>
            </div>

            <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Nama Anda:
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama Anda..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <strong className="text-sm text-slate-200 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-slate-400" /> Buat Room Baru
                    </strong>
                    <p className="text-xs text-slate-400 mt-1">
                      Sebagai Host atau Moderator. Buat kode room baru untuk dibagikan.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Buat Room</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
                  <div>
                    <strong className="text-sm text-slate-200 flex items-center gap-1.5">
                      <LogIn className="w-4 h-4 text-slate-400" /> Gabung Room
                    </strong>
                    <input
                      type="text"
                      placeholder="KODE ROOM"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={5}
                      className="mt-2 w-full uppercase font-mono tracking-widest text-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <button
                    onClick={handleJoinRoom}
                    disabled={loading || !joinCode}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <span>Masuk ke Room</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  onClick={handleQuickDemoRoom}
                  disabled={loading}
                  className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mode Demo (Langsung Buat 6 Pemain untuk Pengujian)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 2. IN-GAME ROOM */
          <div className="flex-1 flex flex-col space-y-6">
            
            {room.stage === 'LOBBY' ? (
              <Lobby
                room={room}
                currentPlayerId={currentPlayerId}
                onUpdateRoleConfig={handleUpdateRoleConfig}
                onSetModerator={handleSetModerator}
                onStartGame={handleStartGame}
                onOpenRules={() => setIsRulesOpen(true)}
              />
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                
                {activeTab === 'player' ? (
                  <div className="space-y-6 max-w-md mx-auto w-full">
                    {currentPlayer && <PlayerCard player={currentPlayer} />}

                    {currentPlayer && (
                      <PlayerActionPanel
                        room={room}
                        currentPlayer={currentPlayer}
                        onPerformAction={handlePerformAction}
                        onVoteLynch={handleVoteLynch}
                        onHunterShoot={handleHunterShoot}
                      />
                    )}

                    {/* Compact Chronicle / History widget for players */}
                    <CompactHistoryTimeline
                      deathHistory={room.deathHistory || []}
                      onOpenFullModal={() => setIsHistoryOpen(true)}
                    />

                    {/* Device perspective selector for offline pass-and-play */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-slate-500" />
                        <span>Tampilan Pemain:</span>
                      </div>
                      <select
                        value={currentPlayerId}
                        onChange={(e) => {
                          setCurrentPlayerId(e.target.value);
                          localStorage.setItem('werewolf_player_id', e.target.value);
                        }}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                      >
                        {room.players.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.status === 'eliminated' ? '(Tereliminasi)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <ModeratorDashboard
                    room={room}
                    currentPlayerId={currentPlayerId}
                    onNightStep={handleNightStep}
                    onResolveNight={handleResolveNight}
                    onDayStep={handleDayStep}
                    onResolveDay={handleResolveDay}
                    onUpdateTimer={handleUpdateTimer}
                    onSetModerator={handleSetModerator}
                    onOpenRoleReveal={() => setIsRoleRevealOpen(true)}
                    onOpenHistory={() => setIsHistoryOpen(true)}
                    onResetGame={handleResetGame}
                    onTriggerDawnTransition={handleManualDawnTransition}
                  />
                )}
              </div>
            )}

            <footer className="mt-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Room {room.code}</span>
                <span aria-hidden="true">·</span>
                <span>Pemain: {currentPlayer?.name || 'Anonim'}</span>
                {isModerator && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300">Moderator</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="hover:text-slate-300 transition-colors"
                >
                  Riwayat ({room.deathHistory?.length || 0})
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => setIsRoleRevealOpen(true)}
                  className="hover:text-slate-300 transition-colors"
                >
                  Role Reveal
                </button>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => setIsExitConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white rounded-lg font-semibold transition-all shadow-sm active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Keluar Room</span>
                </button>
              </div>
            </footer>
          </div>
        )}
      </main>

      <RulesReferenceModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        onOpenRoleDetails={() => setIsRoleDetailsOpen(true)}
      />

      <RoleDetailsModal
        isOpen={isRoleDetailsOpen}
        onClose={() => setIsRoleDetailsOpen(false)}
      />

      <GameHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        deathHistory={room?.deathHistory || []}
        currentCycle={room?.cycle || 1}
      />

      {room && (
        <RoleRevealModal
          isOpen={isRoleRevealOpen}
          onClose={() => setIsRoleRevealOpen(false)}
          room={room}
          onResetGame={handleResetGame}
          isModerator={isModerator}
        />
      )}

      {/* Exit Room Confirmation Modal */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Keluar dari Room?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Anda akan keluar dari room <strong className="text-slate-200">#{room?.code}</strong>. Sesi permainan Anda pada room ini akan diakhiri di perangkat ini.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsExitConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsExitConfirmOpen(false);
                  handleExitRoom();
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dramatic Phase Transition Overlay: Night to Day */}
      <PhaseTransitionOverlay
        isOpen={showPhaseTransition}
        cycle={transitionInfo.cycle}
        lastNightSaved={transitionInfo.lastNightSaved}
        killedPlayerName={transitionInfo.killedPlayerName}
        onComplete={() => setShowPhaseTransition(false)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={room?.deathHistory?.length || 0}
        isModerator={isModerator}
        isInRoom={!!room}
        onExitRoom={() => setIsExitConfirmOpen(true)}
      />
    </div>
  );
}
