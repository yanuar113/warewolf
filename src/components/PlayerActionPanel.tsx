import { useState } from 'react';
import { 
  Skull, Shield, Eye, Moon, Sun, Check, Users, Crosshair, 
  Lock, AlertTriangle, Loader2, X, Heart, Sparkles, Wand2, ShieldAlert
} from 'lucide-react';
import { GameRoom, Player } from '../types/game';

interface Props {
  room: GameRoom;
  currentPlayer: Player;
  onPerformAction: (actionType: string, targetId?: string, targetIds?: string[]) => Promise<void>;
  onVoteLynch: (targetId: string) => Promise<void>;
  onHunterShoot?: (targetId: string) => Promise<void>;
}

interface PendingAction {
  actionType: 
    | 'werewolf_vote' 
    | 'seer_inspect' 
    | 'doctor_protect' 
    | 'bodyguard_protect' 
    | 'sorceress_inspect' 
    | 'cupid_link' 
    | 'witch_heal' 
    | 'witch_poison' 
    | 'hunter_shoot' 
    | 'day_lynch';
  targetId?: string;
  targetIds?: string[];
  targetName: string;
  roleLabel: string;
  actionDescription: string;
  colorScheme: 'rose' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'cyan';
}

export function PlayerActionPanel({
  room,
  currentPlayer,
  onPerformAction,
  onVoteLynch,
  onHunterShoot,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [selectedCupidIds, setSelectedCupidIds] = useState<string[]>([]);

  if (currentPlayer.isModerator || currentPlayer.id === room.moderatorId) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Aksi & Voting Khusus Pemain</p>
        <p>Sebagai Moderator, Anda memandu jalannya permainan melalui <strong>Panel Moderator</strong>.</p>
      </div>
    );
  }

  const isAlive = currentPlayer.status === 'alive';
  const alivePlayers = room.players.filter(p => !p.isModerator && p.id !== room.moderatorId && p.status === 'alive');
  const targetablePlayers = alivePlayers.filter(p => p.id !== currentPlayer.id);

  const werewolfPack = room.players.filter(
    p => !p.isModerator && p.id !== room.moderatorId && p.role === 'werewolf' && p.id !== currentPlayer.id
  );

  const myWerewolfVote = room.nightActions.werewolfVotes[currentPlayer.id];
  const myLynchVote = room.dayVotes.votes[currentPlayer.id];

  // Hitung akumulasi perolehan suara voting siang per target
  const voteCounts: Record<string, number> = {};
  let totalDayVotes = 0;
  if (room.dayVotes?.votes) {
    Object.entries(room.dayVotes.votes).forEach(([voterId, targetId]) => {
      if (!targetId) return;
      const voter = room.players.find(p => p.id === voterId);
      if (voter?.foolLostVote) return; // Fool tanpa hak suara tidak dihitung
      const weight = voter?.role === 'mayor' ? 2 : 1;
      voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
      totalDayVotes += 1;
    });
  }

  // Active Seer result from server (respects Lycan)
  const activeSeerResult = room.nightActions.seerInspectionResult;

  // Active Sorceress result from server
  const activeSorceressResult = room.nightActions.sorceressInspectionResult;

  // Locked states
  const isWerewolfLocked = Boolean(myWerewolfVote);
  const werewolfTargetPlayer = isWerewolfLocked
    ? room.players.find(p => p.id === myWerewolfVote)
    : null;

  const isSeerLocked = Boolean(room.nightActions.seerTargetId);
  const isDoctorLocked = Boolean(room.nightActions.doctorTargetId);
  const doctorTargetPlayer = isDoctorLocked
    ? room.players.find(p => p.id === room.nightActions.doctorTargetId)
    : null;

  const isBodyguardLocked = Boolean(room.nightActions.bodyguardTargetId);
  const bodyguardTargetPlayer = isBodyguardLocked
    ? room.players.find(p => p.id === room.nightActions.bodyguardTargetId)
    : null;

  const isSorceressLocked = Boolean(room.nightActions.sorceressTargetId);
  const isCupidLocked = Boolean(room.cupidLovers && room.cupidLovers.length === 2);

  const isLynchLocked = Boolean(myLynchVote);
  const lynchTargetPlayer = isLynchLocked && myLynchVote !== 'skip'
    ? room.players.find(p => p.id === myLynchVote)
    : null;

  // Execute confirmed action
  const handleConfirmAction = async () => {
    if (!pendingAction || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (pendingAction.actionType === 'werewolf_vote') {
        await onPerformAction('werewolf_vote', pendingAction.targetId);
      } else if (pendingAction.actionType === 'seer_inspect') {
        await onPerformAction('seer_inspect', pendingAction.targetId);
      } else if (pendingAction.actionType === 'doctor_protect') {
        await onPerformAction('doctor_protect', pendingAction.targetId);
      } else if (pendingAction.actionType === 'bodyguard_protect') {
        await onPerformAction('bodyguard_protect', pendingAction.targetId);
      } else if (pendingAction.actionType === 'sorceress_inspect') {
        await onPerformAction('sorceress_inspect', pendingAction.targetId);
      } else if (pendingAction.actionType === 'cupid_link') {
        await onPerformAction('cupid_link', undefined, pendingAction.targetIds);
        setSelectedCupidIds([]);
      } else if (pendingAction.actionType === 'witch_heal') {
        await onPerformAction('witch_heal', pendingAction.targetId);
      } else if (pendingAction.actionType === 'witch_poison') {
        await onPerformAction('witch_poison', pendingAction.targetId);
      } else if (pendingAction.actionType === 'day_lynch') {
        await onVoteLynch(pendingAction.targetId || 'skip');
      } else if (pendingAction.actionType === 'hunter_shoot' && onHunterShoot && pendingAction.targetId) {
        await onHunterShoot(pendingAction.targetId);
      }
      setPendingAction(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim pilihan aksi');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to render the Confirmation Modal
  function renderConfirmationModal() {
    if (!pendingAction) return null;

    const colorClasses = {
      rose: {
        border: 'border-rose-600',
        badge: 'bg-rose-950/80 text-rose-300 border-rose-800',
        btn: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white',
        highlight: 'text-rose-400',
      },
      indigo: {
        border: 'border-indigo-600',
        badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800',
        btn: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white',
        highlight: 'text-indigo-400',
      },
      emerald: {
        border: 'border-emerald-600',
        badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
        btn: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white',
        highlight: 'text-emerald-400',
      },
      amber: {
        border: 'border-amber-600',
        badge: 'bg-amber-950/80 text-amber-300 border-amber-800',
        btn: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold',
        highlight: 'text-amber-400',
      },
      purple: {
        border: 'border-purple-600',
        badge: 'bg-purple-950/80 text-purple-300 border-purple-800',
        btn: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white',
        highlight: 'text-purple-400',
      },
      cyan: {
        border: 'border-cyan-600',
        badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
        btn: 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white',
        highlight: 'text-cyan-400',
      },
    }[pendingAction.colorScheme];

    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div 
          className={`w-full max-w-sm bg-slate-900 border ${colorClasses.border} rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Lock className={`w-4 h-4 ${colorClasses.highlight}`} />
              <h3 className="font-bold text-sm text-slate-100">Konfirmasi Pilihan</h3>
            </div>
            <button
              onClick={() => {
                if (!submitting) setPendingAction(null);
              }}
              disabled={submitting}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Target Info */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Pilihan Aksi:
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${colorClasses.badge}`}>
                {pendingAction.roleLabel}
              </span>
            </div>

            <div className="text-base font-bold text-white">
              {pendingAction.targetName}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {pendingAction.actionDescription}
            </p>
          </div>

          {/* Immutability warning */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <strong>Pilihan hanya 1 kali:</strong> Setelah dikonfirmasi, pilihan Anda akan terkunci dan tidak dapat diubah kembali.
            </span>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => setPendingAction(null)}
              disabled={submitting}
              className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-colors"
            >
              Batal
            </button>

            <button
              onClick={handleConfirmAction}
              disabled={submitting}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${colorClasses.btn}`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunci...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Konfirmasi & Kunci</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. HUNTER REVENGE ACTION
  if (room.stage === 'HUNTER_REVENGE' && room.hunterRevengePlayerId === currentPlayer.id) {
    return (
      <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-amber-600 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center gap-2 text-amber-300">
          <Crosshair className="w-5 h-5" />
          <h4 className="font-bold text-sm">Aksi Terakhir Hunter</h4>
        </div>
        <p className="text-xs text-slate-300">
          Pilih satu pemain hidup untuk dieliminasi sebagai aksi balas dendam terakhir:
        </p>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          {alivePlayers.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setErrorMessage(null);
                setPendingAction({
                  actionType: 'hunter_shoot',
                  targetId: p.id,
                  targetName: p.name,
                  roleLabel: 'Hunter (Pemburu)',
                  actionDescription: 'Mengeliminasi pemain ini sebagai tembakan balas dendam terakhir.',
                  colorScheme: 'amber',
                });
              }}
              disabled={submitting}
              className="w-full min-h-[44px] py-2.5 px-3.5 text-left bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border border-slate-700 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-between transition-colors"
            >
              <span>{p.name}</span>
              <Crosshair className="w-4 h-4 text-amber-400" />
            </button>
          ))}
        </div>

        {renderConfirmationModal()}
      </div>
    );
  }

  // 2. ELIMINATED PLAYER
  if (!isAlive) {
    if (room.stage === 'DAY') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-sm text-slate-100">Voting Siang (Penonton)</h4>
            </div>
            <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-950 border border-slate-800 text-amber-400 font-semibold">
              {totalDayVotes} / {alivePlayers.length} Suara
            </span>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
            Anda telah gugur dan sedang mengamati perolehan suara voting musyawarah siang secara langsung.
          </div>

          <div className="space-y-2">
            {alivePlayers.map(target => {
              const targetVotes = voteCounts[target.id] || 0;
              return (
                <div
                  key={target.id}
                  className="w-full min-h-[44px] py-2.5 px-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between text-slate-300"
                >
                  <span className="font-medium">{target.name}</span>
                  {targetVotes > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Users className="w-3 h-3" />
                      <span>{targetVotes} Suara</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">0 Suara</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
        <Moon className="w-5 h-5 text-slate-500 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-300">Status: Nonaktif</h4>
        <p className="text-xs text-slate-400">
          Anda sedang mengamati jalannya permainan.
        </p>
      </div>
    );
  }

  // CUPID LOVERS STATUS BANNER (shown to lovers)
  const renderLoversBanner = () => {
    if (currentPlayer.isLover && currentPlayer.loverPartnerName) {
      return (
        <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-center gap-2.5 text-xs text-rose-200 shadow-sm mb-3">
          <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" />
          <div className="leading-snug">
            <span className="font-bold block text-rose-100">Ikatan Asmara Cupid</span>
            Pasangan takdir Anda adalah <strong className="text-white underline">{currentPlayer.loverPartnerName}</strong>. Jika salah satu gugur, pasangannya ikut gugur!
          </div>
        </div>
      );
    }
    return null;
  };

  // 3. NIGHT ACTIONS
  if (room.stage === 'NIGHT') {

    // 3.1 WEREWOLF
    if (currentPlayer.role === 'werewolf') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-rose-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-400" />
              <h4 className="font-bold text-sm text-slate-100">Target Serangan Werewolf</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {werewolfPack.length > 0 && (
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Rekan Werewolf:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {werewolfPack.map(w => (
                  <span
                    key={w.id}
                    className="text-xs px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-900/60 rounded"
                  >
                    {w.name} {w.status === 'eliminated' ? '(Tereliminasi)' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isWerewolfLocked ? (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-200 block">
                  Pilihan Terkunci: {werewolfTargetPlayer?.name || 'Target Eliminasi'}
                </span>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Target suara Werewolf Anda telah dikonfirmasi dan tidak dapat diubah lagi malam ini.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Pilih target eliminasi malam ini (konfirmasi diperlukan):
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            {alivePlayers
              .filter(p => p.role !== 'werewolf')
              .map(target => {
                const isSelected = myWerewolfVote === target.id;
                const packVotesForThis = Object.entries(room.nightActions.werewolfVotes).filter(
                  ([_, tid]) => tid === target.id
                ).length;

                return (
                  <button
                    key={target.id}
                    onClick={() => {
                      if (isWerewolfLocked) return;
                      setErrorMessage(null);
                      setPendingAction({
                        actionType: 'werewolf_vote',
                        targetId: target.id,
                        targetName: target.name,
                        roleLabel: 'Werewolf',
                        actionDescription: 'Menyerang pemain ini bersama kawanan Werewolf malam ini.',
                        colorScheme: 'rose',
                      });
                    }}
                    disabled={isWerewolfLocked || submitting}
                    className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-rose-950 border-rose-600 text-white font-semibold shadow-sm'
                        : isWerewolfLocked
                        ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                        : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{target.name}</span>
                    <div className="flex items-center gap-2">
                      {packVotesForThis > 0 && (
                        <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          {packVotesForThis} suara
                        </span>
                      )}
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-rose-400 text-[11px] font-semibold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Terkunci</span>
                        </div>
                      ) : (
                        !isWerewolfLocked && <span className="text-[10px] text-slate-500">Pilih</span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.2 SEER (OR PROMOTED APPRENTICE SEER)
    const isSeerRole = currentPlayer.role === 'seer';
    const isPromotedApprentice = currentPlayer.role === 'apprentice_seer' && !!room.apprenticeSeerPromoted;

    if (isSeerRole || isPromotedApprentice) {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-indigo-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-slate-100">
                {isSeerRole ? 'Pemeriksaan Peran (Seer)' : 'Pewarisan Seer (Apprentice)'}
              </h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {activeSeerResult && (
            <div
              className={`p-3.5 rounded-xl border text-center animate-in fade-in duration-150 ${
                activeSeerResult.perceivedRole === 'werewolf'
                  ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-85">
                Hasil Penerawangan Gaib
              </div>
              <div className="text-sm font-bold mt-1">
                {activeSeerResult.targetName} terdeteksi sebagai{' '}
                <span className={activeSeerResult.perceivedRole === 'werewolf' ? 'text-rose-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                  {activeSeerResult.perceivedRole === 'werewolf' ? 'WEREWOLF' : 'WARGA (BUKAN WEREWOLF)'}
                </span>
              </div>
            </div>
          )}

          {isSeerLocked ? (
            <div className="p-3 bg-indigo-950/40 border border-indigo-800/80 rounded-xl flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-200 block">Kemampuan Terkunci</span>
                <p className="text-[11px] text-indigo-300/80 mt-0.5">
                  Pemeriksaan peran telah selesai untuk malam ini dan tidak dapat diubah kembali.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Pilih satu pemain untuk diterawang perannya malam ini:
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            {targetablePlayers.map(target => {
              const isSelected = room.nightActions.seerTargetId === target.id;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    if (isSeerLocked) return;
                    setErrorMessage(null);
                    setPendingAction({
                      actionType: 'seer_inspect',
                      targetId: target.id,
                      targetName: target.name,
                      roleLabel: isSeerRole ? 'Seer (Peramal)' : 'Apprentice Seer',
                      actionDescription: 'Menerawang peran rahasia pemain ini (apakah Werewolf atau Warga).',
                      colorScheme: 'indigo',
                    });
                  }}
                  disabled={isSeerLocked || submitting}
                  className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-950 border-indigo-500 text-white font-semibold'
                      : isSeerLocked
                      ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{target.name}</span>
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-indigo-300 text-[11px] font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Diperiksa</span>
                    </div>
                  ) : (
                    !isSeerLocked && <span className="text-[10px] text-slate-500">Pilih</span>
                  )}
                </button>
              );
            })}
          </div>

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.3 DOCTOR
    if (currentPlayer.role === 'doctor') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-emerald-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-slate-100">Perlindungan Medis (Doctor)</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {isDoctorLocked ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-200 block">
                  Perlindungan Terkunci: {doctorTargetPlayer?.name || 'Target'} {doctorTargetPlayer?.id === currentPlayer.id ? '(Diri Sendiri)' : ''}
                </span>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Kemampuan Doctor telah digunakan untuk malam ini dan tidak dapat diubah kembali.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Pilih satu pemain untuk dilindungi malam ini (termasuk diri sendiri):
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            {alivePlayers.map(target => {
              const isSelected = room.nightActions.doctorTargetId === target.id;
              const isMe = target.id === currentPlayer.id;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    if (isDoctorLocked) return;
                    setErrorMessage(null);
                    setPendingAction({
                      actionType: 'doctor_protect',
                      targetId: target.id,
                      targetName: target.name + (isMe ? ' (Diri Sendiri)' : ''),
                      roleLabel: 'Doctor (Dokter)',
                      actionDescription: 'Melindungi pemain ini dari potensi eliminasi Werewolf malam ini.',
                      colorScheme: 'emerald',
                    });
                  }}
                  disabled={isDoctorLocked || submitting}
                  className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950 border-emerald-500 text-white font-semibold'
                      : isDoctorLocked
                      ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{target.name} {isMe ? '(Diri Sendiri)' : ''}</span>
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-emerald-300 text-[11px] font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Dilindungi</span>
                    </div>
                  ) : (
                    !isDoctorLocked && <span className="text-[10px] text-slate-500">Pilih</span>
                  )}
                </button>
              );
            })}
          </div>

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.4 BODYGUARD
    if (currentPlayer.role === 'bodyguard') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-cyan-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-sm text-slate-100">Pengawalan Ketat (Bodyguard)</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {isBodyguardLocked ? (
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-xl flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-cyan-200 block">
                  Pengawalan Terkunci: {bodyguardTargetPlayer?.name || 'Target'}
                </span>
                <p className="text-[11px] text-cyan-300/80 mt-0.5">
                  Target pengawalan Bodyguard telah dikonfirmasi dan aktif untuk malam ini.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Pilih satu pemain hidup untuk dikawal dan dilindungi dari Werewolf malam ini:
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            {alivePlayers.map(target => {
              const isSelected = room.nightActions.bodyguardTargetId === target.id;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    if (isBodyguardLocked) return;
                    setErrorMessage(null);
                    setPendingAction({
                      actionType: 'bodyguard_protect',
                      targetId: target.id,
                      targetName: target.name,
                      roleLabel: 'Bodyguard (Pengawal)',
                      actionDescription: 'Mengawal pemain ini dari potensi serangan Werewolf malam ini.',
                      colorScheme: 'cyan',
                    });
                  }}
                  disabled={isBodyguardLocked || submitting}
                  className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-950 border-cyan-500 text-white font-semibold'
                      : isBodyguardLocked
                      ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{target.name}</span>
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-cyan-300 text-[11px] font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Dikawal</span>
                    </div>
                  ) : (
                    !isBodyguardLocked && <span className="text-[10px] text-slate-500">Pilih</span>
                  )}
                </button>
              );
            })}
          </div>

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.5 SORCERESS (Penyihir Tim Werewolf)
    if (currentPlayer.role === 'sorceress') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-purple-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <h4 className="font-bold text-sm text-slate-100">Penerawangan Sorceress</h4>
            </div>
            <span className="text-xs text-purple-400 font-semibold">Tim Werewolf</span>
          </div>

          {activeSorceressResult && (
            <div
              className={`p-3.5 rounded-xl border text-center animate-in fade-in duration-150 ${
                activeSorceressResult.isSeer
                  ? 'bg-purple-950/80 border-purple-600 text-purple-200'
                  : 'bg-slate-950 border-slate-700 text-slate-300'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-85">
                Hasil Penglihatan Sorceress
              </div>
              <div className="text-sm font-bold mt-1">
                {activeSorceressResult.targetName} adalah{' '}
                <span className={activeSorceressResult.isSeer ? 'text-purple-300 font-extrabold' : 'text-slate-400'}>
                  {activeSorceressResult.isSeer ? 'SEER (PERAMAL) DESA!' : 'BUKAN SEER'}
                </span>
              </div>
            </div>
          )}

          {isSorceressLocked ? (
            <div className="p-3 bg-purple-950/40 border border-purple-800/80 rounded-xl flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-200 block">Penerawangan Terkunci</span>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  Aksi Anda telah tercatat untuk malam ini.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Pilih satu pemain untuk mencari tahu apakah pemain tersebut adalah Seer:
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            {targetablePlayers.map(target => {
              const isSelected = room.nightActions.sorceressTargetId === target.id;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    if (isSorceressLocked) return;
                    setErrorMessage(null);
                    setPendingAction({
                      actionType: 'sorceress_inspect',
                      targetId: target.id,
                      targetName: target.name,
                      roleLabel: 'Sorceress',
                      actionDescription: 'Menerawang apakah pemain ini memegang peran Seer (Peramal).',
                      colorScheme: 'purple',
                    });
                  }}
                  disabled={isSorceressLocked || submitting}
                  className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-purple-950 border-purple-500 text-white font-semibold'
                      : isSorceressLocked
                      ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{target.name}</span>
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-purple-300 text-[11px] font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Diperiksa</span>
                    </div>
                  ) : (
                    !isSorceressLocked && <span className="text-[10px] text-slate-500">Pilih</span>
                  )}
                </button>
              );
            })}
          </div>

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.6 CUPID (Dewa Asmara)
    if (currentPlayer.role === 'cupid') {
      const isNightOne = room.cycle === 1;

      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-rose-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
              <h4 className="font-bold text-sm text-slate-100">Ikatan Asmara (Cupid)</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {!isNightOne || isCupidLocked ? (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-center">
              <Sparkles className="w-5 h-5 text-amber-400 mx-auto" />
              <div className="text-xs font-semibold text-slate-200">
                Takdir Asmara Telah Terjalin
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Kemampuan Cupid hanya aktif di malam pertama. Pasangan asmara telah ditentukan dan terikat takdir hingga akhir permainan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Pilih tepat <strong>2 pemain</strong> untuk diikat sebagai Pasangan Kekasih:
              </p>

              {errorMessage && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2">
                {alivePlayers.map(target => {
                  const isChecked = selectedCupidIds.includes(target.id);
                  return (
                    <button
                      key={target.id}
                      onClick={() => {
                        setErrorMessage(null);
                        if (isChecked) {
                          setSelectedCupidIds(selectedCupidIds.filter(id => id !== target.id));
                        } else {
                          if (selectedCupidIds.length >= 2) {
                            setSelectedCupidIds([selectedCupidIds[1], target.id]);
                          } else {
                            setSelectedCupidIds([...selectedCupidIds, target.id]);
                          }
                        }
                      }}
                      className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-rose-950 border-rose-500 text-white font-semibold'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{target.name} {target.id === currentPlayer.id ? '(Diri Sendiri)' : ''}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded border border-slate-700">
                        {isChecked ? 'Terpilih' : 'Pilih'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedCupidIds.length === 2 && (
                <button
                  onClick={() => {
                    const p1 = room.players.find(p => p.id === selectedCupidIds[0]);
                    const p2 = room.players.find(p => p.id === selectedCupidIds[1]);
                    setPendingAction({
                      actionType: 'cupid_link',
                      targetIds: selectedCupidIds,
                      targetName: `${p1?.name} & ${p2?.name}`,
                      roleLabel: 'Cupid (Dewa Asmara)',
                      actionDescription: 'Mengikat kedua pemain ini sebagai pasangan kekasih sehidup semati.',
                      colorScheme: 'rose',
                    });
                  }}
                  className="w-full min-h-[44px] py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>Kunci Pasangan Kekasih</span>
                </button>
              )}
            </div>
          )}

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.7 WITCH (Penyihir Alkimia)
    if (currentPlayer.role === 'witch') {
      const healUsed = !!room.nightActions.witchHealUsed;
      const poisonUsed = !!room.nightActions.witchPoisonUsed;

      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-indigo-900/60 rounded-2xl shadow-lg space-y-4">
          {renderLoversBanner()}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-slate-100">Alkimia Ramuan (Witch)</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2.5 rounded-xl border text-center ${healUsed ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'}`}>
              <span className="font-semibold block">Ramuan Selamat</span>
              <span className="text-[10px]">{healUsed ? 'Sudah Terpakai' : 'Tersedia (1x)'}</span>
            </div>
            <div className={`p-2.5 rounded-xl border text-center ${poisonUsed ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-rose-950/40 border-rose-800 text-rose-300'}`}>
              <span className="font-semibold block">Ramuan Racun</span>
              <span className="text-[10px]">{poisonUsed ? 'Sudah Terpakai' : 'Tersedia (1x)'}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Heal action */}
          {!healUsed && room.nightActions.werewolfTargetId && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold text-emerald-300">Gunakan Ramuan Penyelamat:</span>
              <p className="text-xs text-slate-300">
                Pemain target Werewolf malam ini dapat diselamatkan:
              </p>
              <button
                onClick={() => {
                  const victim = room.players.find(p => p.id === room.nightActions.werewolfTargetId);
                  setPendingAction({
                    actionType: 'witch_heal',
                    targetId: room.nightActions.werewolfTargetId,
                    targetName: victim?.name || 'Korban Werewolf',
                    roleLabel: 'Witch',
                    actionDescription: 'Menyelamatkan pemain ini dari serangan Werewolf malam ini.',
                    colorScheme: 'emerald',
                  });
                }}
                className="w-full min-h-[40px] py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
              >
                Selamatkan Korban
              </button>
            </div>
          )}

          {/* Poison action */}
          {!poisonUsed && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[11px] font-semibold text-rose-300">Gunakan Ramuan Racun (Sekali Pakai):</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {targetablePlayers.map(target => (
                  <button
                    key={target.id}
                    onClick={() => {
                      setPendingAction({
                        actionType: 'witch_poison',
                        targetId: target.id,
                        targetName: target.name,
                        roleLabel: 'Witch',
                        actionDescription: 'Meracuni dan mengeliminasi pemain ini malam ini.',
                        colorScheme: 'rose',
                      });
                    }}
                    className="w-full py-2 px-3 text-left rounded-lg text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-between"
                  >
                    <span>{target.name}</span>
                    <span className="text-[10px] text-rose-400">Racuni</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.8 APPRENTICE SEER (BEFORE PROMOTION)
    if (currentPlayer.role === 'apprentice_seer') {
      return (
        <div className="w-full max-w-sm mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
          {renderLoversBanner()}
          <Eye className="w-6 h-6 text-indigo-400 mx-auto" />
          <h4 className="font-semibold text-sm text-slate-200">Status Magang Peramal</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seer utama masih aktif di desa. Kemampuan menerawang Anda akan aktif secara otomatis jika Seer utama gugur.
          </p>
        </div>
      );
    }

    // 3.9 PASSIVE ROLES (VILLAGER, LYCAN, TANNER, FOOL, MAYOR, HUNTER)
    return (
      <div className="w-full max-w-sm mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
        {renderLoversBanner()}
        <Moon className="w-6 h-6 text-slate-400 mx-auto" />
        <h4 className="font-semibold text-sm text-slate-200">Fase Malam</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          {currentPlayer.role === 'lycan'
            ? 'Aura terselubung: Anda tertidur lelap di malam hari. Ingat bahwa jika Seer memeriksa Anda, Anda akan terdeteksi sebagai Werewolf!'
            : currentPlayer.role === 'tanner'
            ? 'Anda tertidur di malam hari. Rencanakan strategi Anda untuk dipancing dan dipilih warga saat musyawarah siang!'
            : currentPlayer.role === 'fool'
            ? 'Anda tertidur di malam hari. Jika dieliminasi saat musyawarah siang, peran Anda akan terungkap dan mendapat pengampunan!'
            : 'Malam hari sedang berlangsung. Menunggu instruksi selanjutnya dari moderator.'}
        </p>
      </div>
    );
  }

  // 4. DAY ACTIONS (VOTING LYNCH)
  if (room.stage === 'DAY') {
    const isFoolLostVote = Boolean(currentPlayer.foolLostVote);

    return (
      <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
        {renderLoversBanner()}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-slate-100">Voting Siang</h4>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Siang {room.cycle}</span>
            <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-950 border border-slate-800 text-amber-400 font-semibold">
              {totalDayVotes} / {alivePlayers.length} Suara
            </span>
          </div>
        </div>

        {/* Fool lost vote notification banner */}
        {isFoolLostVote && (
          <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 space-y-1">
            <span className="font-bold block">Status Fool (Idiot Desa) Terungkap</span>
            <p className="text-[11px] text-amber-300/80 leading-snug">
              Sesuai aturan boardgame, Anda telah menerima pengampunan publik dan batal tereliminasi, namun Anda tidak memiliki hak suara voting untuk sisa permainan.
            </p>
          </div>
        )}

        {/* Mayor voting weight badge */}
        {currentPlayer.role === 'mayor' && !isFoolLostVote && (
          <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Kekuatan Mayor: Suara voting Anda berbobot <strong>2 suara</strong>!</span>
          </div>
        )}

        {/* Locked status banner */}
        {isLynchLocked ? (
          <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-start gap-2.5 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-200 block">
                Suara Terkunci: {myLynchVote === 'skip' ? 'Lewati Voting' : (lynchTargetPlayer?.name || 'Target')}
              </span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Suara Anda telah tercatat dan terkunci. Suara tidak dapat diubah pada babak voting ini.
              </p>
            </div>
          </div>
        ) : !isFoolLostVote ? (
          <p className="text-xs text-slate-300">
            Pilih pemain yang dicurigai untuk dieliminasi (hanya 1 kali):
          </p>
        ) : null}

        {errorMessage && (
          <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Voting Options */}
        <div className="space-y-2">
          {alivePlayers.map(target => {
            const isSelected = myLynchVote === target.id;
            const isMe = target.id === currentPlayer.id;
            const targetVotes = voteCounts[target.id] || 0;
            const isDisabled = isLynchLocked || submitting || isFoolLostVote;

            return (
              <button
                key={target.id}
                onClick={() => {
                  if (isDisabled) return;
                  setErrorMessage(null);
                  setPendingAction({
                    actionType: 'day_lynch',
                    targetId: target.id,
                    targetName: target.name + (isMe ? ' (Diri Sendiri)' : ''),
                    roleLabel: currentPlayer.role === 'mayor' ? 'Mayor (2 Suara)' : 'Warga',
                    actionDescription: `Memberikan suara eliminasi kepada pemain ini pada musyawarah siang ${room.cycle}.`,
                    colorScheme: 'amber',
                  });
                }}
                disabled={isDisabled}
                className={`w-full min-h-[46px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                    : isDisabled
                    ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{target.name} {isMe ? '(Diri Sendiri)' : ''}</span>
                  {targetVotes > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 shrink-0 ${
                        isSelected
                          ? 'bg-slate-950 text-amber-300 border border-slate-900'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>{targetVotes} Suara</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isSelected ? (
                    <div className="flex items-center gap-1 text-slate-950 text-[11px] font-bold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pilihan Anda</span>
                    </div>
                  ) : (
                    !isDisabled && <span className="text-[10px] text-slate-500">Pilih</span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Skip voting option */}
          {(() => {
            const skipVotes = voteCounts['skip'] || 0;
            const isDisabled = isLynchLocked || submitting || isFoolLostVote;

            return (
              <button
                onClick={() => {
                  if (isDisabled) return;
                  setErrorMessage(null);
                  setPendingAction({
                    actionType: 'day_lynch',
                    targetId: 'skip',
                    targetName: 'Lewati Voting (Tidak Memilih)',
                    roleLabel: 'Warga',
                    actionDescription: 'Memilih untuk tidak mengeliminasi siapa pun pada musyawarah siang hari ini.',
                    colorScheme: 'amber',
                  });
                }}
                disabled={isDisabled}
                className={`w-full min-h-[46px] py-2.5 px-3.5 text-center rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-2 ${
                  myLynchVote === 'skip'
                    ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                    : isDisabled
                    ? 'bg-slate-950/60 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                    : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>Lewati Voting (Tidak Memilih)</span>
                  {skipVotes > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 ${
                        myLynchVote === 'skip'
                          ? 'bg-slate-900 text-slate-200 border border-slate-700'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>{skipVotes} Suara</span>
                    </span>
                  )}
                </div>
                {myLynchVote === 'skip' ? (
                  <div className="flex items-center gap-1 text-slate-200 text-[11px] font-semibold shrink-0">
                    <Lock className="w-3.5 h-3.5 text-slate-300" />
                    <span>Pilihan Anda</span>
                  </div>
                ) : (
                  !isDisabled && <span className="text-[10px] text-slate-500 shrink-0">Pilih</span>
                )}
              </button>
            );
          })()}
        </div>

        {renderConfirmationModal()}
      </div>
    );
  }

  return null;
}
