import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import EPath from '../../src/layers/cip/core/epath/index.js';

const { Logical } = EPath.Segments;

describe('Logical ClassID', () => {
  test('Padded Implicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x20, 0x01]));
  });
  test('Packed Implicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x20, 0x01]));
  });
  test('Padded Implicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x21, 0x00, 0x00, 0x01]));
  });
  test('Packed Implicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x21, 0x00, 0x01]));
  });

  test('Padded Explicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address8Bit);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x20, 0x01]));
  });
  test('Packed Explicit 8-bit Format', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address8Bit);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x20, 0x01]));
  });
  test('Padded Explicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x21, 0x00, 0x00, 0x01]));
  });
  test('Packed Explicit 16-bit Format', () => {
    const segment = new Logical.ClassID(256, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x21, 0x00, 0x01]));
  });

  test('Padded Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x21, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.ClassID(1, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.ClassID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x21, 0x01, 0x00]));
  });

  test('Invalid Explicit 32-bit Format With 8-bit Value', () => {
    assert.throws(() => new Logical.ClassID(1, Logical.Formats.Address32Bit));
  });
  test('Invalid Explicit 32-bit Format', () => {
    assert.throws(() => new Logical.ClassID(256, Logical.Formats.Address32Bit));
  });
});

describe('Logical InstanceID', () => {
  test('Padded Implicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x24, 0x01]));
  });
  test('Packed Implicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x24, 0x01]));
  });
  test('Padded Implicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x25, 0x00, 0x00, 0x01]));
  });
  test('Packed Implicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x25, 0x00, 0x01]));
  });
  test('Padded Implicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x26, 0x00, 0x00, 0x00, 0x01, 0x00]));
  });
  test('Packed Implicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x26, 0x00, 0x00, 0x01, 0x00]));
  });

  test('Padded Explicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address8Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x24, 0x01]));
  });
  test('Packed Explicit 8-bit Format', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address8Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x24, 0x01]));
  });
  test('Padded Explicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x25, 0x00, 0x00, 0x01]));
  });
  test('Packed Explicit 16-bit Format', () => {
    const segment = new Logical.InstanceID(256, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x25, 0x00, 0x01]));
  });
  test('Padded Explicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000, Logical.Formats.Address32Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x26, 0x00, 0x00, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 32-bit Format', () => {
    const segment = new Logical.InstanceID(0x10000, Logical.Formats.Address32Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x26, 0x00, 0x00, 0x01, 0x00]));
  });

  test('Padded Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x25, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x25, 0x01, 0x00]));
  });
  test('Padded Explicit 32-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x26, 0x00, 0x01, 0x00, 0x00, 0x00]));
  });
  test('Packed Explicit 32-bit Format With 8-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x26, 0x01, 0x00, 0x00, 0x00]));
  });
  test('Padded Explicit 32-bit Format With 16-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x26, 0x00, 0x01, 0x00, 0x00, 0x00]));
  });
  test('Packed Explicit 32-bit Format With 16-bit Value', () => {
    const segment = new Logical.InstanceID(1, Logical.Formats.Address32Bit);
    assert.equal(segment.type.code, Logical.Types.InstanceID);
    assert.equal(segment.format.code, Logical.Formats.Address32Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x26, 0x01, 0x00, 0x00, 0x00]));
  });
});

describe('Logical AttributeID', () => {
  test('Padded Implicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x30, 0x01]));
  });
  test('Packed Implicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x30, 0x01]));
  });
  test('Padded Implicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x31, 0x00, 0x00, 0x01]));
  });
  test('Packed Implicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x31, 0x00, 0x01]));
  });

  test('Padded Explicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address8Bit);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x30, 0x01]));
  });
  test('Packed Explicit 8-bit Format', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address8Bit);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address8Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x30, 0x01]));
  });
  test('Padded Explicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x31, 0x00, 0x00, 0x01]));
  });
  test('Packed Explicit 16-bit Format', () => {
    const segment = new Logical.AttributeID(256, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x31, 0x00, 0x01]));
  });

  test('Padded Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(true), Buffer.from([0x31, 0x00, 0x01, 0x00]));
  });
  test('Packed Explicit 16-bit Format With 8-bit Value', () => {
    const segment = new Logical.AttributeID(1, Logical.Formats.Address16Bit);
    assert.equal(segment.type.code, Logical.Types.AttributeID);
    assert.equal(segment.format.code, Logical.Formats.Address16Bit);
    assert.deepEqual(segment.encode(false), Buffer.from([0x31, 0x01, 0x00]));
  });

  test('Invalid Explicit 32-bit Format With 8-bit Value', () => {
    assert.throws(() => new Logical.AttributeID(1, Logical.Formats.Address32Bit));
  });
  test('Invalid Explicit 32-bit Format With 16-bit Value', () => {
    assert.throws(() => new Logical.AttributeID(256, Logical.Formats.Address32Bit));
  });
});
