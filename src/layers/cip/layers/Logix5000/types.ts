
export interface TagObject {
  id: number;
  name?: string;
}

export type TagInput = string | number | TagObject;

export interface TagListResponse {
  id: number;
  attributes: { [key: number]: any | undefined; };
}

// export interface SymbolInfo {
//   dataType: any;
// }
