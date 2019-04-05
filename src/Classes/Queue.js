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

  hasNext() {
    return this._priorityQueue.length > 0 || this._queue.length > 0;
  }

  getNext() {
    const obj = this._priorityQueue.shift();
    if (obj) return obj;
    return this._queue.shift();
  }
}

module.exports = Queue;
