import CIPFeature from './feature.js';

export default class CIPFeatureGroup {
  constructor(features) {
    this.features = Array.isArray(features) ? features : [];
    this.featureCodeMap = new Map(this.features.map((feature) => [feature.code, feature]));
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
    const featureObject = this.get(feature);
    if (featureObject) {
      return featureObject.code;
    }
    return undefined;
  }

  getName(feature) {
    const featureObject = this.get(feature);
    if (featureObject) {
      return featureObject.name;
    }
    return undefined;
  }
}
