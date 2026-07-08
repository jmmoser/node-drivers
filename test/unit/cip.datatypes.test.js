import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DataType,
  Encode,
} from '../../src/layers/cip/core/datatypes/index.js';
import { DecodeTypedData } from '../../src/layers/cip/core/datatypes/decoding.js';
import EPath from '../../src/layers/cip/core/epath/index.js';

function assertCloseTo(actual, expected, numDigits = 2) {
  assert.ok(
    Math.abs(actual - expected) < (10 ** -numDigits) / 2,
    `Expected ${actual} to be close to ${expected}`,
  );
}

describe('Encoding', () => {
  test('SINT positive', () => {
    assert.deepEqual(Encode(DataType.SINT, 1), Buffer.from([0x01]));
  });
  test('SINT negative', () => {
    assert.deepEqual(Encode(DataType.SINT, -1), Buffer.from([0xFF]));
  });
  test('USINT', () => {
    assert.deepEqual(Encode(DataType.USINT, 1), Buffer.from([0x01]));
  });
  test('BYTE', () => {
    assert.deepEqual(Encode(DataType.BYTE, 1), Buffer.from([0x01]));
  });
  test('INT positive', () => {
    assert.deepEqual(Encode(DataType.INT, 1), Buffer.from([0x01, 0x00]));
  });
  test('INT negative', () => {
    assert.deepEqual(Encode(DataType.INT, -1), Buffer.from([0xFF, 0xFF]));
  });
  test('ITIME positive', () => {
    assert.deepEqual(Encode(DataType.ITIME, 1), Buffer.from([0x01, 0x00]));
  });
  test('ITIME negative', () => {
    assert.deepEqual(Encode(DataType.ITIME, -1), Buffer.from([0xFF, 0xFF]));
  });
  test('UINT', () => {
    assert.deepEqual(Encode(DataType.UINT, 1), Buffer.from([0x01, 0x00]));
  });
  test('WORD', () => {
    assert.deepEqual(Encode(DataType.WORD, 1), Buffer.from([0x01, 0x00]));
  });
  test('DINT positive', () => {
    assert.deepEqual(Encode(DataType.DINT, 1), Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('DINT negative', () => {
    assert.deepEqual(Encode(DataType.DINT, -1), Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('TIME positive', () => {
    assert.deepEqual(Encode(DataType.TIME, 1), Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('TIME negative', () => {
    assert.deepEqual(Encode(DataType.TIME, -1), Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('FTIME positive', () => {
    assert.deepEqual(Encode(DataType.FTIME, 1), Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('FTIME negative', () => {
    assert.deepEqual(Encode(DataType.FTIME, -1), Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('UDINT', () => {
    assert.deepEqual(Encode(DataType.UDINT, 1), Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('DWORD', () => {
    assert.deepEqual(Encode(DataType.DWORD, 1), Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('DATE', () => {
    assert.deepEqual(Encode(DataType.DATE, 1), Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('REAL', () => {
    assert.deepEqual(Encode(DataType.REAL, 5.5), Buffer.from([0x00, 0x00, 0xB0, 0x40]));
  });

  test('LINT positive', () => {
    assert.deepEqual(
      Encode(DataType.LINT, 1),
      Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    );
  });

  test('LINT negative', () => {
    assert.deepEqual(
      Encode(DataType.LINT, -1),
      Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
    );
  });

  test('LTIME positive', () => {
    assert.deepEqual(
      Encode(DataType.LTIME, 1),
      Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    );
  });

  test('LTIME negative', () => {
    assert.deepEqual(
      Encode(DataType.LTIME, -1),
      Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
    );
  });

  test('LREAL', () => {
    assert.deepEqual(
      Encode(DataType.LREAL, 5.5),
      Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x40]),
    );
  });

  test('STRING', () => {
    assert.deepEqual(Encode(DataType.STRING, 'abc'), Buffer.from([0x03, 0x00, 0x61, 0x62, 0x63]));
  });
  test('SHORT_STRING', () => {
    assert.deepEqual(Encode(DataType.SHORT_STRING, 'abc'), Buffer.from([0x03, 0x61, 0x62, 0x63]));
  });
  test('STRING2 ascii only', () => {
    assert.deepEqual(Encode(DataType.STRING2, 'abc'), Buffer.from([0x03, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]));
  });
  test('USINT[]', () => {
    assert.deepEqual(Encode(DataType.ARRAY(DataType.USINT, 0, 1), [1, 2]), Buffer.from([0x01, 0x02]));
  });

  test('TRANSFORM', () => {
    const dt = DataType.TRANSFORM(
      DataType.STRUCT([DataType.USINT, DataType.USINT]),
      (val) => ({
        major: val[0],
        minor: val[1],
      }),
      (val) => [val.major, val.minor],
    );
    assert.deepEqual(Encode(dt, { major: 1, minor: 0 }), Buffer.from([0x01, 0x00]));
  });
});

describe('Decoding', () => {
  test('SINT positive', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01]), offsetRef, DataType.SINT), 1);
    assert.equal(offsetRef.current, 1);
  });
  test('SINT negative', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0xFF]), offsetRef, DataType.SINT), -1);
    assert.equal(offsetRef.current, 1);
  });
  test('USINT', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01]), offsetRef, DataType.USINT), 1);
    assert.equal(offsetRef.current, 1);
  });
  test('BYTE', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01]), offsetRef, DataType.BYTE), 1);
    assert.equal(offsetRef.current, 1);
  });
  test('INT positive', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.INT), 1);
    assert.equal(offsetRef.current, 2);
  });
  test('INT negative', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0xFF, 0xFF]), offsetRef, DataType.INT), -1);
    assert.equal(offsetRef.current, 2);
  });
  test('ITIME positive', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.ITIME), 1);
    assert.equal(offsetRef.current, 2);
  });
  test('ITIME negative', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0xFF, 0xFF]), offsetRef, DataType.ITIME), -1);
    assert.equal(offsetRef.current, 2);
  });
  test('UINT', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.UINT), 1);
    assert.equal(offsetRef.current, 2);
  });
  test('WORD', () => {
    const offsetRef = { current: 0 };
    assert.equal(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.WORD), 1);
    assert.equal(offsetRef.current, 2);
  });
  test('DINT positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.DINT), 1);
    assert.equal(offsetRef.current, 4);
  });
  test('DINT negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.DINT), -1);
    assert.equal(offsetRef.current, 4);
  });
  test('TIME positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.TIME), 1);
    assert.equal(offsetRef.current, 4);
  });
  test('TIME negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.TIME), -1);
    assert.equal(offsetRef.current, 4);
  });
  test('FTIME positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.FTIME), 1);
    assert.equal(offsetRef.current, 4);
  });
  test('FTIME negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.FTIME), -1);
    assert.equal(offsetRef.current, 4);
  });
  test('UDINT', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.UDINT), 1);
    assert.equal(offsetRef.current, 4);
  });
  test('DWORD', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.DWORD), 1);
    assert.equal(offsetRef.current, 4);
  });
  test('DATE', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.DATE), 1);
    assert.equal(offsetRef.current, 4);
  });
  test('REAL', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x00, 0x00, 0xB0, 0x40]);
    assertCloseTo(DecodeTypedData(buffer, offsetRef, DataType.REAL), 5.5);
    assert.equal(offsetRef.current, 4);
  });
  test('LINT positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.LINT), BigInt(1));
    assert.equal(offsetRef.current, 8);
  });
  test('LINT negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.LINT), BigInt(-1));
    assert.equal(offsetRef.current, 8);
  });
  test('LTIME positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.LTIME), BigInt(1));
    assert.equal(offsetRef.current, 8);
  });
  test('LTIME negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.LTIME), BigInt(-1));
    assert.equal(offsetRef.current, 8);
  });
  test('LREAL', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x40]);
    assertCloseTo(DecodeTypedData(buffer, offsetRef, DataType.LREAL), 5.5);
    assert.equal(offsetRef.current, 8);
  });
  test('STRING', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x03, 0x00, 0x61, 0x62, 0x63]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.STRING), 'abc');
    assert.equal(offsetRef.current, 5);
  });
  test('SHORT_STRING', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x03, 0x61, 0x62, 0x63]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.SHORT_STRING), 'abc');
    assert.equal(offsetRef.current, 4);
  });
  test('STRING2 ascii only', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x03, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]);
    assert.equal(DecodeTypedData(buffer, offsetRef, DataType.STRING2), 'abc');
    assert.equal(offsetRef.current, 8);
  });
  test('STRINGI', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x65, 0x6e, 0x67, 0xDA, 0x01, 0x00, 0x03, 0x61, 0x62, 0x63]);
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, DataType.STRINGI), [
      1,
      [
        [
          'eng',
          new EPath.Segments.DataType(DataType.SHORT_STRING),
          1,
          'abc',
        ],
      ],
    ]);
    assert.equal(offsetRef.current, buffer.length);
  });
  test('ARRAY USINT[]', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x02]);
    const dataType = DataType.ARRAY(DataType.USINT, 0, 1);
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), [1, 2]);
    assert.equal(offsetRef.current, 2);
  });

  test('TRANSFORM', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.TRANSFORM(
      DataType.STRUCT([DataType.USINT, DataType.USINT]),
      (val) => ({
        major: val[0],
        minor: val[1],
      }),
      (val) => [val.major, val.minor],
    );
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), {
      major: 1, minor: 0,
    });
    assert.equal(offsetRef.current, 2);
  });
});

