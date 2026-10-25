import { useState } from 'react';
import { Volume2, VolumeX, BookOpen, Crown, Copy, Check, History, LogOut, Share2 } from 'lucide-react';
import { sounds } from '../utils/audio';
import { copyToClipboard } from '../utils/clipboard';

interface Props {
  roomCode?: string;
  activeTab: 'player' | 'moderator';
  onTabChange: (tab: 'player' | 'moderator') => void;
  isModerator: boolean;
  onOpenRules: () => void;
  onOpenHistory?: () => void;
  historyCount?: number;
  onClaimModerator?: () => void;
  onExitRoom?: () => void;
  stage?: string;
}

export function TopBar({
  roomCode,
  activeTab,
  onTabChange,
  isModerator,
  onOpenRules,
  onOpenHistory,
  historyCount = 0,
  onClaimModerator,
  onExitRoom,
  stage,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(sounds.enabled);

  const toggleAudio = () => {
    sounds.enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    await copyToClipboard(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInviteLink = async () => {
    if (!roomCode || typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Undangan Permainan Werewolf',
          text: `Bergabunglah ke sesi permainan Werewolf pada Ruang #${roomCode}:`,
          url: url,
        });
        return;
      } catch {
        // Fall back to copy
      }
    }
    await copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Room Code Pill */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            Werewolf Companion
          </span>
          {roomCode && (
            <div className="flex items-center shrink-0">
              <button
                onClick={copyRoomCode}
                title="Salin Kode Ruang"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-mono font-medium bg-slate-900 border border-slate-700 rounded-l text-slate-300 hover:text-white hover:border-slate-500 active:scale-95 transition-all min-h-[32px] shrink-0"
              >
                <span>#{roomCode}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              <button
                onClick={shareInviteLink}
                title="Bagikan Tautan Undangan"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 text-xs font-medium bg-indigo-950/90 hover:bg-indigo-900 border border-l-0 border-indigo-700 text-indigo-300 hover:text-white rounded-r active:scale-95 transition-all min-h-[32px] shrink-0 shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'Tautan Tersalin' : 'Undang'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Desktop Navigation Tabs (Hidden on mobile, handled by MobileBottomNav) */}
        <nav className="hidden md:flex items-center gap-2">
          {roomCode && (
            <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                onClick={() => onTabChange('player')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'player'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kartu Peran
              </button>
              <button
                onClick={() => onTabChange('moderator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'moderator'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Panel Moderator</span>
              </button>
            </div>
          )}

          {roomCode && onOpenHistory && (
            <button
              onClick={onOpenHistory}
              title="Lihat riwayat eliminasi pemain per babak"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg border border-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Riwayat</span>
              {historyCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-[10px] font-mono rounded text-slate-300">
                  {historyCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Aturan</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={toggleAudio}
            title={audioEnabled ? 'Nonaktifkan Suara' : 'Aktifkan Suara'}
            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors active:scale-95"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-slate-300" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {roomCode && onExitRoom && (
            <button
              onClick={onExitRoom}
              title="Keluar dari Ruang Permainan"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] text-xs font-semibold bg-rose-950/90 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-800/90 rounded-lg active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Keluar Ruang</span>
              <span className="sm:hidden">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
