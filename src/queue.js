'use strict';

class Queue {
  constructor() {
    this._queue = [];
    this._priorityQueue = [];
  }

  size() {
    return this._priorityQueue.length > 0 || this._queue.length > 0;
  }

  enqueue(obj, priority) {
    if (priority) {
      this._priorityQueue.push(obj);
    } else {
      this._queue.push(obj);
    }
  }

  dequeue() {
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
