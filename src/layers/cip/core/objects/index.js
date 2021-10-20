'use strict';

const { ClassCodes } = require('../constants');

const Identity = require('./Identity');
const MessageRouter = require('./MessageRouter');
const Port = require('./Port');
const TCPIPInterface = require('./TCPIPInterface');
const EthernetLink = require('./EthernetLink');
const ConnectionManager = require('./ConnectionManager');

const OBJECTS = {
  [ClassCodes.Identity]: Identity,
  [ClassCodes.MessageRouter]: MessageRouter,
  [ClassCodes.Port]: Port,
  [ClassCodes.TCPIPInterface]: TCPIPInterface,
  [ClassCodes.EthernetLink]: EthernetLink,
  [ClassCodes.ConnectionManager]: ConnectionManager,
};

module.exports = {
  OBJECTS,

  Identity,
  MessageRouter,
  Port,
  TCPIPInterface,
  EthernetLink,
  // Connection: require('./Connection'),
  ConnectionManager,
};
