'use strict';

const express = require('express');
var app = express();
const path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);


app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

const NeuralNetwork = require('./shared/neural-network');
const Data = require('./shared/input-data');
const Result = require('./shared/result');
const forwardPropagation = require('./shared/forward-propagation');

const testData = require('./shared/test-data');

var builder = NeuralNetwork.Builder.fromCsv(testData.TEST_DATA_IRIS);
builder.header(false);
builder.inputs.range(0, 4);
builder.outputs.pick(4);

var nn = builder.build();
nn._initTrainedData();

let clients = [];

var NUM_TOTAL_ITERATIONS = 1000;
var numResults;

const TrainingMode = {
  /** Split iterations for all input data across clients. */
  DIVIDE_TOTAL_ITERATIONS: 1,
  /** Split input data with same number of iterations across clients. */
  DIVIDE_INPUT_DATA: 2
};

const trainingMode = TrainingMode.DIVIDE_INPUT_DATA;

function train() {
  if (clients.length == 0) {
    return;
  }

  numResults = 0;

  const data = {
    inputData: nn.inputData,
    outputData: nn.outputData
  };

  const trainedData = {
    wWeights: nn.trainedData.wWeights,
    vWeights: nn.trainedData.vWeights,
    bias: nn.trainedData.bias,
    bout: nn.trainedData.bout
  };

  switch (trainingMode) {
    case TrainingMode.DIVIDE_TOTAL_ITERATIONS:
      io.emit('receive data', data);
      io.emit('receive trained data', trainedData);

      io.emit('train', Math.floor(NUM_TOTAL_ITERATIONS / clients.length));

      break;

    case TrainingMode.DIVIDE_INPUT_DATA: {
      let dimensionPerClient = nn.outputData.values.length / clients.length;
      console.log('dimensionPerClient = ', dimensionPerClient);

      for (let i = 0; i < clients.length; i++) {
        let socketId = clients[i].id;

        io.sockets.connected[socketId].emit('receive data', data);
        io.sockets.connected[socketId].emit('receive trained data', Object.assign({
          // this basically freezes the weights outside of this range. Could be optimized,
          // as it still sends ALL input data...
          range: {
            start: i * dimensionPerClient,
            end: (i * dimensionPerClient) + dimensionPerClient
          }
        }, trainedData));

        io.sockets.connected[socketId].emit('train', NUM_TOTAL_ITERATIONS);
      }

      break;
    }
  }
}

function updateDeltas(deltas) {
  var wWeights = deltas.wWeights;
  var vWeights = deltas.vWeights;
  var bias = deltas.bias;

  for (let i = 0; i < wWeights.length; i++) {
    for (let j = 0; j < wWeights[i].length; j++) {
      nn.trainedData.wWeights[i][j] += wWeights[i][j];
    }
  }

  for (let i = 0; i < vWeights.length; i++) {
    nn.trainedData.vWeights[i] += vWeights[i];
  }

  for (let i = 0; i < bias.length; i++) {
    nn.trainedData.bias[i] += bias[i];
  }

  nn.trainedData.bout += deltas.bout;
}

/**
 * @param {Result} result 
 */
function calculateRootMeanSquaredError(result) {
  // calculate MSE:
  var squaredErrors = [];

  for (var i = 0; i < nn.inputData.values.length; i++) {
    var predictedResult = result.predict(nn.inputData.values[i]);
    console.log('predictedResult:', predictedResult);

    var actualResult = nn.outputData.numericVariableAt(i, 0); // first
    console.log('actualResult:', actualResult);

    var error = actualResult - predictedResult;
    squaredErrors.push(Math.pow(error, 2));

    console.log('----------');
  }

  // mean
  var meanSquaredError = squaredErrors.reduce(function (accum, el) {
    return accum + (el / squaredErrors.length);
  }, 0.0);

  return Math.sqrt(meanSquaredError);
}

function done() {
  console.log('done');

  const result = new Result((input) => forwardPropagation(nn.trainedData, nn._dimension, input).fout);

  var rmse = calculateRootMeanSquaredError(result);
  console.log('Root Mean Squared Error:', rmse);

  console.log('Demo prediction for [5.0,3.3,1.4,0.2]:', nn.outputData.reverseLookup(0, result.predict([5.0,3.3,1.4,0.2])));

  return result;
}

app.get('/train', function (req, res) {
  train();
  res.send('Training with ' + clients.length + ' clients. Mode: ' + trainingMode);
});

let finishEarlyTimeout;

io.on('connection', function (socket) {
  clients.push(socket);

  socket.on('update trained data', function (deltas) {
    updateDeltas(deltas);

    numResults++;
    // console.log('numResults = ', numResults);
    // console.log('max = ', NUM_TOTAL_ITERATIONS * nn.outputData.values.length * clients.length);

    let resultsCompleted = false;

    switch (trainingMode) {
      case TrainingMode.DIVIDE_TOTAL_ITERATIONS:
        resultsCompleted = numResults == NUM_TOTAL_ITERATIONS * nn.outputData.values.length;
        break;
      case TrainingMode.DIVIDE_INPUT_DATA:
        resultsCompleted = numResults == NUM_TOTAL_ITERATIONS * nn.outputData.values.length * clients.length;
        break;
    }

    if (resultsCompleted) {
      done();
    } else {
      socket.broadcast.emit('receive trained data', {
        wWeights: nn.trainedData.wWeights,
        vWeights: nn.trainedData.vWeights,
        bias: nn.trainedData.bias,
        bout: nn.trainedData.bout
      });

      if (finishEarlyTimeout) {
        clearTimeout(finishEarlyTimeout);
        finishEarlyTimeout = null;
      }

      finishEarlyTimeout = setTimeout(() => {
        done();

        clearTimeout(finishEarlyTimeout);
        finishEarlyTimeout = null;
      }, 3500);
    }
  });

  socket.on('disconnect', function () {
    console.log('disconnect');
    const index = clients.indexOf(socket);

    if (index === -1) {
      throw Error(`index not found for client with id ${socket.id}`);
    }

    clients.splice(index, 1);
  });
});

server.listen(8080);