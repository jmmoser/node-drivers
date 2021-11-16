import CIPFeature from './feature';

export default class CIPFeatureGroup {
  // features: CIPFeature[];
  featureCodeMap: Map<number, CIPFeature>;

  constructor(features?: CIPFeature[]) {
    // this.features = Array.isArray(features) ? features : [];
    features = Array.isArray(features) ? features : [];
    this.featureCodeMap = new Map(features.map((feature) => [feature.code, feature]));
  }

  register(feature: CIPFeature) {
    // this.features.push(feature);
    this.featureCodeMap.set(feature.code, feature);
    return feature;
  }

  get(feature: CIPFeature | number) {
    if (feature instanceof CIPFeature) {
      return feature;
    }
    return this.featureCodeMap.get(feature);
  }

  getCode(feature: CIPFeature | number) {
    const featureObject = this.get(feature);
    if (featureObject) {
      return featureObject.code;
    }
    return undefined;
  }

  getDescription(feature: CIPFeature | number) {
    const featureObject = this.get(feature);
    if (featureObject) {
      return featureObject.description;
    }
    return undefined;
  }
}
