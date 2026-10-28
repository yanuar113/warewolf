import { X, Shield, Moon, Sun, Info, Award, ChevronRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenRoleDetails?: () => void;
}

export function RulesReferenceModal({ isOpen, onClose, onOpenRoleDetails }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[88vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-200">
        
        {/* Sticky Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
              Ringkasan Aturan Werewolf
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              Panduan alur permainan dan aturan musyawarah desa
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Tutup Ringkasan Aturan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm leading-relaxed">
          
          {/* Prominent CTA to Role Details Modal */}
          {onOpenRoleDetails && (
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-950/50 via-slate-950 to-indigo-950/50 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5 text-center sm:text-left">
                <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center justify-center sm:justify-start gap-1.5">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Panduan Detail Peran & Kemampuan</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  Pelajari deskripsi, kondisi kemenangan, dan taktik bermain setiap peran.
                </p>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenRoleDetails();
                }}
                className="w-full sm:w-auto min-h-[40px] px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
              >
                <span>Buka Panduan Peran</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Section: Tujuan Permainan */}
          <section className="space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Tujuan Permainan</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Tim Warga (Villagers)</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  Mengeliminasi seluruh Werewolf dari desa melalui voting musyawarah siang hari.
                </p>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tim Werewolf</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  Mengeliminasi warga desa di malam hari hingga jumlah Werewolf sama atau lebih banyak dari warga aktif.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Siklus Permainan */}
          <section className="space-y-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Siklus Permainan (Malam & Siang)</span>
            </h3>

            {/* Fase Malam */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>1. Fase Malam (Aksi Rahasia)</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Hening</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Semua pemain memejamkan mata. Pemain yang memiliki peran khusus bangun dan melakukan aksinya secara hening melalui layar perangkat:
              </p>
              <ul className="list-disc list-inside text-[11px] sm:text-xs text-slate-300 space-y-1 pl-1">
                <li><strong className="text-white">Cupid (Malam 1):</strong> Menentukan dua pemain sebagai pasangan kekasih sehidup semati.</li>
                <li><strong className="text-white">Seer:</strong> Memeriksa status peran rahasia satu pemain (Werewolf atau Warga).</li>
                <li><strong className="text-white">Doctor / Bodyguard:</strong> Memilih satu pemain untuk dilindungi dari serangan Werewolf.</li>
                <li><strong className="text-white">Werewolf:</strong> Menentukan target satu warga desa yang akan dieliminasi.</li>
                <li><strong className="text-white">Witch:</strong> Menggunakan Ramuan Penyelamat atau Ramuan Racun.</li>
              </ul>
            </div>

            {/* Fase Siang */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Fase Siang (Musyawarah & Voting)</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Terbuka</span>
              </div>
              <ul className="list-disc list-inside text-[11px] sm:text-xs text-slate-300 space-y-1 pl-1">
                <li><strong className="text-white">Pengumuman:</strong> Moderator mengumumkan korban malam (atau tidak ada korban jika berhasil diselamatkan).</li>
                <li><strong className="text-white">Diskusi:</strong> Seluruh pemain yang masih aktif berdiskusi, berargumen, dan mencari petunjuk tersangka.</li>
                <li><strong className="text-white">Voting:</strong> Seluruh pemain memberikan suara untuk mengeksekusi pemain yang paling dicurigai. Suara Mayor bernilai ganda (2 suara).</li>
              </ul>
            </div>
          </section>

          {/* Section: Peran Utama */}
          <section className="space-y-2.5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Ringkasan Peran Inti</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-rose-300">Werewolf</div>
                <p className="text-slate-400 mt-0.5 text-[11px] sm:text-xs">
                  Menyerang satu warga di malam hari dan menyamar sebagai warga biasa saat diskusi siang.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-indigo-300">Seer (Peramal)</div>
                <p className="text-slate-400 mt-0.5 text-[11px] sm:text-xs">
                  Menerawang status peran rahasia satu pemain setiap malam untuk mengumpulkan informasi.
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-emerald-300">Doctor (Dokter)</div>
                <p className="text-slate-400 mt-0.5 text-[11px] sm:text-xs">
                  Melindungi satu pemain dari serangan Werewolf malam hari (dapat melindungi diri sendiri).
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-bold text-amber-300">Hunter (Pemburu)</div>
                <p className="text-slate-400 mt-0.5 text-[11px] sm:text-xs">
                  Saat tereliminasi, berhak segera menembak dan mengeliminasi satu pemain pilihannya.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Petunjuk Offline */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-2.5 text-[11px] sm:text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-slate-200">Petunjuk Permainan Offline:</strong> Semua aksi malam dilakukan secara hening melalui layar masing-masing sehingga pemain tidak perlu bersuara atau bergerak yang dapat membocorkan peran asli.
            </div>
          </div>

        </div>

        {/* Sticky Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {onOpenRoleDetails ? (
            <button
              onClick={() => {
                onClose();
                onOpenRoleDetails();
              }}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-semibold bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Panduan Detail Peran</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
          >
            Tutup Aturan
          </button>
        </div>

      </div>
    </div>
  );
}
