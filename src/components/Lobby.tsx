import { useState } from 'react';
import { 
  Users, Crown, Play, Sparkles, Copy, Check, Plus, Minus, Info, Link, Share2, Trash2 
} from 'lucide-react';
import { GameRoom, RoleId } from '../types/game';
import { ROLE_DEFINITIONS, getRecommendedRoleConfig } from '../utils/roles';
import { sounds } from '../utils/audio';
import { copyToClipboard } from '../utils/clipboard';

interface Props {
  room: GameRoom;
  currentPlayerId: string;
  onUpdateRoleConfig: (config: Record<RoleId, number>) => Promise<void>;
  onSetModerator: (targetPlayerId: string) => Promise<void>;
  onStartGame: () => Promise<void>;
  onOpenRules: () => void;
  onDeleteRoom?: () => void;
}

export function Lobby({
  room,
  currentPlayerId,
  onUpdateRoleConfig,
  onSetModerator,
  onStartGame,
  onOpenRules,
  onDeleteRoom,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [starting, setStarting] = useState(false);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?room=${room.code}`
    : `?room=${room.code}`;

  const copyRoomCode = async () => {
    await copyToClipboard(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    if (!inviteUrl) return;
    await copyToClipboard(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Undangan Permainan Werewolf',
          text: `Bergabunglah ke sesi permainan Werewolf pada Ruang #${room.code}:`,
          url: inviteUrl,
        });
        return;
      } catch {
        // Fall back to copy
      }
    }
    await copyInviteLink();
  };

  const playingPlayers = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId);
  const playerCount = playingPlayers.length;

  const handleApplyRecommended = async () => {
    const recommended = getRecommendedRoleConfig(playerCount);
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

  const isHost = currentPlayerId === room.hostId;
  const isModerator = currentPlayerId === room.moderatorId;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Room Code Card */}
      <div className="p-4 sm:p-6 md:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl text-center space-y-4">
        <div>
          <span className="text-xs font-semibold text-slate-400">
            Kode Ruang Permainan
          </span>
          <h2 className="text-4xl sm:text-6xl font-bold font-mono tracking-wider text-white mt-1">
            {room.code}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2">
            Bagikan tautan undangan atau kode ruang ini kepada rekan bermain untuk bergabung ke ruang tunggu.
          </p>
        </div>

        {/* Direct Invitation Link Bar */}
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 p-1.5 bg-slate-950 border border-slate-700/80 rounded-2xl shadow-inner">
            <div className="pl-2.5 text-indigo-400 shrink-0">
              <Link className="w-4 h-4" />
            </div>
            <input
              type="text"
              readOnly
              value={inviteUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-transparent border-0 text-xs text-slate-200 font-mono focus:outline-none select-all truncate px-1 py-1"
            />
            <button
              onClick={copyInviteLink}
              title="Salin Link Undangan Lengkap"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link'}</span>
            </button>
          </div>
          {copiedLink && (
            <p className="text-[11px] text-emerald-400 font-medium mt-1.5 animate-in fade-in">
              Link undangan berhasil disalin! Teman Anda dapat mengkliknya untuk langsung bergabung.
            </p>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Bagikan Undangan</span>
          </button>

          <button
            onClick={copyRoomCode}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Kode Tersalin' : 'Salin Kode Saja'}</span>
          </button>

          <button
            onClick={onOpenRules}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            Lihat Ringkasan Aturan
          </button>

          {(isHost || isModerator) && onDeleteRoom && (
            <button
              onClick={onDeleteRoom}
              className="px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Bubarkan & Hapus Room</span>
            </button>
          )}
        </div>

        {/* Active Session Notice */}
        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <Info className="w-3.5 h-3.5 text-emerald-400/80 shrink-0" />
          <span>Sesi Ruang Aktif: Sesi room akan terus terjaga aktif secara otomatis selama ada pemain yang terhubung.</span>
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

          {/* Moderator Info Card */}
          {(() => {
            const modPlayer = room.players.find(p => p.id === room.moderatorId || p.isModerator);
            if (!modPlayer) return null;
            return (
              <div className="p-3 bg-indigo-950/40 border border-indigo-700/60 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-100">{modPlayer.name} {modPlayer.id === currentPlayerId ? '(Anda)' : ''}</div>
                    <div className="text-[10px] text-indigo-300">Pemandu Permainan (Tidak ikut bermain/divote)</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800">
                  Moderator
                </span>
              </div>
            );
          })()}

          {/* Playing Players List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {playingPlayers.length === 0 ? (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 text-center">
                Belum ada pemain yang bergabung.
              </div>
            ) : (
              playingPlayers.map(p => {
                const isMe = p.id === currentPlayerId;

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border bg-slate-950 border-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-200">
                        {p.name} {isMe ? '(Anda)' : ''}
                      </span>
                    </div>

                    {isHost && (
                      <button
                        onClick={() => onSetModerator(p.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 transition-colors"
                      >
                        Jadikan Moderator
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              {isHost
                ? 'Sebagai pembuat room (Host), Anda berhak memilih siapa yang menjadi Moderator.'
                : 'Moderator memandu alur permainan dan memverifikasi hasil aksi secara real-time.'}
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

            {isModerator ? (
              <button
                onClick={handleApplyRecommended}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gunakan Rekomendasi Standar</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                Diatur oleh Moderator
              </span>
            )}
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
                    {isModerator ? (
                      <>
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
                      </>
                    ) : (
                      <span className="px-3 py-1 font-mono font-bold text-sm text-slate-300 bg-slate-900 rounded-lg border border-slate-800">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            {isModerator ? (
              <button
                onClick={handleStart}
                disabled={!canStart || starting}
                className={`w-full min-h-[50px] py-3.5 px-6 rounded-xl font-semibold text-xs sm:text-sm tracking-normal flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                  canStart
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {playerCount < 4
                    ? `Menunggu Pemain Bergabung (${playerCount}/4 minimal)`
                    : 'Mulai Permainan & Bagikan Peran'}
                </span>
              </button>
            ) : (
              <div className="w-full py-3.5 px-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                {playerCount < 4
                  ? `Menunggu pemain bergabung (${playerCount}/4 minimal)...`
                  : 'Menunggu Moderator memulai permainan...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
