import CIPFeature from './feature';
export default class CIPFeatureGroup {
    constructor(features) {
        // this.features = Array.isArray(features) ? features : [];
        features = Array.isArray(features) ? features : [];
        this.featureCodeMap = new Map(features.map((feature) => [feature.code, feature]));
    }
    register(feature) {
        // this.features.push(feature);
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
    getDescription(feature) {
        const featureObject = this.get(feature);
        if (featureObject) {
            return featureObject.description;
        }
        return undefined;
    }
}
