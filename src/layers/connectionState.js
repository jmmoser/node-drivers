/**
 * Shared connection lifecycle states for layers that open and close a
 * session with a peer (TCP socket, EIP session, CIP connection).
 */
export const ConnectionStates = Object.freeze({
  Disconnecting: -1,
  Disconnected: 0,
  Connecting: 1,
  Connected: 2,
});

const ConnectionStateNames = Object.freeze({
  [ConnectionStates.Disconnecting]: 'disconnecting',
  [ConnectionStates.Disconnected]: 'disconnected',
  [ConnectionStates.Connecting]: 'connecting',
  [ConnectionStates.Connected]: 'connected',
});

/**
 * Builds a transition function for a layer from a table of allowed
 * transitions ({ [fromState]: [toState, ...] }). Re-entering the current
 * state is a no-op. An unlisted transition throws before the state is
 * changed, so a rejected transition never leaves the layer half-moved.
 */
export function createStateMachine(label, transitions) {
  const allowed = new Map(
    Object.entries(transitions).map(([from, to]) => [Number(from), new Set(to)]),
  );

  return function setConnectionState(layer, state) {
    const previousState = layer._connectionState; // eslint-disable-line no-underscore-dangle
    if (previousState === state) {
      return;
    }

    const next = allowed.get(previousState);
    if (next == null || !next.has(state)) {
      throw new Error(
        `${label} error: invalid connection state transition from ${ConnectionStateNames[previousState]} to ${ConnectionStateNames[state]}`,
      );
    }

    layer._connectionState = state; // eslint-disable-line no-underscore-dangle
  };
}
