import { ClassCodes } from '../constants/index.js';

import Identity from './Identity.js';
import MessageRouter from './MessageRouter.js';
import Port from './Port.js';
import TCPIPInterface from './TCPIPInterface.js';
import EthernetLink from './EthernetLink.js';
import ConnectionManager from './ConnectionManager.js';

const OBJECTS = {
  [ClassCodes.Identity]: Identity,
  [ClassCodes.MessageRouter]: MessageRouter,
  [ClassCodes.Port]: Port,
  [ClassCodes.TCPIPInterface]: TCPIPInterface,
  [ClassCodes.EthernetLink]: EthernetLink,
  [ClassCodes.ConnectionManager]: ConnectionManager,
};

export default {
  OBJECTS,

  Identity,
  MessageRouter,
  Port,
  TCPIPInterface,
  EthernetLink,
  // Connection: require('./Connection'),
  ConnectionManager,
};
