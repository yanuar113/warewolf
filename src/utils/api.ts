import { GameRoom, RoleId } from '../types/game';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('werewolf_offline_sync') 
  : null;

export function cleanRoomCode(code: string): string {
  return (code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
}

export function getStoredPlayerId(explicitPlayerId?: string): string {
  if (explicitPlayerId && explicitPlayerId.trim()) {
    return explicitPlayerId.trim();
  }
  if (typeof window !== 'undefined') {
    const fromSession = sessionStorage.getItem('werewolf_player_id');
    if (fromSession && fromSession.trim()) return fromSession.trim();
    const fromLocal = localStorage.getItem('werewolf_player_id');
    if (fromLocal && fromLocal.trim()) return fromLocal.trim();
  }
  return '';
}

function getAuthHeaders(explicitPlayerId?: string): Record<string, string> {
  const playerId = getStoredPlayerId(explicitPlayerId);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (playerId) {
    headers['x-player-id'] = playerId;
  }
  return headers;
}

async function safeFetchJson<T>(url: string, options: RequestInit, fallbackError: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    throw new Error('Koneksi terputus. Pastikan perangkat Anda terhubung ke internet.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 404) {
      throw new Error('Ruang permainan telah dihapus karena sudah lama tidak ada aktivitas atau telah dibubarkan oleh Moderator.');
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('Server sedang memuat ulang. Silakan coba kembali sesaat lagi.');
    }
    throw new Error(fallbackError || `Terjadi kendala server (Status ${res.status}).`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (parseErr) {
    throw new Error('Format data tidak valid. Silakan coba kembali.');
  }

  if (!res.ok) {
    throw new Error(data?.error || fallbackError);
  }

  return data as T;
}

export const api = {
  async createRoom(hostName: string): Promise<{ room: GameRoom; playerId: string }> {
    const data = await safeFetchJson<{ room: GameRoom; playerId: string }>(
      '/api/rooms',
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hostName }),
      },
      'Gagal membuat room permainan'
    );
    if (data.playerId && typeof window !== 'undefined') {
      sessionStorage.setItem('werewolf_player_id', data.playerId);
      sessionStorage.setItem('werewolf_room_code', data.room.code);
      localStorage.setItem('werewolf_player_id', data.playerId);
      localStorage.setItem('werewolf_room_code', data.room.code);
    }
    this.broadcastUpdate(data.room.code);
    return data;
  },

  async getRoom(rawCode: string, explicitPlayerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const playerId = getStoredPlayerId(explicitPlayerId);
    const url = playerId ? `/api/rooms/${code}?playerId=${encodeURIComponent(playerId)}` : `/api/rooms/${code}`;
    const data = await safeFetchJson<{ room: GameRoom }>(
      url,
      {
        headers: getAuthHeaders(playerId),
      },
      'Gagal memuat status room'
    );
    return data.room;
  },

  async joinRoom(rawCode: string, playerName: string, asModerator?: boolean): Promise<{ room: GameRoom; playerId: string }> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom; playerId: string }>(
      `/api/rooms/${code}/join`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ playerName, asModerator }),
      },
      'Gagal bergabung ke room'
    );
    if (data.playerId && typeof window !== 'undefined') {
      sessionStorage.setItem('werewolf_player_id', data.playerId);
      sessionStorage.setItem('werewolf_room_code', data.room.code);
      localStorage.setItem('werewolf_player_id', data.playerId);
      localStorage.setItem('werewolf_room_code', data.room.code);
    }
    this.broadcastUpdate(code);
    return data;
  },

  async updateRoleConfig(rawCode: string, roleConfig: Record<RoleId, number>, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/roles`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ roleConfig }),
      },
      'Gagal mengatur komposisi peran'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async setModerator(rawCode: string, targetPlayerId: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/set-moderator`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ targetPlayerId }),
      },
      'Gagal mengubah status moderator'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async startGame(rawCode: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/start-game`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
      },
      'Gagal memulai permainan'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async setNightStep(rawCode: string, nextStep: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/night-step`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ nextStep }),
      },
      'Gagal mengubah langkah malam'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async submitPlayerAction(rawCode: string, playerId: string, actionType: string, targetId?: string, targetIds?: string[]): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/action`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ playerId, actionType, targetId, targetIds }),
      },
      'Gagal mengirim aksi rahasia peran'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async resolveNight(rawCode: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/resolve-night`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
      },
      'Gagal memproses hasil malam'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async hunterRevenge(rawCode: string, targetId: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/hunter-revenge`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ targetId }),
      },
      'Gagal memproses tembakan Hunter'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async setDayStep(rawCode: string, nextStep: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/day-step`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ nextStep }),
      },
      'Gagal mengubah langkah siang'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async submitLynchVote(rawCode: string, voterId: string, targetId: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/vote-lynch`,
      {
        method: 'POST',
        headers: getAuthHeaders(voterId),
        body: JSON.stringify({ voterId, targetId }),
      },
      'Gagal mengirim voting siang'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async resolveDay(rawCode: string, manualTargetId?: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/resolve-day`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ manualTargetId }),
      },
      'Gagal menyelesaikan musyawarah siang'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async updateTimer(rawCode: string, seconds?: number, isRunning?: boolean, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/timer`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
        body: JSON.stringify({ seconds, isRunning }),
      },
      'Gagal memperbarui timer'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async resetGame(rawCode: string, playerId?: string): Promise<GameRoom> {
    const code = cleanRoomCode(rawCode);
    const data = await safeFetchJson<{ room: GameRoom }>(
      `/api/rooms/${code}/reset-game`,
      {
        method: 'POST',
        headers: getAuthHeaders(playerId),
      },
      'Gagal me-reset permainan'
    );
    this.broadcastUpdate(code);
    return data.room;
  },

  async deleteRoom(rawCode: string, playerId?: string): Promise<void> {
    const code = cleanRoomCode(rawCode);
    await safeFetchJson<{ success: boolean }>(
      `/api/rooms/${code}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(playerId),
      },
      'Gagal menghapus room'
    );
    this.broadcastUpdate(code);
  },

  broadcastUpdate(rawCode: string) {
    const code = cleanRoomCode(rawCode);
    if (channel) {
      try {
        channel.postMessage({ type: 'ROOM_UPDATED', code });
      } catch {
        // Channel fallback
      }
    }
  },

  onBroadcast(callback: (code: string) => void) {
    if (!channel) return () => {};
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ROOM_UPDATED' && e.data.code) {
        callback(e.data.code);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
    };
  },
};
