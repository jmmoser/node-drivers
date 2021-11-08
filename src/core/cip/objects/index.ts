import { ClassCodes } from '../constants/index';

import Identity from './Identity';
import MessageRouter from './MessageRouter';
import Port from './Port';
import TCPIPInterface from './TCPIPInterface';
import EthernetLink from './EthernetLink';
import ConnectionManager from './ConnectionManager';

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
