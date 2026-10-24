import { useState } from 'react';
import { 
  Skull, Shield, Eye, Moon, Sun, Check, Users, Crosshair, 
  Lock, AlertTriangle, Loader2, X 
} from 'lucide-react';
import { GameRoom, Player } from '../types/game';

interface Props {
  room: GameRoom;
  currentPlayer: Player;
  onPerformAction: (actionType: string, targetId: string) => Promise<void>;
  onVoteLynch: (targetId: string) => Promise<void>;
  onHunterShoot?: (targetId: string) => Promise<void>;
}

interface PendingAction {
  actionType: 'werewolf_vote' | 'seer_inspect' | 'doctor_protect' | 'hunter_shoot' | 'day_lynch';
  targetId: string;
  targetName: string;
  roleLabel: string;
  actionDescription: string;
  colorScheme: 'rose' | 'indigo' | 'emerald' | 'amber';
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
  const [seerResult, setSeerResult] = useState<{
    targetName: string;
    isWerewolf: boolean;
  } | null>(null);

  const isAlive = currentPlayer.status === 'alive';
  const alivePlayers = room.players.filter(p => p.status === 'alive');
  const targetablePlayers = alivePlayers.filter(p => p.id !== currentPlayer.id);

  const werewolfPack = room.players.filter(
    p => p.role === 'werewolf' && p.id !== currentPlayer.id
  );

  const myWerewolfVote = room.nightActions.werewolfVotes[currentPlayer.id];
  const myLynchVote = room.dayVotes.votes[currentPlayer.id];

  // Derive Seer result if target is already recorded in room
  const inspectedPlayer = room.nightActions.seerTargetId
    ? room.players.find(p => p.id === room.nightActions.seerTargetId)
    : null;

  const activeSeerResult = seerResult || (inspectedPlayer ? {
    targetName: inspectedPlayer.name,
    isWerewolf: inspectedPlayer.role === 'werewolf',
  } : null);

  // Locked states (abilities and votes can only be chosen once per cycle and cannot be changed)
  const isWerewolfLocked = Boolean(myWerewolfVote);
  const werewolfTargetPlayer = isWerewolfLocked
    ? room.players.find(p => p.id === myWerewolfVote)
    : null;

