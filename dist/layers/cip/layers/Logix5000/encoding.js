import EPath from '../../../../core/cip/epath/index';
import { Logix5000ClassCodes, } from './constants';
export function EncodeReadTemplateServiceData(offset, bytesToRead) {
    const buffer = Buffer.allocUnsafe(6);
    buffer.writeUInt32LE(offset, 0);
    buffer.writeUInt16LE(bytesToRead - offset, 4);
    return buffer;
}
export function EncodeReadTagServiceData(numberOfElements) {
    const buffer = Buffer.allocUnsafe(2);
    buffer.writeUInt16LE(numberOfElements);
    return buffer;
}
export function EncodeReadTagFragmentedServiceData(numberOfElements, offset) {
    const buffer = Buffer.allocUnsafe(6);
    buffer.writeUInt16LE(numberOfElements, 0);
    buffer.writeUInt32LE(offset, 2);
    return buffer;
}
export function EncodeAttributes(attributes) {
    const buffer = Buffer.allocUnsafe(2 + attributes.length * 2);
    buffer.writeUInt16LE(attributes.length, 0);
    for (let i = 0; i < attributes.length; i++) {
        buffer.writeUInt16LE(attributes[i], 2 * (i + 1));
    }
    return buffer;
}
export function EncodeReadModifyWriteMasks(ORmasks, ANDmasks) {
    const buffer = Buffer.alloc(2 + 2 * ORmasks.length);
    buffer.writeUInt16LE(ORmasks.length, 0);
    for (let i = 0; i < ORmasks.length; i++) {
        buffer.writeUInt8(ORmasks[i], 2 + i);
        buffer.writeUInt8(ANDmasks[i], 2 + ORmasks.length + i);
    }
    return buffer;
}
export function EncodeSymbolPath(tag) {
    switch (typeof tag) {
        case 'string':
            return EPath.Encode(true, EPath.ConvertSymbolToSegments(tag));
        case 'number':
            return EPath.Encode(true, [
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.ClassID, Logix5000ClassCodes.Symbol),
                new EPath.Segments.Logical(EPath.Segments.Logical.Types.InstanceID, tag),
            ]);
        case 'object':
            return EPath.Encode(true, EPath.ConvertSymbolToSegments(tag));
        default:
            throw new Error('Tag must be a tag name, symbol instance number, or a tag object');
    }
}
