import { Trophy, RotateCcw, X, Heart, Skull } from 'lucide-react';
import { GameRoom } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/roles';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: GameRoom;
  onResetGame: () => Promise<void>;
  isModerator: boolean;
}

export function RoleRevealModal({
  isOpen,
  onClose,
  room,
  onResetGame,
  isModerator,
}: Props) {
  if (!isOpen) return null;

  const winner = room.winner;
  const isVillageWin = winner === 'village';

  // Eksklusifkan moderator dari pengungkapan peran, hanya tampilkan pemain yang bermain
  const playingPlayers = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 text-slate-100 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-100">
              Pengungkapan Peran (Role Reveal)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Victory Status */}
        {winner ? (
          <div
            className={`p-6 rounded-2xl border text-center space-y-2 ${
              isVillageWin
                ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/40 border-rose-700 text-rose-200'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Hasil Permainan
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-wide">
              {isVillageWin ? 'Kemenangan Tim Warga' : 'Kemenangan Tim Werewolf'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              {isVillageWin
                ? 'Seluruh Werewolf telah tereliminasi dari permainan.'
                : 'Jumlah Werewolf berhasil menyamai atau melebihi jumlah warga yang aktif.'}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
            Permainan masih berjalan. Daftar peran di bawah ini ditampilkan untuk peninjauan.
          </div>
        )}

        {/* Roster of all players */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Peran Seluruh Pemain ({playingPlayers.length})
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {playingPlayers.map(player => {
              const roleDef = player.role ? ROLE_DEFINITIONS[player.role] : null;
              const isWolf = roleDef?.team === 'werewolf';
              const isAlive = player.status === 'alive';

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                    isWolf
                      ? 'bg-slate-950 border-rose-900/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                    {roleDef ? (
                      <img
                        src={roleDef.image}
                        alt={roleDef.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">
                        ?
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <strong className="text-sm text-slate-100 truncate block">
                        {player.name}
                      </strong>
                      {isAlive ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 shrink-0">
                          <Heart className="w-3 h-3 fill-emerald-400" /> Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-400 flex items-center gap-0.5 shrink-0">
                          <Skull className="w-3 h-3" /> Gugur
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-medium text-slate-300 mt-0.5">
                      {roleDef ? roleDef.name : 'Villager'}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 truncate">
                      {isAlive
                        ? 'Bertahan hingga akhir'
                        : `${player.eliminatedInPhase || 'Tereliminasi'} · ${player.eliminatedReason || 'Eliminasi'}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chronological Elimination Timeline */}
        {room.deathHistory && room.deathHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Kronologi Eliminasi Babak per Babak
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {room.deathHistory.map(record => (
                <div
                  key={record.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    record.saved
                      ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
                      : record.playerName.includes('Tidak ada')
                      ? 'bg-slate-950 border-slate-800 text-slate-400'
                      : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">
                      {record.phase} {record.cycle}: {record.playerName}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {record.reason}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center"
          >
            Tutup Tampilan
          </button>

          {isModerator && (
            <button
              onClick={onResetGame}
              className="w-full sm:w-auto px-6 py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Mulai Babak Baru (Kembali ke Lobby)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
