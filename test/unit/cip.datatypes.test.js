/* eslint-disable no-undef */

import {
  DataType,
  Encode,
  DecodeTypedData,
} from '../../dist/core/cip/datatypes/index.js';

import EPath from '../../dist/core/cip/epath/index.js';

describe('Encoding', () => {
  test('SINT positive', () => {
    expect(Encode(DataType.SINT, 1)).toEqual(Buffer.from([0x01]));
  });
  test('SINT negative', () => {
    expect(Encode(DataType.SINT, -1)).toEqual(Buffer.from([0xFF]));
  });
  test('USINT', () => {
    expect(Encode(DataType.USINT, 1)).toEqual(Buffer.from([0x01]));
  });
  test('BYTE', () => {
    expect(Encode(DataType.BYTE, 1)).toEqual(Buffer.from([0x01]));
  });
  test('INT positive', () => {
    expect(Encode(DataType.INT, 1)).toEqual(Buffer.from([0x01, 0x00]));
  });
  test('INT negative', () => {
    expect(Encode(DataType.INT, -1)).toEqual(Buffer.from([0xFF, 0xFF]));
  });
  test('ITIME positive', () => {
    expect(Encode(DataType.ITIME, 1)).toEqual(Buffer.from([0x01, 0x00]));
  });
  test('ITIME negative', () => {
    expect(Encode(DataType.ITIME, -1)).toEqual(Buffer.from([0xFF, 0xFF]));
  });
  test('UINT', () => {
    expect(Encode(DataType.UINT, 1)).toEqual(Buffer.from([0x01, 0x00]));
  });
  test('WORD', () => {
    expect(Encode(DataType.WORD, 1)).toEqual(Buffer.from([0x01, 0x00]));
  });
  test('DINT positive', () => {
    expect(Encode(DataType.DINT, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('DINT negative', () => {
    expect(Encode(DataType.DINT, -1)).toEqual(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('TIME positive', () => {
    expect(Encode(DataType.TIME, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('TIME negative', () => {
    expect(Encode(DataType.TIME, -1)).toEqual(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('FTIME positive', () => {
    expect(Encode(DataType.FTIME, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('FTIME negative', () => {
    expect(Encode(DataType.FTIME, -1)).toEqual(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('UDINT', () => {
    expect(Encode(DataType.UDINT, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('DWORD', () => {
    expect(Encode(DataType.DWORD, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('DATE', () => {
    expect(Encode(DataType.DATE, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00]));
  });
  test('REAL', () => {
    expect(Encode(DataType.REAL, 5.5)).toEqual(Buffer.from([0x00, 0x00, 0xB0, 0x40]));
  });

  test('LINT positive', () => {
    expect(
      Encode(DataType.LINT, 1),
    ).toEqual(
      Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    );
  });

  test('LINT negative', () => {
    expect(
      Encode(DataType.LINT, -1),
    ).toEqual(
      Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
    );
  });

  test('LTIME positive', () => {
    expect(
      Encode(DataType.LTIME, 1),
    ).toEqual(
      Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    );
  });

  test('LTIME negative', () => {
    expect(
      Encode(DataType.LTIME, -1),
    ).toEqual(
      Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
    );
  });

  test('LREAL', () => {
    expect(
      Encode(DataType.LREAL, 5.5),
    ).toEqual(
      Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x40]),
    );
  });

  test('STRING', () => {
    expect(Encode(DataType.STRING, 'abc')).toEqual(Buffer.from([0x03, 0x00, 0x61, 0x62, 0x63]));
  });
  test('SHORT_STRING', () => {
    expect(Encode(DataType.SHORT_STRING, 'abc')).toEqual(Buffer.from([0x03, 0x61, 0x62, 0x63]));
  });
  test('STRING2 ascii only', () => {
    expect(Encode(DataType.STRING2, 'abc')).toEqual(Buffer.from([0x03, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]));
  });
  test('USINT[]', () => {
    expect(Encode(DataType.ARRAY(DataType.USINT, 0, 1), [1, 2])).toEqual(Buffer.from([0x01, 0x02]));
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
    expect(Encode(dt, { major: 1, minor: 0 })).toEqual(Buffer.from([0x01, 0x00]));
  });
});

describe('Decoding', () => {
  test('SINT positive', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01]), offsetRef, DataType.SINT)).toBe(1);
    expect(offsetRef.current).toBe(1);
  });
  test('SINT negative', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0xFF]), offsetRef, DataType.SINT)).toBe(-1);
    expect(offsetRef.current).toBe(1);
  });
  test('USINT', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01]), offsetRef, DataType.USINT)).toBe(1);
    expect(offsetRef.current).toBe(1);
  });
  test('BYTE', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01]), offsetRef, DataType.BYTE)).toBe(1);
    expect(offsetRef.current).toBe(1);
  });
  test('INT positive', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.INT)).toBe(1);
    expect(offsetRef.current).toBe(2);
  });
  test('INT negative', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0xFF, 0xFF]), offsetRef, DataType.INT)).toBe(-1);
    expect(offsetRef.current).toBe(2);
  });
  test('ITIME positive', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.ITIME)).toBe(1);
    expect(offsetRef.current).toBe(2);
  });
  test('ITIME negative', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0xFF, 0xFF]), offsetRef, DataType.ITIME)).toBe(-1);
    expect(offsetRef.current).toBe(2);
  });
  test('UINT', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.UINT)).toBe(1);
    expect(offsetRef.current).toBe(2);
  });
  test('WORD', () => {
    const offsetRef = { current: 0 };
    expect(DecodeTypedData(Buffer.from([0x01, 0x00]), offsetRef, DataType.WORD)).toBe(1);
    expect(offsetRef.current).toBe(2);
  });
  test('DINT positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.DINT)).toBe(1);
    expect(offsetRef.current).toBe(4);
  });
  test('DINT negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.DINT)).toBe(-1);
    expect(offsetRef.current).toBe(4);
  });
  test('TIME positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.TIME)).toBe(1);
    expect(offsetRef.current).toBe(4);
  });
  test('TIME negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.TIME)).toBe(-1);
    expect(offsetRef.current).toBe(4);
  });
  test('FTIME positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.FTIME)).toBe(1);
    expect(offsetRef.current).toBe(4);
  });
  test('FTIME negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.FTIME)).toBe(-1);
    expect(offsetRef.current).toBe(4);
  });
  test('UDINT', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.UDINT)).toBe(1);
    expect(offsetRef.current).toBe(4);
  });
  test('DWORD', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.DWORD)).toBe(1);
    expect(offsetRef.current).toBe(4);
  });
  test('DATE', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.DATE)).toBe(1);
    expect(offsetRef.current).toBe(4);
  });
  test('REAL', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x00, 0x00, 0xB0, 0x40]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.REAL)).toBeCloseTo(5.5);
    expect(offsetRef.current).toBe(4);
  });
  test('LINT positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.LINT)).toBe(BigInt(1));
    expect(offsetRef.current).toBe(8);
  });
  test('LINT negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.LINT)).toBe(BigInt(-1));
    expect(offsetRef.current).toBe(8);
  });
  test('LTIME positive', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.LTIME)).toBe(BigInt(1));
    expect(offsetRef.current).toBe(8);
  });
  test('LTIME negative', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.LTIME)).toBe(BigInt(-1));
    expect(offsetRef.current).toBe(8);
  });
  test('LREAL', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x40]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.LREAL)).toBeCloseTo(5.5);
    expect(offsetRef.current).toBe(8);
  });
  test('STRING', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x03, 0x00, 0x61, 0x62, 0x63]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.STRING)).toBe('abc');
    expect(offsetRef.current).toBe(5);
  });
  test('SHORT_STRING', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x03, 0x61, 0x62, 0x63]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.SHORT_STRING)).toBe('abc');
    expect(offsetRef.current).toBe(4);
  });
  test('STRING2 ascii only', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x03, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.STRING2)).toBe('abc');
    expect(offsetRef.current).toBe(8);
  });
  test('STRINGI', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x65, 0x6e, 0x67, 0xDA, 0x01, 0x00, 0x03, 0x61, 0x62, 0x63]);
    expect(DecodeTypedData(buffer, offsetRef, DataType.STRINGI)).toStrictEqual([
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
    expect(offsetRef.current).toBe(buffer.length);
  });
  test('ARRAY USINT[]', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x02]);
    const dataType = DataType.ARRAY(DataType.USINT, 0, 1);
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual([1, 2]);
    expect(offsetRef.current).toBe(2);
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
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual({
      major: 1, minor: 0,
    });
    expect(offsetRef.current).toBe(2);
  });
});

