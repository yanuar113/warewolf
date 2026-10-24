import { Moon, Sun, Shield, Skull, History } from 'lucide-react';
import { DeathRecord } from '../types/game';

interface Props {
  deathHistory: DeathRecord[];
  onOpenFullModal?: () => void;
}

export function CompactHistoryTimeline({ deathHistory, onOpenFullModal }: Props) {
  if (!deathHistory || deathHistory.length === 0) {
    return (
      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Belum ada pemain yang tereliminasi.</span>
        </div>
      </div>
    );
  }

  // Reverse so newest is on top
  const recentRecords = deathHistory.slice(-4).reverse();

  return (
    <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wide">
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span>Riwayat Eliminasi Terakhir</span>
        </div>
        {onOpenFullModal && (
          <button
            onClick={onOpenFullModal}
            className="text-[11px] text-slate-400 hover:text-white transition-colors"
          >
            Lihat Semua ({deathHistory.length})
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {recentRecords.map(record => {
          const isNight = record.phase === 'Malam';
          const isNone = record.playerName.includes('Tidak ada');

          return (
            <div
              key={record.id}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                {isNight ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="text-slate-400 text-[11px] shrink-0 font-medium">
                  {record.phase} {record.cycle}:
                </span>
                <span className={`truncate font-medium ${
                  record.saved
                    ? 'text-emerald-400'
                    : isNone
                    ? 'text-slate-500'
                    : 'text-slate-200'
                }`}>
                  {record.playerName}
                </span>
              </div>

              <div className="shrink-0 text-[10px] text-slate-400 flex items-center gap-1">
                {record.saved ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Shield className="w-3 h-3" /> Dilindungi
                  </span>
                ) : !isNone ? (
                  <span className="flex items-center gap-1 text-rose-400">
                    <Skull className="w-3 h-3" /> Tereliminasi
                  </span>
                ) : (
                  <span className="text-slate-500">Aman</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
