import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Identity from '../../src/layers/cip/core/objects/Identity.js';

describe('CIP common class attributes', () => {
  it('OptionalAttributeList and OptionalServiceList have distinct codes (CIP Vol 1)', () => {
    const common = Identity.CommonClassAttribute;
    /** both were declared with code 4, so requesting the service list
     * fetched the attribute list and code-4 responses decoded under the
     * wrong name */
    assert.equal(common.OptionalAttributeList.code, 4);
    assert.equal(common.OptionalServiceList.code, 5);
  });

  it('GetClassAttribute encodes the Optional Service List attribute as 5', () => {
    const request = Identity.GetClassAttribute(
      Identity.CommonClassAttribute.OptionalServiceList,
    );
    const path = request.encode().subarray(2);
    /** class 0x01, instance 0, attribute 5 */
    assert.deepEqual(path, Buffer.from([0x20, 0x01, 0x24, 0x00, 0x30, 0x05]));
  });

  it('GetAttributeSingle resolves common class attributes', () => {
    /** the fallback referenced CommonClassAttribute.getCode, which does
     * not exist (the group object was intended) */
    const request = Identity.GetAttributeSingle(Identity.CommonClassAttribute.Revision);
    assert.deepEqual(
      request.encode().subarray(2),
      Buffer.from([0x20, 0x01, 0x24, 0x00, 0x30, 0x01]),
    );
  });
});

describe('Identity Status attribute (CIP Vol 1 Table 5-2.3)', () => {
  function decodeStatus(word) {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(word, 0);
    return Identity.DecodeInstanceAttribute(
      buffer,
      { current: 0 },
      Identity.InstanceAttribute.Status,
    );
  }

  it('reads Configured from bit 2', () => {
    /** Configured was read from bit 3, which is reserved, so compliant
     * devices always decoded as unconfigured */
    assert.equal(decodeStatus(0b0100).configured, 1);
  });

  it('does not read Configured from reserved bit 3', () => {
    assert.equal(decodeStatus(0b1000).configured, 0);
  });

  it('reads Owned from bit 0', () => {
    assert.equal(decodeStatus(0b0001).owned, 1);
  });
});
