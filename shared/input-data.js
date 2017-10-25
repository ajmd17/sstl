if (typeof require === 'function') {
  var getRowSchema = require('./get-row-schema');
  var DataTypes = require('./data-types');
}

/**
 * 
 * @param {SchemaField[]} schema 
 * @param {any[][]} values 
 */
function Data(schema, values) {
  this.schema = schema;
  this.values = values;

  /** @type {{[x: string]: []}} */
  this._possibleCategoricalValues = {};

  for (var i = 0; i < this.schema.length; i++) {
    if (this.schema[i].type == DataTypes.CATEGORICAL) {
      this._possibleCategoricalValues[this.schema[i].label] = [];

      for (var j = 0; j < this.values.length; j++) {
        var value = this.values[j][i];

        if (this._possibleCategoricalValues[this.schema[i].label].indexOf(value) === -1) {
          this._possibleCategoricalValues[this.schema[i].label].push(value);
        }
      }
    }
  }
}

Data.prototype.at = function (index) {
  return this.values[index];
};

Data.prototype.numericVariableAt = function (rowIndex, colIndex) {
  var row = this.values[rowIndex];

  switch (this.schema[colIndex].type) {
    case DataTypes.NUMERICAL:
      return parseFloat(row[colIndex]);
    case DataTypes.CATEGORICAL:
      return this._possibleCategoricalValues[this.schema[colIndex].label].indexOf(row[colIndex]);
    default:
      row[colIndex];
  }
};

/**
 * Reverse lookup a predicted value by column and float value
 * @param {colIndex} value 
 * @param {number} value
 */
Data.prototype.reverseLookup = function (colIndex, value) {
  var schemaField = this.schema[colIndex];

  switch (schemaField.type) {
      case DataTypes.CATEGORICAL: {
          var possibleValues = this._possibleCategoricalValues[schemaField.label];
          return possibleValues[Math.floor(value * possibleValues.length)];
      }
      default:
          return value;
  }
};

function SchemaField(label, type) {
  this.label = label;
  this.type = type;
}


/**
* @param {any[][]} rows
* @param {string[]} hasHeader
*/
Data.from = function (rows, header) {
  if (rows.length == 0) {
      throw Error('No rows provided.');
  }

  var row0Schema = getRowSchema(rows[0]);

  if (header) {
      if (header.length != rows[0].length) {
          throw Error('Header column length must be same as data column length');
      }

      return new Data(header.map((label, i) => new SchemaField(label, row0Schema[i])));
  }


  return new Data(rows[0].map((el, i) => {
    var rem = (i % 26);
    var div = Math.floor(i / 26) + 1;

    var label = String.fromCharCode(65 + rem) + div;

    return new SchemaField(label, row0Schema[i]);
  }), rows);
};

if (typeof module === 'object') {
  module.exports = Data;
}