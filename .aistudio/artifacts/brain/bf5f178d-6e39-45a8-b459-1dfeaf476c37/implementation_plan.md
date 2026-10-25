# Rencana Pengembangan Fitur Baru: Werewolf Companion

Rencana pengembangan kumpulan fitur unggulan untuk meningkatkan imersi, atmosfer ketegangan, dan kedalaman strategi taktis dalam permainan Werewolf Companion.

## User Review & Critical Decisions

> [!IMPORTANT]
> Tiga usulan fitur utama ini dirancang saling melengkapi dan dapat diaktifkan secara bertahap atau sekaligus. Tinjau dan pilih fitur yang ingin Anda prioritaskan:

- **Fitur 1: Narasi Suara Otomatis (Voice Announcer)**: Menggunakan sintesis suara (Web Speech API) bahasa Indonesia beraksen dramatis untuk membacakan instruksi malam dan siang otomatis ("Semua pemain tutup mata...", "Seer bangun...").
- **Fitur 2: Peran Baru (Cupid & Tanner)**: 
  - *Cupid*: Menautkan 2 pemain menjadi sepasang kekasih (Lovebirds) di malam pertama.
  - *Tanner*: Karakter netral yang menang tunggal jika berhasil digantung warga di siang hari.
- **Fitur 3: Catatan Deduksi Rahasia Pemain (Suspicion Tracker)**: Buku catatan pribadi di layar pemain untuk menandai status kecurigaan (Dipercaya, Dicurigai Werewolf, Netral) dan mencatat alibi diskusi.

---

## 1. Overview & Core Concept

- **Tujuan**: Mengubah aplikasi dari sekadar pencatat peran menjadi pendamping pesta interaktif yang memandu suasana secara dramatis tanpa repot.
- **Target Pengguna**: Pemain kasual, komunitas board game, dan moderator yang ingin permainan berjalan lancar tanpa celah kecurigaan suara manual.
- **Nilai Tambah**: Suara narator otomatis membebaskan moderator dari keharusan berbicara monoton, sementara peran baru memberikan variasi plot twist.

---

## 2. User Experience & Visual Design

### A. Fitur 1: Narasi Suara Pemandu Otomatis (Voice Announcer)
- **Letak Kontrol**: Tombol speaker narasi di `TopBar` dan kontrol pemutaran di `ModeratorDashboard`.
- **Alur Kerja**:
  - Saat tombol *Panggil Seer* diklik, aplikasi memutar efek suara gong hening diikuti narasi suara jernih: *"Seer, buka mata Anda..."*.
  - Pemain dapat mengatur kecepatan bicara (0.8x - 1.2x) dan memilih jenis suara bahasa Indonesia yang tersedia di peramban.

### B. Fitur 2: Peran Baru (Cupid & Tanner)
- **Cupid**:
  - Langkah malam khusus di Malam 1 sebelum Seer: Memilih 2 target pemain.
  - Notifikasi rahasia muncul di kartu kedua pemain: *"Anda telah ditautkan oleh Cupid dengan [Nama Pasangan]!"*.
- **Tanner**:
  - Tampilan kartu bertema ungu gelap/penipu.
  - Jika voting siang mengeksekusi Tanner, langsung memicu layar kemenangan dramatis khusus: *"Tanner Menang Sendiri!"*.

### C. Fitur 3: Buku Catatan Deduksi (Suspicion Tracker)
- **Komponen Drawer / Tab Tambahan**: Tab kecil di sisi kartu peran pemain.
- **Interaksi Cepat**: Tiap nama pemain memiliki tombol siklus 3 status:
  - 🟢 *Dipercaya (Warga)*
  - 🔴 *Dicurigai (Werewolf)*
  - ⚪ *Belum Yakin (Netral)*
- **Kolom Catatan Ringkas**: Area teks cepat untuk mengetik alibi saat sesi diskusi siang.

---

## 3. Key Product Decisions & Trade-Offs

- **Web Speech API vs File Audio Rekaman**:
  - *Keputusan*: Menggunakan Web Speech API bawaan browser untuk narasi dinamis yang dapat menyebutkan nama babak dan kondisi permainan tanpa membebani ukuran Docker image atau kuota data.
- **Persistensi Catatan Pemain**:
  - *Keputusan*: Disimpan di `localStorage` per room/perangkat agar privasi deduksi masing-masing pemain 100% aman dan tidak dikirim ke server.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       Client View                           │
│                                                             │
│   ┌────────────────────┐   ┌────────────────────────────┐   │
│   │ Player View        │   │ Moderator Dashboard        │   │
│   │ - PlayerCard       │   │ - Auto Voice Announcer     │   │
│   │ - SuspicionTracker │   │ - Step Controller          │   │
│   │ - Cupid/Love Link  │   │ - Cupid & Tanner Resolver  │   │
│   └─────────┬──────────┘   └─────────────┬──────────────┘   │
└─────────────┼────────────────────────────┼──────────────────┘
              │                            │                   
              ▼                            ▼                   
┌─────────────────────────────────────────────────────────────┐
│                    Sound & Speech Engine                    │
│   - Web Audio API (Chimes, Gong, Howl, Drone)               │
│   - Web Speech API (Indonesian Voice Narration)             │
└─────────────────────────────────────────────────────────────┘
              │                            │                   
              ▼                            ▼                   
┌─────────────────────────────────────────────────────────────┐
│                     Express API Server                      │
│   - /api/rooms/:code/cupid-link                             │
│   - /api/rooms/:code/resolve-day (Check Tanner Victory)     │
│   - Room State Sanitization (Lovebirds mutual reveal)       │
└─────────────────────────────────────────────────────────────┘
```

### Rencana File yang Akan Diubah / Dibuat:
1. `src/utils/speech.ts` *(Baru)*: Engine Text-to-Speech untuk narasi suara pemandu otomatis.
2. `src/components/SuspicionTracker.tsx` *(Baru)*: Komponen buku catatan deduksi interaktif pemain.
3. `src/types/game.ts`: Menambahkan role `cupid`, `tanner`, serta field `cupidTargetIds` dan status pasangan kasih.
4. `server.ts`: Menambahkan logika eliminasi berantai kekasih dan kondisi kemenangan instan Tanner.
5. `src/components/ModeratorDashboard.tsx`: Integrasi tombol narator suara dan langkah Cupid di malam pertama.
