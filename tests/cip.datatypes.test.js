const {
  DataType,
  DataTypeCodes,
  Encode,
  EncodeTo,
  Decode
} = require('../src/layers/cip/objects/CIP');

const EPath = require('../src/layers/cip/objects/EPath');


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
    expect(Encode(DataType.LINT, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });
  test('LINT negative', () => {
    expect(Encode(DataType.LINT, -1)).toEqual(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('LTIME positive', () => {
    expect(Encode(DataType.LTIME, 1)).toEqual(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });
  test('LTIME negative', () => {
    expect(Encode(DataType.LTIME, -1)).toEqual(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]));
  });
  test('LREAL', () => {
    expect(Encode(DataType.LREAL, 5.5)).toEqual(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x40]));
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
});


describe('Decoding', () => {
  test('SINT positive', () => {
    expect(Decode(DataType.SINT, Buffer.from([0x01]), 0, val => {
      expect(val).toBe(1);
    })).toBe(1);
  });
  test('SINT negative', () => {
    expect(Decode(DataType.SINT, Buffer.from([0xFF]), 0, val => {
      expect(val).toBe(-1);
    })).toBe(1);
  });
  test('USINT', () => {
    expect(Decode(DataType.USINT, Buffer.from([0x01]), 0, val => {
      expect(val).toBe(1);
    })).toBe(1);
  });
  test('BYTE', () => {
    expect(Decode(DataType.BYTE, Buffer.from([0x01]), 0, val => {
      expect(val).toBe(1);
    })).toBe(1);
  });
  test('INT positive', () => {
    expect(Decode(DataType.INT, Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(2);
  });
  test('INT negative', () => {
    expect(Decode(DataType.INT, Buffer.from([0xFF, 0xFF]), 0, val => {
      expect(val).toBe(-1);
    })).toBe(2);
  });
  test('ITIME positive', () => {
    expect(Decode(DataType.ITIME, Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(2);
  });
  test('ITIME negative', () => {
    expect(Decode(DataType.ITIME, Buffer.from([0xFF, 0xFF]), 0, val => {
      expect(val).toBe(-1);
    })).toBe(2);
  });
  test('UINT', () => {
    expect(Decode(DataType.UINT, Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(2);
  });
  test('WORD', () => {
    expect(Decode(DataType.WORD, Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(2);
  });
  test('DINT positive', () => {
    expect(Decode(DataType.DINT, Buffer.from([0x01, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(4);
  });
  test('DINT negative', () => {
    expect(Decode(DataType.DINT, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]), 0, val => {
      expect(val).toBe(-1);
    })).toBe(4);
  });
  test('TIME positive', () => {
    expect(Decode(DataType.TIME, Buffer.from([0x01, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(4);
  });
  test('TIME negative', () => {
    expect(Decode(DataType.TIME, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]), 0, val => {
      expect(val).toBe(-1);
    })).toBe(4);
  });
  test('FTIME positive', () => {
    expect(Decode(DataType.FTIME, Buffer.from([0x01, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(4);
  });
  test('FTIME negative', () => {
    expect(Decode(DataType.FTIME, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]), 0, val => {
      expect(val).toBe(-1);
    })).toBe(4);
  });
  test('UDINT', () => {
    expect(Decode(DataType.UDINT, Buffer.from([0x01, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(4);
  });
  test('DWORD', () => {
    expect(Decode(DataType.DWORD, Buffer.from([0x01, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(4);
  });
  test('DATE', () => {
    expect(Decode(DataType.DATE, Buffer.from([0x01, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(1);
    })).toBe(4);
  });
  test('REAL', () => {
    expect(Decode(DataType.REAL, Buffer.from([0x00, 0x00, 0xB0, 0x40]), 0, val => {
      expect(val).toBeCloseTo(5.5);
    })).toBe(4);
  });
  test('LINT positive', () => {
    expect(Decode(DataType.LINT, Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(BigInt(1));
    })).toBe(8);
  });
  test('LINT negative', () => {
    expect(Decode(DataType.LINT, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), 0, val => {
      expect(val).toBe(BigInt(-1));
    })).toBe(8);
  });
  test('LTIME positive', () => {
    expect(Decode(DataType.LTIME, Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), 0, val => {
      expect(val).toBe(BigInt(1));
    })).toBe(8);
  });
  test('LTIME negative', () => {
    expect(Decode(DataType.LTIME, Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]), 0, val => {
      expect(val).toBe(BigInt(-1));
    })).toBe(8);
  });
  test('LREAL', () => {
    expect(Decode(DataType.LREAL, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x40]), 0, val => {
      expect(val).toBeCloseTo(5.5);
    })).toBe(8);
  });
  test('STRING', () => {
    expect(Decode(DataType.STRING, Buffer.from([0x03, 0x00, 0x61, 0x62, 0x63]), 0, val => {
      expect(val).toBe('abc');
    })).toBe(5);
  });
  test('SHORT_STRING', () => {
    expect(Decode(DataType.SHORT_STRING, Buffer.from([0x03, 0x61, 0x62, 0x63]), 0, val => {
      expect(val).toBe('abc');
    })).toBe(4);
  });
  test('STRING2 ascii only', () => {
    expect(Decode(DataType.STRING2, Buffer.from([0x03, 0x00, 0x61, 0x00, 0x62, 0x00, 0x63, 0x00]), 0, val => {
      expect(val).toBe('abc');
    })).toBe(8);
  });
  test('STRINGI', () => {
    const buffer = Buffer.from(
      [0x01, 0x65, 0x6e, 0x67, 0xDA, 0x01, 0x00, 0x03, 0x61, 0x62, 0x63]
    );
    expect(
      Decode(DataType.STRINGI, buffer, 0, val => {
        expect(val).toEqual([
          1,
          [
            [
              'eng',
              new EPath.Segments.DataType.Elementary(DataTypeCodes.SHORT_STRING),
              1,
              'abc'
            ]
          ]
        ]);
      })
    ).toBe(buffer.length);
  })
  test('ARRAY USINT[]', () => {
    expect(Decode(DataType.ARRAY(DataType.USINT, 0, 1), Buffer.from([0x01, 0x02]), 0, val => {
      expect(val).toEqual([1, 2]);
    })).toBe(2);
  });
});


describe('Encoding EPATH', () => {
  test('Padded EPATH(Port)', () => {
    expect(Encode(DataType.EPATH(true), [new EPath.Segments.Port(1, Buffer.from([0x00]))])).toEqual(Buffer.from([0x01, 0x00]));
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
    expect(Decode(DataType.EPATH(true), Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toEqual(new EPath.Segments.Port(1, Buffer.from([0x00])));
    })).toBe(2);
  });
  test('Padded EPATH(Port) Known Length', () => {
    expect(Decode(DataType.EPATH(true, 2), Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toEqual([new EPath.Segments.Port(1, Buffer.from([0x00]))]);
    })).toBe(2);
  });
  test('Padded EPATH(Port) Full Length', () => {
    expect(Decode(DataType.EPATH(true, true), Buffer.from([0x01, 0x00]), 0, val => {
      expect(val).toEqual([new EPath.Segments.Port(1, Buffer.from([0x00]))]);
    })).toBe(2);
  });
  test('Padded EPATH(Port, Logical, Logical) Known Length', () => {
    expect(Decode(DataType.EPATH(true, 6), Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]), 0, val => {
      expect(val).toEqual([
        new EPath.Segments.Port(1, Buffer.from([0x00])),
        new EPath.Segments.Logical.ClassID(2),
        new EPath.Segments.Logical.InstanceID(1),
      ]);
    })).toBe(6);
  });
  test('Padded EPATH(Port, Logical, Logical) Full Length', () => {
    expect(Decode(DataType.EPATH(true, true), Buffer.from([0x01, 0x00, 0x20, 0x02, 0x24, 0x01]), 0, val => {
      expect(val).toEqual([
        new EPath.Segments.Port(1, Buffer.from([0x00])),
        new EPath.Segments.Logical.ClassID(2),
        new EPath.Segments.Logical.InstanceID(1),
      ]);
    })).toBe(6);
  });
});


describe('Constructed', () => {
  test('Attribute List Encoding', () => {
    const attributes = [1, 2, 3];
    const data = Encode(DataType.STRUCT([
      DataType.UINT,
      DataType.ABBREV_ARRAY(DataType.UINT)
    ]), [
      attributes.length,
      attributes
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