const rootPrefix = '../../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  databaseConstants = require(rootPrefix + '/lib/globalConstant/database');

// Declare variables.
const dbName = databaseConstants.mainDbName;

/**
 * Class for ContractAbis Model.
 *
 * @class ContractAbisModel
 */
class ContractAbisModel extends ModelBase {
  /**
   * Constructor for ContractAbis Model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'contract_abis';
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.signature
   * @param {string} dbRow.data
   *
   * @returns {object}
   */
  formatDbData(dbRow) {
    const oThis = this;

    const formattedData = {
      id: dbRow.id,
      signature: dbRow.signature,
      data: JSON.parse(dbRow.data)
    };

    return formattedData;
  }
}

module.exports = ContractAbisModel;