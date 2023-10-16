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

  /**
   * This method gets the row for an array of signatures.
   * 
   * @param {Array<string>} signatures
   * 
   * @returns {Promise<Map<String, ContractAbisModel>>}
   */
  async fetchBySignatures(signatures) {
    const oThis = this;

    const response = {};

    const dbRows = await oThis
      .select("*")
      .where({ signature: signatures })
      .fire();

      for (let index = 0; index < dbRows.length; index++) {
        const formatDbRow = oThis.formatDbData(dbRows[index]);
        response[formatDbRow.signature] = formatDbRow;
      }

    return response;
  }

   
  async insertRecords(insertColumns, insertValues) {
    const oThis = this;

    return oThis.insertMultiple(insertColumns, insertValues).fire();
  }
}

module.exports = ContractAbisModel;