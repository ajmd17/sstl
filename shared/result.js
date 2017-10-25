'use strict';

class Result {
  /**
   * 
   * @param {function(number[])} predictor 
   */
  constructor(predictor) {
      this._predictor = predictor;
  }

  /**
   * @param {number[]} input 
   */
  predict(input) {
      return this._predictor(input);
  }

  /**
   * @param {Result} other 
   * @param {number?} weight
   */
  combineWith(other, weight) {
      if (weight == undefined) weight = 0.5;

      if (weight <= 0.0 || weight >= 1.0) {
          throw Error('weight must be <= 0 or >= 1');
      }

      return new Result((input) => {
          const a = this.predict(input);
          const b = other.predict(input);
  
          return a * (1.0 - weight) + b * weight;
      });
  }
}

if (typeof module === 'object') {
    module.exports = Result;
}