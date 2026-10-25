import { useEffect, useState } from 'react';
import { Moon, EyeOff, Sparkles, X, ChevronRight, ShieldAlert } from 'lucide-react';
import { sounds } from '../utils/audio';

interface Props {
  isOpen: boolean;
  cycle: number;
  onComplete: () => void;
}

export function NightTransitionOverlay({
  isOpen,
  cycle,
  onComplete,
}: Props) {
  const [animStage, setAnimStage] = useState<'dusk' | 'midnight' | 'reveal'>('dusk');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAnimStage('dusk');
      setExiting(false);
      return;
    }

    // Play ominous nightfall audio gong & howl
    sounds.playNightFall();

    // Sequence of suspenseful animations
    const t1 = setTimeout(() => {
      setAnimStage('midnight');
    }, 600);

    const t2 = setTimeout(() => {
      setAnimStage('reveal');
    }, 1500);

    const t3 = setTimeout(() => {
      handleClose();
    }, 4500);

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 select-none transition-opacity duration-500 ease-out ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Transisi Fase Malam"
    >
      {/* 1. Slow Screen Dimming Ambient Layer */}
      <div className="absolute inset-0 bg-slate-950/95 transition-colors duration-1000 ease-in-out" />

      {/* 2. Eerie Deep Purple/Indigo Moonlight Radial Glow */}
      <div className="absolute inset-0 bg-radial-[circle_at_top] from-indigo-600/25 via-purple-950/30 to-slate-950 pointer-events-none animate-pulse duration-1000" />

      {/* 3. Ominous Fog / Midnight Mist Layer */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950 via-indigo-950/20 to-transparent pointer-events-none" />

      {/* 4. Giant Rotating Moonlight Halo in background */}
      <div className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full pointer-events-none opacity-30 bg-[conic-gradient(from_0deg,transparent_0_40deg,rgba(99,102,241,0.2)_40deg_80deg,transparent_80deg_120deg,rgba(168,85,247,0.25)_120deg_160deg,transparent_160deg_200deg,rgba(99,102,241,0.2)_200deg_240deg,transparent_240deg_280deg,rgba(168,85,247,0.25)_280deg_320deg,transparent_320deg_360deg)] blur-2xl animate-spin-slow" />

      {/* Skip Button Top Right */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/70 rounded-full text-xs text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95"
      >
        <span>Lewati</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Main Suspenseful Content Container */}
      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        
        {/* Glowing Moon Visual Icon */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {/* Pulsing Moonlight Aura */}
          <div className="absolute inset-0 rounded-full bg-indigo-500/25 blur-2xl animate-pulse" />
          <div className="absolute inset-2 rounded-full border border-indigo-400/30 animate-ping opacity-20" />
          
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-900 via-purple-700 to-indigo-400 p-0.5 shadow-[0_0_50px_rgba(99,102,241,0.5)] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
              <Moon className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-200 drop-shadow-[0_0_15px_rgba(165,180,252,0.9)]" />
            </div>
          </div>
        </div>

        {/* Phase Titles */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-indigo-300/90 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Babak {cycle} · Fase Malam Dimulai</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-300 tracking-tight font-serif drop-shadow-sm">
            MALAM KELAM JATUH
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xs mx-auto leading-relaxed">
            "Malam telah tiba. Seluruh pemain memejamkan mata dan menjaga keheningan."
          </p>
        </div>

        {/* Dramatic Night Instruction Box */}
        <div 
          className={`transition-all duration-700 ease-out transform ${
            animStage === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="p-4 bg-slate-900/90 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-md text-left flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-500/60 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                Petunjuk Moderator
              </span>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                Panggil peran khusus secara hening sesuai urutan. Pemain menjalankan aksi melalui panel perangkat.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleClose}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 transition-all mx-auto"
          >
            <EyeOff className="w-4 h-4" />
            <span>Tutup Mata & Lanjutkan Malam</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
