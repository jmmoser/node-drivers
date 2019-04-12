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

  shift() {
    const obj = this._priorityQueue.shift();
    if (obj) return obj;
    return this._queue.shift();
  }

  peek() {
    let next = null;
    if (this._priorityQueue.length > 0) {
      next = this._priorityQueue[0];
    } else if (this._queue.length > 0) {
      next = this._queue[0];
    }
    return next;
  }
}

module.exports = Queue;
