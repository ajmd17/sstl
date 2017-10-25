/**
 * 
 * @param {number[]} vWeights 
 * @param {number[][]} wWeights
 * @param {number[]} bias
 */
function TrainedData(vWeights, wWeights, bias) {
    this.vWeights = vWeights;
    this.wWeights = wWeights;
    this.bias = bias;
}

/**
 * Merges in-place
 * @param {TrainedData} other 
 */
TrainedData.prototype.extend = function (other) {
    this.vWeights = this.vWeights.concat(other.vWeights);
    this.wWeights = this.wWeights.concat(other.wWeights);
    this.bias = this.bias.concat(other.bias);

    return this;
};


if (typeof module === 'object') {
    module.exports = TrainedData;
}