describe('Encoding EPATH', () => {
  test('Padded EPATH(Port)', () => {
    assert.deepEqual(
      Encode(DataType.EPATH(true), [new EPath.Segments.Port(1, Buffer.from([0x00]))]),
      Buffer.from([0x01, 0x00]),
    );
  });
  test('Padded EPATH(Port,Logical,Logical)', () => {
    assert.deepEqual(Encode(DataType.EPATH(true), [
      new EPath.Segments.Port(1, Buffer.from([0x00])),
      new EPath.Segments.Logical.ClassID(2),
      new EPath.Segments.Logical.InstanceID(1),
    ]), Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]));
  });
});

describe('Decoding EPATH', () => {
  test('Padded EPATH(Port) Unknown Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.EPATH(true);
    const output = new EPath.Segments.Port(1, Buffer.from([0x00]));
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), output);
    assert.equal(offsetRef.current, 2);
  });
  test('Padded EPATH(Port) Known Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.EPATH(true, 2);
    const output = [new EPath.Segments.Port(1, Buffer.from([0x00]))];
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), output);
    assert.equal(offsetRef.current, 2);
  });
  test('Padded EPATH(Port) Full Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.EPATH(true, true);
    const output = [new EPath.Segments.Port(1, Buffer.from([0x00]))];
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), output);
    assert.equal(offsetRef.current, 2);
  });
  test('Padded EPATH(Port, Logical, Logical) Known Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]);
    const dataType = DataType.EPATH(true, 6);
    const output = [
      new EPath.Segments.Port(1, Buffer.from([0x00])),
      new EPath.Segments.Logical.ClassID(2),
      new EPath.Segments.Logical.InstanceID(1),
    ];
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), output);
    assert.equal(offsetRef.current, 6);
  });
  test('Padded EPATH(Port, Logical, Logical) Full Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]);
    const dataType = DataType.EPATH(true, true);
    const output = [
      new EPath.Segments.Port(1, Buffer.from([0x00])),
      new EPath.Segments.Logical.ClassID(2),
      new EPath.Segments.Logical.InstanceID(1),
    ];
    assert.deepEqual(DecodeTypedData(buffer, offsetRef, dataType), output);
    assert.equal(offsetRef.current, 6);
  });
});

