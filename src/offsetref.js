class OffsetRef {
  constructor(offset) {
    this.current = offset;
    this.locked = false;
  }

  change(delta) {
    if (this.locked) {
      //
    }
    this.current += delta;
  }
}

// function OffsetRef(offset) {
//   return {
//     current: offset,
//   };
// }

module.exports = OffsetRef;
