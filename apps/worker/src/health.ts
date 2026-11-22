import { createServer, type Server } from 'node:http';
import { isConnected, WorkerHeartbeat, WorkerJob } from '@ethica/db';
import { collectDefaultMetrics, Gauge, register } from 'prom-client';

collectDefaultMetrics();
const queueDepth = new Gauge({
  name: 'worker_queue_depth',
  help: 'Jobs na fila (queued)',
  collect: async function collect() {
    this.set(await WorkerJob.countDocuments({ status: 'queued' }));
  },
});
void queueDepth;

// Alive = connected to the database and a heartbeat of this instance in the last 2 minutes.
export const HEARTBEAT_MAX_AGE_MS = 2 * 60_000;

export const startHealthServer = (port: number, instance: string): Server =>
  createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': register.contentType });
      res.end(await register.metrics());
      return;
    }
    if (req.url === '/health') {
      const beat = await WorkerHeartbeat.findOne({ instance })
        .lean()
        .catch(() => null);
      const ok = isConnected() && Boolean(beat && Date.now() - beat.beatAt.getTime() < HEARTBEAT_MAX_AGE_MS);
      res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: ok ? 'ok' : 'unavailable' }));
      return;
    }
    res.writeHead(404);
    res.end();
  }).listen(port, () => console.log(JSON.stringify({ event: 'worker.listening', port })));
