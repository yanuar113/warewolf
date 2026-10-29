import { useState } from 'react';
import { Volume2, VolumeX, BookOpen, Crown, Copy, Check, History, LogOut, Share2, Trash2, Award } from 'lucide-react';
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
  onDeleteRoom?: () => void;
  onOpenRoleReveal?: () => void;
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
  onDeleteRoom,
  onOpenRoleReveal,
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
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-2.5 sm:px-6 py-2 sm:py-2.5 w-full">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-6 w-full">
        
        {/* Left: Brand & Room Code Pill */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <span className="text-xs sm:text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            <span className="sm:hidden">Werewolf</span>
            <span className="hidden sm:inline">Werewolf Companion</span>
          </span>

          {roomCode && (
            <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shrink-0 shadow-sm text-xs">
              <button
                onClick={copyRoomCode}
                title="Salin Kode Ruang"
                className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 font-mono font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors border-r border-slate-800 shrink-0 text-[11px] sm:text-xs"
              >
                <span>#{roomCode}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
              <button
                onClick={shareInviteLink}
                title="Bagikan Tautan Undangan"
                className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 font-medium text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 transition-colors shrink-0 text-[11px] sm:text-xs"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3 text-indigo-400" />}
                <span className="hidden xs:inline sm:inline whitespace-nowrap">{copiedLink ? 'Tersalin' : 'Undang'}</span>
              </button>
            </div>
          )}

          {roomCode && isModerator && (
            <button
              onClick={() => onTabChange(activeTab === 'moderator' ? 'player' : 'moderator')}
              className={`md:hidden px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 shadow-sm ${
                activeTab === 'moderator'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-400 ring-2 ring-amber-400/20'
              }`}
              title={activeTab === 'moderator' ? 'Buka Tampilan Kartu Peran' : 'Kembali ke Panel Moderator'}
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="text-[11px] whitespace-nowrap">
                {activeTab === 'moderator' ? 'Kartu' : 'Ke Moderator'}
              </span>
            </button>
          )}
        </div>

        {/* Center: Desktop Navigation Tabs (Hidden on small mobile screens, handled by MobileBottomNav) */}
        {roomCode && (
          <nav className="hidden md:flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <button
                onClick={() => onTabChange('player')}
                className={`px-3 py-1 rounded-md transition-all whitespace-nowrap font-medium ${
                  activeTab === 'player'
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kartu Peran
              </button>
              {isModerator && (
                <button
                  onClick={() => onTabChange('moderator')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md transition-all whitespace-nowrap font-medium ${
                    activeTab === 'moderator'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Panel Moderator</span>
                </button>
              )}
            </div>

            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                title="Lihat riwayat eliminasi pemain per babak"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Riwayat</span>
                {historyCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-slate-800 border border-slate-700 text-[10px] font-mono rounded text-indigo-300">
                    {historyCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={onOpenRules}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Aturan</span>
            </button>

            {onOpenRoleReveal && (
              <button
                onClick={onOpenRoleReveal}
                title="Buka Kartu & Status Peran"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Role Reveal</span>
              </button>
            )}
          </nav>
        )}

        {/* Right: Sound, Hapus Room & Exit Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={toggleAudio}
            title={audioEnabled ? 'Nonaktifkan Suara' : 'Aktifkan Suara'}
            className="p-1.5 sm:p-2 h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors active:scale-95 shrink-0"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-slate-300" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Tombol Hapus Room (Pindah ke Navbar Atas, khusus Moderator) */}
          {roomCode && isModerator && onDeleteRoom && (
            <button
              onClick={onDeleteRoom}
              title="Hapus dan Bubarkan Room dari Server"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 sm:h-9 text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800/80 rounded-lg active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Hapus Room</span>
              <span className="sm:hidden">Hapus</span>
            </button>
          )}

          {/* Keluar Room */}
          {roomCode && onExitRoom && (
            <button
              onClick={onExitRoom}
              title="Keluar dari Ruang Permainan"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 h-8 sm:h-9 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Keluar Ruang</span>
              <span className="sm:hidden">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
