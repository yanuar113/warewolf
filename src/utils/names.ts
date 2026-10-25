/**
 * Generator nama acak berbahasa Indonesia semi-formal dan modern
 * Digunakan untuk mengisi default nama pemain agar tidak kosong atau otomatis terpilih nama moderator
 */
export const INDONESIAN_PLAYER_NAMES: string[] = [
  'Aditya',
  'Bagas',
  'Bima',
  'Citra',
  'Danu',
  'Dimas',
  'Eka',
  'Fajar',
  'Galih',
  'Gilang',
  'Hendra',
  'Indra',
  'Kurnia',
  'Mahendra',
  'Nadia',
  'Pratama',
  'Putra',
  'Rian',
  'Satria',
  'Surya',
  'Tiara',
  'Wahyu',
  'Yudha',
  'Zahra',
  'Arif',
  'Bayu',
  'Dian',
  'Farhan',
  'Rizky',
  'Taufik',
  'Lestari',
  'Dewi'
];

export function getRandomPlayerName(): string {
  const index = Math.floor(Math.random() * INDONESIAN_PLAYER_NAMES.length);
  return INDONESIAN_PLAYER_NAMES[index];
}
