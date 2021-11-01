import Logix5000 from './layers/Logix5000/index.js';
import * as Core from '../../core/cip/index.js';
import CIPLayer from './ciplayer.js';

CIPLayer.Logix5000 = Logix5000;
CIPLayer.Core = Core;

export default CIPLayer;
