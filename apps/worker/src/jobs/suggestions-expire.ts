import { proposalFits } from '@ethica/contracts';
import { listPendingSuggestions } from '@ethica/db';
import { settleSuggestions } from '../queue/notification-writes.js';

// Once a day (AD-270): a pending suggestion of an office without the module expires (kept to read); one whose
// case already is as proposed, or no longer fits, is superseded.
export const expireSuggestions = async (now = new Date()): Promise<{ expired: number; superseded: number }> => {
  const pending = await listPendingSuggestions(now);
  const expired = pending.filter((item) => !item.automation).map((item) => item.id);
  const superseded = pending
    .filter((item) => item.automation && (!item.legalCase || proposalFits(item.legalCase, item.proposal) !== 'apply'))
    .map((item) => item.id);
  return {
    expired: await settleSuggestions(expired, 'expired'),
    superseded: await settleSuggestions(superseded, 'superseded'),
  };
};
