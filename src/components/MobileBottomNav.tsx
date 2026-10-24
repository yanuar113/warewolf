import { Crown, BookOpen, History, Shield } from 'lucide-react';

interface Props {
  activeTab: 'player' | 'moderator';
  onTabChange: (tab: 'player' | 'moderator') => void;
  onOpenRules: () => void;
  onOpenHistory: () => void;
  historyCount?: number;
  isModerator: boolean;
  isInRoom: boolean;
}

export function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenRules,
  onOpenHistory,
  historyCount = 0,
  isModerator,
  isInRoom,
}: Props) {
  if (!isInRoom) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 md:hidden safe-area-pb">
      <div className="grid grid-cols-4 h-15 max-w-md mx-auto items-center px-1">
        {/* Tab 1: Kartu Peran */}
        <button
          onClick={() => onTabChange('player')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'player'
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Kartu</span>
        </button>

        {/* Tab 2: Panel Moderator */}
        <button
          onClick={() => onTabChange('moderator')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors relative ${
            activeTab === 'moderator'
              ? 'text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crown className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Moderator</span>
          {isModerator && (
            <span className="absolute top-1.5 right-4 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          )}
        </button>

        {/* Tab 3: Riwayat */}
        <button
          onClick={onOpenHistory}
          className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 transition-colors relative"
        >
          <div className="relative">
            <History className="w-5 h-5" />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-2.5 px-1 py-0.2 bg-slate-800 border border-slate-700 text-[9px] font-mono rounded text-slate-300">
                {historyCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Riwayat</span>
        </button>

        {/* Tab 4: Aturan */}
        <button
          onClick={onOpenRules}
          className="min-h-[48px] flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Aturan</span>
        </button>
      </div>
    </nav>
  );
}
