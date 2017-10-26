'use strict';

const Data = require('./input-data');
const TrainedData = require('./trained-data');
const ColumnPicker = require('./column-picker');

class NeuralNetwork {
  /**
   * @param {Data} inputData
   * @param {Data} outputData
  */
  constructor(inputData, outputData) {
      if (inputData.values.length != outputData.values.length) {
          throw Error('input data must have same length as output data');
      }

      this.inputData = inputData;
      this.outputData = outputData;

      this._dimension = inputData.values[0].length;

      /** @type {TrainedData} */
      this.trainedData = null;
  }

  _initBias() {
      let bias = new Array(this._dimension);
      for (let i = 0; i < this._dimension; i++) {
          bias[i] = Math.random() - 0.5; // put in (-0.5, 0.5) range
      }
      return bias;
  }

  _initWeights() {
      let vWeights = [];
      let wWeights = [];

      for (let i = 0; i < this._dimension; i++) {
          vWeights.push(Math.random() - 0.5);
          let wIdx = wWeights.push([]) - 1;

          for (let j = 0; j < this._dimension; j++) {
              wWeights[wIdx].push(Math.random() - 0.5);
          }
      }

      return [vWeights, wWeights];
  }

  _initTrainedData() {
      let bias = this._initBias();
      let weights = this._initWeights();

      this.trainedData = new TrainedData(weights[0], weights[1], bias);
  }

  /**
   * @param {number} rowIndex 
   */
  _extractRow(rowIndex) {
      let elements = new Array(this._dimension);

      for (let i = 0; i < elements.length; i++) {
          elements[i] = this.inputData.numericVariableAt(rowIndex, i);
      }

      return elements;
  }

  /**
   * @returns {Promise<Result>}
   */
  train() {
      this._initTrainedData();

      let bout = 0.0;

      // sigmoid function
      const transfer = (value) => {
          return 1.0 / (1.0 + Math.exp(-value));
      };

      /**
       * @param {number[]} rowElements
       */
      const calculateFOut = (rowElements) => {
          /** @type {number[]} */
          let arr = Array.from(Array(this._dimension)).map((el, i) => {
              let sum = 0.0;
              
              for (let j = 0; j < this._dimension; j++) {
                  sum += rowElements[j] * this.trainedData.wWeights[j][i];
              }

              return transfer(sum + this.trainedData.bias[i]);
          });

          // for (let i = 0; i < this._dimension; i++) {
          //     let sum = 0.0;

          //     for (let j = 0; j < this._dimension; j++) {
          //         sum += rowElements[j] * this.trainedData.wWeights[j][i];
          //     }

          //     arr[i] = transfer(sum + this.trainedData.bias[i]);
          // }

          let fout = arr.reduce((accum, el, i) => {
              return accum + (el * this.trainedData.vWeights[i]);
          }, 0);

          fout = transfer(fout + bout);

          return { fout, foutArray: arr };
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
          let error = output - fout;
          let n = 0.05;

          let dv;
          let dwi = new Array(this._dimension);
          let dw = new Array(this._dimension);

          for (let i = 0; i < dw.length; i++) {
              dw[i] = new Array(this._dimension);
          }

          let dbi = new Array(this._dimension);
          let db = new Array(this._dimension);

          dv = fout * (1.0 - fout) * error;
          for (let i = 0; i < this._dimension; i++) {
              this.trainedData.vWeights[i] += n * dv * foutArray[i];
          }

          let dbout = n * dv;
          bout += dbout;

          for (let i = 0; i < this._dimension; i++) {
              dwi[i] = foutArray[i] * (1.0 - foutArray[i]) * this.trainedData.vWeights[i] * dv;

              for (let j = 0; j < this._dimension; j++) {
                  dw[j][i] = n * dwi[i] * rowElements[j];
                  this.trainedData.wWeights[j][i] += dw[j][i];
              }
          }

          // modify bias
          for (let i = 0; i < this._dimension; i++) {
              dbi[i] = foutArray[i] * (1.0 - foutArray[i]) * this.trainedData.vWeights[i] * dv;
              db[i] = n * dbi[i];
              this.trainedData.bias[i] += db[i];
          }
      };

      return new Promise((resolve, reject) => {
          setTimeout(() => { // run parallel
              let quadraticError = 0.0;
              
              for (let i = 0; i < NUM_ITERATIONS; i++) {
                  for (let j = 0; j < this.outputData.values.length; j++) {
                      let rowElements = this._extractRow(j);
                      let fouts = calculateFOut(rowElements);
                      let x = this.outputData.numericVariableAt(j, 0)/* first item as arrays not supported yet */;

                      learn(x, fouts.fout, fouts.foutArray, rowElements);
                      quadraticError += Math.pow(x - fout, 2);
                  }

                  quadraticError *= 0.5;
              }

              resolve(new Result((input) => calculateFOut(input).fout));

          }, 0);
      });
  }
}

NeuralNetwork.Builder = {
  /** @param {string} csv */
  fromCsv: (csv) => {
      let split = csv.split('\n')
          .map(x => x.trim())
          .filter(x => x.length != 0);

      if (split.length == 0) {
          throw Error('No input rows');
      }

      split = split.map(row => row.split(','));

      const numRows = split.length;
      const numColumns = split[0].length;

      const inputColumnPicker = new ColumnPicker(numColumns);
      const outputColumnPicker = new ColumnPicker(numColumns);

      return {
          hasHeader: true,
          inputs: inputColumnPicker,
          outputs: outputColumnPicker,

          header: function (enabled) {
              this.hasHeader = !!enabled;
          },

          build: function () {
              const inputColumnIndices = inputColumnPicker.values();
              const outputColumnIndices = outputColumnPicker.values();

              const inputHeader = this.hasHeader ? [] : null;
              const outputHeader = this.hasHeader ? [] : null;

              const inputData = [];
              const outputData = [];

              split.forEach((row, rowIdx) => {
                  const isHeader = this.hasHeader && rowIdx == 0;

                  let inputArr = [];
                  let outputArr = [];

                  for (let i = 0; i < row.length; i++) {
                      if (inputColumnIndices.indexOf(i) !== -1) {
                          if (isHeader) {
                              inputHeader.push(row[i]);
                          } else {
                              inputArr.push(row[i]);
                          }
                      }
                      
                      if (outputColumnIndices.indexOf(i) !== -1) {
                          if (isHeader) {
                              outputHeader.push(row[i]);
                          } else {
                              outputArr.push(row[i]);
                          }
                      }
                  }

                  if (!isHeader) {
                    inputData.push(inputArr);
                    outputData.push(outputArr);
                  }
              });
              
              return new NeuralNetwork(Data.from(inputData, inputHeader), Data.from(outputData, outputHeader));
          }
      };
  }
};

module.exports = NeuralNetwork;