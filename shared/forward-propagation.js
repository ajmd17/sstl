if (typeof require === 'function') {
  var TrainedData = require('./trained-data');
}

/**
 * @param {number} dimension
 * @param {TrainedData} trainedData
 * @param {number[]} rowElements
 */
function forwardPropagation(trainedData, dimension, rowElements) {
  /** @type {number[]} */
  let arr = Array.from(Array(dimension)).map((el, i) => {
    // 1. activation
    var activation = 0.0;
    
    for (var j = 0; j < dimension; j++) {
      activation += rowElements[j] * trainedData.wWeights[j][i];
    }

    // 2. transfer
    return transferFunction(activation + trainedData.bias[i]);
  });

  let fout = arr.reduce((accum, el, i) => {
    return accum + (el * trainedData.vWeights[i]);
  }, 0);

  fout = transferFunction(fout + trainedData.bout);

  return { fout, foutArray: arr };
}

// sigmoid function
function transferFunction(value) {
  return 1.0 / (1.0 + Math.exp(-value));
}

if (typeof module === 'object') {
  module.exports = forwardPropagation;
}