describe('Constructed', () => {
  test('Attribute List Encoding', () => {
    const attributes = [1, 2, 3];
    const data = Encode(DataType.STRUCT([
      DataType.UINT,
      DataType.ABBREV_ARRAY(DataType.UINT),
    ]), [
      attributes.length,
      attributes,
    ]);

    assert.deepEqual(data, Buffer.from([0x03, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00]));
  });

  test('CIP Connection Network Parameters', () => {
    const redundantOwner = 0; // 0 or 1
    /**
     * 0 = Null
     * 1 = Multicast
     * 2 = Point to point
     * 3 = Reserved
     */
    const connectionType = 2;
    /**
     * 0 = Low Priority
     * 1 = High Priority
     * 2 = Scheduled
     * 3 = Urgent
     */
    const priority = 0;
    /**
     * 0 = Fixed size connection
     * 1 = Variable size connection
     */
    const variableSize = 1;

    const connectionSize = 500;

    let code = 0;

    code |= (redundantOwner & 1) << 15;
    code |= (connectionType & 3) << 13;
    code |= (priority & 3) << 10;
    code |= (variableSize & 1) << 9;
    code |= (connectionSize & 0b111111111);

    assert.equal(code, 0x43F4);
  });
});

describe('STRINGN decoding', () => {
  test('decodes a width-1 STRINGN as single-byte characters', () => {
    /** STRINGN was always decoded as UTF-16LE, so any width other than 2
     * silently produced garbage */
    const offsetRef = { current: 0 };
    const value = DecodeTypedData(
      Buffer.from('0100 0400 41424344'.replace(/\s+/g, ''), 'hex'),
      offsetRef,
      DataType.STRINGN,
    );
    assert.equal(value, 'ABCD');
    assert.equal(offsetRef.current, 8);
  });

  test('decodes a width-2 STRINGN as UTF-16LE', () => {
    const offsetRef = { current: 0 };
    const value = DecodeTypedData(
      Buffer.from('0200 0200 41004200'.replace(/\s+/g, ''), 'hex'),
      offsetRef,
      DataType.STRINGN,
    );
    assert.equal(value, 'AB');
    assert.equal(offsetRef.current, 8);
  });
});

