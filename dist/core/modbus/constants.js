export var Functions;
(function (Functions) {
    Functions[Functions["ReadCoils"] = 1] = "ReadCoils";
    Functions[Functions["ReadDiscreteInputs"] = 2] = "ReadDiscreteInputs";
    Functions[Functions["ReadHoldingRegisters"] = 3] = "ReadHoldingRegisters";
    Functions[Functions["ReadInputRegisters"] = 4] = "ReadInputRegisters";
    Functions[Functions["WriteSingleCoil"] = 5] = "WriteSingleCoil";
    Functions[Functions["WriteSingleHoldingRegister"] = 6] = "WriteSingleHoldingRegister";
    Functions[Functions["WriteMultipleCoils"] = 15] = "WriteMultipleCoils";
    Functions[Functions["WriteMultipleHoldingRegisters"] = 16] = "WriteMultipleHoldingRegisters";
    Functions[Functions["MaskWriteRegister"] = 22] = "MaskWriteRegister";
    Functions[Functions["WriteAndReadRegisters"] = 23] = "WriteAndReadRegisters";
    Functions[Functions["ReadFIFOQueue"] = 24] = "ReadFIFOQueue";
    Functions[Functions["EncapsulatedInterfaceTransport"] = 43] = "EncapsulatedInterfaceTransport";
})(Functions || (Functions = {}));
;
export var SearialLineFunctions;
(function (SearialLineFunctions) {
    SearialLineFunctions[SearialLineFunctions["ReadExceptionStatus"] = 7] = "ReadExceptionStatus";
    SearialLineFunctions[SearialLineFunctions["Diagnostics"] = 8] = "Diagnostics";
    SearialLineFunctions[SearialLineFunctions["GetCommEventCounter"] = 11] = "GetCommEventCounter";
    SearialLineFunctions[SearialLineFunctions["GetCommEventLog"] = 12] = "GetCommEventLog";
    SearialLineFunctions[SearialLineFunctions["ReportServerID"] = 17] = "ReportServerID";
})(SearialLineFunctions || (SearialLineFunctions = {}));
;
export const ErrorDescriptions = Object.freeze({
    0x01: 'Illegal function',
    0x02: 'Illegal data address',
    0x03: 'Illegal data value',
    0x04: 'Slave or server failure',
    0x05: 'Acknowledge',
    0x06: 'Slave or server busy',
    0x07: 'Negative acknowledge',
    0x08: 'Memory parity',
    0x09: 'Not defined',
    0x0A: 'Gateway path',
    0x0B: 'Gateway target',
    0x0C: 'Max',
});
export var MEITransportFunctions;
(function (MEITransportFunctions) {
    MEITransportFunctions[MEITransportFunctions["CANopenGeneralReference"] = 13] = "CANopenGeneralReference";
    MEITransportFunctions[MEITransportFunctions["ReadDeviceIdentification"] = 14] = "ReadDeviceIdentification";
})(MEITransportFunctions || (MEITransportFunctions = {}));
;
