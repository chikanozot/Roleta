import { Member, GlobalGoals } from '../types';

export interface MemberAuditResult {
  hasWarnings: boolean;
  missingAccesses: string[]; // e.g., ["Sanguine", "Crypt", "Dragãozinho"]
  belowLevelMakers: Array<{ name: string; currentLevel: number; targetLevel: number }>;
  noMakers: boolean;
}

export function auditMember(member: Member, globalGoals?: GlobalGoals): MemberAuditResult {
  const result: MemberAuditResult = {
    hasWarnings: false,
    missingAccesses: [],
    belowLevelMakers: [],
    noMakers: false
  };

  if (!globalGoals) return result;

  // Check accesses
  if (globalGoals.sanguine && !member.access.sanguine) {
    result.missingAccesses.push('Sanguine');
  }
  if (globalGoals.crypt && !member.access.crypt) {
    result.missingAccesses.push('Crypt');
  }
  if (globalGoals.dragon && !member.access.dragon) {
    result.missingAccesses.push('Dragãozinho');
  }

  // Check maker levels
  const targetLevelStr = globalGoals.makerLevel || 'none';
  if (targetLevelStr !== 'none') {
    const targetLevel = parseInt(targetLevelStr.replace('+', ''), 10) || 0;
    if (targetLevel > 0) {
      if (member.makers.length === 0) {
        result.noMakers = true;
      } else {
        // A member is compliant if AT LEAST ONE of their makers meets or exceeds the target level.
        const makerLevels = member.makers.map(maker => {
          const levels = maker.levelGoals.map(g => parseInt(g.goal.replace('+', ''), 10) || 0);
          return levels.length > 0 ? Math.max(...levels) : 0;
        });

        const highestMakerLevel = makerLevels.length > 0 ? Math.max(...makerLevels) : 0;

        // Only flag a warning if NONE of their makers meet the required level
        if (highestMakerLevel < targetLevel) {
          member.makers.forEach((maker, index) => {
            const currentLevel = makerLevels[index];
            result.belowLevelMakers.push({
              name: maker.name,
              currentLevel,
              targetLevel
            });
          });
        }
      }
    }
  }

  result.hasWarnings = result.missingAccesses.length > 0 || result.belowLevelMakers.length > 0 || result.noMakers;
  return result;
}
