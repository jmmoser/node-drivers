
export interface TagObject {
  id: number;
  name?: string;
}

export type Tag = string | number | TagObject;

export interface TagListResponse {
  id: number;
  attributes: { [key: number]: any | undefined; };
}