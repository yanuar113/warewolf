import { useState, useEffect } from 'react';
import { 
  Moon, Sun, Clock, Users, Skull, Shield, Eye, Bell, 
  Play, Pause, RotateCcw, ChevronRight, UserCheck, Award, EyeOff, History, Sparkles 
} from 'lucide-react';
import { GameRoom, NightStep, DayStep } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/roles';
import { sounds } from '../utils/audio';
import { CompactHistoryTimeline } from './CompactHistoryTimeline';

interface Props {
  room: GameRoom;
  currentPlayerId?: string;
  onNightStep: (step: NightStep) => Promise<void>;
  onResolveNight: () => Promise<void>;
  onDayStep: (step: DayStep) => Promise<void>;
  onResolveDay: (manualTargetId?: string) => Promise<void>;
  onUpdateTimer: (seconds?: number, isRunning?: boolean) => Promise<void>;
  onSetModerator: (playerId: string) => Promise<void>;
  onOpenRoleReveal: () => void;
  onOpenHistory?: () => void;
  onResetGame: () => Promise<void>;
  onTriggerDawnTransition?: () => void;
  onTriggerNightTransition?: () => void;
}

export function ModeratorDashboard({
  room,
  currentPlayerId,
  onNightStep,
  onResolveNight,
  onDayStep,
  onResolveDay,
  onUpdateTimer,
  onSetModerator,
  onOpenRoleReveal,
  onOpenHistory,
  onResetGame,
  onTriggerDawnTransition,
  onTriggerNightTransition,
}: Props) {
  const [selectedLynchTarget, setSelectedLynchTarget] = useState<string>('');
  const [showRoleCheatSheet, setShowRoleCheatSheet] = useState(true);

  if (currentPlayerId && room.moderatorId !== currentPlayerId) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-rose-900/60 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-widest text-rose-400 font-bold">Error 403 Forbidden</span>
          <h3 className="text-xl font-bold text-white">Akses Panel Moderator Ditolak</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Anda tidak memiliki hak akses sebagai Moderator untuk room ini. Hanya Moderator ({room.players.find(p => p.id === room.moderatorId)?.name || 'terpilih'}) yang dapat mengakses dashboard panduan ini.
        </p>
      </div>
    );
  }

  // Timer local tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (room.timerRunning && room.discussionTimerSeconds > 0) {
      interval = setInterval(() => {
        onUpdateTimer(room.discussionTimerSeconds - 1, true);
        if (room.discussionTimerSeconds === 31 || room.discussionTimerSeconds === 1) {
          sounds.playBell();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [room.timerRunning, room.discussionTimerSeconds, onUpdateTimer]);

  const alivePlayers = room.players.filter(p => p.status === 'alive');
  const eliminatedPlayers = room.players.filter(p => p.status === 'eliminated');
  const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf').length;
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf').length;

  const seerPlayer = room.players.find(p => p.role === 'seer');
  const seerTargetPlayer = room.players.find(p => p.id === room.nightActions.seerTargetId);

  const doctorPlayer = room.players.find(p => p.role === 'doctor');
  const doctorTargetPlayer = room.players.find(p => p.id === room.nightActions.doctorTargetId);

  const werewolfTargetPlayer = room.players.find(p => p.id === room.nightActions.werewolfTargetId);

  const voteCounts: Record<string, { count: number; voters: string[] }> = {};
  Object.entries(room.dayVotes.votes).forEach(([voterId, targetId]) => {
    const voter = room.players.find(p => p.id === voterId);
    if (!voter) return;
    const weight = voter.role === 'mayor' ? 2 : 1;
    if (!voteCounts[targetId]) {
      voteCounts[targetId] = { count: 0, voters: [] };
    }
    voteCounts[targetId].count += weight;
    voteCounts[targetId].voters.push(voter.name + (voter.role === 'mayor' ? ' (2 suara)' : ''));
  });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Status Card */}
      <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              Panel Moderator
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded font-mono font-medium bg-slate-800 border border-slate-700 text-slate-300">
              {room.stage === 'NIGHT' ? `Malam ${room.cycle}` : room.stage === 'DAY' ? `Siang ${room.cycle}` : 'Selesai'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400 mt-2">
            <span>{alivePlayers.length} Pemain Aktif</span>
            <span aria-hidden="true">·</span>
            <span>{aliveWerewolves} Werewolf</span>
            <span aria-hidden="true">·</span>
            <span>{aliveVillagers} Tim Warga</span>
            <span aria-hidden="true">·</span>
            <span>{eliminatedPlayers.length} Tereliminasi</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 w-full sm:w-auto">
            <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={room.moderatorId}
              onChange={(e) => onSetModerator(e.target.value)}
              className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none min-h-[38px]"
            >
              {room.players.map(p => (
                <option key={p.id} value={p.id}>
                  Moderator: {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 rounded-lg transition-colors min-h-[38px]"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Riwayat ({room.deathHistory?.length || 0})</span>
              </button>
            )}

            <button
              onClick={onOpenRoleReveal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-slate-200 rounded-lg transition-colors min-h-[38px]"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Role Reveal</span>
            </button>
          </div>
        </div>
      </div>

      {/* COMPACT HISTORY TIMELINE FOR MODERATOR */}
      <CompactHistoryTimeline
        deathHistory={room.deathHistory || []}
        onOpenFullModal={onOpenHistory}
      />

      {/* NIGHT CYCLE GUIDE */}
      {room.stage === 'NIGHT' && (
        <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Moon className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm">
                Panduan Fase Malam (Babak {room.cycle})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {onTriggerNightTransition && (
                <button
                  onClick={onTriggerNightTransition}
                  className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Efek Transisi Malam</span>
                </button>
              )}
              <span className="text-xs text-slate-500">Langkah: {room.nightStep}</span>
            </div>
          </div>

          {/* Step 1: Night Start */}
          {room.nightStep === 'NIGHT_START' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Instruksi Moderator:
                </span>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  "Semua pemain, tutup mata."
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    sounds.playNightFall();
                    onNightStep('SEER_STEP');
                  }}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
                >
                  <span>Panggil Seer</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Seer */}
          {room.nightStep === 'SEER_STEP' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Instruksi Moderator:
                </span>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  "Seer, buka mata dan pilih satu pemain untuk diperiksa perannya."
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-xs font-semibold text-slate-400 mb-2">Status Aksi Seer:</div>
                {seerTargetPlayer ? (
                  <div className="flex items-center justify-between text-xs p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-300 font-medium">{seerPlayer?.name || 'Seer'}</span> memeriksa{' '}
                      <strong className="text-white">{seerTargetPlayer.name}</strong>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        seerTargetPlayer.role === 'werewolf'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {seerTargetPlayer.role === 'werewolf' ? 'Werewolf' : 'Villager'}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Menunggu Seer {seerPlayer ? `(${seerPlayer.name})` : ''} memilih target di layar perangkatnya...
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onNightStep('DOCTOR_STEP')}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
                >
                  <span>Selesai, Panggil Doctor</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Doctor */}
          {room.nightStep === 'DOCTOR_STEP' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Instruksi Moderator:
                </span>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  "Seer tutup mata. Doctor, buka mata dan pilih satu pemain untuk dilindungi."
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="text-xs font-semibold text-slate-400 mb-2">Status Aksi Doctor:</div>
                {doctorTargetPlayer ? (
                  <div className="text-xs p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-slate-200">
                    <span className="font-medium">{doctorPlayer?.name || 'Doctor'}</span> melindungi{' '}
                    <strong className="text-white">{doctorTargetPlayer.name}</strong> malam ini.
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Menunggu Doctor {doctorPlayer ? `(${doctorPlayer.name})` : ''} memilih target di layar perangkatnya...
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onNightStep('WEREWOLF_STEP')}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-rose-700 hover:bg-rose-600 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
                >
                  <span>Selesai, Panggil Werewolf</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Werewolf */}
          {room.nightStep === 'WEREWOLF_STEP' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5" /> Instruksi Moderator:
                </span>
                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  "Doctor tutup mata. Werewolf, buka mata dan tentukan target eliminasi malam ini."
                </p>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-400">
                  Status Voting Werewolf:
                </div>
                {Object.keys(room.nightActions.werewolfVotes).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(room.nightActions.werewolfVotes).map(([wwId, targetId]) => {
                      const wolf = room.players.find(p => p.id === wwId);
                      const target = room.players.find(p => p.id === targetId);
                      return (
                        <div
                          key={wwId}
                          className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded-lg border border-slate-800"
                        >
                          <span className="text-slate-300 font-medium">{wolf?.name || 'Werewolf'}</span>
                          <span className="text-slate-400">memilih: <strong className="text-white">{target?.name || 'Target'}</strong></span>
                        </div>
                      );
                    })}

                    {werewolfTargetPlayer && (
                      <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-800 rounded-lg text-xs font-semibold text-rose-300 text-center">
                        Target mayoritas: {werewolfTargetPlayer.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Menunggu Werewolf memilih target di layar perangkat masing-masing...
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onNightStep('NIGHT_RESOLVE')}
                  className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all min-h-[44px]"
                >
                  <span>Selesai, Hitung Resolusi Malam</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Night Resolve */}
          {room.nightStep === 'NIGHT_RESOLVE' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Hasil Malam #{room.cycle}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Target Werewolf:</span>
                    <strong className="text-slate-200 text-sm">
                      {werewolfTargetPlayer ? werewolfTargetPlayer.name : 'Tidak ada'}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block mb-1">Target Dilindungi Doctor:</span>
                    <strong className="text-slate-200 text-sm">
                      {doctorTargetPlayer ? doctorTargetPlayer.name : 'Tidak ada'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-0.5">Kesimpulan:</span>
                  {werewolfTargetPlayer && doctorTargetPlayer && werewolfTargetPlayer.id === doctorTargetPlayer.id ? (
                    <span className="text-emerald-400 font-semibold">
                      Target berhasil dilindungi oleh Doctor. Tidak ada pemain yang tereliminasi.
                    </span>
                  ) : werewolfTargetPlayer ? (
                    <span className="text-rose-400 font-semibold">
                      {werewolfTargetPlayer.name} tereliminasi.
                    </span>
                  ) : (
                    <span className="text-slate-300">Tidak ada aksi eliminasi malam ini.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2.5">
                {onTriggerDawnTransition && (
                  <button
                    onClick={onTriggerDawnTransition}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-amber-300 border border-slate-700 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all min-h-[44px]"
                    title="Pratinjau tampilan animasi fajar di layar"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Pratinjau Animasi Fajar</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onResolveNight();
                  }}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
                >
                  <Sun className="w-4 h-4" />
                  <span>Mulai Fase Siang (Fajar)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DAY CYCLE GUIDE */}
      {room.stage === 'DAY' && (
        <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-200">
              <Sun className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm">
                Panduan Fase Siang (Babak {room.cycle})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Langkah: {room.dayStep}</span>
          </div>

          {/* Discussion Timer */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <span className="text-xs text-slate-400 block">Waktu Diskusi:</span>
                <span className="font-mono text-2xl font-bold tabular-nums text-slate-200">
                  {formatTimer(room.discussionTimerSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onUpdateTimer(undefined, !room.timerRunning)}
                className="min-h-[40px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {room.timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{room.timerRunning ? 'Jeda' : 'Mulai'}</span>
              </button>

              <button
                onClick={() => onUpdateTimer(room.discussionTimerSeconds + 60, room.timerRunning)}
                className="min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                +1 Menit
              </button>

              <button
                onClick={() => onUpdateTimer(180, false)}
                className="min-h-[40px] min-w-[40px] p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-slate-200 rounded-lg flex items-center justify-center transition-colors"
                title="Reset Waktu ke 3 Menit"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => sounds.playBell()}
                className="min-h-[40px] min-w-[40px] p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded-lg flex items-center justify-center transition-colors"
                title="Bunyikan Bel"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Announcement Text */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Pengumuman Pagi:
              </span>
              {onTriggerDawnTransition && (
                <button
                  onClick={onTriggerDawnTransition}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/80 rounded-lg transition-colors"
                  title="Tampilkan animasi fajar di layar"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Putar Animasi Fajar</span>
                </button>
              )}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {room.lastNightSaved ? (
                `"Semua pemain, buka mata. Tidak ada pemain yang tereliminasi malam tadi (target dilindungi Doctor)."`
              ) : room.lastNightKilledId ? (
                `"Semua pemain, buka mata. Pemain yang tereliminasi malam tadi adalah ${
                  room.players.find(p => p.id === room.lastNightKilledId)?.name
                }."`
              ) : (
                `"Semua pemain, buka mata. Tidak ada pemain yang tereliminasi malam tadi."`
              )}
            </p>
          </div>

          {/* Live Voting Leaderboard */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Rekapitulasi Suara Voting Siang
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {Object.keys(room.dayVotes.votes).length} / {alivePlayers.length} Suara
              </span>
            </div>

            {Object.keys(voteCounts).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(voteCounts).map(([targetId, info]) => {
                  const target = targetId === 'skip' ? { name: 'Lewati (Tidak ada eliminasi)' } : room.players.find(p => p.id === targetId);
                  return (
                    <div
                      key={targetId}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <strong className="text-sm text-slate-200">{target?.name}</strong>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Pemilih: {info.voters.join(', ')}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-200 font-mono font-medium text-xs rounded-lg self-start sm:self-auto">
                        {info.count} Suara
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Pemain dapat memilih melalui panel perangkat masing-masing, atau Moderator dapat memilih target eliminasi secara manual di bawah ini.
              </p>
            )}

            {/* Target Override */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 block mb-1 font-medium">
                  Pilih Target Eliminasi:
                </label>
                <select
                  value={selectedLynchTarget}
                  onChange={(e) => setSelectedLynchTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none min-h-[44px]"
                >
                  <option value="">Gunakan Suara Terbanyak Otomatis</option>
                  <option value="skip">
                    Lewati (Tidak ada yang dieliminasi) {voteCounts['skip']?.count ? `(${voteCounts['skip'].count} suara)` : ''}
                  </option>
                  {alivePlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      Eliminasi {p.name} {voteCounts[p.id]?.count ? `(${voteCounts[p.id].count} suara)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  sounds.playElimination();
                  onResolveDay(selectedLynchTarget || undefined);
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-3 bg-rose-700 hover:bg-rose-600 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Skull className="w-4 h-4" />
                <span>Selesaikan & Masuk ke Malam Berikutnya</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUNTER REVENGE */}
      {room.stage === 'HUNTER_REVENGE' && (
        <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl text-center space-y-2">
          <Skull className="w-6 h-6 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-100">
            Aksi Terakhir Hunter Sedang Berjalan
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Hunter ({room.players.find(p => p.id === room.hunterRevengePlayerId)?.name}) tereliminasi dan sedang memilih satu pemain untuk dieliminasi bersamanya.
          </p>
        </div>
      )}

      {/* MODERATOR CHEAT SHEET */}
      <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-sm text-slate-200">
              Daftar Peran Seluruh Pemain (Hanya Moderator)
            </h4>
          </div>
          <button
            onClick={() => setShowRoleCheatSheet(!showRoleCheatSheet)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            {showRoleCheatSheet ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showRoleCheatSheet ? 'Sembunyikan' : 'Tampilkan'}</span>
          </button>
        </div>

        {showRoleCheatSheet && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {room.players.map(p => {
              const roleDef = p.role ? ROLE_DEFINITIONS[p.role] : null;
              const isWolf = roleDef?.team === 'werewolf';
              const isAlive = p.status === 'alive';

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    !isAlive
                      ? 'bg-slate-950 border-slate-800 opacity-50'
                      : isWolf
                      ? 'bg-rose-950/20 border-rose-900/40'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">{p.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {roleDef ? roleDef.name : 'Belum dibagikan'}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      !isAlive
                        ? 'bg-slate-800 text-slate-400'
                        : isWolf
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {!isAlive ? 'Tereliminasi' : isWolf ? 'Werewolf' : 'Warga'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GAME EVENT LOG */}
      <div className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-3">
        <h4 className="font-bold text-sm text-slate-200">
          Catatan Peristiwa
        </h4>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {room.logs.slice().reverse().map(log => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg border bg-slate-950 border-slate-800 text-xs text-slate-300"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                <span className="font-semibold uppercase">{log.title}</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-300">{log.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
