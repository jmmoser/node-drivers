import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';

import TCPLayer from '../../src/layers/tcp/index.js';

function listen() {
  return new Promise((resolve) => {
    const connections = [];
    const server = net.createServer((socket) => {
      connections.push(socket);
      socket.on('data', () => {});
      socket.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, connections }));
  });
}

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

describe('TCP layer', () => {
  it('connects on demand and writes queued messages', async () => {
    const { server, connections } = await listen();
    const layer = new TCPLayer({ host: '127.0.0.1', port: server.address().port });

    const received = new Promise((resolve) => {
      server.on('connection', (socket) => socket.once('data', resolve));
    });

    layer.send(Buffer.from([1, 2, 3]), null, false);
    assert.deepEqual(await received, Buffer.from([1, 2, 3]));
    assert.equal(connections.length, 1);

    await layer.close();
    server.close();
  });

  it('does not reconnect after close', async () => {
    const { server, connections } = await listen();
    const layer = new TCPLayer({ host: '127.0.0.1', port: server.address().port });

    layer.send(Buffer.from([1, 2, 3]), null, false);
    await sleep(100);
    assert.equal(connections.length, 1);

    await layer.close();

    /** a deferred wakeup with an empty queue (e.g. from a write callback)
     * must not reopen the connection */
    layer.sendNextMessage();
    await sleep(200);

    assert.equal(connections.length, 1, 'closed layer must not reconnect');
    assert.ok(layer.socket.destroyed, 'socket should remain destroyed after close');

    server.close();
  });
});
