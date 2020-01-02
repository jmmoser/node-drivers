'use strict';

const CIPFeature = require('./feature');

class CIPFeatureGroup {
  constructor(features) {
    this.features = Array.isArray(features) ? features : [];
    this.featureCodeMap = new Map(this.features.map(feature => [feature.code, feature]));
  }

  register(feature) {
    this.features.push(feature);
    this.featureCodeMap.set(feature.code, feature);
    return feature;
  }

  get(feature) {
    if (feature instanceof CIPFeature) {
      return feature;
    }
    return this.featureCodeMap.get(feature);
  }

  getCode(feature) {
    feature = this.get(feature);
    if (feature) {
      return feature.code;
    }
  }

  getName(feature) {
    feature = this.get(feature);
    if (feature) {
      return feature.name;
    }
  }
}

module.exports = CIPFeatureGroup;