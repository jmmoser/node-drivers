'use strict';

/* eslint no-underscore-dangle: ["error", { "allowAfterThis": true }] */

/**
 * Append-only JSON database
 */

const fs = require('fs');
const readLine = require('readline');

class DB {
  constructor(filePath) {
    this._filePath = filePath;
    this._records = null;

    this._writeStream = fs.createWriteStream(this._filePath, { flags: 'a', encoding: 'utf8' });
  }

  async clear() {
    if (this._clearing != null) {
      return this._clearing;
    }

    await this._records;
    this._records = null;

    this._clearing = fs.promises.truncate(this._filePath, 0);
    await this._clearing;
    this._clearing = null;

    return undefined;
  }

  // async clear() {
  //   await this._records;
  //   this._records = null;
  //   this._clearing = fs.promises.truncate(this._filePath, 0);
  //   await this._clearing;
  //   this._clearing = null;
  // }

  async append(obj) {
    await this._clearing;
    const records = await this._records;
    records.push(obj);

    await new Promise((resolve) => {
      this._writeStream.write(`${JSON.stringify(obj)}\n`, resolve);
    });
  }

  async read() {
    if (this._records != null) {
      return this._records;
    }

    await this._clearing;

    this._records = new Promise((resolve) => {
      const readInterface = readLine.createInterface(fs.createReadStream(this._filePath, 'utf8'));

      const records = [];

      readInterface.on('line', (line) => {
        try {
          records.push(JSON.stringify(line));
        } catch (err) {
          //
        }
      });

      readInterface.on('close', () => {
        resolve(records);
      });
    });

    return this._records;
  }
}

module.exports = DB;
