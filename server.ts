import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GameRoom, Player, RoleId } from './src/types/game';
import { getRecommendedRoleConfig, distributeRolesToPlayers } from './src/utils/roles';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Ensure uploads directory exists for dynamic storage
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Serve public directory for static assets
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

let logGlobalCounter = 0;
function createLogId(tag = ''): string {
  logGlobalCounter++;
  return `log_${Date.now()}_${logGlobalCounter}_${Math.random().toString(36).substring(2, 7)}${tag ? `_${tag}` : ''}`;
}

let dhGlobalCounter = 0;
function createDhId(tag = ''): string {
  dhGlobalCounter++;
  return `dh_${Date.now()}_${dhGlobalCounter}_${Math.random().toString(36).substring(2, 7)}${tag ? `_${tag}` : ''}`;
}

const rooms = new Map<string, GameRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function checkWinCondition(room: GameRoom): 'werewolf' | 'village' | null {
  const playingAlive = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId && p.status === 'alive');
  const aliveWerewolves = playingAlive.filter(p => p.role === 'werewolf').length;
  // Werewolf faction contains werewolf and sorceress
  const aliveWerewolfFaction = playingAlive.filter(p => p.role === 'werewolf' || p.role === 'sorceress').length;
  // Village faction contains villagers and village-aligned special roles
  const aliveVillageFaction = playingAlive.filter(p => p.role !== 'werewolf' && p.role !== 'sorceress' && p.role !== 'tanner').length;

  if (aliveWerewolves === 0 && playingAlive.length > 0) {
    return 'village';
  }
  if (aliveWerewolfFaction >= aliveVillageFaction && aliveWerewolves > 0) {
    return 'werewolf';
  }
  return null;
}

// ---------------- ELIMINATION HELPER (LOVERS & APPRENTICE SEER CASCADE) ----------------
function eliminatePlayer(
  room: GameRoom, 
  targetId: string, 
  reason: string, 
  phaseName: string
): { eliminatedHunter?: Player } {
  const target = room.players.find(p => p.id === targetId);
  if (!target || target.status === 'eliminated') return {};

  target.status = 'eliminated';
  target.eliminatedInPhase = phaseName;
  target.eliminatedReason = reason;

  room.deathHistory.push({
    id: createDhId(),
    cycle: room.cycle,
    phase: room.stage === 'DAY' ? 'Siang' : 'Malam',
    playerId: target.id,
    playerName: target.name,
    playerRole: target.role,
    reason,
    saved: false,
    timestamp: Date.now(),
  });

  let hunterToRevenge: Player | undefined;
  if (target.role === 'hunter') {
    hunterToRevenge = target;
  }

  // Pewarisan peran Apprentice Seer jika Seer utama gugur
  if (target.role === 'seer' && !room.apprenticeSeerPromoted) {
    const aliveApprentice = room.players.find(p => p.role === 'apprentice_seer' && p.status === 'alive');
    if (aliveApprentice) {
      room.apprenticeSeerPromoted = true;
      room.logs.push({
        id: createLogId(''),
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: room.stage === 'DAY' ? 'DAY' : 'NIGHT',
        title: 'Pewarisan Peran Seer',
        description: `Seer utama (${target.name}) telah gugur. Apprentice Seer (${aliveApprentice.name}) kini mewarisi kemampuan menerawang.`,
        isSecret: true,
      });
    }
  }

  // Ikatan Asmara Cupid (Suicide Pact): jika salah satu gugur, pasangannya ikut gugur karena patah hati
  if (room.cupidLovers && room.cupidLovers.includes(target.id)) {
    const partnerId = room.cupidLovers.find(id => id !== target.id);
    const partner = room.players.find(p => p.id === partnerId);
    if (partner && partner.status === 'alive') {
      partner.status = 'eliminated';
      partner.eliminatedInPhase = phaseName;
      partner.eliminatedReason = 'Patah Hati (Ikatan Asmara Cupid)';

      room.logs.push({
        id: createLogId(''),
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: room.stage === 'DAY' ? 'DAY' : 'NIGHT',
        title: 'Tragedi Ikatan Asmara',
        description: `${partner.name} ikut tereliminasi karena patah hati mendalam setelah pasangannya (${target.name}) gugur!`,
      });

      room.deathHistory.push({
        id: createDhId('love'),
        cycle: room.cycle,
        phase: room.stage === 'DAY' ? 'Siang' : 'Malam',
        playerId: partner.id,
        playerName: partner.name,
        playerRole: partner.role,
        reason: 'Patah Hati (Ikatan Asmara Cupid)',
        saved: false,
        timestamp: Date.now(),
      });

      if (partner.role === 'seer' && !room.apprenticeSeerPromoted) {
        const aliveApprentice = room.players.find(p => p.role === 'apprentice_seer' && p.status === 'alive');
        if (aliveApprentice) {
          room.apprenticeSeerPromoted = true;
          room.logs.push({
            id: createLogId(''),
            timestamp: Date.now(),
            cycle: room.cycle,
            phase: room.stage === 'DAY' ? 'DAY' : 'NIGHT',
            title: 'Pewarisan Peran Seer',
            description: `Seer utama (${partner.name}) telah gugur. Apprentice Seer (${aliveApprentice.name}) kini mewarisi kemampuan menerawang.`,
            isSecret: true,
          });
        }
      }

      if (partner.role === 'hunter' && !hunterToRevenge) {
        hunterToRevenge = partner;
      }
    }
  }

  return { eliminatedHunter: hunterToRevenge };
}

