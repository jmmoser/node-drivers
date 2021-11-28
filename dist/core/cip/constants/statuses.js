export var GeneralStatusCodes;
(function (GeneralStatusCodes) {
    GeneralStatusCodes[GeneralStatusCodes["Success"] = 0] = "Success";
    GeneralStatusCodes[GeneralStatusCodes["ConnectionFailure"] = 1] = "ConnectionFailure";
    GeneralStatusCodes[GeneralStatusCodes["ResourceUnavailable"] = 2] = "ResourceUnavailable";
    GeneralStatusCodes[GeneralStatusCodes["InvalidParameterValue"] = 3] = "InvalidParameterValue";
    GeneralStatusCodes[GeneralStatusCodes["PathSegmentError"] = 4] = "PathSegmentError";
    GeneralStatusCodes[GeneralStatusCodes["PathDestinationUnknown"] = 5] = "PathDestinationUnknown";
    GeneralStatusCodes[GeneralStatusCodes["PartialTransfer"] = 6] = "PartialTransfer";
    GeneralStatusCodes[GeneralStatusCodes["ConnectionLost"] = 7] = "ConnectionLost";
    GeneralStatusCodes[GeneralStatusCodes["ServiceNotSupported"] = 8] = "ServiceNotSupported";
    GeneralStatusCodes[GeneralStatusCodes["InvalidAttributeValue"] = 9] = "InvalidAttributeValue";
    GeneralStatusCodes[GeneralStatusCodes["AttributeListError"] = 10] = "AttributeListError";
    GeneralStatusCodes[GeneralStatusCodes["AlreadyInRequestedModeOrState"] = 11] = "AlreadyInRequestedModeOrState";
    GeneralStatusCodes[GeneralStatusCodes["ObjectStateConflict"] = 12] = "ObjectStateConflict";
    GeneralStatusCodes[GeneralStatusCodes["ObjectAlreadyExists"] = 13] = "ObjectAlreadyExists";
    GeneralStatusCodes[GeneralStatusCodes["AttributeNotSettable"] = 14] = "AttributeNotSettable";
    GeneralStatusCodes[GeneralStatusCodes["PrivilegeViolation"] = 15] = "PrivilegeViolation";
    GeneralStatusCodes[GeneralStatusCodes["DeviceStateConflict"] = 16] = "DeviceStateConflict";
    GeneralStatusCodes[GeneralStatusCodes["ReplyDataTooLarge"] = 17] = "ReplyDataTooLarge";
    GeneralStatusCodes[GeneralStatusCodes["FragmentationOfPrimitiveValue"] = 18] = "FragmentationOfPrimitiveValue";
    GeneralStatusCodes[GeneralStatusCodes["NotEnoughData"] = 19] = "NotEnoughData";
    GeneralStatusCodes[GeneralStatusCodes["AttributeNotSupported"] = 20] = "AttributeNotSupported";
    GeneralStatusCodes[GeneralStatusCodes["TooMuchData"] = 21] = "TooMuchData";
    GeneralStatusCodes[GeneralStatusCodes["ObjectDoesNotExist"] = 22] = "ObjectDoesNotExist";
    GeneralStatusCodes[GeneralStatusCodes["ServiceFragmentationSequenceNotInProgress"] = 23] = "ServiceFragmentationSequenceNotInProgress";
    GeneralStatusCodes[GeneralStatusCodes["NoStoredAttributeData"] = 24] = "NoStoredAttributeData";
    GeneralStatusCodes[GeneralStatusCodes["StoreOperationFailure"] = 25] = "StoreOperationFailure";
    GeneralStatusCodes[GeneralStatusCodes["RoutingFailureRequestTooLarge"] = 26] = "RoutingFailureRequestTooLarge";
    GeneralStatusCodes[GeneralStatusCodes["RoutingFailureResponseTooLarge"] = 27] = "RoutingFailureResponseTooLarge";
    GeneralStatusCodes[GeneralStatusCodes["MissingAttributeListEntryData"] = 28] = "MissingAttributeListEntryData";
    GeneralStatusCodes[GeneralStatusCodes["InvalidAttributeValueList"] = 29] = "InvalidAttributeValueList";
    GeneralStatusCodes[GeneralStatusCodes["EmbeddedServiceError"] = 30] = "EmbeddedServiceError";
    GeneralStatusCodes[GeneralStatusCodes["VendorSpecificError"] = 31] = "VendorSpecificError";
    GeneralStatusCodes[GeneralStatusCodes["InvalidParameter"] = 32] = "InvalidParameter";
    GeneralStatusCodes[GeneralStatusCodes["WriteOnceValueOrMediumAlreadyWritten"] = 33] = "WriteOnceValueOrMediumAlreadyWritten";
    GeneralStatusCodes[GeneralStatusCodes["InvalidReplyReceived"] = 34] = "InvalidReplyReceived";
    GeneralStatusCodes[GeneralStatusCodes["BufferOverflow"] = 35] = "BufferOverflow";
    GeneralStatusCodes[GeneralStatusCodes["MessageFormatError"] = 36] = "MessageFormatError";
    GeneralStatusCodes[GeneralStatusCodes["KeyFailureInPath"] = 37] = "KeyFailureInPath";
    GeneralStatusCodes[GeneralStatusCodes["PathSizeInvalid"] = 38] = "PathSizeInvalid";
    GeneralStatusCodes[GeneralStatusCodes["UnexpectedAttributeInList"] = 39] = "UnexpectedAttributeInList";
    GeneralStatusCodes[GeneralStatusCodes["InvalidMemberID"] = 40] = "InvalidMemberID";
    GeneralStatusCodes[GeneralStatusCodes["MemberNotSettable"] = 41] = "MemberNotSettable";
    GeneralStatusCodes[GeneralStatusCodes["Group2OnlyServerGeneralFailure"] = 42] = "Group2OnlyServerGeneralFailure";
    GeneralStatusCodes[GeneralStatusCodes["UnknownModbusError"] = 43] = "UnknownModbusError";
})(GeneralStatusCodes || (GeneralStatusCodes = {}));
;
// // CIP-V1-1.0 Appendix B-1. General status codes
// const GeneralStatusNames = Object.freeze({
//   [GeneralStatusCodes.Success]: 'Success',
//   [GeneralStatusCodes.ConnectionFailure]: 'Connection failure',
//   [GeneralStatusCodes.ResourceUnavailable]: 'Resource unavailable',
//   [GeneralStatusCodes.InvalidParameterValue]: 'Invalid parameter value',
//   [GeneralStatusCodes.PathSegmentError]: 'Path segment error',
//   [GeneralStatusCodes.PathDestinationUnknown]: 'Path destination unknown',
//   [GeneralStatusCodes.PartialTransfer]: 'Partial transfer',
//   [GeneralStatusCodes.ConnectionLost]: 'Connection lost',
//   [GeneralStatusCodes.ServiceNotSupported]: 'Service not supported',
//   [GeneralStatusCodes.InvalidAttributeValue]: 'Invalid attribute value',
//   [GeneralStatusCodes.AttributeListError]: 'Attribute list error',
//   [GeneralStatusCodes.AlreadyInRequestedModeOrState]: 'Already in requested mode/state',
//   [GeneralStatusCodes.ObjectStateConflict]: 'Object state conflict',
//   [GeneralStatusCodes.ObjectAlreadyExists]: 'Object already exists',
//   [GeneralStatusCodes.AttributeNotSettable]: 'Attribute not settable',
//   [GeneralStatusCodes.PrivilegeViolation]: 'Privilege violation',
//   0x10: 'Device state conflict',
//   0x11: 'Reply data too large',
//   0x12: 'Fragmentation of a primitive value',
//   0x13: 'Not enough data',
//   0x14: 'Attribute not supported',
//   0x15: 'Too much data',
//   0x16: 'Objet does not exist',
//   0x17: 'Service fragmentation sequence not in progress',
//   0x18: 'No stored attribute data',
//   0x19: 'Store operation failure',
//   0x1A: 'Routing failure, request packet too large',
//   0x1B: 'Routing failure, response packet too large',
//   0x1C: 'Missing attribute list entry data',
//   0x1D: 'Invalid attribute value list',
//   0x1E: 'Embedded service error',
//   0x1F: 'Vendor specific error',
//   0x20: 'Invalid parameter',
//   0x21: 'Write-once value or medium already written',
//   0x22: 'Invalid Replay Received',
//   0x25: 'Key Failure in path',
//   0x26: 'Path Size Invalid',
//   0x27: 'Unexpected attribute in list',
//   0x28: 'Invalid member ID',
//   0x29: 'Member not settable',
//   0x2A: 'Group 2 only server general failure',
//   [GeneralStatusCodes.UnknownModbusError]: 'Unknown Modbus Error'
// });
// CIP-V1-1.0 Appendix B-1. General status codes
export const GeneralStatusDescriptions = Object.freeze({
    0x01: 'A connection related service failed along the connection path.',
    0x02: 'Resources needed for the object to perform the requested service were unavailable.',
    0x03: 'See Status Code 0x20, which is the preferred value to use for this condition.',
    0x04: 'The path segment identifier or the segment syntax was not understood by the processing node. Path processing shall stop when a path segment error is encountered.',
    0x05: 'The path is referencing an object class, instance or structure element that is not known or is not contained in the processing node. Path processing shall stop when a path destination unknown error is encountered.',
    0x06: 'Only part of the expected data was transferred.',
    0x07: 'The message connection was lost.',
    0x08: 'The requested service was not implemented or was not defined for this Object Class/Instance.',
    0x09: 'Invalid attribute data detected.',
    0x0A: 'An attribute in the Get_Attribute_List or Set_Attribute_List response has a non-zero status.',
    0x0B: 'The object is already in the mode/state being requested by the service.',
    0x0C: 'The object cannot perform the requested service in its current mode/state.',
    0x0D: 'The requested instance of object to be created already exists.',
    0x0E: 'A request to modify a non-modifiable attribute was received.',
    0x0F: 'A permission/privilege check failed.',
    0x10: 'The device’s current mode/state prohibits the execution of the requested service.',
    0x11: 'The data to be transmitted in the response buffer is larger than the allocated response buffer.',
    0x12: 'The service specified an operation that is going to fragment a primitive data value, i.e. half a REAL data type.',
    0x13: 'The service did not supply enough data to perform the specified operation.',
    0x14: 'The attribute specified in the request is not supported.',
    0x15: 'The service supplied more data than was expected.',
    0x16: 'The object specified does not exist in the device.',
    0x17: 'The fragmentation sequence for this service is not currently active for this data.',
    0x18: 'The attribute data of this object was not saved prior to the requested service.',
    0x19: 'The attribute data of this object was not saved due to a failure during the attempt.',
    0x1A: 'The service request packet was too large for transmission on a network in the path to the destination. The routing device was forced to abort the service.',
    0x1B: 'The service response packet was too large for transmission on a network in the path from the destination. The routing device was forced to abort the service.',
    0x1C: 'The service did not supply an attribute in a list of attributes that was needed by the service to perform the requested behaviour.',
    0x1D: 'The service is returning the list of attributes supplied with status information for those attributes that were invalid.',
    0x1E: 'An embedded service resulted in an error.',
    0x1F: 'A vendor specific error has been encountered. The Additional Code Field of the Error Response defines the particular error encountered. Use of this General Error Code should only be performed when none of the Error Codes presented in this table or within an Object Class definition accurately reflect the error.',
    0x20: 'A parameter associated with the request was invalid. This code is used when a parameter does not meet the requirements of this specification and/or the requirements defined in an Application Object Specification.',
    0x21: 'An attempt was made to write to a write-once medium (e.g. WORM drive, PROM) that has already been written, or to modify a value that cannot be changed once established.',
    0x22: 'An invalid reply is received (e.g. reply service code does not match the request service code, or reply message is shorter than the minimum expected reply size). This status code can serve for other causes of invalid replies.',
    0x25: 'The Key Segment that was included as the first segment in the path does not match the destination module. The object specific status shall indicate which part of the key check failed.',
    0x26: 'The size of the path which was sent with the Service Request is either not large enough to allow the Request to be routed to an object or too much routing data was included.',
    0x27: 'An attempt was made to set an attribute that is not able to be set at this time.',
    0x28: 'The Member ID specified in the request does not exist in the specified Class/Instance/Attribute.',
    0x29: 'A request to modify a non-modifiable member was received.',
    0x2A: 'This error code may only be reported by DeviceNet group 2 only servers with 4K or less code space and only in place of Service not supported, Attribute not supported and Attribute not settable.',
    [GeneralStatusCodes.UnknownModbusError]: 'A CIP to Modbus translator received an unknown Modbus Exception Code.',
});
