if (typeof require === 'function') {
  var DataTypes = require('./data-types');
}

/**
 * @param {string} str 
 */
function getDataType(str) {
  if (!isNaN(str)) {
      return DataTypes.NUMERICAL;
  } else {
      return DataTypes.CATEGORICAL;
  }
}

/**
 * @param {string[]} row
 */
function getRowSchema(row) {
  return row.map(x => getDataType(String(x)));
}

if (typeof module === 'object') {
  module.exports = getRowSchema;
}