// ---------------- ROOM EXPIRATION & CLEANUP ENGINE ----------------
// Batas waktu inaktif room (Time-To-Live) demi efisiensi memori & performa server:
const TTL_FINISHED_GAME_MS = 2 * 60 * 60 * 1000;    // 2 jam setelah game selesai (GAME_OVER)
const TTL_INACTIVE_LOBBY_MS = 12 * 60 * 60 * 1000;  // 12 jam di LOBBY tanpa koneksi/aktivitas
const TTL_ABANDONED_GAME_MS = 24 * 60 * 60 * 1000;  // 24 jam jika permainan ditinggalkan tanpa aktivitas

function isRoomExpired(room: GameRoom): boolean {
  const lastActive = room.updatedAt || Date.now();
  const elapsed = Date.now() - lastActive;

  if (room.stage === 'GAME_OVER') {
    return elapsed > TTL_FINISHED_GAME_MS;
  }
  if (room.stage === 'LOBBY') {
    return elapsed > TTL_INACTIVE_LOBBY_MS;
  }
  return elapsed > TTL_ABANDONED_GAME_MS;
}

function cleanupInactiveRooms(): number {
  let cleanedCount = 0;
  for (const [code, room] of rooms.entries()) {
    if (isRoomExpired(room)) {
      rooms.delete(code);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`[STORAGE-CLEANUP] Otomatis menghapus ${cleanedCount} room/sesi lama yang ditinggalkan demi efisiensi server.`);
  }
  return cleanedCount;
}

// Jalankan pembersihan otomatis berkala setiap 5 menit
setInterval(cleanupInactiveRooms, 5 * 60 * 1000);

// ---------------- SECURITY & PRIVACY HELPERS ----------------

// Helper to identify requester from headers, query, or body
function getRequesterId(req: express.Request): string | undefined {
  const headerId = req.headers['x-player-id'];
  if (headerId && typeof headerId === 'string' && headerId.trim() !== '') {
    return headerId.trim();
  }
  if (req.query.playerId && typeof req.query.playerId === 'string' && req.query.playerId.trim() !== '') {
    return req.query.playerId.trim();
  }
  if (req.body && req.body.playerId && typeof req.body.playerId === 'string' && req.body.playerId.trim() !== '') {
    return req.body.playerId.trim();
  }
  if (req.body && req.body.requesterId && typeof req.body.requesterId === 'string' && req.body.requesterId.trim() !== '') {
    return req.body.requesterId.trim();
  }
  return undefined;
}

// Security & Privacy Sanitization: Redact private role data & secret info for non-moderators
function sanitizeRoomForPlayer(room: GameRoom, requesterId?: string): GameRoom {
  // Deep clone room object so we do not mutate in-memory state
  const sanitized: GameRoom = JSON.parse(JSON.stringify(room));

  const isModerator = !!(requesterId && requesterId === room.moderatorId);
  const isGameOver = room.stage === 'GAME_OVER';

  // Moderator or completed game sees full roles & public logs
  if (isModerator || isGameOver) {
    return sanitized;
  }

  // Regular player view
  const myPlayer = room.players.find(p => p.id === requesterId);

  // Pasangan Cupid info
  let partnerId: string | undefined;
  let partnerPlayer: Player | undefined;
  if (room.cupidLovers && requesterId && room.cupidLovers.includes(requesterId)) {
    partnerId = room.cupidLovers.find(id => id !== requesterId);
    partnerPlayer = room.players.find(p => p.id === partnerId);
  }

  // 1. Sanitize Player Roles
  sanitized.players = room.players.map(p => {
    const playerCopy = { ...p };
    const isMe = p.id === requesterId;
    const isTeammateWolf = myPlayer?.role === 'werewolf' && p.role === 'werewolf';
    const isRevealedFool = p.role === 'fool' && p.foolPardoned;

    if (!isMe && !isTeammateWolf && !isRevealedFool) {
      playerCopy.role = undefined;
    }

    // Pasangan kekasih Cupid mengetahui status pasangannya
    if (room.cupidLovers && room.cupidLovers.includes(p.id)) {
      if (isMe && partnerPlayer) {
        playerCopy.isLover = true;
        playerCopy.loverPartnerId = partnerPlayer.id;
        playerCopy.loverPartnerName = partnerPlayer.name;
      } else if (p.id === partnerId) {
        playerCopy.isLover = true;
      }
    }

    return playerCopy;
  });

  // 2. Sanitize Night Actions (Secrets)
  if (myPlayer?.role === 'werewolf') {
    sanitized.nightActions = {
      werewolfVotes: room.nightActions.werewolfVotes || {},
      werewolfTargetId: room.nightActions.werewolfTargetId,
    };
  } else if (myPlayer?.role === 'seer' || (myPlayer?.role === 'apprentice_seer' && room.apprenticeSeerPromoted)) {
    sanitized.nightActions = {
      werewolfVotes: {},
      seerTargetId: room.nightActions.seerTargetId,
      seerInspectionResult: room.nightActions.seerInspectionResult,
    };
  } else if (myPlayer?.role === 'doctor') {
    sanitized.nightActions = {
      werewolfVotes: {},
      doctorTargetId: room.nightActions.doctorTargetId,
    };
  } else if (myPlayer?.role === 'bodyguard') {
    sanitized.nightActions = {
      werewolfVotes: {},
      bodyguardTargetId: room.nightActions.bodyguardTargetId,
    };
  } else if (myPlayer?.role === 'sorceress') {
    sanitized.nightActions = {
      werewolfVotes: {},
      sorceressTargetId: room.nightActions.sorceressTargetId,
      sorceressInspectionResult: room.nightActions.sorceressInspectionResult,
    };
  } else if (myPlayer?.role === 'cupid') {
    sanitized.nightActions = {
      werewolfVotes: {},
      cupidTargetIds: room.nightActions.cupidTargetIds,
    };
  } else if (myPlayer?.role === 'witch') {
    sanitized.nightActions = {
      werewolfVotes: {},
      witchHealTargetId: room.nightActions.witchHealTargetId,
      witchPoisonTargetId: room.nightActions.witchPoisonTargetId,
      witchHealUsed: room.nightActions.witchHealUsed,
      witchPoisonUsed: room.nightActions.witchPoisonUsed,
    };
  } else {
    sanitized.nightActions = {
      werewolfVotes: {},
    };
  }

  // 3. Cupid lovers visibility
  if (myPlayer?.role === 'cupid' || (room.cupidLovers && requesterId && room.cupidLovers.includes(requesterId))) {
    sanitized.cupidLovers = room.cupidLovers;
  } else {
    sanitized.cupidLovers = undefined;
  }

  // 4. Sanitize Secret Logs
  sanitized.logs = room.logs.filter(log => !log.isSecret);

  // 5. Sanitize Death History Roles (if game not over)
  sanitized.deathHistory = room.deathHistory.map(dh => ({
    ...dh,
    playerRole: undefined,
  }));

  return sanitized;
}