describe('BOOL decoding with bit positions', () => {
  test('reads a bit at position >= 8', () => {
    /** the read size was derived from the byte-width of the position
     * number itself, so positions 8-255 read only one byte and always
     * decoded as false */
    const value = DecodeTypedData(
      Buffer.from([0x00, 0x01]),
      { current: 0 },
      DataType.BOOL(8),
    );
    assert.equal(value, true);
  });

  test('reads a bit at position < 8', () => {
    assert.equal(
      DecodeTypedData(Buffer.from([0b0000_0100]), { current: 0 }, DataType.BOOL(2)),
      true,
    );
    assert.equal(
      DecodeTypedData(Buffer.from([0b0000_0100]), { current: 0 }, DataType.BOOL(3)),
      false,
    );
  });
});

describe('Array encode sizing with variable-size item types', () => {
  test('ABBREV_ARRAY of SHORT_STRING sums per-element sizes', () => {
    /** EncodeSize used value[0]'s size for every element, so mixed-length
     * strings either threw mid-write or corrupted the stream */
    assert.deepEqual(
      Encode(DataType.ABBREV_ARRAY(DataType.SHORT_STRING), ['ab', 'longer']),
      Buffer.concat([
        Buffer.from([2]), Buffer.from('ab', 'ascii'),
        Buffer.from([6]), Buffer.from('longer', 'ascii'),
      ]),
    );
  });

  test('ARRAY of SHORT_STRING sums per-element sizes', () => {
    assert.deepEqual(
      Encode(DataType.ARRAY(DataType.SHORT_STRING, 0, 1), ['ab', 'wxyz']),
      Buffer.concat([
        Buffer.from([2]), Buffer.from('ab', 'ascii'),
        Buffer.from([4]), Buffer.from('wxyz', 'ascii'),
      ]),
    );
  });
});
