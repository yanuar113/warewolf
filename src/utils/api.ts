import { GameRoom, RoleId } from '../types/game';

const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('werewolf_offline_sync') 
  : null;

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

export const api = {
  async createRoom(hostName: string): Promise<{ room: GameRoom; playerId: string }> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ hostName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal membuat bilik');
    if (data.playerId && typeof window !== 'undefined') {
      sessionStorage.setItem('werewolf_player_id', data.playerId);
      sessionStorage.setItem('werewolf_room_code', data.room.code);
      localStorage.setItem('werewolf_player_id', data.playerId);
      localStorage.setItem('werewolf_room_code', data.room.code);
    }
    this.broadcastUpdate(data.room.code);
    return data;
  },

  async getRoom(code: string, explicitPlayerId?: string): Promise<GameRoom> {
    const playerId = getStoredPlayerId(explicitPlayerId);
    const url = playerId ? `/api/rooms/${code}?playerId=${encodeURIComponent(playerId)}` : `/api/rooms/${code}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(playerId),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memuat bilik');
    return data.room;
  },

  async joinRoom(code: string, playerName: string, asModerator?: boolean): Promise<{ room: GameRoom; playerId: string }> {
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ playerName, asModerator }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal bergabung ke bilik');
    if (data.playerId && typeof window !== 'undefined') {
      sessionStorage.setItem('werewolf_player_id', data.playerId);
      sessionStorage.setItem('werewolf_room_code', data.room.code);
      localStorage.setItem('werewolf_player_id', data.playerId);
      localStorage.setItem('werewolf_room_code', data.room.code);
    }
    this.broadcastUpdate(code);
    return data;
  },

  async updateRoleConfig(code: string, roleConfig: Record<RoleId, number>, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ roleConfig }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengatur peran');
    this.broadcastUpdate(code);
    return data.room;
  },

  async setModerator(code: string, targetPlayerId: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/set-moderator`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ targetPlayerId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah moderator');
    this.broadcastUpdate(code);
    return data.room;
  },

  async startGame(code: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/start-game`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal memulai permainan');
    this.broadcastUpdate(code);
    return data.room;
  },

  async setNightStep(code: string, nextStep: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/night-step`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ nextStep }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah langkah malam');
    this.broadcastUpdate(code);
    return data.room;
  },

  async submitPlayerAction(code: string, playerId: string, actionType: string, targetId?: string, targetIds?: string[]): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/action`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ playerId, actionType, targetId, targetIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim aksi rahasia');
    this.broadcastUpdate(code);
    return data.room;
  },

  async resolveNight(code: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/resolve-night`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyelesaikan malam');
    this.broadcastUpdate(code);
    return data.room;
  },

  async hunterRevenge(code: string, targetId: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/hunter-revenge`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ targetId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menembak pembalasan');
    this.broadcastUpdate(code);
    return data.room;
  },

  async setDayStep(code: string, nextStep: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/day-step`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ nextStep }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah langkah siang');
    this.broadcastUpdate(code);
    return data.room;
  },

  async submitLynchVote(code: string, voterId: string, targetId: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/vote-lynch`, {
      method: 'POST',
      headers: getAuthHeaders(voterId),
      body: JSON.stringify({ voterId, targetId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengirim voting');
    this.broadcastUpdate(code);
    return data.room;
  },

  async resolveDay(code: string, manualTargetId?: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/resolve-day`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ manualTargetId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyelesaikan musyawarah');
    this.broadcastUpdate(code);
    return data.room;
  },

  async updateTimer(code: string, seconds?: number, isRunning?: boolean, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/timer`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
      body: JSON.stringify({ seconds, isRunning }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal mengubah timer');
    this.broadcastUpdate(code);
    return data.room;
  },

  async resetGame(code: string, playerId?: string): Promise<GameRoom> {
    const res = await fetch(`/api/rooms/${code}/reset-game`, {
      method: 'POST',
      headers: getAuthHeaders(playerId),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal me-reset permainan');
    this.broadcastUpdate(code);
    return data.room;
  },

  async deleteRoom(code: string, playerId?: string): Promise<void> {
    const res = await fetch(`/api/rooms/${code}`, {
      method: 'DELETE',
      headers: getAuthHeaders(playerId),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menghapus room');
    this.broadcastUpdate(code);
  },

  broadcastUpdate(code: string) {
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
