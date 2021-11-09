import Logix5000 from './layers/Logix5000/index';
import * as Core from '../../core/cip/index';
import CIPLayer from './ciplayer';

CIPLayer.Logix5000 = Logix5000;
CIPLayer.Core = Core;

export default CIPLayer;
