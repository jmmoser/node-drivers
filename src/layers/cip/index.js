import CIPInternalLayer from './layers/internal/CIPInternalLayer.js';
import EIP from './layers/EIP/index.js';
import Logix5000 from './layers/Logix5000/index.js';
import * as Core from '../../core/cip/index.js';

class CIPLayer extends CIPInternalLayer {}

CIPLayer.EIP = EIP;
CIPLayer.Logix5000 = Logix5000;
CIPLayer.Core = Core;

export default CIPLayer;