// ---------------- API ROUTES ----------------

// Health check endpoint for deployment monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime(),
    app: 'werewolf-companion',
  });
});

// Create a new room
app.post('/api/rooms', (req, res) => {
  const { hostName } = req.body;
  const trimmedName = typeof hostName === 'string' ? hostName.trim() : '';

  if (!trimmedName) {
    return res.status(400).json({ error: 'Nama Anda wajib diisi. Silakan masukkan nama sebelum membuat room.' });
  }

  if (trimmedName.length > 25) {
    return res.status(400).json({ error: 'Nama terlalu panjang (maksimal 25 karakter).' });
  }

  const code = generateRoomCode();
  const hostPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);

  const initialPlayer: Player = {
    id: hostPlayerId,
    name: trimmedName,
    status: 'alive',
    isModerator: true,
    joinedAt: Date.now(),
  };

  const newRoom: GameRoom = {
    code,
    hostId: hostPlayerId,
    moderatorId: hostPlayerId,
    stage: 'LOBBY',
    cycle: 0,
    nightStep: 'NIGHT_START',
    dayStep: 'DAY_ANNOUNCE',
    players: [initialPlayer],
    roleConfig: getRecommendedRoleConfig(6),
    nightActions: {
      werewolfVotes: {},
    },
    dayVotes: {
      votes: {},
    },
    lastNightSaved: false,
    logs: [
      {
        id: createLogId(),
        timestamp: Date.now(),
        cycle: 0,
        phase: 'NIGHT',
        title: 'Room Dibuat',
        description: `Room ${code} dibuat oleh ${initialPlayer.name}.`,
      },
    ],
    deathHistory: [],
    discussionTimerSeconds: 180,
    timerRunning: false,
    updatedAt: Date.now(),
  };

  rooms.set(code, newRoom);
  res.json({ room: sanitizeRoomForPlayer(newRoom, hostPlayerId), playerId: hostPlayerId });
});

// Get room details
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Kode room tidak ditemukan' });
  }

  // Bersihkan otomatis jika sesi sudah kedaluwarsa karena tidak aktif
  if (isRoomExpired(room)) {
    rooms.delete(code);
    return res.status(404).json({ error: 'Sesi room ini telah berakhir dan dibersihkan karena sudah lama tidak aktif.' });
  }

  // Refresh timestamp agar room yang sedang dibuka pemain tidak pernah mati
  room.updatedAt = Date.now();

  const requesterId = getRequesterId(req);
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Join room
app.post('/api/rooms/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName, asModerator } = req.body;
  const requesterId = getRequesterId(req);
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ error: 'Room tidak ditemukan' });
  }

  // Bersihkan otomatis jika sesi sudah kedaluwarsa karena tidak aktif
  if (isRoomExpired(room)) {
    rooms.delete(code);
    return res.status(404).json({ error: 'Sesi room ini telah berakhir dan dibersihkan karena sudah lama tidak aktif.' });
  }

  const trimmedName = typeof playerName === 'string' ? playerName.trim() : '';
  if (!trimmedName) {
    return res.status(400).json({ error: 'Nama Anda wajib diisi. Silakan masukkan nama sebelum masuk ke room.' });
  }

  if (trimmedName.length > 25) {
    return res.status(400).json({ error: 'Nama terlalu panjang (maksimal 25 karakter).' });
  }
  
  const existingPlayer = room.players.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
  if (existingPlayer) {
    // Izinkan rekoneksi jika ID pengirim cocok dengan ID pemain yang sudah ada
    if (requesterId && requesterId === existingPlayer.id) {
      if (asModerator && (existingPlayer.id === room.hostId || requesterId === room.hostId)) {
        existingPlayer.isModerator = true;
        room.moderatorId = existingPlayer.id;
      }
      room.updatedAt = Date.now();
      return res.json({ room: sanitizeRoomForPlayer(room, existingPlayer.id), playerId: existingPlayer.id });
    }

    // Jika permainan sudah berjalan dan bukan pemain rekoneksi
    if (room.stage !== 'LOBBY') {
      return res.status(400).json({ 
        error: `Nama "${trimmedName}" sudah terdaftar di room ini. Gunakan sesi perangkat Anda sebelumnya untuk rekoneksi.` 
      });
    }

    // Di lobby: tolak nama duplikat agar tidak ada 2 orang bernama sama
    return res.status(400).json({ 
      error: `Nama "${trimmedName}" sudah digunakan oleh pemain lain di room ini. Silakan pilih nama lain.` 
    });
  }

  // Cegah pemain baru bergabung jika permainan sudah dimulai
  if (room.stage !== 'LOBBY') {
    return res.status(400).json({ error: 'Permainan sudah dimulai. Pemain baru tidak dapat masuk di tengah permainan.' });
  }

  const newPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);
  const newPlayer: Player = {
    id: newPlayerId,
    name: trimmedName,
    status: 'alive',
    isModerator: false,
    joinedAt: Date.now(),
  };

  if (asModerator) {
    if (requesterId === room.hostId) {
      room.players.forEach(p => (p.isModerator = false));
      newPlayer.isModerator = true;
      room.moderatorId = newPlayerId;
    } else {
      return res.status(403).json({ error: 'Akses ditolak. Hanya pembuat room (Host) yang berhak memilih Moderator.' });
    }
  }

  room.players.push(newPlayer);
  
  if (room.stage === 'LOBBY') {
    const playingCount = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId).length;
    room.roleConfig = getRecommendedRoleConfig(playingCount);
  }

  room.logs.push({
    id: createLogId(),
    timestamp: Date.now(),
    cycle: room.cycle,
    phase: 'NIGHT',
    title: 'Pemain Bergabung',
    description: `${newPlayer.name} telah masuk ke room.`,
  });

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, newPlayerId), playerId: newPlayerId });
});

