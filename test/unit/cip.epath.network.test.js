/* eslint-disable no-undef */

import EPath from '../../src/core/cip/epath/index.js';

const { Network } = EPath.Segments;

describe('Network Segment Production Inhibit Time', () => {
  test('Encode', () => {
    expect(
      new Network(Network.SubtypeCodes.ProductionInhibitTime, 5).encode(),
    ).toEqual(
      Buffer.from([0x43, 0x05]),
    );
  });
  test('Decode', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x43, 0x05]);
    const output = [
      new Network(Network.SubtypeCodes.ProductionInhibitTime, 5),
    ];
    expect(EPath.Decode(buffer, offsetRef, true, false)).toStrictEqual(output);
    expect(offsetRef.current).toBe(2);
  });
});
