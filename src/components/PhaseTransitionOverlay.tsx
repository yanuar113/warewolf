import { useEffect, useState } from 'react';
import { Sun, Moon, Shield, Skull, ChevronRight, X, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface Props {
  isOpen: boolean;
  cycle: number;
  lastNightSaved?: boolean;
  killedPlayerName?: string;
  onComplete: () => void;
}

export function PhaseTransitionOverlay({
  isOpen,
  cycle,
  lastNightSaved,
  killedPlayerName,
  onComplete,
}: Props) {
  const [animStage, setAnimStage] = useState<'dawn' | 'sunrise' | 'reveal'>('dawn');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAnimStage('dawn');
      setExiting(false);
      return;
    }

    // Play sunrise dawn soundtrack
    sounds.playDramaticSunrise();

    // Sequence of animations
    const t1 = setTimeout(() => {
      setAnimStage('sunrise');
    }, 800);

    const t2 = setTimeout(() => {
      setAnimStage('reveal');
    }, 1800);

    const t3 = setTimeout(() => {
      handleClose();
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      onComplete();
      setExiting(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 select-none transition-opacity duration-400 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Transisi Fase Malam ke Siang"
    >
      {/* 1. Deep Midnight to Golden Dawn Ambient Gradient */}
      <div className="absolute inset-0 bg-slate-950 transition-colors duration-1000 ease-in-out" />

      {/* 2. Horizon Glow Rising Layer */}
      <div className="absolute inset-0 bg-radial-[circle_at_bottom] from-amber-500/35 via-rose-700/20 to-transparent animate-horizon-glow pointer-events-none" />

      {/* 3. Subtle Animated Fog / Mist Layer */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-amber-600/15 via-rose-950/20 to-transparent pointer-events-none" />

      {/* 4. Giant Radiant Sun Rays rotating in background */}
      <div className="absolute w-[600px] h-[600px] sm:w-[850px] sm:h-[850px] rounded-full pointer-events-none animate-sunrise-rays opacity-40 bg-[conic-gradient(from_0deg,transparent_0_30deg,rgba(245,158,11,0.25)_30deg_60deg,transparent_60deg_90deg,rgba(251,191,36,0.3)_90deg_120deg,transparent_120deg_150deg,rgba(245,158,11,0.25)_150deg_180deg,transparent_180deg_210deg,rgba(251,191,36,0.3)_210deg_240deg,transparent_240deg_270deg,rgba(245,158,11,0.25)_270deg_300deg,transparent_300deg_330deg,rgba(251,191,36,0.3)_330deg_360deg)] blur-xl" />

      {/* Skip Button Top Right */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 rounded-full text-xs text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95"
      >
        <span>Lewati</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Main Dramatic Content Container */}
      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        
        {/* Sun Rising Visual Icon */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center animate-sunrise-rise">
          {/* Pulsing Backlight Rings */}
          <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-2xl animate-pulse" />
          <div className="absolute inset-2 rounded-full border border-amber-400/40 animate-ping opacity-25" />
          
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 p-0.5 shadow-[0_0_50px_rgba(245,158,11,0.6)] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-950/20 backdrop-blur-sm flex items-center justify-center">
              <Sun className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-100 drop-shadow-[0_0_12px_rgba(254,240,138,0.9)]" />
            </div>
          </div>
        </div>

        {/* Phase Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-amber-300/90 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Babak {cycle} · Fase Siang Dimulai</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-300 tracking-tight font-serif drop-shadow-sm">
            FAJAR MENYINGSING
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xs mx-auto leading-relaxed">
            "Semua pemain buka mata. Sinar matahari pagi kembali menyinari desa."
          </p>
        </div>

        {/* Night Resolution Dramatic Bulletin */}
        <div 
          className={`transition-all duration-700 ease-out transform ${
            animStage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {lastNightSaved ? (
            <div className="p-4 bg-slate-900/90 border border-emerald-500/50 rounded-2xl shadow-xl backdrop-blur-md text-left flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Kabar Baik dari Malam Hari
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                  Dokter berhasil melindungi target penyerangan! Tidak ada pemain yang gugur malam tadi.
                </p>
              </div>
            </div>
          ) : killedPlayerName ? (
            <div className="p-4 bg-slate-900/90 border border-rose-500/50 rounded-2xl shadow-xl backdrop-blur-md text-left flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center shrink-0 mt-0.5">
                <Skull className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                  Kabar Duka Pagi Ini
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                  Warga <strong className="text-white font-bold">"{killedPlayerName}"</strong> ditemukan tidak bernyawa.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/90 border border-amber-500/40 rounded-2xl shadow-xl backdrop-blur-md text-left flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center shrink-0 mt-0.5">
                <Sun className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Malam Hening
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                  Tidak ada korban tereliminasi malam tadi. Seluruh pemain berkumpul di balai desa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 active:scale-[0.98] text-slate-950 font-bold text-sm rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 transition-all mx-auto"
          >
            <span>Buka Mata & Mulai Diskusi</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