// Update role configuration
app.post('/api/rooms/:code/roles', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { roleConfig } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat mengubah konfigurasi peran.' });
  }

  room.roleConfig = roleConfig;
  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Change Moderator (Room Master / Host Authorization)
app.post('/api/rooms/:code/set-moderator', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { targetPlayerId } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.hostId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya pembuat room (Host) yang berhak memilih atau mengganti Moderator / Room Master.' });
  }

  const target = room.players.find(p => p.id === targetPlayerId);
  if (!target) return res.status(404).json({ error: 'Pemain target tidak ditemukan' });

  room.players.forEach(p => {
    p.isModerator = (p.id === targetPlayerId);
  });
  room.moderatorId = targetPlayerId;

  room.logs.push({
    id: createLogId(),
    timestamp: Date.now(),
    cycle: room.cycle,
    phase: room.stage === 'NIGHT' ? 'NIGHT' : 'DAY',
    title: 'Pergantian Moderator',
    description: `Moderator saat ini adalah ${target.name}.`,
  });

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Start Game
app.post('/api/rooms/:code/start-game', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat memulai permainan.' });
  }

  const playingPlayers = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId);
  if (playingPlayers.length < 4) {
    return res.status(400).json({ error: 'Minimal 4 pemain (di luar Moderator) untuk memulai permainan.' });
  }

  const assignments = distributeRolesToPlayers(playingPlayers, room.roleConfig);
  room.players.forEach(p => {
    if (p.isModerator || p.id === room.moderatorId) {
      p.role = undefined;
      p.status = 'alive';
    } else {
      p.role = assignments[p.id];
      p.status = 'alive';
    }
    p.eliminatedInPhase = undefined;
    p.eliminatedReason = undefined;
  });

  room.stage = 'NIGHT';
  room.cycle = 1;
  room.nightStep = 'NIGHT_START';
  room.nightActions = { werewolfVotes: {} };
  room.dayVotes = { votes: {} };
  room.lastNightKilledId = undefined;
  room.lastNightSaved = false;
  room.winner = undefined;
  room.deathHistory = [];

  room.logs.push({
    id: createLogId(),
    timestamp: Date.now(),
    cycle: 1,
    phase: 'NIGHT',
    title: 'Permainan Dimulai',
    description: 'Peran dibagikan secara acak. Fase Malam ke-1 dimulai.',
  });

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Advance Night Step
app.post('/api/rooms/:code/night-step', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { nextStep } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat mengubah langkah malam.' });
  }

  room.nightStep = nextStep;
  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Submit Action
