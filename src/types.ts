export interface Ref {
  current: number;
}

export type CodedValue = {
  code: number;
  description: string;
}

export interface CodeDescriptionMap {
  [key: number]: string;
}