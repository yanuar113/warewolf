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
  const alivePlayers = room.players.filter(p => p.status === 'alive');
  const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf').length;
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf').length;

  if (aliveWerewolves === 0 && alivePlayers.length > 0) {
    return 'village';
  }
  if (aliveWerewolves >= aliveVillagers && aliveWerewolves > 0) {
    return 'werewolf';
  }
  return null;
}

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

  // 1. Sanitize Player Roles
  sanitized.players = room.players.map(p => {
    const playerCopy = { ...p };
    const isMe = p.id === requesterId;
    const isTeammateWolf = myPlayer?.role === 'werewolf' && p.role === 'werewolf';

    if (!isMe && !isTeammateWolf) {
      playerCopy.role = undefined;
    }
    return playerCopy;
  });

  // 2. Sanitize Night Actions (Secrets)
  if (myPlayer?.role === 'werewolf') {
    sanitized.nightActions = {
      werewolfVotes: room.nightActions.werewolfVotes || {},
      werewolfTargetId: room.nightActions.werewolfTargetId,
    };
  } else if (myPlayer?.role === 'seer') {
    sanitized.nightActions = {
      werewolfVotes: {},
      seerTargetId: room.nightActions.seerTargetId,
    };
  } else if (myPlayer?.role === 'doctor') {
    sanitized.nightActions = {
      werewolfVotes: {},
      doctorTargetId: room.nightActions.doctorTargetId,
    };
  } else {
    sanitized.nightActions = {
      werewolfVotes: {},
    };
  }

  // 3. Sanitize Secret Logs
  sanitized.logs = room.logs.filter(log => !log.isSecret);

  // 4. Sanitize Death History Roles (if game not over)
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
  const code = generateRoomCode();
  const hostPlayerId = 'p_' + Math.random().toString(36).substring(2, 9);

  const initialPlayer: Player = {
    id: hostPlayerId,
    name: hostName?.trim() || 'Moderator',
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
        id: 'log_' + Date.now(),
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

  const trimmedName = playerName?.trim() || `Pemain ${room.players.length + 1}`;
  
  const existingPlayer = room.players.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
  if (existingPlayer) {
    if (asModerator) {
      if (existingPlayer.id === room.hostId || requesterId === room.hostId) {
        existingPlayer.isModerator = true;
        room.moderatorId = existingPlayer.id;
      } else {
        return res.status(403).json({ error: 'Akses ditolak. Hanya pembuat room (Host) yang dapat menetapkan Moderator.' });
      }
    }
    room.updatedAt = Date.now();
    return res.json({ room: sanitizeRoomForPlayer(room, existingPlayer.id), playerId: existingPlayer.id });
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
    room.roleConfig = getRecommendedRoleConfig(room.players.length);
  }

  room.logs.push({
    id: 'log_' + Date.now(),
    timestamp: Date.now(),
    cycle: room.cycle,
    phase: room.stage === 'NIGHT' ? 'NIGHT' : 'DAY',
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
    id: 'log_' + Date.now(),
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

  if (room.players.length < 4) {
    return res.status(400).json({ error: 'Minimal 4 pemain untuk memulai permainan.' });
  }

  const assignments = distributeRolesToPlayers(room.players, room.roleConfig);
  room.players.forEach(p => {
    p.role = assignments[p.id];
    p.status = 'alive';
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
    id: 'log_' + Date.now(),
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
  const { playerId, actionType, targetId } = req.body;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

  const requesterId = getRequesterId(req);
  if (playerId !== requesterId) {
    return res.status(403).json({ error: 'Akses ditolak. Anda tidak dapat melakukan aksi atas nama pemain lain.' });
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player || player.status !== 'alive') {
    return res.status(403).json({ error: 'Pemain tidak valid atau sudah tereliminasi.' });
  }

  if (actionType === 'werewolf_vote') {
    if (player.role !== 'werewolf') {
      return res.status(403).json({ error: 'Hanya Werewolf yang dapat memilih target eliminasi.' });
    }
    if (room.nightActions.werewolfVotes[playerId]) {
      return res.status(400).json({ error: 'Pilihan target Werewolf Anda sudah dikonfirmasi dan tidak dapat diubah.' });
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
  } else if (actionType === 'seer_inspect') {
    if (player.role !== 'seer') {
      return res.status(403).json({ error: 'Hanya Seer yang dapat melakukan aksi ini.' });
    }
    if (room.nightActions.seerTargetId) {
      return res.status(400).json({ error: 'Kemampuan Seer hanya dapat digunakan 1 kali per malam dan tidak dapat diubah.' });
    }
    room.nightActions.seerTargetId = targetId;
    const targetPlayer = room.players.find(p => p.id === targetId);
    
    room.logs.push({
      id: 'log_' + Date.now(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Pemeriksaan Seer',
      description: `Seer (${player.name}) memeriksa ${targetPlayer?.name || 'pemain'}.`,
      isSecret: true,
    });
  } else if (actionType === 'doctor_protect') {
    if (player.role !== 'doctor') {
      return res.status(403).json({ error: 'Hanya Doctor yang dapat melakukan aksi ini.' });
    }
    if (room.nightActions.doctorTargetId) {
      return res.status(400).json({ error: 'Kemampuan Doctor hanya dapat digunakan 1 kali per malam dan tidak dapat diubah.' });
    }
    room.nightActions.doctorTargetId = targetId;
    const targetPlayer = room.players.find(p => p.id === targetId);

    room.logs.push({
      id: 'log_' + Date.now(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Perlindungan Doctor',
      description: `Doctor (${player.name}) melindungi ${targetPlayer?.name || 'pemain'}.`,
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
  const protectedId = room.nightActions.doctorTargetId;

  let killedPlayer: Player | undefined;

  if (victimId) {
    if (victimId === protectedId) {
      room.lastNightSaved = true;
      room.lastNightKilledId = undefined;

      room.logs.push({
        id: 'log_' + Date.now(),
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: 'NIGHT',
        title: 'Hasil Malam',
        description: `Target Werewolf berhasil dilindungi oleh Doctor. Tidak ada korban tereliminasi.`,
      });

      room.deathHistory.push({
        id: 'dh_' + Date.now(),
        cycle: room.cycle,
        phase: 'Malam',
        playerName: 'Tidak ada pemain tereliminasi',
        reason: 'Target Werewolf dilindungi oleh Doctor',
        saved: true,
        timestamp: Date.now(),
      });
    } else {
      killedPlayer = room.players.find(p => p.id === victimId);
      if (killedPlayer) {
        killedPlayer.status = 'eliminated';
        killedPlayer.eliminatedInPhase = `Malam ${room.cycle}`;
        killedPlayer.eliminatedReason = 'Serangan Werewolf';
        room.lastNightKilledId = victimId;
        room.lastNightSaved = false;

        room.logs.push({
          id: 'log_' + Date.now(),
          timestamp: Date.now(),
          cycle: room.cycle,
          phase: 'NIGHT',
          title: 'Hasil Malam',
          description: `${killedPlayer.name} tereliminasi oleh Werewolf.`,
        });

        room.deathHistory.push({
          id: 'dh_' + Date.now(),
          cycle: room.cycle,
          phase: 'Malam',
          playerId: killedPlayer.id,
          playerName: killedPlayer.name,
          playerRole: killedPlayer.role,
          reason: 'Serangan Werewolf',
          saved: false,
          timestamp: Date.now(),
        });
      }
    }
  } else {
    room.lastNightSaved = false;
    room.lastNightKilledId = undefined;
    room.logs.push({
      id: 'log_' + Date.now(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Hasil Malam',
      description: 'Tidak ada serangan pada malam ini.',
    });

    room.deathHistory.push({
      id: 'dh_' + Date.now(),
      cycle: room.cycle,
      phase: 'Malam',
      playerName: 'Tidak ada pemain tereliminasi',
      reason: 'Tidak ada target penyerangan',
      saved: false,
      timestamp: Date.now(),
    });
  }

  if (killedPlayer && killedPlayer.role === 'hunter') {
    room.stage = 'HUNTER_REVENGE';
    room.hunterRevengePlayerId = killedPlayer.id;
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
  if (target && target.status === 'alive') {
    target.status = 'eliminated';
    target.eliminatedInPhase = `Fase Eliminasi Hunter (Babak ${room.cycle})`;
    target.eliminatedReason = 'Target Eliminasi Hunter';

    room.logs.push({
      id: 'log_' + Date.now(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'NIGHT',
      title: 'Aksi Hunter',
      description: `Hunter mengeliminasi ${target.name}.`,
    });

    room.deathHistory.push({
      id: 'dh_' + Date.now(),
      cycle: room.cycle,
      phase: room.stage === 'DAY' ? 'Siang' : 'Malam',
      playerId: target.id,
      playerName: target.name,
      playerRole: target.role,
      reason: 'Aksi Terakhir Hunter',
      saved: false,
      timestamp: Date.now(),
    });
  }

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
  if (!voter || voter.status !== 'alive') {
    return res.status(403).json({ error: 'Hanya pemain aktif yang dapat melakukan voting.' });
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

  if (condemnedId && condemnedId !== 'skip') {
    const condemnedPlayer = room.players.find(p => p.id === condemnedId);
    if (condemnedPlayer) {
      condemnedPlayer.status = 'eliminated';
      condemnedPlayer.eliminatedInPhase = `Siang ${room.cycle}`;
      condemnedPlayer.eliminatedReason = 'Voting Eliminasi Siang';
      room.dayVotes.lynchedPlayerId = condemnedId;

      room.logs.push({
        id: 'log_' + Date.now(),
        timestamp: Date.now(),
        cycle: room.cycle,
        phase: 'DAY',
        title: 'Hasil Voting Siang',
        description: `${condemnedPlayer.name} tereliminasi berdasarkan hasil voting.`,
      });

      room.deathHistory.push({
        id: 'dh_' + Date.now(),
        cycle: room.cycle,
        phase: 'Siang',
        playerId: condemnedPlayer.id,
        playerName: condemnedPlayer.name,
        playerRole: condemnedPlayer.role,
        reason: 'Voting Eliminasi Siang',
        saved: false,
        timestamp: Date.now(),
      });

      if (condemnedPlayer.role === 'hunter') {
        room.stage = 'HUNTER_REVENGE';
        room.hunterRevengePlayerId = condemnedPlayer.id;
        room.updatedAt = Date.now();
        return res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
      }
    }
  } else {
    room.dayVotes.lynchedPlayerId = undefined;
    room.logs.push({
      id: 'log_' + Date.now(),
      timestamp: Date.now(),
      cycle: room.cycle,
      phase: 'DAY',
      title: 'Hasil Voting Siang',
      description: 'Tidak ada pemain yang tereliminasi (suara seri atau mayoritas memilih lewati).',
    });

    room.deathHistory.push({
      id: 'dh_' + Date.now(),
      cycle: room.cycle,
      phase: 'Siang',
      playerName: 'Tidak ada eliminasi',
      reason: 'Hasil voting seri atau mayoritas memilih lewati',
      saved: false,
      timestamp: Date.now(),
    });
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
      id: 'log_' + Date.now(),
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
    id: 'log_' + Date.now(),
    timestamp: Date.now(),
    cycle: 0,
    phase: 'NIGHT',
    title: 'Room Direset',
    description: 'Permainan kembali ke lobby.',
  });

  room.updatedAt = Date.now();
  res.json({ room: sanitizeRoomForPlayer(room, requesterId) });
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
