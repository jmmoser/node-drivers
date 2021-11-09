import { DataType } from './constants';

// Help from https://github.com/plcpeople/nodepccc/blob/00b4824972baec636deb0906454f841d8b832797/nodePCCC
export function logicalASCIIAddressInfo(address: string) {
  const splitString = address.split(':');
  const prefix = splitString[0].replace(/[0-9]/gi, '');
  const info = {
    prefix,
    addrtype: prefix,
    datatype: '',
    size: -1,
    id: -1,
  };

  switch (prefix) {
    case 'S':
    case 'I':
    case 'N':
    case 'O':
    case 'B':
      info.datatype = 'INT';
      info.size = 2;
      info.id = DataType.Integer;
      break;
    case 'L': // Micrologix Only
      info.datatype = 'DINT';
      info.size = 4;
      break;
    case 'F':
      info.datatype = 'REAL';
      info.size = 4;
      info.id = DataType.Float;
      break;
    case 'T':
      info.datatype = 'TIMER';
      info.size = 6;
      info.id = DataType.Timer;
      break;
    case 'C':
      info.datatype = 'COUNTER';
      info.size = 6;
      info.id = DataType.Counter;
      break;
    case 'ST':
      info.datatype = 'STRING';
      info.size = 84;
      info.id = DataType.String;
      break;
    case 'NST': // N as string - special type to read strings moved into an integer array to support CompactLogix read-only.
      info.datatype = 'NSTRING';
      info.size = 44;
      break;
    case 'R':
      info.datatype = 'CONTROL';
      info.size = 6;
      info.id = DataType.Control;
      break;
    case 'A': // TODO - support this.
    default:
      console.log(`Failed to find a match for ${splitString[0]} possibly because ${prefix} type is not supported yet.`);
      return undefined;
  }

  return info;
}
