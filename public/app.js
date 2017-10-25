var socket;

/** @type {Data} */
var inputData, outputData;

var trainedData;
var bout = 0.0;
var dimension;

function _extractRow(rowIndex) {
  let elements = new Array(dimension);

  for (var i = 0; i < elements.length; i++) {
      elements[i] = inputData.numericVariableAt(rowIndex, i);
  }

  return elements;
}

/**
 * @param {number[]} rowElements
 */
const calculateFOut = (rowElements) => {
  /** @type {number[]} */
  let arr = Array.from(Array(dimension)).map((el, i) => {
      let sum = 0.0;

      for (let j = 0; j < dimension; j++) {
          sum += rowElements[j] * trainedData.wWeights[j][i];
      }

      return transfer(sum + trainedData.bias[i]);
  });

  let fout = arr.reduce((accum, el, i) => {
      return accum + (el * trainedData.vWeights[i]);
  }, 0);

  fout = transfer(fout + bout);

  return { fout, foutArray: arr };
};

// sigmoid function
const transfer = (value) => {
  return 1.0 / (1.0 + Math.exp(-value));
};

/**
 * @param {number} output
 * @param {number} numNeurons 
 * @param {number} dimension 
 * @param {number} fout 
 * @param {number[]} foutArray
 * @param {number[]} rowElements
 */
const learn = (output, fout, foutArray, rowElements) => {
  var before = {
    wWeights: [],
    vWeights: [],
    bias: [],
    bout: bout
  };

  for (var i = 0; i < trainedData.vWeights.length; i++) {
    before.vWeights.push(trainedData.vWeights[i]);
  }

  for (var i = 0; i < trainedData.wWeights.length; i++) {
    var current = [];

    for (var j = 0; j < trainedData.wWeights[i].length; j++) {
      current.push(trainedData.wWeights[i][j]);
    }

    before.wWeights.push(current);
  }

  for (var i = 0; i < trainedData.bias.length; i++) {
    before.bias.push(trainedData.bias[i]);
  }

  let error = output - fout;
  let n = 0.05;

  let dv;
  let dwi = new Array(dimension);
  let dw = new Array(dimension);

  for (let i = 0; i < dw.length; i++) {
      dw[i] = new Array(dimension);
  }

  let dbi = new Array(dimension);
  let db = new Array(dimension);

  dv = fout * (1.0 - fout) * error;
  for (let i = 0; i < dimension; i++) {
      trainedData.vWeights[i] += n * dv * foutArray[i];
  }

  let dbout = n * dv;
  bout += dbout;

  for (let i = 0; i < dimension; i++) {
      dwi[i] = foutArray[i] * (1.0 - foutArray[i]) * trainedData.vWeights[i] * dv;

      for (let j = 0; j < dimension; j++) {
          dw[j][i] = n * dwi[i] * rowElements[j];
          trainedData.wWeights[j][i] += dw[j][i];
      }
  }

  // modify bias
  for (let i = 0; i < dimension; i++) {
      dbi[i] = foutArray[i] * (1.0 - foutArray[i]) * trainedData.vWeights[i] * dv;
      db[i] = n * dbi[i];
      trainedData.bias[i] += db[i];
  }

  // get deltas
  var deltas = {
    vWeights: trainedData.vWeights.map(function (x, i) {
      return x - before.vWeights[i];
    }),
    wWeights: trainedData.wWeights.map(function (x, i) {
      return x.map(function (y, j) {
        return y - before.wWeights[i][j];
      })
    }),
    bias: trainedData.bias.map(function (x, i) {
      return x - before.bias[i];
    }),
    bout: bout - before.bout
  };

  //console.log('deltas = ', deltas);
  socket.emit('update trained data', deltas);
};

$(function () {
  socket = io();

  socket.on('receive data', function (data) {
    inputData = new Data(data.inputData.schema, data.inputData.values);
    outputData = new Data(data.outputData.schema, data.outputData.values);

    dimension = inputData.values[0].length;
  });

  socket.on('receive trained data', function (data) {
    trainedData = new TrainedData(data.vWeights, data.wWeights, data.bias);
    bout = data.bout;
  });
  
  socket.on('train', function (numIterations) {
    var currentIteration = 0;
    var timeout;

    setTimeout(function next() {
      console.log('Training (' + currentIteration + ' / ' + numIterations + ')...');

      if (currentIteration < numIterations) {
        for (var j = 0; j < outputData.values.length; j++) {
          var rowElements = _extractRow(j);
          var fouts = calculateFOut(rowElements);
          var x = outputData.numericVariableAt(j, 0)/* first item as arrays not supported yet */;

          learn(x, fouts.fout, fouts.foutArray, rowElements);
        }

        currentIteration++;
        setTimeout(next, 100);
      }
    }, 0);
  });
  
});