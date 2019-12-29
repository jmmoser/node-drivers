const EPath = require('../src/layers/cip/EPath');
const Network = EPath.Segments.Network;

describe('Network Segment Production Inhibit Time', () => {
  test('Encode', () => {
    expect(new Network.ProductionInhibitTime(5).encode()).toEqual(Buffer.from([0x43, 0x05]));
  });
  test('Decode', () => {
    expect(EPath.Decode(Buffer.from([0x43, 0x05]), 0, true, false, segments => {
      expect(segments).toEqual([new Network.ProductionInhibitTime(5)]);
    })).toBe(2);
  });
});