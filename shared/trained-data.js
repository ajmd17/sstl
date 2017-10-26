/**
 * 
 * @param {number[]} vWeights 
 * @param {number[][]} wWeights
 * @param {number[]} bias
 * @param {number} bout
 * @param {{ start: number, end: number }} [range]
 */
function TrainedData(vWeights, wWeights, bias, bout, range) {
  this.vWeights = vWeights;
  this.wWeights = wWeights;
  this.bias = bias;
  this.bout = bout;
  this.range = range;
}

TrainedData.prototype.inRange = function (x) {
  if (this.range == null) {
    return true;
  }

  return x >= this.range.start && x < this.range.end;
};


if (typeof module === 'object') {
  module.exports = TrainedData;
}