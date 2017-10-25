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

const testData = require('./shared/test-data');

let bout = 0.0;

var builder = NeuralNetwork.Builder.fromCsv(testData.TEST_CSV_DATA);
builder.header(false);
builder.inputs.range(0, 3);
builder.outputs.pick(3);

var nn = builder.build();
nn._initTrainedData();


var numClients = 0;

var NUM_TOTAL_ITERATIONS = 100;
var numResults;

function train() {
  if (numClients == 0) {
    return;
  }

  numResults = 0;

  io.emit('receive data', {
    inputData: nn.inputData,
    outputData: nn.outputData
  });

  io.emit('receive trained data', {
    wWeights: nn.trainedData.wWeights,
    vWeights: nn.trainedData.vWeights,
    bias: nn.trainedData.bias,
    bout: bout
  });

  io.emit('train', Math.floor(NUM_TOTAL_ITERATIONS / numClients));
}

app.get('/train', function (req, res) {
  train();
  res.send('Training with ' + numClients + ' clients, ' + Math.floor(NUM_TOTAL_ITERATIONS / numClients) + ' iterations per client.');
});

io.on('connection', function (socket) {
  numClients++;

  socket.on('update trained data', function (deltas) {
    //console.log('update trained data by deltas', deltas);

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

    bout += deltas.bout;

    numResults++;

    if (numResults == NUM_TOTAL_ITERATIONS * nn.outputData.values.length) {
      console.log('DONE');
      
      // sigmoid function
      const transfer = (value) => {
          return 1.0 / (1.0 + Math.exp(-value));
      };

      /**
       * @param {number[]} rowElements
       */
      const calculateFOut = (rowElements) => {
        /** @type {number[]} */
        let arr = Array.from(Array(nn._dimension)).map((el, i) => {
            let sum = 0.0;
            
            for (let j = 0; j < nn._dimension; j++) {
                sum += rowElements[j] * nn.trainedData.wWeights[j][i];
            }

            return transfer(sum + nn.trainedData.bias[i]);
        });

        let fout = arr.reduce((accum, el, i) => {
            return accum + (el * nn.trainedData.vWeights[i]);
        }, 0);

        fout = transfer(fout + bout);

        return { fout, foutArray: arr };
      };

      const result = new Result((input) => {
        return calculateFOut(input).fout;
      });

      console.log(result.predict([2.5,2.5,2.5]));

    } else {
      socket.broadcast.emit('receive trained data', {
        wWeights: nn.trainedData.wWeights,
        vWeights: nn.trainedData.vWeights,
        bias: nn.trainedData.bias,
        bout: bout
      });
    }
  });

  socket.on('disconnect', function () {
    console.log('disconnect');
    numClients--;
  });
});

server.listen(8080);