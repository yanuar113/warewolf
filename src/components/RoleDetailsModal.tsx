import { useState } from 'react';
import { X, Shield, Moon, Sun, Sparkles, Award, Search, Target, Zap, CheckCircle2 } from 'lucide-react';
import { RoleId, Team } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/roles';

interface RoleDetailInfo {
  id: RoleId;
  name: string;
  indonesianName: string;
  team: Team;
  teamName: string;
  image: string;
  description: string;
  winCondition: string;
  uniqueAbility: string;
  tacticalTips: string;
  wakeOrderText: string;
}

const EXTENDED_ROLE_INFO: Record<RoleId, RoleDetailInfo> = {
  werewolf: {
    id: 'werewolf',
    name: ROLE_DEFINITIONS.werewolf.name,
    indonesianName: ROLE_DEFINITIONS.werewolf.indonesianName,
    team: 'werewolf',
    teamName: 'Tim Werewolf',
    image: ROLE_DEFINITIONS.werewolf.image,
    description: 'Makhluk nokturnal yang bersembunyi di antara warga desa. Di siang hari berbaur sebagai warga biasa, dan di malam hari berburu bersama kawanan Werewolf.',
    winCondition: 'Mengeliminasi warga hingga jumlah anggota Werewolf sama dengan atau melebihi jumlah warga yang masih hidup.',
    uniqueAbility: 'Serangan Malam Kawanan: Memiliki akses keputusan hening setiap malam untuk menentukan satu target warga yang akan dieliminasi.',
    tacticalTips: 'Pertahankan konsistensi gaya bicara saat diskusi siang hari. Hindari bersikap terlalu pasif atau terlalu agresif agar tidak memicu kecurigaan Seer dan Warga.',
    wakeOrderText: 'Bangun di Fase Malam (Giliran ke-3)',
  },
  seer: {
    id: 'seer',
    name: ROLE_DEFINITIONS.seer.name,
    indonesianName: ROLE_DEFINITIONS.seer.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.seer.image,
    description: 'Tokoh spiritual desa yang memiliki indra keenam untuk menyingkap identitas dan faksi asli para pemain.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari permainan.',
    uniqueAbility: 'Pemeriksaan Identitas: Setiap malam dapat memilih satu pemain untuk diverifikasi apakah pemain tersebut adalah Werewolf atau Warga.',
    tacticalTips: 'Simpan informasi hasil penerawangan secara cermat. Ungkapkan identitas Anda pada saat yang tepat ketika memiliki bukti kuat untuk mengarahkan voting warga.',
    wakeOrderText: 'Bangun Pertama di Fase Malam (Giliran ke-1)',
  },
  doctor: {
    id: 'doctor',
    name: ROLE_DEFINITIONS.doctor.name,
    indonesianName: ROLE_DEFINITIONS.doctor.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.doctor.image,
    description: 'Pelindung medis desa yang bertugas menyelamatkan nyawa warga dari ancaman serangan malam.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari permainan.',
    uniqueAbility: 'Perlindungan Medis: Setiap malam dapat memilih satu pemain (termasuk diri sendiri) untuk dilindungi. Jika target diserang Werewolf malam itu, ia selamat.',
    tacticalTips: 'Amati pemain yang tampak memegang peran penting seperti Seer, dan prioritaskan perlindungan untuk mereka di fase pertengahan permainan.',
    wakeOrderText: 'Bangun Kedua di Fase Malam (Giliran ke-2)',
  },
  villager: {
    id: 'villager',
    name: ROLE_DEFINITIONS.villager.name,
    indonesianName: ROLE_DEFINITIONS.villager.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.villager.image,
    description: 'Penduduk desa tanpa kekuatan supranatural yang mengandalkan deduksi, logika, dan analisis argumen.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf melalui hasil konsensus voting siang hari.',
    uniqueAbility: 'Kekuatan Suara & Deduksi: Tidak memiliki aksi khusus di malam hari, namun memegang peranan kunci dalam membentuk opini publik dan voting eliminasi siang.',
    tacticalTips: 'Perhatikan inkonsistensi argumen, pola voting, dan perubahan sikap pemain lain selama sesi diskusi terbuka.',
    wakeOrderText: 'Tidak Bangun di Malam Hari (Tidur Penuh)',
  },
  hunter: {
    id: 'hunter',
    name: ROLE_DEFINITIONS.hunter.name,
    indonesianName: ROLE_DEFINITIONS.hunter.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.hunter.image,
    description: 'Penembak jitu desa yang tidak akan gugur sendirian tanpa membawa musuhnya ikut tereliminasi.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari permainan.',
    uniqueAbility: 'Tembakan Balas Dendam: Saat tereliminasi (baik serangan malam maupun voting siang), Hunter berhak segera menembak dan mengeliminasi satu pemain pilihan.',
    tacticalTips: 'Jangan terburu-buru membocorkan peran Anda. Analisis siapa tersangka terkuat agar tembakan terakhir Anda tepat sasaran pada Werewolf.',
    wakeOrderText: 'Aksi Aktif Saat Tereliminasi',
  },
  witch: {
    id: 'witch',
    name: ROLE_DEFINITIONS.witch.name,
    indonesianName: ROLE_DEFINITIONS.witch.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.witch.image,
    description: 'Praktisi alkimia misterius yang menguasai ramuan penyelamat dan ramuan racun berdaya ubah tinggi.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari permainan.',
    uniqueAbility: 'Ramuan Ganda Sekali Pakai: Memiliki 2 ramuan khusus sepanjang permainan: Ramuan Penyelamat untuk membatalkan korban Werewolf, dan Ramuan Racun untuk mengeliminasi pemain pilihan.',
    tacticalTips: 'Gunakan ramuan penyelamat secara efektif pada awal permainan, dan simpan ramuan racun untuk mengeksekusi pemain yang dicurigai kuat.',
    wakeOrderText: 'Bangun Terakhir di Fase Malam (Giliran ke-4)',
  },
  mayor: {
    id: 'mayor',
    name: ROLE_DEFINITIONS.mayor.name,
    indonesianName: ROLE_DEFINITIONS.mayor.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.mayor.image,
    description: 'Pemimpin politik desa yang dihormati dan memiliki pengaruh besar dalam keputusan hukum desa.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari permainan.',
    uniqueAbility: 'Bobot Suara Ganda: Setiap suara (vote) yang diberikan Mayor pada voting siang hari dihitung bernilai 2 suara. Berperan sebagai penentu saat hasil voting seri.',
    tacticalTips: 'Gunakan pengaruh suara Anda untuk memecah kebuntuan opini publik warga saat perdebatan sengit berlangsung.',
    wakeOrderText: 'Kekuatan Aktif di Sesi Voting Siang',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleDetailsModal({ isOpen, onClose }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'village' | 'werewolf'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleId, setActiveRoleId] = useState<RoleId>('werewolf');

  if (!isOpen) return null;

  const roleList = Object.values(EXTENDED_ROLE_INFO).filter(role => {
    const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'village' && role.team === 'village') ||
      (selectedFilter === 'werewolf' && role.team === 'werewolf');

    const matchesSearch =
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.indonesianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const activeRole = EXTENDED_ROLE_INFO[activeRoleId] || EXTENDED_ROLE_INFO.werewolf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                Panduan Peran & Kemampuan Karakter
              </h2>
              <p className="text-xs text-slate-400">
                Informasi detail deskripsi, kondisi kemenangan, dan kemampuan unik setiap peran
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Team Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedFilter === 'all'
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua Peran ({Object.keys(EXTENDED_ROLE_INFO).length})
            </button>
            <button
              onClick={() => setSelectedFilter('village')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                selectedFilter === 'village'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tim Warga</span>
            </button>
            <button
              onClick={() => setSelectedFilter('werewolf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                selectedFilter === 'werewolf'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-rose-400" />
              <span>Tim Werewolf</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari peran atau kemampuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
        </div>

        {/* Modal Body: Master-Detail Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 p-3 sm:p-5 gap-4">
          
          {/* Left Column: Role Selector List */}
          <div className="md:col-span-5 space-y-2 overflow-y-auto max-h-[220px] md:max-h-none pr-1">
            {roleList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                Tidak ada peran yang cocok dengan pencarian.
              </div>
            ) : (
              roleList.map(role => {
                const isActive = role.id === activeRoleId;
                const isWolf = role.team === 'werewolf';

                return (
                  <button
                    key={role.id}
                    onClick={() => setActiveRoleId(role.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isActive
                        ? isWolf
                          ? 'bg-rose-950/40 border-rose-600 ring-1 ring-rose-500/50'
                          : 'bg-slate-800 border-indigo-500 ring-1 ring-indigo-500/50'
                        : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                      <img
                        src={role.image}
                        alt={role.name}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-100 truncate block">
                          {role.name}
                        </span>
                        <span
                          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            isWolf
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {isWolf ? 'Werewolf' : 'Warga'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {role.indonesianName}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Active Role Detailed Display */}
          <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col space-y-5">
            
            {/* Header / Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shrink-0 shadow-lg">
                <img
                  src={activeRole.image}
                  alt={activeRole.name}
                  className="w-full h-full object-cover object-center"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-md border ${
                      activeRole.team === 'werewolf'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {activeRole.teamName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {activeRole.wakeOrderText}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  {activeRole.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {activeRole.indonesianName}
                </p>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-300 overflow-y-auto max-h-[340px] pr-1">
              
              {/* Deskripsi Peran */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Deskripsi Peran</span>
                </h4>
                <p className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-200">
                  {activeRole.description}
                </p>
              </div>

              {/* Kondisi Kemenangan */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kondisi Kemenangan</span>
                </h4>
                <p className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-emerald-200 font-medium">
                  {activeRole.winCondition}
                </p>
              </div>

              {/* Kemampuan Unik */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Kemampuan Unik</span>
                </h4>
                <p className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-indigo-200 font-medium">
                  {activeRole.uniqueAbility}
                </p>
              </div>

              {/* Tips Taktis Bermain */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Panduan & Taktik Bermain</span>
                </h4>
                <p className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-300">
                  {activeRole.tacticalTips}
                </p>
              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Panduan resmi peran aplikasi Werewolf Companion
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition-colors ml-auto min-h-[40px] flex items-center justify-center"
          >
            Tutup Panduan
          </button>
        </div>

      </div>
    </div>
  );
}
