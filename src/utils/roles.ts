import { RoleDefinition, RoleId } from '../types/game';

export const ROLE_CARD_IMAGES: Record<RoleId, string> = {
  werewolf: '/assets/images/werewolf_role_card_1792836261554.jpg',
  seer: '/assets/images/seer_role_card_1792836260638.jpg',
  doctor: '/assets/images/doctor_role_card_1792836262383.jpg',
  villager: '/assets/images/villager_role_card_1792836262327.jpg',
  hunter: '/assets/images/villager_role_card_1792836262327.jpg',
  witch: '/assets/images/seer_role_card_1792836260638.jpg',
  mayor: '/assets/images/villager_role_card_1792836262327.jpg',
};

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  werewolf: {
    id: 'werewolf',
    name: 'Werewolf',
    indonesianName: 'Werewolf',
    team: 'werewolf',
    description: 'Setiap malam, menentukan satu target pemain untuk dieliminasi bersama anggota Werewolf lainnya.',
    detailedRules: 'Bangun di malam hari saat moderator memanggil. Koordinasikan target eliminasi dengan anggota Werewolf lainnya melalui panel ini atau isyarat hening. Di siang hari, berbaur dengan warga dan hindari kecurigaan.',
    image: ROLE_CARD_IMAGES.werewolf,
    wakeOrder: 3,
    hasNightAction: true,
  },
  seer: {
    id: 'seer',
    name: 'Seer',
    indonesianName: 'Seer (Peramal)',
    team: 'village',
    description: 'Setiap malam, memeriksa satu pemain untuk mengetahui apakah pemain tersebut adalah Werewolf atau Warga.',
    detailedRules: 'Saat fase malam berlangsung, pilih satu pemain yang ingin diverifikasi. Hasil verifikasi akan langsung muncul di layar Anda. Gunakan informasi ini saat diskusi siang hari secara hati-hati.',
    image: ROLE_CARD_IMAGES.seer,
    wakeOrder: 1,
    hasNightAction: true,
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    indonesianName: 'Doctor (Dokter)',
    team: 'village',
    description: 'Setiap malam, memilih satu pemain untuk dilindungi dari serangan Werewolf.',
    detailedRules: 'Dapat melindungi diri sendiri atau pemain lain. Jika pemain yang dilindungi merupakan target Werewolf pada malam yang sama, pemain tersebut tidak tereliminasi.',
    image: ROLE_CARD_IMAGES.doctor,
    wakeOrder: 2,
    hasNightAction: true,
  },
  villager: {
    id: 'villager',
    name: 'Villager',
    indonesianName: 'Villager (Warga)',
    team: 'village',
    description: 'Tidak memiliki aksi di malam hari. Menggunakan deduksi dan diskusi di siang hari untuk menemukan Werewolf.',
    detailedRules: 'Amati pola argumen, kejanggalan tingkah laku, dan konsistensi suara pemain lain. Berikan suara Anda saat voting siang untuk mengeliminasi tersangka Werewolf.',
    image: ROLE_CARD_IMAGES.villager,
    wakeOrder: 0,
    hasNightAction: false,
  },
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    indonesianName: 'Hunter (Pemburu)',
    team: 'village',
    description: 'Jika tereliminasi pada fase malam atau siang, dapat segera memilih satu pemain lain untuk dieliminasi bersama.',
    detailedRules: 'Kemampuan aktif saat status berubah menjadi tereliminasi. Panel target akan terbuka untuk memilih satu pemain terakhir.',
    image: ROLE_CARD_IMAGES.hunter,
    wakeOrder: 0,
    hasNightAction: false,
  },
  witch: {
    id: 'witch',
    name: 'Witch',
    indonesianName: 'Witch (Penyihir)',
    team: 'village',
    description: 'Memiliki dua kemampuan sekali pakai: menyelamatkan korban Werewolf atau meracuni satu pemain pilihan.',
    detailedRules: 'Bangun setelah fase Werewolf. Dapat menggunakan satu atau kedua ramuan selama permainan, atau menyimpannya untuk babak berikutnya.',
    image: ROLE_CARD_IMAGES.witch,
    wakeOrder: 4,
    hasNightAction: true,
  },
  mayor: {
    id: 'mayor',
    name: 'Mayor',
    indonesianName: 'Mayor (Kepala Desa)',
    team: 'village',
    description: 'Memiliki bobot suara 2 kali lipat saat voting siang hari.',
    detailedRules: 'Dipilih atau ditentukan oleh pemain. Suaranya menjadi penentu jika terjadi hasil seri dalam voting eliminasi.',
    image: ROLE_CARD_IMAGES.mayor,
    wakeOrder: 0,
    hasNightAction: false,
  },
};

export function getRecommendedRoleConfig(playerCount: number): Record<RoleId, number> {
  const config: Record<RoleId, number> = {
    werewolf: 1,
    villager: 2,
    seer: 1,
    doctor: 1,
    hunter: 0,
    witch: 0,
    mayor: 0,
  };

  if (playerCount <= 5) {
    config.werewolf = 1;
    config.seer = 1;
    config.doctor = 1;
    config.villager = Math.max(1, playerCount - 3);
  } else if (playerCount <= 7) {
    config.werewolf = 2;
    config.seer = 1;
    config.doctor = 1;
    config.villager = Math.max(1, playerCount - 4);
  } else if (playerCount <= 9) {
    config.werewolf = 2;
    config.seer = 1;
    config.doctor = 1;
    config.hunter = 1;
    config.villager = Math.max(1, playerCount - 5);
  } else if (playerCount <= 12) {
    config.werewolf = 3;
    config.seer = 1;
    config.doctor = 1;
    config.hunter = 1;
    config.witch = 1;
    config.villager = Math.max(1, playerCount - 7);
  } else {
    config.werewolf = Math.floor(playerCount / 4);
    config.seer = 1;
    config.doctor = 1;
    config.hunter = 1;
    config.witch = 1;
    config.villager = Math.max(1, playerCount - (config.werewolf + 4));
  }

  return config;
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function distributeRolesToPlayers(
  players: { id: string; isModerator: boolean }[],
  roleConfig: Record<RoleId, number>
): Record<string, RoleId> {
  const rolePool: RoleId[] = [];

  Object.entries(roleConfig).forEach(([roleId, count]) => {
    for (let i = 0; i < count; i++) {
      rolePool.push(roleId as RoleId);
    }
  });

  while (rolePool.length < players.length) {
    rolePool.push('villager');
  }

  while (rolePool.length > players.length) {
    const villagerIdx = rolePool.lastIndexOf('villager');
    if (villagerIdx >= 0) {
      rolePool.splice(villagerIdx, 1);
    } else {
      rolePool.pop();
    }
  }

  const shuffledRoles = shuffleArray(rolePool);
  const assignments: Record<string, RoleId> = {};

  players.forEach((player, idx) => {
    assignments[player.id] = shuffledRoles[idx] || 'villager';
  });

  return assignments;
}
