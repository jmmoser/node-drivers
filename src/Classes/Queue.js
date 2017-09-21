'use strict';

class Queue {
  constructor() {
    this._queue = [];
    this._priorityQueue = [];
  }

  addToQueue(obj, priority) {
    if (priority) {
      this._priorityQueue.push(obj);
    } else {
      this._queue.push(obj);
    }
  }

  getNext() {
    let obj = null;
    obj = this._priorityQueue.shift();
    if (obj) return obj;
    return this._queue.shift();
  }
}

module.exports = Queue;
