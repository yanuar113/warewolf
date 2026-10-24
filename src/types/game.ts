export type RoleId = 
  | 'werewolf' 
  | 'villager' 
  | 'seer' 
  | 'doctor' 
  | 'hunter' 
  | 'witch' 
  | 'mayor';

export type Team = 'werewolf' | 'village';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  indonesianName: string;
  team: Team;
  description: string;
  detailedRules: string;
  image: string;
  wakeOrder: number; // Order in night phase (0 = no wake)
  hasNightAction: boolean;
  minPlayersRequired?: number;
}

export type PlayerStatus = 'alive' | 'eliminated';

export interface Player {
  id: string;
  name: string;
  role?: RoleId;
  status: PlayerStatus;
  isModerator: boolean;
  joinedAt: number;
  eliminatedInPhase?: string;
  eliminatedReason?: string;
  inspectedBySeer?: boolean;
  protectedByDoctor?: boolean;
}

export type GameStage = 
  | 'LOBBY' 
  | 'NIGHT' 
  | 'DAY' 
  | 'HUNTER_REVENGE'
  | 'GAME_OVER';

export type NightStep = 
  | 'NIGHT_START' 
  | 'SEER_STEP' 
  | 'DOCTOR_STEP' 
  | 'WEREWOLF_STEP' 
  | 'WITCH_STEP' 
  | 'NIGHT_RESOLVE';

export type DayStep = 
  | 'DAY_ANNOUNCE' 
  | 'DAY_DISCUSS' 
  | 'DAY_VOTE' 
  | 'DAY_RESOLVE';

export interface NightActions {
  seerTargetId?: string;
  doctorTargetId?: string;
  werewolfVotes: Record<string, string>; // werewolfPlayerId -> victimPlayerId
  werewolfTargetId?: string; // Consensus or majority victim
  witchHealUsed?: boolean;
  witchHealTargetId?: string;
  witchPoisonTargetId?: string;
}

export interface DayVotes {
  votes: Record<string, string>; // voterPlayerId -> targetPlayerId
  lynchedPlayerId?: string;
}

export interface GameEventLog {
  id: string;
  timestamp: number;
  cycle: number;
  phase: 'NIGHT' | 'DAY';
  title: string;
  description: string;
  isSecret?: boolean; // Only visible to moderator or revealed at end
}

export interface DeathRecord {
  id: string;
  cycle: number;
  phase: 'Malam' | 'Siang';
  playerId?: string;
  playerName: string;
  playerRole?: RoleId;
  reason: string;
  saved?: boolean;
  timestamp: number;
}

export interface GameRoom {
  code: string;
  hostId: string;
  moderatorId: string;
  stage: GameStage;
  cycle: number; // 1, 2, 3...
  nightStep: NightStep;
  dayStep: DayStep;
  players: Player[];
  roleConfig: Record<RoleId, number>;
  nightActions: NightActions;
  dayVotes: DayVotes;
  lastNightKilledId?: string;
  lastNightSaved: boolean;
  hunterRevengePlayerId?: string;
  winner?: Team;
  logs: GameEventLog[];
  deathHistory: DeathRecord[];
  discussionTimerSeconds: number;
  timerRunning: boolean;
  updatedAt: number;
}