describe('Encoding EPATH', () => {
  test('Padded EPATH(Port)', () => {
    expect(
      Encode(DataType.EPATH(true), [new EPath.Segments.Port(1, Buffer.from([0x00]))]),
    ).toEqual(Buffer.from([0x01, 0x00]));
  });
  test('Padded EPATH(Port,Logical,Logical)', () => {
    expect(Encode(DataType.EPATH(true), [
      new EPath.Segments.Port(1, Buffer.from([0x00])),
      new EPath.Segments.Logical.ClassID(2),
      new EPath.Segments.Logical.InstanceID(1),
    ])).toEqual(Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]));
  });
});

describe('Decoding EPATH', () => {
  test('Padded EPATH(Port) Unknown Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.EPATH(true);
    const output = new EPath.Segments.Port(1, Buffer.from([0x00]));
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual(output);
    expect(offsetRef.current).toBe(2);
  });
  test('Padded EPATH(Port) Known Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.EPATH(true, 2);
    const output = [new EPath.Segments.Port(1, Buffer.from([0x00]))];
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual(output);
    expect(offsetRef.current).toBe(2);
  });
  test('Padded EPATH(Port) Full Length', () => {
    const offsetRef = { current: 0 };
    const buffer = Buffer.from([0x01, 0x00]);
    const dataType = DataType.EPATH(true, true);
    const output = [new EPath.Segments.Port(1, Buffer.from([0x00]))];
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual(output);
    expect(offsetRef.current).toBe(2);
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
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual(output);
    expect(offsetRef.current).toBe(6);
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
    expect(DecodeTypedData(buffer, offsetRef, dataType)).toStrictEqual(output);
    expect(offsetRef.current).toBe(6);
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

    expect(data).toEqual(Buffer.from([0x03, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x00]));
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

    expect(code).toBe(0x43F4);
  });
});
