import { useState } from 'react';
import { Eye, EyeOff, Shield, Skull, Heart, Crown } from 'lucide-react';
import { Player } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/roles';
import { sounds } from '../utils/audio';

interface Props {
  player: Player;
  onSwitchToModerator?: () => void;
  isModerator?: boolean;
}

export function PlayerCard({ player, onSwitchToModerator, isModerator }: Props) {
  const [isRevealed, setIsRevealed] = useState(false);

  const roleDef = player.role ? ROLE_DEFINITIONS[player.role] : null;

  const handleToggleReveal = () => {
    sounds.playCardFlip();
    setIsRevealed(!isRevealed);
  };

  if (player.isModerator) {
    return (
      <div className="w-full max-w-sm mx-auto p-6 bg-slate-900 border border-indigo-800/80 rounded-3xl shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center mx-auto text-amber-400 shadow-md">
          <Crown className="w-8 h-8" />
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-md border border-indigo-800 inline-block mb-2">
            Peran: Moderator (Pemandu)
          </span>
          <h3 className="text-xl font-bold text-white">Anda Adalah Moderator</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Sebagai Moderator, Anda bertugas memandu alur malam, diskusi, dan voting. Anda <strong>tidak berpartisipasi sebagai pemain</strong> dan <strong>tidak mendapatkan kartu peran</strong>.
          </p>
        </div>

        {isModerator && onSwitchToModerator && (
          <button
            type="button"
            onClick={onSwitchToModerator}
            className="w-full min-h-[44px] py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Crown className="w-4.5 h-4.5 text-slate-950 fill-slate-950" />
            <span>Kembali ke Panel Moderator</span>
          </button>
        )}

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
          Gunakan tombol di atas atau tab <strong>Panel Moderator</strong> untuk memandu fase permainan secara real-time.
        </div>
      </div>
    );
  }

  if (!roleDef) {
    return (
      <div className="w-full max-w-sm mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <p className="text-slate-400 text-sm">Menunggu pembagian peran dari moderator...</p>
        {isModerator && onSwitchToModerator && (
          <button
            type="button"
            onClick={onSwitchToModerator}
            className="w-full min-h-[44px] py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-4 h-4 fill-slate-950" />
            <span>Kembali ke Panel Moderator</span>
          </button>
        )}
      </div>
    );
  }

  const isWerewolf = roleDef.team === 'werewolf';
  const isAlive = player.status === 'alive';

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {/* Return to Moderator Quick Bar if currently inspecting another player */}
      {isModerator && onSwitchToModerator && (
        <button
          type="button"
          onClick={onSwitchToModerator}
          className="w-full mb-3 py-2 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-xl text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors shadow-sm cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Inspeksi: {player.name}</span>
          </span>
          <span className="text-[11px] underline font-bold text-amber-300">Kembali ke Moderator &rarr;</span>
        </button>
      )}

      {/* Cupid Lover Notice Banner */}
      {player.isLover && (
        <div className="w-full mb-3 p-3.5 bg-gradient-to-r from-rose-950/90 via-pink-950/80 to-slate-900 border border-rose-500/70 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in duration-200">
          <div className="w-9 h-9 rounded-xl bg-rose-900/80 border border-rose-500 flex items-center justify-center shrink-0 text-rose-300 shadow-inner mt-0.5">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-300 animate-pulse" />
          </div>
          <div className="flex-1 text-left text-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-rose-200 flex items-center gap-1.5">
                <span>Panah Asmara Cupid</span>
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Pasangan Kekasih
              </span>
            </div>
            <p className="text-slate-200 mt-1 leading-snug text-[11px]">
              {player.loverPartnerName ? (
                <>
                  Anda dipasangkan dengan <strong className="text-white underline font-bold">{player.loverPartnerName}</strong>. Takdir kalian terikat — jika salah satu gugur, pasangannya akan ikut gugur karena patah hati!
                </>
              ) : (
                <>Anda terikat dalam takdir cinta sehidup semati oleh Cupid!</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="w-full mb-1.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Privasi Layar</span>
        <span>Lindungi layar dari pandangan sekitar</span>
      </div>

      {/* Main Card */}
      <div className="relative w-full aspect-[3/4.2] sm:aspect-[3/4.4] rounded-2xl p-1 bg-slate-800 border border-slate-700 shadow-xl overflow-hidden group">
        
        {/* Shutter: Hidden State */}
        {!isRevealed ? (
          <div 
            onClick={handleToggleReveal}
            className="w-full h-full rounded-xl bg-slate-950 p-5 sm:p-6 flex flex-col items-center justify-between cursor-pointer border border-slate-800 hover:border-slate-700 active:bg-slate-900 transition-colors text-center select-none"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                Kartu Peran Tertutup
              </span>
              {player.isLover && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-600 shadow-sm">
                  <Heart className="w-3 h-3 fill-rose-500 text-rose-300 animate-pulse" />
                  <span>Kekasih: {player.loverPartnerName || 'Pasangan'}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2.5 my-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center transition-transform">
                <Eye className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold text-slate-200">Buka Kartu Peran</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-[190px] mx-auto">
                  Ketuk untuk melihat peran Anda secara rahasia.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="w-full min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-200 border border-slate-700 rounded-xl text-xs font-medium tracking-wide transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Tampilkan Peran</span>
            </button>
          </div>
        ) : (
          /* Card Face */
          <div className="w-full h-full rounded-xl bg-slate-950 overflow-hidden flex flex-col relative select-none animate-in fade-in duration-150">
            {/* Role Image */}
            <div className="relative h-[55%] w-full overflow-hidden bg-slate-900">
              <img
                src={roleDef.image}
                alt={roleDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* Header Badges */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded border backdrop-blur-md ${
                      isWerewolf
                        ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isWerewolf ? 'Tim Werewolf' : 'Tim Warga'}
                  </span>
                  {player.isLover && (
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase px-2 py-1 rounded border backdrop-blur-md bg-rose-950/90 text-rose-300 border-rose-600 flex items-center gap-1 shadow-sm">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-300" />
                      <span>Kekasih: {player.loverPartnerName || 'Pasangan'}</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={handleToggleReveal}
                  title="Tutup Kartu"
                  className="p-1.5 bg-black/70 hover:bg-black text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>

              {/* Title & Status */}
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wide">
                    {roleDef.name}
                  </h3>
                  <p className="text-xs text-slate-400">{roleDef.indonesianName}</p>
                </div>
                <div>
                  {isAlive ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                      <Heart className="w-3 h-3 fill-emerald-400" /> Aktif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">
                      <Skull className="w-3 h-3" /> Tereliminasi
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description & Rules */}
            <div className="p-4 flex-1 flex flex-col justify-between bg-slate-950 text-slate-300">
              <div className="space-y-2.5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {roleDef.description}
                </p>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-normal">
                  <span className="font-semibold text-slate-300 block mb-0.5">Panduan Bermain:</span>
                  {roleDef.detailedRules}
                </div>
              </div>

              <button
                onClick={handleToggleReveal}
                className="w-full mt-3 py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Tutup Kartu</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!isAlive && (
        <div className="w-full mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
          <p className="text-xs text-slate-400">
            Status: Tereliminasi ({player.eliminatedReason || 'Eliminasi'}). Harap tidak memberikan petunjuk kepada pemain aktif.
          </p>
        </div>
      )}
    </div>
  );
}
