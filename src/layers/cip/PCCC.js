'use strict';

const EPath = require('./objects/EPath');
const CIP = require('./objects/CIP');
const CIPLayer = require('./objects/CIPLayer');
const MessageRouter = require('./objects/MessageRouter');

const HEADER_LENGTH = 7;


class PCCC extends CIPLayer {
  constructor(lowerLayer, options) {
    super('cip.pccc', lowerLayer);

    this.options = Object.assign({
      vendorID: 0x0001,
      serialNumber: 0x01020304
    }, options);
    
    const header = Buffer.allocUnsafe(HEADER_LENGTH);
    header.writeUInt8(HEADER_LENGTH, 0);
    header.writeUInt16LE(this.options.vendorID, 1);
    header.writeUInt32LE(this.options.serialNumber, 3);

    this.header = header;
  }

  sendNextMessage() {
    const request = this.getNextRequest();
    if (request != null) {
      const pcccMessage = request.message;

      const data = Buffer.concat(
        [this.header, pcccMessage],
        HEADER_LENGTH + pcccMessage.length
      );

      send(this, Services.ExecutePCCC, data);

      setImmediate(() => this.sendNextMessage());
    }
  }


  handleData(data, info, context, error) {
    if (context) {
      /** Since this class extends CIPLayer, allow CIPLayer to handle requests like identity() and supportedObjects() */
      super.handleData(data, info, context, error);
      return;
    }

    if (data) {
      const reply = MessageRouter.Reply(data);

      if (data.length > 4 && !reply.status.error) {
        /** Only ExcutePCCC service supported right now */
        if (reply.service.code === Services.ExecutePCCC) {
          this.forward(reply.data.slice(reply.data.readUInt8(0)), info, context);
        } else {
          console.log(reply);
          console.log(`CIP_PCCCLayer: Unexpected CIP reply service code, ${reply.service.code}. Expected 0x${Services.ExecutePCCC.toString(16)}.  This could be a developer error - was another service added?`);
        }
      } else {
        console.log('CIP_PCCCLayer: Unexpected PCCC embedded in CIP response:');
        console.log(reply);
      }
    } else if (error) {
      this.forward(data, info, context, error);
    }
  }
}


const PCCC_EPATH = EPath.Encode(
  CIP.Classes.PCCC,
  0x01
);

/** Use driver specific error handling if exists */
function send(self, service, data) {
  return CIPLayer.send(self, false, service, PCCC_EPATH, data);
}

const Services = {
  ExecutePCCC: 0x4B
};


module.exports = PCCC;
