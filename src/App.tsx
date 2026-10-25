import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, LogIn, PlusCircle, AlertCircle, Smartphone, LogOut, Lock, User, Crown, Link, Trash2 
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
import { NightTransitionOverlay } from './components/NightTransitionOverlay';
import { sounds } from './utils/audio';

export default function App() {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'player' | 'moderator'>('player');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [invitedCode, setInvitedCode] = useState<string>('');
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('werewolf_player_name') || '';
    }
    return '';
  });

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isRoleDetailsOpen, setIsRoleDetailsOpen] = useState(false);
  const [isRoleRevealOpen, setIsRoleRevealOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Phase transition states for dramatic dawn & nightfall animations
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [showNightTransition, setShowNightTransition] = useState(false);
  const [transitionInfo, setTransitionInfo] = useState<{
    cycle: number;
    lastNightSaved?: boolean;
    killedPlayerName?: string;
  }>({ cycle: 1 });
  const prevStageRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect direct invitation link (?room=CODE or ?join=CODE or ?code=CODE)
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = (params.get('room') || params.get('join') || params.get('code') || '').toUpperCase().trim();
    if (codeFromUrl) {
      setInvitedCode(codeFromUrl);
      setJoinCode(codeFromUrl);
    }

    const savedCode = localStorage.getItem('werewolf_room_code');
    const savedPlayerId = localStorage.getItem('werewolf_player_id');

    // If an invitation link is opened and differs from previous saved room,
    // prioritize the invited room code!
    const targetRoomCode = codeFromUrl || savedCode;

    if (targetRoomCode) {
      setLoading(true);
      api.getRoom(targetRoomCode)
        .then(r => {
          // If the player is already recognized in this room (valid reconnection)
          if (savedPlayerId && r.players.some(p => p.id === savedPlayerId)) {
            setRoom(r);
            setCurrentPlayerId(savedPlayerId);
            const player = r.players.find(p => p.id === savedPlayerId);
            if (player?.isModerator) {
              setActiveTab('moderator');
            }
          } else {
            // Pemain belum terdaftar atau tidak memiliki ID valid di room ini.
            // JANGAN pernah default ke r.players[0] karena itu host/moderator!
            // Minta pemain untuk mengisi nama mereka terlebih dahulu.
            setJoinCode(targetRoomCode);
          }
        })
        .catch((err) => {
          localStorage.removeItem('werewolf_room_code');
          localStorage.removeItem('werewolf_player_id');
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('dibersihkan') || msg.includes('berakhir') || msg.includes('tidak ditemukan')) {
            setError('Sesi room sebelumnya telah berakhir atau dibersihkan otomatis dari server.');
          }
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
    } catch (err) {
      // Room expired / cleaned up / deleted from server
      const msg = err instanceof Error ? err.message : '';
      if (
        msg.includes('dibersihkan') || 
        msg.includes('berakhir') || 
        msg.includes('tidak ditemukan') ||
        msg.includes('404')
      ) {
        localStorage.removeItem('werewolf_room_code');
        localStorage.removeItem('werewolf_player_id');
        setRoom(null);
        setCurrentPlayerId('');
        setError('Sesi room telah selesai atau dibersihkan oleh sistem/moderator demi efisiensi.');
      }
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

  // Detect stage change for Nightfall and Dawn transitions
  useEffect(() => {
    if (!room) return;
    const prev = prevStageRef.current;
    const current = room.stage;

    if ((prev === 'LOBBY' || prev === 'DAY') && current === 'NIGHT') {
      setShowNightTransition(true);
    } else if ((prev === 'NIGHT' || prev === 'HUNTER_REVENGE') && current === 'DAY') {
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

  const savedPlayerId = typeof window !== 'undefined' ? localStorage.getItem('werewolf_player_id') : null;
  const myPlayerId = savedPlayerId || currentPlayerId;
  const myPlayer = room?.players.find(p => p.id === myPlayerId);
  const currentPlayer = room?.players.find(p => p.id === currentPlayerId) || room?.players[0];
  const isModerator = !!(room?.moderatorId && (myPlayerId === room.moderatorId || currentPlayer?.id === room.moderatorId || myPlayer?.isModerator || currentPlayer?.isModerator));

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError('Nama Anda wajib diisi sebelum membuat room!');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.createRoom(trimmedName);
      setRoom(result.room);
      setCurrentPlayerId(result.playerId);
      setActiveTab('moderator');
      localStorage.setItem('werewolf_player_name', trimmedName);
      localStorage.setItem('werewolf_room_code', result.room.code);
      localStorage.setItem('werewolf_player_id', result.playerId);
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}?room=${result.room.code}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = (joinCode || invitedCode).trim().toUpperCase();
    if (!code) {
      setError('Masukkan kode room');
      return;
    }
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError('Nama Anda wajib diisi sebelum masuk ke room!');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await api.joinRoom(code, trimmedName, false);
      setRoom(result.room);
      setCurrentPlayerId(result.playerId);
      setActiveTab('player');
      localStorage.setItem('werewolf_player_name', trimmedName);
      localStorage.setItem('werewolf_room_code', result.room.code);
      localStorage.setItem('werewolf_player_id', result.playerId);
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}?room=${result.room.code}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung ke room');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    setLoading(true);
    try {
      await api.deleteRoom(room.code);
      localStorage.removeItem('werewolf_room_code');
      localStorage.removeItem('werewolf_player_id');
      setRoom(null);
      setCurrentPlayerId('');
      setInvitedCode('');
      setJoinCode('');
      setIsDeleteConfirmOpen(false);
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus room');
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
      localStorage.setItem('werewolf_player_name', 'Moderator');
      localStorage.setItem('werewolf_room_code', code);
      localStorage.setItem('werewolf_player_id', res.playerId);
      if (typeof window !== 'undefined') {
        const newUrl = `${window.location.pathname}?room=${code}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
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
    setInvitedCode('');
    setJoinCode('');
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
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

            {invitedCode ? (
              <div className="p-6 sm:p-8 bg-slate-900 border border-indigo-500/50 rounded-3xl shadow-2xl space-y-6 text-center animate-in fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-semibold">
                  <Link className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Link Undangan Terdeteksi</span>
                </div>

                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Anda Diundang Bergabung ke Room
                  </span>
                  <div className="text-4xl sm:text-5xl font-mono font-black text-amber-400 tracking-widest mt-1">
                    #{invitedCode}
                  </div>
                </div>

                <form onSubmit={handleJoinRoom} className="space-y-4 max-w-sm mx-auto text-left">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Masukkan Nama Anda:
                      </label>
                      <span className="text-[11px] font-medium text-amber-400">
                        *Wajib Diisi
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Masukkan nama Anda (wajib)..."
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={25}
                      autoFocus
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {!playerName.trim() && (
                      <p className="text-[11px] text-amber-400/90 mt-1.5">
                        Isi nama Anda untuk bergabung ke room ini.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !playerName.trim()}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Gabung Langsung ke Room</span>
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setInvitedCode('');
                      setJoinCode('');
                      if (typeof window !== 'undefined') {
                        const cleanUrl = window.location.pathname;
                        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
                      }
                    }}
                    className="text-slate-400 hover:text-slate-200 transition-colors underline cursor-pointer"
                  >
                    Gunakan kode lain atau buat room baru
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Nama Anda:
                    </label>
                    <span className="text-[11px] font-medium text-amber-400">
                      *Wajib Diisi
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Masukkan nama Anda (wajib)..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={25}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {!playerName.trim() && (
                    <p className="text-[11px] text-amber-400/90 mt-1.5">
                      Pemain wajib mengisi nama sebelum membuat atau bergabung ke room.
                    </p>
                  )}
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
                      disabled={loading || !playerName.trim()}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
                      disabled={loading || !joinCode.trim() || !playerName.trim()}
                      className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
            )}
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

                    {/* Perspective Selector - Allows Moderator to inspect cards & switch back easily */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Akun Pemain Terhubung:</span>
                      </div>
                      {isModerator ? (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {currentPlayerId !== room.moderatorId && (
                            <button
                              onClick={() => {
                                setCurrentPlayerId(room.moderatorId);
                              }}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                            >
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                              <span>Kembali ke Moderator</span>
                            </button>
                          )}

                          <select
                            value={currentPlayerId}
                            onChange={(e) => {
                              setCurrentPlayerId(e.target.value);
                            }}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none font-medium"
                          >
                            {room.players.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.id === room.moderatorId ? '(Moderator)' : p.status === 'eliminated' ? '(Tereliminasi)' : ''}
                              </option>
                            ))}
                          </select>
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                            Pemandu
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-100">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{currentPlayer?.name}</span>
                        </div>
                      )}
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
                    onTriggerNightTransition={() => setShowNightTransition(true)}
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
                {isModerator && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 hover:text-white rounded-lg font-semibold transition-all shadow-sm active:scale-95 cursor-pointer text-xs"
                      title="Hapus room dari server untuk menghemat memori dan penyimpanan"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus Room</span>
                    </button>
                  </>
                )}
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

      {/* Delete / Free Room Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-800/80 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-950 border border-rose-700 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Akhiri & Hapus Room?</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Room <strong className="text-amber-400">#{room?.code}</strong> dan seluruh riwayat sesi permainan akan langsung dihapus dari sistem server demi efisiensi memori dan penyimpanan.
              </p>
              <p className="text-[11px] text-rose-400 mt-2 font-medium">
                Semua pemain di room ini akan otomatis dikeluarkan.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRoom}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{loading ? 'Menghapus...' : 'Ya, Hapus Room'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dramatic Phase Transition Overlay: Nightfall */}
      <NightTransitionOverlay
        isOpen={showNightTransition}
        cycle={room?.cycle || 1}
        onComplete={() => setShowNightTransition(false)}
      />

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
