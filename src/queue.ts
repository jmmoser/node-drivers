/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */
type TQueue = any[];

export default class Queue {
  _queue: TQueue;
  _priorityQueue: TQueue;

  constructor() {
    this._queue = [];
    this._priorityQueue = [];
  }

  size(priorityOnly: boolean) {
    if (priorityOnly === true) {
      return this._priorityQueue.length;
    }
    return this._priorityQueue.length + this._queue.length;
  }

  enqueue(obj: any, priority: boolean) {
    if (priority) {
      this._priorityQueue.push(obj);
    } else {
      this._queue.push(obj);
    }
  }

  dequeue(consumeAll?: boolean) {
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
}
