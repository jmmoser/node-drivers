export default class CIPFeature {
  code: number;
  description: string;
  classCode: number;
  
  constructor(code: number, description: string, classCode: number) {
    this.code = code;
    this.description = description;
    this.classCode = classCode;
  }
}
