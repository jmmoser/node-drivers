'use strict';

const Layer = require('./../Stack/Layers/Layer');
const MessageRouter = require('./Objects/MessageRouter');

class ControlLogix extends Layer {
  constructor(connectionLayer, options) {
    super(connectionLayer);
  }

  ReadTag(address, callback) {
    const BASE_ERROR = 'ControlLogix Error: Read Tag: ';
    if (callback == null) return;

    if (address == null || address.length === 0) {
      callback(BASE_ERROR + 'Address must be specified');
      return;
    }

    let path = MessageRouter.ANSIExtSymbolSegment(address);
    const data = Buffer.from([0x01, 0x00]); // number of elements to read (1)

    let request = MessageRouter.Request(Services.ReadTag, path, data);

    this.send(request, null, false, this.contextCallback(function(message) {
      let reply = MessageRouter.Reply(message);

      if (reply.statusCode !== 0) {
        if (READ_TAG_ERRORS[reply.statusCode] != null) {
          reply.statusDescription = READ_TAG_ERRORS[reply.statusCode];
        }
        callback(BASE_ERROR + reply.statusDescription);
        return;
      }

      let dataType = reply.data.readUInt16LE(0);
      let dataConverter = DataConverters[dataType];
      if (dataConverter) {
        callback(null, dataConverter(reply.data, 2));
      } else {
        callback(BASE_ERROR + 'No converter for data type: ' + dataType);
      }
    }));
  }

  WriteTag(address, value, callback) {
    const BASE_ERROR = 'ControlLogix Error: Write Tag: ';
    if (address == null || address.length === 0) {
      if (callback != null) {
        callback(BASE_ERROR + 'Address must be specified');
      }
      return;
    }

    let path = MessageRouter.ANSIExtSymbolSegment(address);
    let data = Buffer.alloc(8);
    data.writeUInt16LE(DataTypes.Float, 0);
    data.writeUInt16LE(1, 2);
    data.writeFloatLE(value, 4);

    let request = MessageRouter.Request(Services.WriteTag, path, data);

    this.send(request, null, false, this.contextCallback(function(message) {
      let reply = MessageRouter.Reply(message);
      if (callback != null) callback(null, reply);
    }));
  }

  ReadModifyWriteTag(address, sizeOfMasks ORmasks, ANDmasks, callback) {
    const BASE_ERROR = 'ControlLogix Error: Read Modify Write Tag: ';
    if (address == null || address.length === 0) {
      if (callback != null) {
        callback(BASE_ERROR + 'Address must be specified');
      }
      return;
    }


  }

  handleData(data, info, context) {
    if (context == null) {
      throw new Error('ControlLogix Error: Unhandled message, context should not be null');
    }

    let callback = this.getCallbackForContext(context);
    if (callback != null) {
      callback(data, info);
    }
  }
}

module.exports = ControlLogix;


// 1756-PM020, pg. 16
const Services = {
  ReadTag: 0x4C,
  ReadTagFragmented: 0x52,
  WriteTag: 0x4D,
  WriteTagFragmented: 0x53,
  ReadModifyWriteTag: 0x4E,

  MultipleServicePacket: 0x0A // used to combine multiple requests in one message frame
};

const DataTypes = {
  Byte: 0xC1,
  Char: 0xC2,
  Short: 0xC3,
  Integer: 0xC4,
  Float: 0xCA,
  UnsignedInteger: 0xD3
}

const DataConverters = {
  0x00C1: function(buffer, offset) {
    return !!buffer.readUInt8(offset);
  },
  0x00C2: function(buffer, offset) {
    return buffer.readInt8(offset);
  },
  0x00C3: function(buffer, offset) {
    return buffer.readInt16LE(offset);
  },
  0x00C4: function(buffer, offset) {
    return buffer.readInt32(offset);
  },
  0x00CA: function(buffer, offset) {
    return buffer.readFloatLE(offset);
  },
  0x00D3: function(buffer, offset) {
    return buffer.readUInt32LE(offset);
  }
};

// CIP Logix5000 1756-PM020 Page 19, Read Tag Service Error Codes
const READ_TAG_ERRORS = {
  0x04: 'A syntax error was detected decoding the Request Path',
  0x05: 'Request Path destination unknown: Probably instance number is not present',
  0x06: 'Insufficient Packet Space: Not enough room in the response buffer for all the data',
  0x13: 'Insufficient Request Data: Data too short for expected parameters',
  0x26: 'The Request Path Size received was shorter or longer than expected',
  0xFF: 'General Error: Access beyond end of the object'
};
