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

function withTimeout(promise, label, ms = 3000) {
  return new Promise((resolve, reject) => {
    const handle = setTimeout(() => {
      reject(new Error(`${label} did not settle within ${ms}ms`));
    }, ms);
    promise.then(
      (value) => { clearTimeout(handle); resolve(value); },
      (err) => { clearTimeout(handle); reject(err); },
    );
  });
}

describe('TCP layer connection lifecycle', () => {
  it('connected() resolves false on a layer that never connected', async () => {
    const layer = new TCPLayer({ host: '127.0.0.1', port: 1 });
    assert.equal(await withTimeout(layer.connected(), 'connected()'), false);
  });

  it('settles the connect promise when the connection is refused', async () => {
    /** grab a port that is guaranteed closed */
    const { server } = await listen();
    const { port } = server.address();
    await new Promise((resolve) => { server.close(resolve); });

    const layer = new TCPLayer({ host: '127.0.0.1', port, connectTimeout: 2000 });
    layer.send(Buffer.from([1]), null, false);

    /** ECONNREFUSED emits 'error', never 'timeout' — the promise
     * previously stayed pending forever */
    assert.equal(await withTimeout(layer.connected(), 'refused connect'), false);
  });

  it('destroys the in-flight socket when disconnecting while connecting', async () => {
    const { server } = await listen();
    const layer = new TCPLayer({ host: '127.0.0.1', port: server.address().port });

    layer.send(Buffer.from([1]), null, false);
    assert.equal(layer._connectionState, 1, 'layer should be connecting');

    await withTimeout(layer.disconnect(), 'disconnect while connecting');

    /** without destroy() the OS completes the handshake later and the
     * established socket leaks */
    assert.ok(layer.socket.destroyed, 'in-flight socket must be destroyed');

    await new Promise((resolve) => { server.close(resolve); });
  });
});

describe('TCP layer Scan', () => {
  it('yields hosts with open ports', async () => {
    const { server } = await listen();
    const { port } = server.address();

    /** Scan awaited connected() on a layer that never initiated a
     * connection, so it reported nothing on any network */
    const results = [];
    for await (const result of TCPLayer.Scan(['127.0.0.1'], [port])) {
      results.push(result);
    }

    assert.deepEqual(results, [{ host: '127.0.0.1', port }]);
    await new Promise((resolve) => { server.close(resolve); });
  });

  it('skips hosts with closed ports', async () => {
    const { server } = await listen();
    const { port } = server.address();
    await new Promise((resolve) => { server.close(resolve); });

    const results = [];
    for await (const result of TCPLayer.Scan(['127.0.0.1'], [port])) {
      results.push(result);
    }

    assert.deepEqual(results, []);
  });
});