app.post('/api/rooms/:code/action', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, actionType, targetId, targetIds } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (playerId !== requesterId) {
    return res.status(403).json({ error: 'Akses ditolak. Anda tidak dapat melakukan aksi atas nama pemain lain.' });
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player || player.status !== 'alive' || player.isModerator || player.id === room.moderatorId) {
    return res.status(403).json({ error: 'Pemain tidak valid, tereliminasi, atau merupakan Moderator (Pemandu).' });
  }

  // 1. Werewolf Vote
  if (actionType === 'werewolf_vote') {
    if (player.role !== 'werewolf') {
      return res.status(403).json({ error: 'Hanya Werewolf yang dapat memilih target eliminasi.' });
    }
    if (room.nightActions.werewolfVotes[playerId]) {
      return res.status(400).json({ error: 'Pilihan target Werewolf Anda sudah dikonfirmasi dan tidak dapat diubah.' });
    }
    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer || targetPlayer.status !== 'alive') {
      return res.status(400).json({ error: 'Target eliminasi tidak valid atau sudah gugur.' });
    }

    room.nightActions.werewolfVotes[playerId] = targetId;
    
    const voteCounts: Record<string, number> = {};
    Object.values(room.nightActions.werewolfVotes).forEach(tgt => {
      voteCounts[tgt] = (voteCounts[tgt] || 0) + 1;
    });

    let maxVotes = 0;
    let chosenVictim: string | undefined;
    Object.entries(voteCounts).forEach(([tgt, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        chosenVictim = tgt;
      }
    });

    room.nightActions.werewolfTargetId = chosenVictim;

  // 2. Seer Inspect (including Apprentice Seer if promoted)
  } else if (actionType === 'seer_inspect') {
    const isMainSeer = player.role === 'seer';
    const isPromotedApprentice = player.role === 'apprentice_seer' && room.apprenticeSeerPromoted;

    if (!isMainSeer && !isPromotedApprentice) {
      return res.status(403).json({ error: 'Hanya Seer (atau Apprentice Seer aktif) yang dapat melakukan penerawangan.' });
    }
    if (room.nightActions.seerTargetId) {
      return res.status(400).json({ error: 'Kemampuan penerawangan hanya dapat digunakan 1 kali per malam dan tidak dapat diubah.' });
    }

    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer || targetPlayer.status !== 'alive') {
      return res.status(400).json({ error: 'Target penerawangan tidak valid atau sudah gugur.' });
    }

    room.nightActions.seerTargetId = targetId;

    // Lycan special rule: Lycan appears as Werewolf to Seer!
    const perceivedRole: 'werewolf' | 'villager' = 
      (targetPlayer.role === 'werewolf' || targetPlayer.role === 'lycan') ? 'werewolf' : 'villager';

    room.nightActions.seerInspectionResult = {
      targetId: targetPlayer.id,
      targetName: targetPlayer.name,
      perceivedRole,
    };
    
    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Pemeriksaan Seer',
      description: `${player.name} (${isMainSeer ? 'Seer' : 'Apprentice Seer'}) memeriksa ${targetPlayer.name}.`,
      isSecret: true,
    });

  // 3. Doctor Protect
  } else if (actionType === 'doctor_protect') {
    if (player.role !== 'doctor') {
      return res.status(403).json({ error: 'Hanya Doctor yang dapat melakukan aksi perlindungan.' });
    }
    if (room.nightActions.doctorTargetId) {
      return res.status(400).json({ error: 'Kemampuan Doctor hanya dapat digunakan 1 kali per malam dan tidak dapat diubah.' });
    }
    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer || targetPlayer.status !== 'alive') {
      return res.status(400).json({ error: 'Target perlindungan tidak valid atau sudah gugur.' });
    }

    room.nightActions.doctorTargetId = targetId;

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Perlindungan Doctor',
      description: `Doctor (${player.name}) melindungi ${targetPlayer.name}.`,
      isSecret: true,
    });

  // 4. Bodyguard Protect
  } else if (actionType === 'bodyguard_protect') {
    if (player.role !== 'bodyguard') {
      return res.status(403).json({ error: 'Hanya Bodyguard yang dapat melakukan aksi pengawalan.' });
    }
    if (room.nightActions.bodyguardTargetId) {
      return res.status(400).json({ error: 'Kemampuan Bodyguard hanya dapat digunakan 1 kali per malam dan tidak dapat diubah.' });
    }
    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer || targetPlayer.status !== 'alive') {
      return res.status(400).json({ error: 'Target pengawalan tidak valid atau sudah gugur.' });
    }

    room.nightActions.bodyguardTargetId = targetId;

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Pengawalan Bodyguard',
      description: `Bodyguard (${player.name}) mengawal dan melindungi ${targetPlayer.name}.`,
      isSecret: true,
    });

  // 5. Sorceress Inspect (Checks if target is Seer)
  } else if (actionType === 'sorceress_inspect') {
    if (player.role !== 'sorceress') {
      return res.status(403).json({ error: 'Hanya Sorceress yang dapat melakukan aksi ini.' });
    }
    if (room.nightActions.sorceressTargetId) {
      return res.status(400).json({ error: 'Kemampuan Sorceress hanya dapat digunakan 1 kali per malam dan tidak dapat diubah.' });
    }
    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer || targetPlayer.status !== 'alive') {
      return res.status(400).json({ error: 'Target penerawangan tidak valid atau sudah gugur.' });
    }

    room.nightActions.sorceressTargetId = targetId;
    const isSeer = targetPlayer.role === 'seer' || (targetPlayer.role === 'apprentice_seer' && !!room.apprenticeSeerPromoted);

    room.nightActions.sorceressInspectionResult = {
      targetId: targetPlayer.id,
      targetName: targetPlayer.name,
      isSeer,
    };

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Penerawangan Sorceress',
      description: `Sorceress (${player.name}) menerawang ${targetPlayer.name} untuk mencari Seer.`,
      isSecret: true,
    });

  // 6. Cupid Link (Night 1 only)
  } else if (actionType === 'cupid_link') {
    if (player.role !== 'cupid') {
      return res.status(403).json({ error: 'Hanya Cupid yang dapat mengikat pasangan asmara.' });
    }
    if (room.cycle !== 1) {
      return res.status(400).json({ error: 'Kemampuan Cupid hanya aktif di malam pertama permainan.' });
    }
    if (room.cupidLovers && room.cupidLovers.length === 2) {
      return res.status(400).json({ error: 'Pasangan asmara sudah ditentukan dan tidak dapat diubah.' });
    }

    const loverIds = targetIds || (targetId ? [targetId] : []);
    if (!Array.isArray(loverIds) || loverIds.length !== 2) {
      return res.status(400).json({ error: 'Cupid wajib memilih tepat 2 pemain untuk menjadi pasangan kekasih.' });
    }
    if (loverIds[0] === loverIds[1]) {
      return res.status(400).json({ error: 'Pilih 2 pemain yang berbeda.' });
    }

    const p1 = room.players.find(p => p.id === loverIds[0] && p.status === 'alive');
    const p2 = room.players.find(p => p.id === loverIds[1] && p.status === 'alive');
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'Salah satu pemain yang dipilih tidak valid atau sudah tidak aktif.' });
    }

    room.cupidLovers = [loverIds[0], loverIds[1]];
    room.nightActions.cupidTargetIds = [loverIds[0], loverIds[1]];

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Ikatan Asmara Cupid',
      description: `Cupid (${player.name}) telah mengikat takdir asmara antara ${p1.name} dan ${p2.name}.`,
      isSecret: true,
    });

  // 7. Witch Potion
  } else if (actionType === 'witch_heal') {
    if (player.role !== 'witch') {
      return res.status(403).json({ error: 'Hanya Witch yang dapat menggunakan ramuan penyelamat.' });
    }
    if (room.nightActions.witchHealUsed) {
      return res.status(400).json({ error: 'Ramuan penyelamat Witch hanya dapat digunakan 1 kali sepanjang permainan.' });
    }
    room.nightActions.witchHealTargetId = targetId;
    room.nightActions.witchHealUsed = true;

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Ramuan Penyelamat Witch',
      description: `Witch (${player.name}) menggunakan ramuan penyelamat.`,
      isSecret: true,
    });

  } else if (actionType === 'witch_poison') {
    if (player.role !== 'witch') {
      return res.status(403).json({ error: 'Hanya Witch yang dapat menggunakan ramuan racun.' });
    }
    if (room.nightActions.witchPoisonUsed) {
      return res.status(400).json({ error: 'Ramuan racun Witch hanya dapat digunakan 1 kali sepanjang permainan.' });
    }
    const targetPlayer = room.players.find(p => p.id === targetId && p.status === 'alive');
    if (!targetPlayer) {
      return res.status(400).json({ error: 'Target racun tidak valid.' });
    }
    room.nightActions.witchPoisonTargetId = targetId;
    room.nightActions.witchPoisonUsed = true;

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Ramuan Racun Witch',
      description: `Witch (${player.name}) meracuni ${targetPlayer.name}.`,
      isSecret: true,
    });
  }

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Resolve Night Phase
app.post('/api/rooms/:code/resolve-night', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat memproses hasil malam.' });
  }

  const victimId = room.nightActions.werewolfTargetId;
  const isDoctorProtected = victimId && victimId === room.nightActions.doctorTargetId;
  const isBodyguardProtected = victimId && victimId === room.nightActions.bodyguardTargetId;
  const isWitchHealed = victimId && victimId === room.nightActions.witchHealTargetId;
  const isSavedFromWolves = isDoctorProtected || isBodyguardProtected || isWitchHealed;

  let hunterTriggered: Player | undefined;

  // 1. Proses target Werewolf
  if (victimId) {
    if (isSavedFromWolves) {
      room.lastNightSaved = true;
      room.lastNightKilledId = undefined;

      const protectorName = isDoctorProtected ? 'Doctor' : isBodyguardProtected ? 'Bodyguard' : 'Witch';
      room.logs.push({
        id: createLogId(),
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: 'NIGHT',
        title: 'Hasil Malam',
        description: `Target penyerangan berhasil diselamatkan oleh ${protectorName}. Tidak ada korban eliminasi Werewolf.`,
      });

      room.deathHistory.push({
        id: createDhId(),
        cycle: room.cycle,
        phase: 'Malam',
        playerName: 'Tidak ada pemain tereliminasi',
        reason: `Target Werewolf diselamatkan oleh ${protectorName}`,
        saved: true,
        timestamp: Date.now(),
      });
    } else {
      room.lastNightSaved = false;
      room.lastNightKilledId = victimId;
      const { eliminatedHunter } = eliminatePlayer(room, victimId, 'Serangan Werewolf', `Malam ${room.cycle}`);
      if (eliminatedHunter) hunterTriggered = eliminatedHunter;

      const victim = room.players.find(p => p.id === victimId);
      room.logs.push({
        id: createLogId(),
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: 'NIGHT',
        title: 'Hasil Malam',
        description: `${victim?.name || 'Seorang warga'} tereliminasi oleh Werewolf.`,
      });
    }
  } else {
    room.lastNightSaved = false;
    room.lastNightKilledId = undefined;
    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Hasil Malam',
      description: 'Tidak ada serangan Werewolf pada malam ini.',
    });

    room.deathHistory.push({
      id: createDhId(),
      cycle: room.cycle,
      phase: 'Malam',
      playerName: 'Tidak ada pemain tereliminasi',
      reason: 'Tidak ada target penyerangan Werewolf',
      saved: false,
      timestamp: Date.now(),
    });
  }

  // 2. Proses racun Witch jika digunakan malam ini
  if (room.nightActions.witchPoisonTargetId) {
    const poisonId = room.nightActions.witchPoisonTargetId;
    const { eliminatedHunter } = eliminatePlayer(room, poisonId, 'Ramuan Racun Witch', `Malam ${room.cycle}`);
    if (eliminatedHunter && !hunterTriggered) hunterTriggered = eliminatedHunter;

    const poisonTarget = room.players.find(p => p.id === poisonId);
    room.logs.push({
      id: createLogId(''),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Korban Racun Witch',
      description: `${poisonTarget?.name || 'Seorang warga'} tereliminasi akibat racun misterius Witch.`,
    });
    // Reset poison target for next nights while preserving used flag
    room.nightActions.witchPoisonTargetId = undefined;
  }

  // 3. Aksi Hunter Revenge jika ada Hunter yang tereliminasi
  if (hunterTriggered) {
    room.stage = 'HUNTER_REVENGE';
    room.hunterRevengePlayerId = hunterTriggered.id;
  } else {
    const win = checkWinCondition(room);
    if (win) {
      room.stage = 'GAME_OVER';
      room.winner = win;
    } else {
      room.stage = 'DAY';
      room.dayStep = 'DAY_ANNOUNCE';
      room.dayVotes = { votes: {} };
    }
  }

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Hunter Action
app.post('/api/rooms/:code/hunter-revenge', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { targetId } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  const isHunter = requesterId === room.hunterRevengePlayerId;
  const isModerator = requesterId === room.moderatorId;

  if (!isHunter && !isModerator) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Hunter terkait atau Moderator yang dapat mengeksekusi tembakan.' });
  }

  const target = room.players.find(p => p.id === targetId);
  let secondaryHunter: Player | undefined;

  if (target && target.status === 'alive') {
    const { eliminatedHunter } = eliminatePlayer(
      room, 
      target.id, 
      'Aksi Terakhir Hunter', 
      `Balas Dendam Hunter (Babak ${room.cycle})`
    );
    if (eliminatedHunter) secondaryHunter = eliminatedHunter;

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: room.stage === 'DAY' ? 'DAY' : 'NIGHT',
      title: 'Aksi Hunter',
      description: `Hunter mengeliminasi ${target.name} sebelum menghembuskan nafas terakhirnya.`,
    });
  }

  if (secondaryHunter) {
    room.hunterRevengePlayerId = secondaryHunter.id;
  } else {
    room.hunterRevengePlayerId = undefined;
    const win = checkWinCondition(room);
    if (win) {
      room.stage = 'GAME_OVER';
      room.winner = win;
    } else {
      room.stage = 'DAY';
      room.dayStep = 'DAY_ANNOUNCE';
      room.dayVotes = { votes: {} };
    }
  }

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Day Step
app.post('/api/rooms/:code/day-step', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { nextStep } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat mengubah langkah siang.' });
  }

  room.dayStep = nextStep;
  if (nextStep === 'DAY_DISCUSS') {
    room.timerRunning = true;
  }
  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Submit Day Vote