  const isSeerLocked = Boolean(room.nightActions.seerTargetId || activeSeerResult);
  const isDoctorLocked = Boolean(room.nightActions.doctorTargetId);
  const doctorTargetPlayer = isDoctorLocked
    ? room.players.find(p => p.id === room.nightActions.doctorTargetId)
    : null;

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
        const target = room.players.find(p => p.id === pendingAction.targetId);
        await onPerformAction('seer_inspect', pendingAction.targetId);
        if (target) {
          setSeerResult({
            targetName: target.name,
            isWerewolf: target.role === 'werewolf',
          });
        }
      } else if (pendingAction.actionType === 'doctor_protect') {
        await onPerformAction('doctor_protect', pendingAction.targetId);
      } else if (pendingAction.actionType === 'day_lynch') {
        await onVoteLynch(pendingAction.targetId);
      } else if (pendingAction.actionType === 'hunter_shoot' && onHunterShoot) {
        await onHunterShoot(pendingAction.targetId);
      }
      setPendingAction(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim pilihan aksi');
    } finally {
      setSubmitting(false);
    }
  };

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

        {/* Confirmation Modal */}
        {renderConfirmationModal()}
      </div>
    );
  }

  // 2. ELIMINATED PLAYER
  if (!isAlive) {
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
                Target Terpilih:
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

  // 3. NIGHT ACTIONS
  if (room.stage === 'NIGHT') {
    // 3.1 WEREWOLF
    if (currentPlayer.role === 'werewolf') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-rose-900/60 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-400" />
              <h4 className="font-bold text-sm text-slate-100">Target Serangan Werewolf</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {/* Werewolf Pack list */}
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

          {/* Locked Status Banner */}
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

          {/* Target List */}
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

          {/* Modal */}
          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.2 SEER
    if (currentPlayer.role === 'seer') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-indigo-900/60 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-slate-100">Pemeriksaan Peran (Seer)</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {/* Seer Inspection Result Card */}
          {activeSeerResult && (
            <div
              className={`p-3.5 rounded-xl border text-center animate-in fade-in duration-150 ${
                activeSeerResult.isWerewolf
                  ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                  : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider font-semibold opacity-85">
                Hasil Pemeriksaan Seer
              </div>
              <div className="text-sm font-bold mt-1">
                {activeSeerResult.targetName} adalah{' '}
                <span className={activeSeerResult.isWerewolf ? 'text-rose-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                  {activeSeerResult.isWerewolf ? 'WEREWOLF' : 'VILLAGER (BUKAN WEREWOLF)'}
                </span>
              </div>
            </div>
          )}

          {/* Locked status banner */}
          {isSeerLocked ? (
            <div className="p-3 bg-indigo-950/40 border border-indigo-800/80 rounded-xl flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-200 block">
                  Kemampuan Terkunci
                </span>
                <p className="text-[11px] text-indigo-300/80 mt-0.5">
                  Kemampuan Seer hanya dapat digunakan 1 kali per malam. Pilihan telah selesai dan tidak dapat diubah.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300">
              Pilih satu pemain untuk diterawang perannya (hanya 1 kali):
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Target List */}
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
                      roleLabel: 'Seer (Penerawang)',
                      actionDescription: 'Menerawang peran rahasia pemain ini (apakah Werewolf atau Villager).',
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

          {/* Modal */}
          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.3 DOCTOR
    if (currentPlayer.role === 'doctor') {
      return (
        <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-emerald-900/60 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-slate-100">Perlindungan (Doctor)</h4>
            </div>
            <span className="text-xs text-slate-400">Malam {room.cycle}</span>
          </div>

          {/* Locked status banner */}
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
              Pilih satu pemain untuk dilindungi malam ini (hanya 1 kali):
            </p>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Target List */}
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

          {/* Modal */}
          {renderConfirmationModal()}
        </div>
      );
    }

    // 3.4 VILLAGER (NO NIGHT ACTION)
    return (
      <div className="w-full max-w-sm mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
        <Moon className="w-6 h-6 text-slate-400 mx-auto" />
        <h4 className="font-semibold text-sm text-slate-200">Fase Malam</h4>
        <p className="text-xs text-slate-400">
          Malam hari sedang berlangsung. Menunggu instruksi selanjutnya dari moderator.
        </p>
      </div>
    );
  }

  // 4. DAY ACTIONS (VOTING LYNCH)
  if (room.stage === 'DAY') {
    return (
      <div className="w-full max-w-sm mx-auto p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-slate-100">Voting Siang</h4>
          </div>
          <span className="text-xs text-slate-400">Siang {room.cycle}</span>
        </div>

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
        ) : (
          <p className="text-xs text-slate-300">
            Pilih pemain yang dicurigai untuk dieliminasi (hanya 1 kali):
          </p>
        )}

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
            return (
              <button
                key={target.id}
                onClick={() => {
                  if (isLynchLocked) return;
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
                disabled={isLynchLocked || submitting}
                className={`w-full min-h-[44px] py-2.5 px-3.5 text-left rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                    : isLynchLocked
                    ? 'bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed opacity-50'
                    : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-300'
                }`}
              >
                <span>{target.name} {isMe ? '(Diri Sendiri)' : ''}</span>
                {isSelected ? (
                  <div className="flex items-center gap-1 text-slate-950 text-[11px] font-bold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Terkunci</span>
                  </div>
                ) : (
                  !isLynchLocked && <span className="text-[10px] text-slate-500">Pilih</span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => {
              if (isLynchLocked) return;
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
            disabled={isLynchLocked || submitting}
            className={`w-full min-h-[44px] py-2.5 px-3.5 text-center rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-2 ${
              myLynchVote === 'skip'
                ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                : isLynchLocked
                ? 'bg-slate-950/60 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                : 'bg-slate-950 hover:bg-slate-800 active:scale-[0.99] border-slate-800 text-slate-400'
            }`}
          >
            <span>Lewati Voting (Tidak Memilih)</span>
            {myLynchVote === 'skip' && <Lock className="w-3.5 h-3.5 text-slate-300" />}
          </button>
        </div>

        {/* Modal */}
        {renderConfirmationModal()}
      </div>
    );
  }

  return null;
}
