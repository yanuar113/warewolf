import { X, Shield, Moon, Sun, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesReferenceModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-200">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">Ringkasan Aturan Werewolf</h2>
            <p className="text-[11px] sm:text-xs text-slate-400">Berdasarkan aturan standar playwerewolf.co/pages/rules</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" /> Tujuan Permainan
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-xs">
              <li><strong className="text-slate-100">Tim Warga (Villagers):</strong> Mengeliminasi seluruh Werewolf melalui voting siang hari.</li>
              <li><strong className="text-slate-100">Tim Werewolf:</strong> Mengeliminasi warga di malam hari hingga jumlah Werewolf setara atau lebih banyak dari jumlah warga aktif.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" /> Siklus Permainan
            </h3>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">1. Fase Malam</div>
              <p className="text-xs text-slate-400">
                Semua pemain memejamkan mata. Moderator memanggil peran secara berurutan:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5 pl-2">
                <li><strong className="text-slate-200">Seer:</strong> Memeriksa status peran satu pemain.</li>
                <li><strong className="text-slate-200">Doctor:</strong> Memilih satu pemain untuk dilindungi.</li>
                <li><strong className="text-slate-200">Werewolf:</strong> Menentukan satu target eliminasi.</li>
              </ul>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">2. Fase Siang</div>
              <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5 pl-2">
                <li><strong className="text-slate-200">Pengumuman:</strong> Moderator mengumumkan korban malam (atau tidak ada korban jika diselamatkan Doctor).</li>
                <li><strong className="text-slate-200">Diskusi:</strong> Seluruh pemain yang aktif berdiskusi mencari informasi.</li>
                <li><strong className="text-slate-200">Voting:</strong> Pemain memberikan suara untuk mengeliminasi satu tersangka.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Peran Utama
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200">Werewolf</div>
                <p className="text-slate-400 mt-0.5">Memilih korban bersama kawanan Werewolf di malam hari.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200">Seer</div>
                <p className="text-slate-400 mt-0.5">Mengetahui apakah seorang pemain adalah Werewolf atau Warga.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200">Doctor</div>
                <p className="text-slate-400 mt-0.5">Melindungi satu pemain dari eliminasi Werewolf pada malam hari.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200">Hunter</div>
                <p className="text-slate-400 mt-0.5">Mengeliminasi satu pemain lain saat dirinya tereliminasi.</p>
              </div>
            </div>
          </section>

          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>Petunjuk Permainan Offline:</strong> Aksi malam (voting Werewolf, Seer, dan Doctor) dilakukan secara hening melalui panel perangkat masing-masing sehingga pemain tidak perlu bersuara atau bergerak yang dapat membocorkan peran.
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl transition-colors flex items-center justify-center"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