app.post('/api/rooms/:code/vote-lynch', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { voterId, targetId } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (voterId !== requesterId) {
    return res.status(403).json({ error: 'Akses ditolak. Anda tidak dapat melakukan voting atas nama pemain lain.' });
  }

  const voter = room.players.find(p => p.id === voterId);
  if (!voter || voter.status !== 'alive' || voter.isModerator || voter.id === room.moderatorId) {
    return res.status(403).json({ error: 'Hanya pemain aktif yang dapat melakukan voting. Moderator tidak ikut voting.' });
  }

  // Fool yang telah diampuni kehilangan hak suara voting
  if (voter.foolLostVote) {
    return res.status(400).json({ error: 'Fool (Idiot Desa) yang telah diampuni tidak memiliki hak suara voting.' });
  }

  if (targetId && targetId !== 'skip') {
    const targetPlayer = room.players.find(p => p.id === targetId);
    if (!targetPlayer || targetPlayer.isModerator || targetPlayer.id === room.moderatorId) {
      return res.status(400).json({ error: 'Target voting tidak valid. Moderator tidak berpartisipasi sebagai pemain.' });
    }
  }

  if (room.dayVotes.votes[voterId]) {
    return res.status(400).json({ error: 'Suara voting Anda sudah tercatat dan tidak dapat diubah.' });
  }

  room.dayVotes.votes[voterId] = targetId;
  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Resolve Day Voting
app.post('/api/rooms/:code/resolve-day', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { manualTargetId } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat memproses hasil voting siang.' });
  }

  let condemnedId = manualTargetId;

  if (!condemnedId) {
    const counts: Record<string, number> = {};
    Object.entries(room.dayVotes.votes).forEach(([voterId, targetId]) => {
      if (!targetId || targetId === 'skip') return;
      const voter = room.players.find(p => p.id === voterId);
      // Fool yang kehilangan hak suara tidak dihitung
      if (voter?.foolLostVote) return;
      const weight = voter?.role === 'mayor' ? 2 : 1;
      counts[targetId] = (counts[targetId] || 0) + weight;
    });

    let maxVotes = 0;
    let tie = false;
    let leader: string | undefined;

    Object.entries(counts).forEach(([tid, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        leader = tid;
        tie = false;
      } else if (count === maxVotes && maxVotes > 0) {
        tie = true;
      }
    });

    if (!tie && leader && maxVotes > 0) {
      condemnedId = leader;
    }
  }

  let hunterTriggered: Player | undefined;

  if (condemnedId && condemnedId !== 'skip') {
    const condemnedPlayer = room.players.find(p => p.id === condemnedId);
    if (condemnedPlayer) {
      // 1. TANNER KEMENANGAN INSTAN
      if (condemnedPlayer.role === 'tanner') {
        condemnedPlayer.status = 'eliminated';
        condemnedPlayer.eliminatedInPhase = `Siang ${room.cycle}`;
        condemnedPlayer.eliminatedReason = 'Voting Eliminasi Siang';
        room.stage = 'GAME_OVER';
        room.winner = 'tanner';

        room.logs.push({
          id: createLogId(),
          timestamp: Date.now(),
          cycle: room.cycle,
          phase: 'DAY',
          title: 'Kemenangan Mutlak Tanner',
          description: `${condemnedPlayer.name} (Tanner) berhasil dieliminasi saat musyawarah voting siang dan meraih kemenangan tunggal!`,
        });

        room.deathHistory.push({
          id: createDhId(),
          cycle: room.cycle,
          phase: 'Siang',
          playerId: condemnedPlayer.id,
          playerName: condemnedPlayer.name,
          playerRole: condemnedPlayer.role,
          reason: 'Voting Eliminasi Siang (Kemenangan Tanner)',
          saved: false,
          timestamp: Date.now(),
        });

        room.updatedAt = Date.now();
        return res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
      }

      // 2. PENGAMPUNAN FOOL (IDIOT DESA)
      if (condemnedPlayer.role === 'fool' && !condemnedPlayer.foolPardoned) {
        condemnedPlayer.status = 'alive';
        condemnedPlayer.foolPardoned = true;
        condemnedPlayer.foolLostVote = true;

        room.logs.push({
          id: createLogId(),
          timestamp: Date.now(),
          cycle: room.cycle,
          phase: 'DAY',
          title: 'Pengampunan Fool (Idiot Desa)',
          description: `${condemnedPlayer.name} terungkap sebagai Fool (Idiot Desa)! Sesuai aturan, ia mendapat pengampunan dan batal tereliminasi, namun kehilangan hak voting.`,
        });

        room.deathHistory.push({
          id: createDhId(),
          cycle: room.cycle,
          phase: 'Siang',
          playerId: condemnedPlayer.id,
          playerName: condemnedPlayer.name,
          playerRole: condemnedPlayer.role,
          reason: 'Pengampunan Fool (Batal Tereliminasi)',
          saved: true,
          timestamp: Date.now(),
        });
      } else {
        // 3. ELIMINASI BIASA DENGAN CASCADE LOVERS & HUNTER
        room.dayVotes.lynchedPlayerId = condemnedId;
        const { eliminatedHunter } = eliminatePlayer(room, condemnedPlayer.id, 'Voting Eliminasi Siang', `Siang ${room.cycle}`);
        if (eliminatedHunter) hunterTriggered = eliminatedHunter;

        room.logs.push({
          id: createLogId(),
          timestamp: Date.now(),
          cycle: room.cycle,
          phase: 'DAY',
          title: 'Hasil Voting Siang',
          description: `${condemnedPlayer.name} tereliminasi berdasarkan hasil voting musyawarah siang.`,
        });
      }
    }
  } else {
    room.dayVotes.lynchedPlayerId = undefined;
    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'DAY',
      title: 'Hasil Voting Siang',
      description: 'Tidak ada pemain yang tereliminasi (suara seri atau mayoritas memilih lewati).',
    });

    room.deathHistory.push({
      id: createDhId(),
      cycle: room.cycle,
      phase: 'Siang',
      playerName: 'Tidak ada eliminasi',
      reason: 'Hasil voting seri atau mayoritas memilih lewati',
      saved: false,
      timestamp: Date.now(),
    });
  }

  // Cek apakah Hunter tereliminasi dan memicu revenge
  if (hunterTriggered) {
    room.stage = 'HUNTER_REVENGE';
    room.hunterRevengePlayerId = hunterTriggered.id;
    room.updatedAt = Date.now();
    return res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
  }

  const win = checkWinCondition(room);
  if (win) {
    room.stage = 'GAME_OVER';
    room.winner = win;
  } else {
    room.stage = 'NIGHT';
    room.cycle += 1;
    room.nightStep = 'NIGHT_START';
    room.nightActions = { werewolfVotes: {} };
    room.dayVotes = { votes: {} };
    room.lastNightSaved = false;
    room.lastNightKilledId = undefined;

    room.logs.push({
      id: createLogId(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: `Fase Malam ke-${room.cycle}`,
      description: 'Malam dimulai. Seluruh pemain menutup mata.',
    });
  }

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Update Timer
app.post('/api/rooms/:code/timer', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { seconds, isRunning } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat mengatur timer musyawarah.' });
  }

  if (typeof seconds === 'number') room.discussionTimerSeconds = seconds;
  if (typeof isRunning === 'boolean') room.timerRunning = isRunning;

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Reset Game
app.post('/api/rooms/:code/reset-game', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || requesterId !== room.moderatorId) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator yang dapat mereset permainan.' });
  }

  room.stage = 'LOBBY';
  room.cycle = 0;
  room.nightStep = 'NIGHT_START';
  room.dayStep = 'DAY_ANNOUNCE';
  room.nightActions = { werewolfVotes: {} };
  room.dayVotes = { votes: {} };
  room.winner = undefined;
  room.lastNightKilledId = undefined;
  room.lastNightSaved = false;
  room.deathHistory = [];

  room.players.forEach(p => {
    p.status = 'alive';
    p.role = undefined;
    p.eliminatedInPhase = undefined;
    p.eliminatedReason = undefined;
  });

  room.logs.push({
    id: createLogId(),
    timestamp: Date.now(),
    cycle: 0,
    phase: 'NIGHT',
    title: 'Room Direset',
    description: 'Permainan kembali ke lobby.',
  });

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
});

// Delete / End Room (Frees server memory & storage immediately)
app.delete('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan atau sudah dibersihkan' });

  const requesterId = getRequesterId(req);
  if (!requesterId || (requesterId !== room.moderatorId && requesterId !== room.hostId)) {
    return res.status(403).json({ error: 'Akses ditolak. Hanya Moderator atau Host yang dapat menghapus room ini.' });
  }

  rooms.delete(code);
  res.json({ success: true, message: `Room ${code} berhasil dihapus dari sistem.` });
});

// ---------------- VITE & STATIC HANDLING ----------------

async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Werewolf app running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Gagal menjalankan server:', err);
  }
}

startServer();
