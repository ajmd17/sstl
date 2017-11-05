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

TrainedData.prototype.clone = function () {
  let data = this.copy();
  return new TrainedData(data.vWeights, data.wWeights, data.bias, data.bout, this.range);
};

TrainedData.prototype.copy = function () {
  var before = {
    wWeights: [],
    vWeights: [],
    bias: [],
    bout: this.bout
  };

  for (var i = 0; i < this.vWeights.length; i++) {
    before.vWeights.push(this.vWeights[i]);
  }

  for (var i = 0; i < this.wWeights.length; i++) {
    var current = [];

    for (var j = 0; j < this.wWeights[i].length; j++) {
      current.push(this.wWeights[i][j]);
    }

    before.wWeights.push(current);
  }

  for (var i = 0; i < this.bias.length; i++) {
    before.bias.push(this.bias[i]);
  }

  return before;
};

TrainedData.prototype.difference = function (before) {
  // get deltas
  return {
    vWeights: this.vWeights.map(function (x, i) {
      return x - before.vWeights[i];
    }),
    wWeights: this.wWeights.map(function (x, i) {
      return x.map(function (y, j) {
        return y - before.wWeights[i][j];
      })
    }),
    bias: this.bias.map(function (x, i) {
      return x - before.bias[i];
    }),
    bout: this.bout - before.bout
  };
};

TrainedData.prototype.add = function (deltas) {
  var wWeights = deltas.wWeights;
  var vWeights = deltas.vWeights;
  var bias = deltas.bias;

  for (let i = 0; i < wWeights.length; i++) {
    for (let j = 0; j < wWeights[i].length; j++) {
      this.wWeights[i][j] += wWeights[i][j];
    }
  }

  for (let i = 0; i < vWeights.length; i++) {
    this.vWeights[i] += vWeights[i];
  }

  for (let i = 0; i < bias.length; i++) {
    this.bias[i] += bias[i];
  }

  this.bout += deltas.bout;

  return this;
}


if (typeof module === 'object') {
  module.exports = TrainedData;
}