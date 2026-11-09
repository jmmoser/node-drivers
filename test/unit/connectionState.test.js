import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ConnectionStates, createStateMachine } from '../../src/layers/connectionState.js';

describe('connection state machine', () => {
  const setState = createStateMachine('Test layer', {
    [ConnectionStates.Disconnected]: [ConnectionStates.Connecting],
    [ConnectionStates.Connecting]: [ConnectionStates.Connected, ConnectionStates.Disconnected],
    [ConnectionStates.Connected]: [ConnectionStates.Disconnected],
  });

  it('applies allowed transitions', () => {
    const layer = { _connectionState: ConnectionStates.Disconnected };
    setState(layer, ConnectionStates.Connecting);
    setState(layer, ConnectionStates.Connected);
    assert.equal(layer._connectionState, ConnectionStates.Connected);
  });

  it('treats re-entering the current state as a no-op', () => {
    const layer = { _connectionState: ConnectionStates.Disconnected };
    setState(layer, ConnectionStates.Disconnected);
    assert.equal(layer._connectionState, ConnectionStates.Disconnected);
  });

  it('rejects an invalid transition without changing the state', () => {
    const layer = { _connectionState: ConnectionStates.Disconnected };
    /** the TCP layer used to assign the new state and then throw,
     * leaving the layer in the state it had just rejected */
    assert.throws(
      () => setState(layer, ConnectionStates.Connected),
      /invalid connection state transition from disconnected to connected/,
    );
    assert.equal(layer._connectionState, ConnectionStates.Disconnected);
  });
});
