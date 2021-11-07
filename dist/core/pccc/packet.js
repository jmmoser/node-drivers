import { STSCodeDescriptions, EXTSTSCodeDescriptionsCMDF0, } from './constants';
export default class PCCCPacket {
    constructor(command = 0, status = 0, transaction = 0, data) {
        this.command = command;
        this.transaction = transaction;
        this.data = data;
        this.status = {
            code: status,
            description: '',
            extended: {
                code: 0,
                description: '',
            },
        };
    }
    static fromBufferReply(buffer, offsetRef) {
        const packet = new PCCCPacket();
        packet.command = buffer.readUInt8(offsetRef.current);
        offsetRef.current += 1;
        packet.status.code = buffer.readUInt8(offsetRef.current);
        offsetRef.current += 1;
        packet.status.description = STSCodeDescriptions[packet.status.code] || '';
        // if (buffer.length < 4) {
        //   return packet;
        // }
        packet.transaction = buffer.readUInt16LE(offsetRef.current);
        offsetRef.current += 2;
        if (packet.status.code === 0xF0) {
            packet.status.extended.code = buffer.readUInt8(offsetRef.current);
            offsetRef.current += 1;
            packet.status.extended.description = EXTSTSCodeDescriptionsCMDF0[packet.status.extended.code] || '';
        }
        packet.data = buffer.slice(offsetRef.current);
        offsetRef.current += packet.data.length;
        return packet;
    }
}
