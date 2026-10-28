import { useState } from 'react';
import {
  X,
  Shield,
  Moon,
  Award,
  Search,
  Target,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
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
  lycan: {
    id: 'lycan',
    name: ROLE_DEFINITIONS.lycan.name,
    indonesianName: ROLE_DEFINITIONS.lycan.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.lycan.image,
    description: 'Warga desa yang memiliki aura mistis gelap. Meskipun berjuang untuk Tim Warga, penampilannya mengecoh penglihatan Seer.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari desa.',
    uniqueAbility: 'Aura Terselubung: Saat diperiksa oleh Seer, hasil verifikasi akan menampilkan Lycan sebagai Werewolf.',
    tacticalTips: 'Bangun kepercayaan warga lain di siang hari. Jika Seer menuduh Anda, jelaskan situasi peran Anda dengan tenang.',
    wakeOrderText: 'Tidak Bangun di Malam Hari',
  },
  bodyguard: {
    id: 'bodyguard',
    name: ROLE_DEFINITIONS.bodyguard.name,
    indonesianName: ROLE_DEFINITIONS.bodyguard.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.bodyguard.image,
    description: 'Pengawal setia desa yang melindungi warga penting dari ancaman pembunuhan malam.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari desa.',
    uniqueAbility: 'Perlindungan Ketat: Memilih satu pemain setiap malam untuk dilindungi dari serangan Werewolf.',
    tacticalTips: 'Prioritaskan perlindungan untuk Seer atau tokoh penting desa yang telah terungkap.',
    wakeOrderText: 'Bangun di Fase Malam (Giliran ke-2)',
  },
  cupid: {
    id: 'cupid',
    name: ROLE_DEFINITIONS.cupid.name,
    indonesianName: ROLE_DEFINITIONS.cupid.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.cupid.image,
    description: 'Entitas asmara yang menghubungkan dua jiwa dalam ikatan takdir.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari desa.',
    uniqueAbility: 'Ikatan Asmara: Di malam pertama, memilih dua pemain untuk menjadi Pasangan Kekasih. Jika salah satu gugur, pasangannya ikut tereliminasi.',
    tacticalTips: 'Pilihlah pasangan secara bijak untuk menciptakan aliansi strategis di antara para pemain.',
    wakeOrderText: 'Bangun di Malam Pertama (Giliran ke-1)',
  },
  tanner: {
    id: 'tanner',
    name: ROLE_DEFINITIONS.tanner.name,
    indonesianName: ROLE_DEFINITIONS.tanner.indonesianName,
    team: 'tanner',
    teamName: 'Tim Independen (Solo)',
    image: ROLE_DEFINITIONS.tanner.image,
    description: 'Warga yang membenci kehidupannya dan memiliki satu impian unik: dieliminasi oleh warga desa saat voting siang.',
    winCondition: 'Berhasil dieliminasi melalui hasil musyawarah voting siang hari untuk meraih kemenangan tunggal mutlak.',
    uniqueAbility: 'Provokator Publik: Meraih kemenangan sendiri jika warga memilih untuk mengeliminasinya saat voting siang.',
    tacticalTips: 'Bertingkah mencurigakan dan buat argumen agak goyah saat siang, tetapi hindari bersikap terlalu mencolok hingga dianggap bercanda.',
    wakeOrderText: 'Tidak Bangun di Malam Hari',
  },
  fool: {
    id: 'fool',
    name: ROLE_DEFINITIONS.fool.name,
    indonesianName: ROLE_DEFINITIONS.fool.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.fool.image,
    description: 'Sosok yang sering disalahpahami warga, tetapi memiliki pengampunan publik satu kali.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari desa.',
    uniqueAbility: 'Pengampunan Publik: Jika dieliminasi pada voting siang hari, perannya terungkap dan dia selamat (batal tereliminasi), tetapi kehilangan hak suara pada voting berikutnya.',
    tacticalTips: 'Pengampunan Anda memberikan bukti konkret bahwa Anda berpihak pada warga.',
    wakeOrderText: 'Tidak Bangun di Malam Hari',
  },
  sorceress: {
    id: 'sorceress',
    name: ROLE_DEFINITIONS.sorceress.name,
    indonesianName: ROLE_DEFINITIONS.sorceress.indonesianName,
    team: 'werewolf',
    teamName: 'Tim Werewolf',
    image: ROLE_DEFINITIONS.sorceress.image,
    description: 'Penyihir jahat yang bersekutu dengan para Werewolf untuk memburu Seer.',
    winCondition: 'Mengeliminasi warga hingga Werewolf menguasai desa.',
    uniqueAbility: 'Deteksi Seer: Setiap malam memeriksa satu pemain untuk menemukan keberadaan Seer (Peramal).',
    tacticalTips: 'Bantu Werewolf menemukan Seer tanpa membocorkan identitas diri Anda kepada publik.',
    wakeOrderText: 'Bangun di Fase Malam (Giliran ke-2)',
  },
  apprentice_seer: {
    id: 'apprentice_seer',
    name: ROLE_DEFINITIONS.apprentice_seer.name,
    indonesianName: ROLE_DEFINITIONS.apprentice_seer.indonesianName,
    team: 'village',
    teamName: 'Tim Warga',
    image: ROLE_DEFINITIONS.apprentice_seer.image,
    description: 'Murid penerus spiritual yang siap menggantikan peran Seer utama.',
    winCondition: 'Mengeliminasi seluruh anggota Werewolf dari desa.',
    uniqueAbility: 'Penerus Penerawang: Jika Seer utama tereliminasi, Apprentice Seer otomatis mewarisi kemampuan memeriksa pemain di malam hari.',
    tacticalTips: 'Amati pergerakan permainan dan bersiaplah mengambil alih tugas Seer jika Seer utama gugur.',
    wakeOrderText: 'Bangun Jika Seer Utama Gugur',
  },
};

