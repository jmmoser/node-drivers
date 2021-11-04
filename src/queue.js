/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */

export default class Queue {
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

  dequeue(consumeAll) {
    if (consumeAll === true) {
      if (this._priorityQueue.length > 0) {
        const entities = [...this._priorityQueue];
        this._priorityQueue.length = 0;
        return entities;
      }

      const entities = [...this._queue];
      this._queue.length = 0;
      return entities;
    }

    if (this._priorityQueue.length > 0) {
      return this._priorityQueue.shift();
    }

    if (this._queue.length > 0) {
      return this._queue.shift();
    }

    return undefined;
  }

  // dequeue() {
  //   if (this._priorityQueue.length > 0) {
  //     return this._priorityQueue.shift();
  //   }

  //   if (this._queue.length > 0) {
  //     return this._queue.shift();
  //   }

  //   return undefined;
  // }

  peek() {
    if (this._priorityQueue.length > 0) {
      return this._priorityQueue[0];
    }

    if (this._queue.length > 0) {
      return this._queue[0];
    }

    return undefined;
  }

  clear() {
    this._queue.length = 0;
    this._priorityQueue.length = 0;
  }

  iterate(cb) {
    let finished = false;

    function iterator(queue) {
      let i = 0;
      function consumer() {
        queue.splice(i, 1);
        i -= 1;
      }

      while (i < queue.length) {
        if (!cb(queue[i], consumer)) {
          finished = true;
          break;
        }
        i += 1;
      }
    }

    if (!finished) {
      iterator(this._priorityQueue);
    }

    if (!finished) {
      iterator(this._queue);
    }
  }
}
