export default interface Segment {
  encodeSize(padded: boolean): number;
  encodeTo(buffer: Buffer, offset: number, padded: boolean): number;
}