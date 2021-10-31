import {
  ClassCodes,
  ClassNames,
} from './classes.js';

import {
  CommonServiceCodes,
  CommonServiceNames,
} from './services.js';

import {
  GeneralStatusCodes,
  GeneralStatusNames,
  GeneralStatusDescriptions,
} from './statuses.js';

import * as Vendors from './vendors.js';
// asdf.default.VendorNames

export default {
  ClassCodes,
  ClassNames,
  CommonServiceCodes,
  CommonServiceNames,
  GeneralStatusCodes,
  GeneralStatusNames,
  GeneralStatusDescriptions,
  VendorNames: Vendors.default.VendorNames,
};
