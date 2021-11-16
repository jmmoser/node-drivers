/* eslint-disable max-classes-per-file */

import { DecodeTypedData } from './datatypes/decoding';
import { CommonServiceCodes } from './constants/services';
import EPath from './epath/index';

import CIPRequest from './request';
import CIPFeature from './feature';

import { IDataTypeOption } from './datatypes/types';

const LogicalSegment = EPath.Segments.Logical;

export default class CIPAttribute extends CIPFeature {
  // instance: number;
  dataType: IDataTypeOption;

  constructor(classCode: number, attributeID: number, name: string, dataType: IDataTypeOption) {
    super(attributeID, name, classCode);
    // this.instance = instance;
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
