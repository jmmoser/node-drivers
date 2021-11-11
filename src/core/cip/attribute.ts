/* eslint-disable max-classes-per-file */

import { DecodeTypedData } from './datatypes/decoding';
import { CommonServiceCodes } from './constants/services';
import EPath from './epath/index';

import CIPRequest from './request';
import CIPFeature from './feature';

import { IDataType } from './datatypes/types';

const LogicalSegment = EPath.Segments.Logical;

export default class CIPAttribute extends CIPFeature {
  dataType: IDataType;

  constructor(code: number, name: string, dataType: IDataType, classCode: number) {
    super(code, name, classCode);
    this.dataType = dataType;
  }

  Get(instance: number) {
    return new CIPRequest(
      CommonServiceCodes.GetAttributeSingle,
      EPath.Encode(true, [
        new LogicalSegment(LogicalSegment.Types.ClassID, this.classCode),
        new LogicalSegment(LogicalSegment.Types.InstanceID, this.classCode, instance),
        new LogicalSegment(LogicalSegment.Types.AttributeID, this.classCode, this.code),
      ]),
      undefined,
      (buffer, offsetRef) => DecodeTypedData(buffer, offsetRef, this.dataType),
    );
  }
}

// CIPAttribute.Class = class CIPClassAttribute extends CIPAttribute {
//   Get(instance) {
//     return super.Get(instance == null ? 0 : instance);
//   }
// };

// CIPAttribute.Instance = class CIPInstanceAttribute extends CIPAttribute {
//   Get(instance) {
//     if (instance < 1) {
//       throw new Error(`Instance must be greater than 0. Supplied instance ${instance}`);
//     }
//     return super.Get(instance);
//   }
// };
