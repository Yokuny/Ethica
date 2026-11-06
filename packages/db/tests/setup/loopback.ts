import { Server } from 'node:net';

// supertest opens the app with listen(0), which binds every address, and then calls 127.0.0.1. Node
// sets SO_REUSEADDR, so macOS hands out a port another program already holds on 127.0.0.1 and that
// program answers instead of the app (404, no `body.data`, nothing in the app log). Bound to
// 127.0.0.1 itself, the kernel skips the taken port. `_listen2` because supertest reads address()
// right after listen(), and the public listen() with a host only binds on a later tick.
type SyncListen = { _listen2: (address: string, port: number, addressType: number, backlog: number) => void };

const listen = Server.prototype.listen as (...args: unknown[]) => Server;

Server.prototype.listen = function (this: Server & SyncListen, ...args: unknown[]) {
  if (args[0] !== 0) return listen.apply(this, args);
  this._listen2('127.0.0.1', 0, 4, 511);
  return this;
} as typeof Server.prototype.listen;
