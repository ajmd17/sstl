'use strict';

const getRowSchema = require('./get-row-schema');

class ColumnPicker {
  /** @param {number} numColumns */
  constructor(numColumns) {
      this.numColumns = numColumns;
      this._dataset = new Set();
      this._exclude = [];
  }

  values() {
    let _values = [];

    for (let x of this._dataset) {
      if (this._exclude.indexOf(x) === -1) {
        _values.push(x);
      }
    }

    return _values;
  }

  /**
   * Add specific columns to the dataset
   * @param {...number} colsToKeep
   */
  pick(colsToKeep) {
      for (let i = 0; i < arguments.length; i++) {
          if (arguments[i] < 0 || arguments[i] >= this.numColumns) {
              throw Error(`${arguments[i]} is out of range of number of columns (${this.numColumns})`);
          }

          this._dataset.add(arguments[i]);
      }

      return this;
  }

  /**
   * Remove specific columns from the dataset
   * @param {...number} colsToRemove
   */
  exclude(colsToRemove) {
    Array.prototype.push.call(this._exclude, Array.prototype.slice.call(arguments, 1));
    return this;
  }

  /**
   * Add a range of columns to the dataset
   * @param {number} start 
   * @param {number} end 
   */
  range(start, end) {
      const sign = Math.sign(end - start);

      if (sign == 1) {
          for (let i = start; i < end; i += 1) {
              this._dataset.add(i);
          }
      } else if (sign == -1) {
          for (let i = start; i > end; i -= 1) {
              this._dataset.add(i);
          }
      } else if (sign == 0) {
          this._dataset.add(start);
      }

      return this;
  }
}

module.exports = ColumnPicker;