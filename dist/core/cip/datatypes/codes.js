import { getBits } from '../../../utils';
/** CIP Vol1 Table C-6.1 */
export var DataTypeCodes;
(function (DataTypeCodes) {
    /** DATATYPES FROM EXTERNAL SOURCES CANNOT BE NEGATIVE BECAUSE CODE IS READ AS UNSIGNED */
    DataTypeCodes[DataTypeCodes["TRANSFORM"] = -3] = "TRANSFORM";
    DataTypeCodes[DataTypeCodes["PLACEHOLDER"] = -2] = "PLACEHOLDER";
    DataTypeCodes[DataTypeCodes["UNKNOWN"] = -1] = "UNKNOWN";
    DataTypeCodes[DataTypeCodes["BOOL"] = 193] = "BOOL";
    DataTypeCodes[DataTypeCodes["SINT"] = 194] = "SINT";
    DataTypeCodes[DataTypeCodes["INT"] = 195] = "INT";
    DataTypeCodes[DataTypeCodes["DINT"] = 196] = "DINT";
    DataTypeCodes[DataTypeCodes["LINT"] = 197] = "LINT";
    DataTypeCodes[DataTypeCodes["USINT"] = 198] = "USINT";
    DataTypeCodes[DataTypeCodes["UINT"] = 199] = "UINT";
    DataTypeCodes[DataTypeCodes["UDINT"] = 200] = "UDINT";
    DataTypeCodes[DataTypeCodes["ULINT"] = 201] = "ULINT";
    DataTypeCodes[DataTypeCodes["REAL"] = 202] = "REAL";
    DataTypeCodes[DataTypeCodes["LREAL"] = 203] = "LREAL";
    DataTypeCodes[DataTypeCodes["STIME"] = 204] = "STIME";
    DataTypeCodes[DataTypeCodes["DATE"] = 205] = "DATE";
    DataTypeCodes[DataTypeCodes["TIME_OF_DAY"] = 206] = "TIME_OF_DAY";
    DataTypeCodes[DataTypeCodes["DATE_AND_TIME"] = 207] = "DATE_AND_TIME";
    DataTypeCodes[DataTypeCodes["STRING"] = 208] = "STRING";
    DataTypeCodes[DataTypeCodes["BYTE"] = 209] = "BYTE";
    DataTypeCodes[DataTypeCodes["WORD"] = 210] = "WORD";
    DataTypeCodes[DataTypeCodes["DWORD"] = 211] = "DWORD";
    DataTypeCodes[DataTypeCodes["LWORD"] = 212] = "LWORD";
    DataTypeCodes[DataTypeCodes["STRING2"] = 213] = "STRING2";
    DataTypeCodes[DataTypeCodes["FTIME"] = 214] = "FTIME";
    DataTypeCodes[DataTypeCodes["LTIME"] = 215] = "LTIME";
    DataTypeCodes[DataTypeCodes["ITIME"] = 216] = "ITIME";
    DataTypeCodes[DataTypeCodes["STRINGN"] = 217] = "STRINGN";
    DataTypeCodes[DataTypeCodes["SHORT_STRING"] = 218] = "SHORT_STRING";
    DataTypeCodes[DataTypeCodes["TIME"] = 219] = "TIME";
    DataTypeCodes[DataTypeCodes["EPATH"] = 220] = "EPATH";
    DataTypeCodes[DataTypeCodes["ENGUNIT"] = 221] = "ENGUNIT";
    DataTypeCodes[DataTypeCodes["STRINGI"] = 222] = "STRINGI";
    /** CIP Volume 1, C-6.2 Constructed Data Type Reporting */
    /* Data is an abbreviated struct type, i.e. a CRC of the actual type descriptor */
    DataTypeCodes[DataTypeCodes["ABBREV_STRUCT"] = 160] = "ABBREV_STRUCT";
    /* Data is an abbreviated array type. The limits are left off */
    DataTypeCodes[DataTypeCodes["ABBREV_ARRAY"] = 161] = "ABBREV_ARRAY";
    /* Data is a struct type descriptor */
    DataTypeCodes[DataTypeCodes["STRUCT"] = 162] = "STRUCT";
    /* Data is an array type descriptor */
    DataTypeCodes[DataTypeCodes["ARRAY"] = 163] = "ARRAY";
})(DataTypeCodes || (DataTypeCodes = {}));
;
/** ANS.1 */
export var DataTypeTagClassCodes;
(function (DataTypeTagClassCodes) {
    DataTypeTagClassCodes[DataTypeTagClassCodes["Universal"] = 0] = "Universal";
    DataTypeTagClassCodes[DataTypeTagClassCodes["Application"] = 1] = "Application";
    DataTypeTagClassCodes[DataTypeTagClassCodes["ContextSpecific"] = 2] = "ContextSpecific";
    DataTypeTagClassCodes[DataTypeTagClassCodes["Private"] = 3] = "Private";
})(DataTypeTagClassCodes || (DataTypeTagClassCodes = {}));
;
export var DataTypeTagTypeCodes;
(function (DataTypeTagTypeCodes) {
    DataTypeTagTypeCodes[DataTypeTagTypeCodes["Primitive"] = 0] = "Primitive";
    DataTypeTagTypeCodes[DataTypeTagTypeCodes["Constructed"] = 1] = "Constructed";
})(DataTypeTagTypeCodes || (DataTypeTagTypeCodes = {}));
;
export function DecodeDataTypeTag(buffer, offsetRef) {
    const code = buffer.readUInt8(offsetRef.current);
    offsetRef.current += 1;
    const tagClass = getBits(code, 6, 8);
    const tagType = getBits(code, 5, 6);
    let tagID = getBits(code, 0, 5);
    if (tagID === 0b11111) {
        let length = 1;
        while (getBits(buffer.readUInt8(offsetRef.current + length - 1), 7, 8) === 1) {
            length += 1;
        }
        tagID = 0;
        for (let i = 0; i < length; i++) {
            tagID |= (buffer.readUInt8(offsetRef.current + i) & 0b1111111) << (7 * (length - i - 1));
        }
    }
    return {
        tagClass: {
            code: tagClass,
            name: DataTypeTagClassCodes[tagClass] || 'Unknown',
        },
        type: {
            code: tagType,
            name: DataTypeTagTypeCodes[tagType] || 'Unknown',
        },
        id: tagID,
        code,
    };
}
export default {
    DataTypeCodes,
    // DataTypeTag,
    DecodeDataTypeTag,
};
