'use strict';

const Layer = require('./Layer');

// 9/19/2017 I am nearly 100% sure this layer is needed!  Multiple upperlayers
// must all use the same same context incrementor

// Multiplexes connected and unconnected messages
// handles interfacing with lower layer (EIPLayer)
// using connected and unconnected sends,
// connection IDs, sequence numbers, etc.
class CIPLayer extends Layer {
  // constructor(lowerLayer) {
  //   super(lowerLayer, function(cipObject) {
  //     console.log('Layer adder called');
  //
  //     if (this._disconnecting === 1) return;
  //     this._layers.push(cipObject);
  //     // cipObject._layer = this;
  //   });
  //
  //   this._layers = [];
  //   this._setupCallbacks();
  //
  //   this._context = 0; // pseudo-context for unconnected messages
  // }

  constructor(lowerLayer) {
    super(lowerLayer, true);

    this._layers = [];
    this._setupCallbacks();

    this._context = 0; // pseudo-context for unconnected messages
  }

  _incrementContext() {
    this._context = (this._context + 1) % 0x100000000;
    return this._context;
  }

  connect(callback) {
    // this probably shouldn't be called
    if (callback) callback();
  }

  _connectedObjects() {
    let objs = [];
    let length = this._layers.length;
    for (let i = 0; i < length; i++) {
      let obj = this._layers[i];
      if (isFunction(obj.connectionState) && obj.connectionState() === 2) {
        objs.push(obj);
      }
    }
    return objs;
  }

  disconnect(callback) {
    let self = this;

    if (self._disconnecting === 1) return;

    let connectedObjects = self._connectedObjects();

    if (connectedObjects.length === 0) {
      if (callback) callback();
      return;
    }

    self._diconnecting = 1;
    self._disconnectCount = 0;

    let objectCount = self._layers.length;

    let objectDisconnectCallback = function() {
      self._disconnectCount++;
      if (self._disconnectCount >= objectCount) {
        clearTimeout(self._disconnectTimer);
        self._disconnecting = 0;
        if (callback) callback();
      }
    };

    self._disconnectTimer = setTimeout(function() {
      self._layers = [];
      self._disconnecting = 0;
      if (callback) callback();
    }, 10000);

    for (let i = 0; i < connectedObjects.length; i++) {
      connectedObjects[i].disconnect(objectDisconnectCallback);
    }
  }

  _setupCallbacks() {
    this._callbacks = {};
    this._connectedCallbacks = {};
  }

  // is this function used???
  _incrementSequenceCount(cipObject) {
    cipObject._sequenceCount = (cipObject._sequenceCount + 1) % 0x10000;
    return cipObject._sequenceCount;
  }


  // addObject(cipObject) {
  //   if (this._disconnecting === 1) return;
  //
  //   this._layers.push(cipObject);
  //   cipObject._layer = this;
  //   return cipObject;
  // }

  registerConnection(connection) {
    if (this._disconnecting === 1) return;
    this._layers.push(connection);
    return connection;
  }

  setConnectionResponseCallback(TtoOConnectionID, callback) {
    if (callback) {
      this._connectedCallbacks[TtoOConnectionID] = callback;
    } else if (this._connectedCallbacks[TtoOConnectionID]) {
      delete this._connectedCallbacks[TtoOConnectionID];
    }
  }

  // sendUnconnected(message, callback) {
  //   // if (this._disconnecting === 1) return;
  //
  //   // Context is used by EIPLayer for unconnected sends
  //   // calback -> context -> senderContext ... senderContext -> context -> callback
  //   let context = this._incrementContext();
  //   if (callback != null) this._callbacks[context] = callback; // some messages won't require a callback
  //   // this.send(message, { connected: false, context: context }, false);
  //   this.send(message, { context: context }, false);
  // }
  //
  // sendConnected(OtoTConnectionID, message) {
  //   // if (this._disconnecting === 1) return;
  //
  //   // No callback because connected messages do not cause a response
  //   // A response may occure and will be mapped to connection by connectionID
  //   // The connection can use the sequnce count to determine the request for the response
  //
  //   // this.send(message, { connected: true, connectionID: OtoTConnectionID }, false);
  //   this.send(message, { context: this._context }, false);
  // }

  sendNextMessage() {
    // No implementation needed

    // This needs to be changed, unconnected sends may not even need cip layer
    // Maybe they still need cip layer, not sure...

    // 9/18/2017
    // I think this layer just acts as a helper above the EIPLayer.
    // Provides connected and unconnected sends to EIPLayer, don't
    // have to worry about info parameter.
    // throw new Error('Layer above CIPLayer called send');

    let request = this.getNextRequest();

    if (request) {
      this.send(request.message, request.info, false, this.contextCallback(function(data, info, context) {
        this.forwardTo(request.layer, data, info, context);
      }));
      this.sendNextMessage();
    }
  }

  handleData(message, info, context) {
    if (this._disconnecting === 1) return;

    let callback = null;

    if (info.connected === false) {
      if (context != null) {
        if (this._callbacks[context]) {
          callback = this._callbacks[context];
          delete this._callbacks[context];
        }
      }
    } else if (info.connected === true) {
      let connectionID = info.connectionID;
      if (this._connectedCallbacks[connectionID]) {
        callback = this._connectedCallbacks[connectionID];
      }
    }

    if (callback) {
      callback(message, info);
    } else {
      console.log('');
      console.log('CIPLayer Error: Unhandled message:');
      console.log(info);
      console.log(message);
    }
  }

  // handleData(message, info, context) {
  //   if (this._disconnecting === 1) return;
  //
  //   let callback = null;
  //
  //   if (info.connected === false) {
  //     if (info.context) {
  //       if (this._callbacks[info.context]) {
  //         callback = this._callbacks[info.context];
  //         delete this._callbacks[info.context];
  //       }
  //     }
  //   } else if (info.connected === true) {
  //     let connectionID = info.connectionID;
  //     if (this._connectedCallbacks[connectionID]) {
  //       callback = this._connectedCallbacks[connectionID];
  //     }
  //   }
  //
  //   if (callback) {
  //     callback(message, info);
  //   } else {
  //     console.log('');
  //     console.log('CIPLayer Error: Unhandled message:');
  //     console.log(info);
  //     console.log(message);
  //   }
  // }
}

module.exports = CIPLayer;

function isFunction(obj) {
  return !!(obj && obj.constructor && obj.call && obj.apply);
}
