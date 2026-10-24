import { useState } from 'react';
import { 
  Users, Crown, Play, Sparkles, Copy, Check, Plus, Minus, Info 
} from 'lucide-react';
import { GameRoom, RoleId } from '../types/game';
import { ROLE_DEFINITIONS, getRecommendedRoleConfig } from '../utils/roles';
import { sounds } from '../utils/audio';

interface Props {
  room: GameRoom;
  currentPlayerId: string;
  onUpdateRoleConfig: (config: Record<RoleId, number>) => Promise<void>;
  onSetModerator: (targetPlayerId: string) => Promise<void>;
  onStartGame: () => Promise<void>;
  onOpenRules: () => void;
}

export function Lobby({
  room,
  currentPlayerId,
  onUpdateRoleConfig,
  onSetModerator,
  onStartGame,
  onOpenRules,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyRecommended = async () => {
    const recommended = getRecommendedRoleConfig(room.players.length);
    await onUpdateRoleConfig(recommended);
  };

  const handleRoleCountChange = async (roleId: RoleId, delta: number) => {
    const newConfig = { ...room.roleConfig };
    const current = newConfig[roleId] || 0;
    const updated = Math.max(0, current + delta);
    newConfig[roleId] = updated;
    await onUpdateRoleConfig(newConfig);
  };

  const totalCardsConfigured = Object.values(room.roleConfig).reduce((a, b) => a + b, 0);
  const playerCount = room.players.length;
  const isMatch = totalCardsConfigured === playerCount;
  const canStart = playerCount >= 4;

  const handleStart = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    sounds.playNightFall();
    try {
      if (!isMatch) {
        const balanced = getRecommendedRoleConfig(playerCount);
        await onUpdateRoleConfig(balanced);
      }
      await onStartGame();
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Room Code Card */}
      <div className="p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl text-center space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Kode Room Permainan
        </span>
        <h2 className="text-4xl sm:text-6xl font-bold font-mono tracking-widest text-white">
          {room.code}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Bagikan kode room ini kepada pemain lain untuk bergabung melalui perangkat masing-masing.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={copyRoomCode}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Kode Tersalin' : 'Salin Kode'}</span>
          </button>
          <button
            onClick={onOpenRules}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            Lihat Ringkasan Aturan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Players List */}
        <div className="lg:col-span-5 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-sm text-slate-100">
                Daftar Pemain ({playerCount})
              </h3>
            </div>
            {playerCount < 4 && (
              <span className="text-xs text-amber-400">Minimal 4 pemain</span>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {room.players.map(p => {
              const isMe = p.id === currentPlayerId;
              const isMod = p.id === room.moderatorId;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                    isMod
                      ? 'bg-slate-950 border-indigo-700/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMod && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                    <span className="font-medium text-slate-200">
                      {p.name} {isMe ? '(Anda)' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMod ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                        Moderator
                      </span>
                    ) : (
                      <button
                        onClick={() => onSetModerator(p.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        Jadikan Moderator
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Moderator memandu alur babak dan memverifikasi hasil voting secara real-time.
            </span>
          </div>
        </div>

        {/* Right: Role Deck Config */}
        <div className="lg:col-span-7 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Konfigurasi Peran
              </h3>
              <div className="text-xs text-slate-400 mt-0.5">
                Jumlah Kartu: <strong className={isMatch ? 'text-emerald-400' : 'text-amber-400'}>{totalCardsConfigured}</strong> / {playerCount} Pemain
              </div>
            </div>

            <button
              onClick={handleApplyRecommended}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gunakan Rekomendasi Standar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(Object.keys(ROLE_DEFINITIONS) as RoleId[]).map(roleId => {
              const def = ROLE_DEFINITIONS[roleId];
              const count = room.roleConfig[roleId] || 0;
              const isWolf = def.team === 'werewolf';

              return (
                <div
                  key={roleId}
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    count > 0
                      ? isWolf
                        ? 'bg-slate-950 border-rose-900/40'
                        : 'bg-slate-950 border-slate-800'
                      : 'bg-slate-950 border-slate-900 opacity-50'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-semibold text-slate-200">{def.name}</div>
                    <div className="text-[10px] text-slate-500">{def.team === 'werewolf' ? 'Tim Werewolf' : 'Tim Warga'}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRoleCountChange(roleId, -1)}
                      disabled={count === 0}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 disabled:opacity-30 text-slate-200 flex items-center justify-center text-xs transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-sm text-slate-200">
                      {count}
                    </span>
                    <button
                      onClick={() => handleRoleCountChange(roleId, 1)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-90 text-slate-200 flex items-center justify-center text-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className={`w-full min-h-[50px] py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                canStart
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {playerCount < 4
                  ? `Menunggu Pemain (${playerCount}/4)`
                  : 'Mulai Permainan & Bagikan Peran'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
