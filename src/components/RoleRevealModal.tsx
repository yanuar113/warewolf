import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Trophy,
  RotateCcw,
  X,
  Heart,
  Skull,
  Moon,
  Sun,
  Shield,
  Clock,
  Sparkles,
  Zap,
  Crosshair,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Play,
  Users,
  ChevronDown,
} from 'lucide-react';
import { GameRoom, RoleId, Team } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/roles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: GameRoom;
  onResetGame: () => Promise<void>;
  isModerator: boolean;
}

type TimelineFilter = 'all' | 'eliminations';

interface ChronologyItem {
  id: string;
  timestamp: number;
  cycle: number;
  phase: 'NIGHT' | 'DAY' | 'START' | 'END';
  title: string;
  description: string;
  category: 'start' | 'night_action' | 'night_result' | 'day_result' | 'special' | 'end';
  victimName?: string;
  victimRole?: RoleId;
  victimRoleName?: string;
  isElimination?: boolean;
  isSaved?: boolean;
}

export function RoleRevealModal({
  isOpen,
  onClose,
  room,
  onResetGame,
  isModerator,
}: Props) {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [searchPlayer, setSearchPlayer] = useState('');

  const winner = room.winner;

  // Pemain yang bermain (eksklusifkan moderator pemandu)
  const playingPlayers = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId);

  // Buat map pencarian pemain berdasarkan ID & Nama
  const playerMapById = useMemo(() => {
    const map = new Map<string, { name: string; role?: RoleId; roleName: string; team?: Team }>();
    room.players.forEach(p => {
      const roleDef = p.role ? ROLE_DEFINITIONS[p.role] : undefined;
      map.set(p.id, {
        name: p.name,
        role: p.role,
        roleName: roleDef ? roleDef.name : 'Warga',
        team: roleDef ? roleDef.team : 'village',
      });
    });
    return map;
  }, [room.players]);

  // Bangun daftar kronologi lengkap: STRICTLY mulai dari "Permainan Dimulai" hingga selesai
  const timelineItems: ChronologyItem[] = useMemo(() => {
    const items: ChronologyItem[] = [];

    // Filter log lobi pra-permainan (Room Dibuat, Pemain Bergabung, dsb.)
    const isLobbyLog = (title: string, desc: string) => {
      const t = title.toLowerCase();
      const d = desc.toLowerCase();
      return (
        t.includes('room dibuat') ||
        t.includes('pemain bergabung') ||
        t.includes('pergantian moderator') ||
        t.includes('room direset') ||
        d.includes('telah masuk ke room') ||
        d.includes('dibuat oleh') ||
        d.includes('kembali ke lobby')
      );
    };

    const cleanLogs = (room.logs || []).filter(log => !isLobbyLog(log.title, log.description));

    // Ambil log mulai dari "Permainan Dimulai" terakhir
    const startIdx = cleanLogs.findIndex(l => l.title.toLowerCase().includes('permainan dimulai'));
    const inGameLogs = startIdx !== -1 ? cleanLogs.slice(startIdx) : cleanLogs;

    // Pastikan log "Permainan Dimulai" ada di urutan pertama
    const hasStartLog = inGameLogs.some(l => l.title.toLowerCase().includes('permainan dimulai'));
    if (!hasStartLog) {
      items.push({
        id: 'init_start_log',
        timestamp: room.players[0]?.joinedAt || Date.now() - 3600000,
        cycle: 1,
        phase: 'START',
        title: 'Permainan Dimulai',
        description: 'Peran rahasia dibagikan secara acak kepada seluruh pemain. Fase Malam ke-1 dimulai.',
        category: 'start',
      });
    }

    // Olah log sesi permainan resmi
    inGameLogs.forEach((log, index) => {
      let category: ChronologyItem['category'] = 'night_action';
      let phase: ChronologyItem['phase'] = log.phase || 'NIGHT';
      let isElimination = false;
      let isSaved = false;
      let victimName: string | undefined;
      let victimRole: RoleId | undefined;
      let victimRoleName: string | undefined;

      const titleLower = log.title.toLowerCase();
      const descLower = log.description.toLowerCase();

      if (titleLower.includes('permainan dimulai')) {
        phase = 'START';
        category = 'start';
      } else if (titleLower.includes('permainan selesai') || titleLower.includes('kemenangan')) {
        phase = 'END';
        category = 'end';
      } else if (titleLower.includes('hasil malam')) {
        category = 'night_result';
        if (descLower.includes('dilindungi') || descLower.includes('diselamatkan')) {
          isSaved = true;
        } else if (descLower.includes('tereliminasi')) {
          isElimination = true;
        }
      } else if (titleLower.includes('voting siang') || titleLower.includes('hasil voting')) {
        category = 'day_result';
        phase = 'DAY';
        if (descLower.includes('tereliminasi')) {
          isElimination = true;
        }
      } else if (titleLower.includes('hunter') || titleLower.includes('racun') || titleLower.includes('patah hati')) {
        category = 'special';
        isElimination = true;
      } else if (titleLower.includes('pengampunan')) {
        category = 'special';
        isSaved = true;
      }

      // Deteksi nama pemain yang terlibat dari teks log untuk menampilkan perannya
      for (const p of playingPlayers) {
        if (p.name && (log.description.includes(p.name) || log.title.includes(p.name))) {
          if (isElimination || isSaved) {
            victimName = p.name;
            victimRole = p.role;
            const rDef = p.role ? ROLE_DEFINITIONS[p.role] : undefined;
            victimRoleName = rDef ? rDef.name : 'Warga';
            break;
          }
        }
      }

      items.push({
        id: log.id || `log_${index}`,
        timestamp: log.timestamp,
        cycle: log.cycle || 1,
        phase,
        title: log.title,
        description: log.description,
        category,
        victimName,
        victimRole,
        victimRoleName,
        isElimination,
        isSaved,
      });
    });

    // 3. Pastikan penutup Permainan Selesai ada jika game sudah berakhir
    const hasEndLog = items.some(it => it.phase === 'END');
    if (winner && !hasEndLog) {
      const winTitle =
        winner === 'village'
          ? 'Kemenangan Tim Warga'
          : winner === 'tanner'
          ? 'Kemenangan Mutlak Tanner'
          : 'Kemenangan Tim Werewolf';

      const winDesc =
        winner === 'village'
          ? 'Seluruh anggota Werewolf berhasil dieliminasi. Tim Warga berhasil mengamankan desa dan memenangkan permainan.'
          : winner === 'tanner'
          ? 'Tanner berhasil dieliminasi melalui hasil musyawarah warga dan meraih kemenangan tunggal mutlak.'
          : 'Jumlah anggota Werewolf berhasil menyamai atau melebihi jumlah warga yang masih aktif. Tim Werewolf memenangkan permainan.';

      items.push({
        id: 'auto_game_over_log',
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: 'END',
        title: `Permainan Selesai · ${winTitle}`,
        description: winDesc,
        category: 'end',
      });
    }

    // Urutkan secara kronologis (Mulai dari Awal Permainan hingga Selesai)
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [room.logs, room.cycle, room.players, playingPlayers, winner]);

  // Filter daftar peristiwa sesuai pilihan tab
  const filteredTimeline = useMemo(() => {
    if (filter === 'eliminations') {
      return timelineItems.filter(it => it.isElimination || it.isSaved || it.phase === 'START' || it.phase === 'END');
    }
    return timelineItems;
  }, [timelineItems, filter]);

  // Filter roster pemain sesuai pencarian
  const filteredPlayers = useMemo(() => {
    if (!searchPlayer.trim()) return playingPlayers;
    const q = searchPlayer.toLowerCase();
    return playingPlayers.filter(p => {
      const roleDef = p.role ? ROLE_DEFINITIONS[p.role] : undefined;
      return (
        p.name.toLowerCase().includes(q) ||
        (roleDef && roleDef.name.toLowerCase().includes(q)) ||
        (roleDef && roleDef.indonesianName.toLowerCase().includes(q))
      );
    });
  }, [playingPlayers, searchPlayer]);

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineBottomRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Deteksi scroll pengguna di dalam daftar kronologi
  const handleTimelineScroll = () => {
    if (!timelineContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = timelineContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const scrollToBottom = () => {
    if (timelineBottomRef.current) {
      timelineBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (timelineContainerRef.current) {
      timelineContainerRef.current.scrollTo({
        top: timelineContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setShowScrollBottomBtn(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[94vh] sm:h-[90vh] max-h-[94vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-100 truncate">
                Pengungkapan Peran & Kronologi Permainan
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Daftar peran terbuka dan rekapitulasi peristiwa lengkap dari awal hingga selesai
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup Pengungkapan Peran"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-6">
          
          {/* 1. Victory Status Banner */}
          {winner ? (
            <div
              className={`p-4 sm:p-6 rounded-2xl border text-center space-y-2 shadow-lg ${
                winner === 'village'
                  ? 'bg-gradient-to-b from-emerald-950/60 to-slate-950 border-emerald-600/80 text-emerald-200'
                  : winner === 'tanner'
                  ? 'bg-gradient-to-b from-purple-950/60 to-slate-950 border-purple-600/80 text-purple-200'
                  : 'bg-gradient-to-b from-rose-950/60 to-slate-950 border-rose-600/80 text-rose-200'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-black/40 border border-white/10">
                <Trophy className="w-3.5 h-3.5" />
                <span>Hasil Akhir Permainan</span>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wide text-white">
                {winner === 'village'
                  ? 'Kemenangan Tim Warga'
                  : winner === 'tanner'
                  ? 'Kemenangan Mutlak Tanner'
                  : 'Kemenangan Tim Werewolf'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                {winner === 'village'
                  ? 'Seluruh anggota Werewolf telah berhasil dieliminasi dari desa. Tim Warga berhasil menjaga keselamatan desa.'
                  : winner === 'tanner'
                  ? 'Tanner (Penyamak Kulit) berhasil memancing warga untuk mengeliminasinya saat musyawarah dan meraih kemenangan tunggal mutlak.'
                  : 'Jumlah anggota Werewolf berhasil menyamai atau melebihi jumlah warga aktif yang masih bertahan hidup di desa.'}
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Sesi permainan sedang berlangsung. Data di bawah ini ditampilkan untuk tinjauan moderator.</span>
              </span>
              <span className="font-mono text-slate-300">Babak {room.cycle}</span>
            </div>
          )}

          {/* 2. Roster of Players (Role Reveal) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
                  Daftar Peran Seluruh Pemain ({playingPlayers.length})
                </h4>
              </div>

              {playingPlayers.length > 6 && (
                <input
                  type="text"
                  placeholder="Cari pemain atau peran..."
                  value={searchPlayer}
                  onChange={(e) => setSearchPlayer(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 max-w-xs"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredPlayers.map(player => {
                const roleDef = player.role ? ROLE_DEFINITIONS[player.role] : null;
                const isWolf = roleDef?.team === 'werewolf';
                const isIndie = roleDef?.team === 'tanner';
                const isAlive = player.status === 'alive';

                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                      isWolf
                        ? 'bg-slate-950 border-rose-900/60 shadow-sm'
                        : isIndie
                        ? 'bg-slate-950 border-purple-900/60 shadow-sm'
                        : 'bg-slate-950 border-slate-800/90 shadow-sm'
                    }`}
                  >
                    {/* Proportional Role Portrait */}
                    <div className="w-12 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative shadow-inner">
                      {roleDef ? (
                        <img
                          src={roleDef.image}
                          alt={roleDef.name}
                          className="w-full h-full object-cover object-center"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-bold">
                          ?
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-xs sm:text-sm text-slate-100 truncate block font-bold">
                          {player.name}
                        </strong>
                        {isAlive ? (
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                            <Heart className="w-2.5 h-2.5 fill-emerald-400" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-rose-400 bg-rose-950/80 border border-rose-800 px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                            <Skull className="w-2.5 h-2.5" />
                            <span>Gugur</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-200">
                          {roleDef ? roleDef.name : 'Villager'}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            isWolf
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : isIndie
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {isWolf ? 'Werewolf' : isIndie ? 'Solo' : 'Warga'}
                        </span>
                      </div>

                      {/* Cupid Partner Badge if player is a lover */}
                      {player.isLover && (
                        <div className="mt-1 text-[10px] text-rose-300 flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-300 shrink-0" />
                          <span className="truncate">
                            Kekasih: {player.loverPartnerName || 'Pasangan Takdir'}
                          </span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {isAlive
                          ? 'Bertahan hidup hingga akhir'
                          : `${player.eliminatedInPhase || 'Tereliminasi'} · ${player.eliminatedReason || 'Eliminasi'}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Detailed Event Log & Chronology (The core requested feature) */}
          <div className="space-y-3.5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-2.5">
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Kronologi Peristiwa Babak per Babak</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Catatan peristiwa resmi dari awal permainan dimulai hingga akhir permainan
                </p>
              </div>

              {/* Filter Tabs: Semua vs Khusus Eliminasi */}
              <div className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all text-xs cursor-pointer ${
                    filter === 'all'
                      ? 'bg-slate-800 text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua Peristiwa ({timelineItems.length})
                </button>
                <button
                  onClick={() => setFilter('eliminations')}
                  className={`px-3 py-1 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer ${
                    filter === 'eliminations'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Skull className="w-3 h-3 text-rose-400" />
                  <span>Khusus Eliminasi</span>
                </button>
              </div>
            </div>

            {/* Timeline Stream with Smooth Scroll */}
            {filteredTimeline.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                Belum ada catatan peristiwa yang tercatat.
              </div>
            ) : (
              <div className="relative">
                <div
                  ref={timelineContainerRef}
                  onScroll={handleTimelineScroll}
                  className="max-h-[460px] sm:max-h-[520px] overflow-y-auto scroll-smooth space-y-2.5 pr-1.5 focus:outline-none rounded-2xl border border-slate-800/80 bg-slate-950/60 p-2.5 sm:p-4"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  {filteredTimeline.map((item, idx) => {
                    const isStart = item.phase === 'START';
                    const isEnd = item.phase === 'END';
                    const isNight = item.phase === 'NIGHT';
                    const isDay = item.phase === 'DAY';
                    const isEliminated = item.isElimination;
                    const isSaved = item.isSaved;

                    return (
                      <div
                        key={item.id ? `${item.id}_${idx}` : `timeline_${idx}`}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 text-xs leading-relaxed relative ${
                          isStart
                            ? 'bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 border-indigo-700/60 text-slate-200'
                            : isEnd
                            ? 'bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border-amber-600/70 text-amber-100'
                            : isSaved
                            ? 'bg-emerald-950/30 border-emerald-800/70 text-emerald-200'
                            : isEliminated
                            ? 'bg-rose-950/30 border-rose-900/70 text-slate-200'
                            : 'bg-slate-950 border-slate-800/90 text-slate-300'
                        }`}
                      >
                        {/* Top Row: Phase Tag & Timestamp */}
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isStart ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-700">
                                <Play className="w-2.5 h-2.5 fill-indigo-400" />
                                <span>Permainan Dimulai</span>
                              </span>
                            ) : isEnd ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-600">
                                <Trophy className="w-2.5 h-2.5" />
                                <span>Akhir Permainan</span>
                              </span>
                            ) : isNight ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-indigo-300 border border-indigo-900">
                                <Moon className="w-2.5 h-2.5 text-indigo-400" />
                                <span>Malam Babak {item.cycle}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-amber-300 border border-amber-900">
                                <Sun className="w-2.5 h-2.5 text-amber-400" />
                                <span>Siang Babak {item.cycle}</span>
                              </span>
                            )}

                            {isSaved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <Shield className="w-2.5 h-2.5" />
                                <span>Selamat</span>
                              </span>
                            )}

                            {isEliminated && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800">
                                <Skull className="w-2.5 h-2.5" />
                                <span>Gugur</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Event Title */}
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{item.title}</span>
                        </div>

                        {/* Event Description (Enriched with role context if victim identified) */}
                        <div className="text-xs sm:text-[13px] text-slate-300 mt-1 leading-relaxed">
                          {item.description}
                        </div>

                        {/* Victim / Actor Detail Badge at end of event card */}
                        {item.victimName && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Pemain Terkait:</span>
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <span>{item.victimName}</span>
                              {item.victimRoleName && (
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${
                                    item.victimRole === 'werewolf'
                                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                                      : item.victimRole === 'tanner'
                                      ? 'bg-purple-950 text-purple-300 border-purple-800'
                                      : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                  }`}
                                >
                                  {item.victimRoleName}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Invisible anchor for smooth scrolling to the newest event */}
                  <div ref={timelineBottomRef} className="h-1" />
                </div>

                {/* Floating button to smoothly scroll down if user scrolled up */}
                {showScrollBottomBtn && (
                  <div className="absolute bottom-3 right-4 z-20 animate-in fade-in zoom-in-95 duration-200">
                    <button
                      type="button"
                      onClick={scrollToBottom}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-full shadow-2xl border border-indigo-400 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                      <span>Gulir ke Peristiwa Terbaru</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Sesi permainan tercatat aman di Werewolf Companion
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto ml-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              Tutup Tampilan
            </button>

            {isModerator && (
              <button
                onClick={onResetGame}
                className="flex-1 sm:flex-none px-6 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Mulai Babak Baru (Lobby)</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