const ALL_ROLES_LIST = Object.values(EXTENDED_ROLE_INFO);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenRules?: () => void;
}

export function RoleDetailsModal({ isOpen, onClose, onOpenRules }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'village' | 'werewolf'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleId, setActiveRoleId] = useState<RoleId>('werewolf');
  // On mobile screens: 'list' shows all character cards, 'detail' shows full single-card info
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('detail');

  if (!isOpen) return null;

  const filteredRoles = ALL_ROLES_LIST.filter(role => {
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
  const activeIndex = filteredRoles.findIndex(r => r.id === activeRole.id);

  const handleSelectRole = (id: RoleId) => {
    setActiveRoleId(id);
    setMobileView('detail');
  };

  const handlePrevRole = () => {
    if (filteredRoles.length <= 1) return;
    const prevIdx = activeIndex <= 0 ? filteredRoles.length - 1 : activeIndex - 1;
    setActiveRoleId(filteredRoles[prevIdx].id);
  };

  const handleNextRole = () => {
    if (filteredRoles.length <= 1) return;
    const nextIdx = activeIndex >= filteredRoles.length - 1 ? 0 : activeIndex + 1;
    setActiveRoleId(filteredRoles[nextIdx].id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[94vh] sm:h-[88vh] max-h-[94vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-slate-100">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 truncate">
                Panduan Peran & Kemampuan
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden xs:block">
                Deskripsi peran, kondisi kemenangan, dan tips strategi bermain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenRules && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRules();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Aturan Umum</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              aria-label="Tutup Panduan"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar & Mobile View Mode Switcher */}
        <div className="px-3 py-2.5 sm:px-5 sm:py-3 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Team Filter Pills */}
            <div className="inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-medium shrink-0 overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all whitespace-nowrap text-xs cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Semua ({ALL_ROLES_LIST.length})
              </button>
              <button
                onClick={() => setSelectedFilter('village')}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg transition-all whitespace-nowrap text-xs cursor-pointer ${
                  selectedFilter === 'village'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Warga</span>
              </button>
              <button
                onClick={() => setSelectedFilter('werewolf')}
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg transition-all whitespace-nowrap text-xs cursor-pointer ${
                  selectedFilter === 'werewolf'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3 h-3 text-rose-400" />
                <span>Werewolf</span>
              </button>
            </div>

            {/* Mobile View Toggle Buttons (List vs Detail) */}
            <div className="md:hidden flex items-center gap-1">
              <button
                onClick={() => setMobileView('list')}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
                  mobileView === 'list'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Daftar ({filteredRoles.length})
              </button>
              <button
                onClick={() => setMobileView('detail')}
                className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer ${
                  mobileView === 'detail'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Detail
              </button>
            </div>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari karakter, nama, atau kemampuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-12 min-h-0">
          
          {/* ========================================================= */}
          {/* LEFT / LIST PANEL: Desktop Always Visible, Mobile on 'list' */}
          {/* ========================================================= */}
          <div
            className={`md:col-span-5 border-r border-slate-800/80 bg-slate-950/40 p-3 sm:p-4 overflow-y-auto space-y-2 min-h-0 ${
              mobileView === 'list' ? 'flex-1' : 'hidden md:block'
            }`}
          >
            {filteredRoles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800 mt-4">
                Tidak ada peran yang cocok dengan pencarian &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredRoles.map(role => {
                const isActive = role.id === activeRoleId;
                const isWolf = role.team === 'werewolf';
                const isIndie = role.team === 'tanner';

                return (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={`w-full min-h-[56px] p-2.5 sm:p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isActive
                        ? isWolf
                          ? 'bg-rose-950/50 border-rose-600 ring-1 ring-rose-500/50 shadow-md'
                          : isIndie
                          ? 'bg-amber-950/50 border-amber-600 ring-1 ring-amber-500/50 shadow-md'
                          : 'bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                        : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    {/* Proportional Role Avatar Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative shadow-inner">
                      <img
                        src={role.image}
                        alt={role.name}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 truncate block">
                          {role.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                            isWolf
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : isIndie
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {isWolf ? 'Werewolf' : isIndie ? 'Solo' : 'Warga'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                        {role.indonesianName}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5 hidden xs:block">
                        {role.wakeOrderText}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0 md:hidden" />
                  </button>
                );
              })
            )}
          </div>

          {/* ============================================================ */}
          {/* RIGHT / DETAIL PANEL: Desktop Always Visible, Mobile on 'detail' */}
          {/* ============================================================ */}
          <div
            className={`md:col-span-7 bg-slate-900 overflow-y-auto flex-col p-3 sm:p-5 space-y-4 min-h-0 ${
              mobileView === 'detail' ? 'flex flex-1' : 'hidden md:flex'
            }`}
          >
            {/* Mobile Header Ribbon: Back Button, Carousel & Next/Prev */}
            <div className="md:hidden flex flex-col gap-2.5 pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setMobileView('list')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors min-h-[40px] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Daftar Peran</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevRole}
                    disabled={filteredRoles.length <= 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
                    title="Peran Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 px-2">
                    {activeIndex + 1} / {filteredRoles.length}
                  </span>
                  <button
                    onClick={handleNextRole}
                    disabled={filteredRoles.length <= 1}
                    className="p-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 text-slate-300 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
                    title="Peran Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Horizontal Scrollable Role Avatars for fast tapping on mobile */}
              <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
                {filteredRoles.map(r => {
                  const isSel = r.id === activeRole.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveRoleId(r.id)}
                      className={`relative shrink-0 w-11 h-11 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isSel
                          ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                      title={r.name}
                    >
                      <img
                        src={r.image}
                        alt={r.name}
                        className="w-full h-full object-cover object-center"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Character Profile Header (Image, Badges, Name) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-lg shrink-0">
              {/* Proportional Role Character Portrait */}
              <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shrink-0 shadow-xl relative">
                <img
                  src={activeRole.image}
                  alt={activeRole.name}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent sm:hidden" />
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5 w-full">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-md border ${
                      activeRole.team === 'werewolf'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : activeRole.team === 'tanner'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {activeRole.teamName}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {activeRole.wakeOrderText}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                  {activeRole.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  {activeRole.indonesianName}
                </p>
              </div>
            </div>

            {/* Detail Content Cards: Readable Typography without zoom */}
            <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-slate-300">
              
              {/* Kemampuan Unik (Unique Ability) - Highlighted */}
              <div className="bg-slate-950 border border-indigo-900/60 rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Kemampuan Karakter</span>
                </h4>
                <p className="text-indigo-100 font-medium text-xs sm:text-sm leading-relaxed">
                  {activeRole.uniqueAbility}
                </p>
              </div>

              {/* Kondisi Kemenangan (Win Condition) */}
              <div className="bg-slate-950 border border-emerald-900/60 rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Kondisi Kemenangan</span>
                </h4>
                <p className="text-emerald-100 font-medium text-xs sm:text-sm leading-relaxed">
                  {activeRole.winCondition}
                </p>
              </div>

              {/* Deskripsi Peran (Role Lore & Description) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Deskripsi Karakter</span>
                </h4>
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                  {activeRole.description}
                </p>
              </div>

              {/* Tips Taktis & Strategi Bermain */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-1.5 shadow-md">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Panduan & Taktik Bermain</span>
                </h4>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {activeRole.tacticalTips}
                </p>
              </div>

            </div>

            {/* Desktop Next/Prev Controls at bottom of detail panel */}
            <div className="hidden md:flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400 mt-auto">
              <button
                onClick={handlePrevRole}
                disabled={filteredRoles.length <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Peran Sebelumnya</span>
              </button>
              <span className="font-mono text-slate-400">
                {activeIndex + 1} dari {filteredRoles.length} Peran
              </span>
              <button
                onClick={handleNextRole}
                disabled={filteredRoles.length <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
              >
                <span>Peran Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Panduan resmi peran & kemampuan Werewolf Companion
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
            {onOpenRules && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRules();
                }}
                className="sm:hidden flex-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Aturan Umum</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 rounded-xl text-xs font-semibold transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
