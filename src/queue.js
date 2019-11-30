'use strict';

class Queue {
  constructor() {
    this._queue = [];
    this._priorityQueue = [];
  }

  size(priorityOnly) {
    if (priorityOnly === true) {
      return this._priorityQueue.length;
    }
    return this._priorityQueue.length + this._queue.length;
  }

  enqueue(obj, priority) {
    if (priority) {
      this._priorityQueue.push(obj);
    } else {
      this._queue.push(obj);
    }
  }

  dequeue() {
    if (this._priorityQueue.length > 0) {
      return this._priorityQueue.shift();
    } else if (this._queue.length > 0) {
      return this._queue.shift();
    }
    // const obj = this._priorityQueue.shift();
    // if (obj) return obj;
    // return this._queue.shift();
  }

  peek() {
    if (this._priorityQueue.length > 0) {
      return this._priorityQueue[0];
    } else if (this._queue.length > 0) {
      return this._queue[0];
    }
  }

  clear() {
    this._queue.length = 0;
    this._priorityQueue.length = 0;
  }
}

module.exports = Queue;
