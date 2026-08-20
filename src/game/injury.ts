import type { InjurySource, InjuryState } from './types';

const MAX_INJURY_SEVERITY = 3;
const MAX_RECOVERY_POINTS = 10;
const VALID_SOURCES: InjurySource[] = ['overdrive', 'exploration', 'sect_mission'];

export const getInjuryLabel = (injury: InjuryState | null | undefined) => {
  if (!injury) return '无伤';
  if (injury.severity >= 3) return '重伤未愈';
  if (injury.severity === 2) return '经脉受创';
  return '轻伤未愈';
};

export const getInjurySourceLabel = (source: InjurySource) => {
  if (source === 'overdrive') return '极限运功';
  if (source === 'sect_mission') return '宗门任务';
  return '危险探索';
};

export const getInjuryEffects = (injury: InjuryState | null | undefined) => ({
  cultivationMultiplier: injury ? Math.max(0.7, 1 - injury.severity * 0.08) : 1,
  blocksOverdrive: Boolean(injury && injury.severity >= MAX_INJURY_SEVERITY),
});

export const normalizeInjury = (
  input?: Partial<InjuryState> | null,
): InjuryState | null => {
  if (!input || !VALID_SOURCES.includes(input.source as InjurySource)) return null;
  const severity = Math.max(1, Math.min(MAX_INJURY_SEVERITY, Number(input.severity) || 1)) as InjuryState['severity'];
  return {
    severity,
    recoveryPoints: Math.max(1, Math.min(MAX_RECOVERY_POINTS, Number(input.recoveryPoints) || severity * 2)),
    source: input.source as InjurySource,
    startedAt: Number(input.startedAt) || Date.now(),
  };
};

export const addInjury = (
  current: InjuryState | null | undefined,
  source: InjurySource,
  severity: InjuryState['severity'],
  startedAt: number,
): InjuryState => {
  if (!current) {
    return {
      severity,
      recoveryPoints: severity * 2,
      source,
      startedAt,
    };
  }
  return {
    severity: Math.min(MAX_INJURY_SEVERITY, current.severity + severity) as InjuryState['severity'],
    recoveryPoints: Math.min(MAX_RECOVERY_POINTS, current.recoveryPoints + severity * 2),
    source,
    startedAt,
  };
};

export const recoverInjury = (
  current: InjuryState | null | undefined,
  points: number,
): InjuryState | null => {
  if (!current) return null;
  if (current.recoveryPoints <= points) return null;
  return {
    ...current,
    recoveryPoints: current.recoveryPoints - Math.max(0, points),
  };
};
