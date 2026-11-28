import type { CaseDashboard } from '../@query/dashboard.js';

// Types from the busiest to the least busy (stable): the same order, and so the same color, in the mix donut
// and in the intake area (AD-255).
export const rankTypes = (byType: CaseDashboard['byType']) => [...byType].sort((a, b) => b.count - a.count);
