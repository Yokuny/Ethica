import { Histogram } from 'prom-client';

// Latency per database operation (FND-17) — reuses the pattern from
// .../src/repositories/user.repository.ts (one timer per
// repository call), with a single wrapper instead of try/timer/catch repeated in
// each function — same instrument, less boilerplate per repository.
export const dbReqResTime = new Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duração das operações de banco em segundos',
  labelNames: ['operation', 'success'],
});

export const withDbTiming = async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
  const timer = dbReqResTime.startTimer();
  try {
    const result = await fn();
    timer({ operation, success: 'true' });
    return result;
  } catch (e) {
    timer({ operation, success: 'false' });
    throw e;
  }
};
