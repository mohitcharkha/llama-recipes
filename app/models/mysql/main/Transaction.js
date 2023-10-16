const rootPrefix = "../../../..",
  ModelBase = require(rootPrefix + "/app/models/mysql/Base"),
  databaseConstants = require(rootPrefix + "/lib/globalConstant/database");

// Declare variables.
const dbName = databaseConstants.mainDbName;

/**
 * Class for transaction model.
 *
 * @class TransactionModel
 */
class TransactionModel extends ModelBase {
  /**
   * Constructor for transaction model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = "transactions";
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.tx_hash
   * @param {string} dbRow.data
   * @param {string} dbRow.from_address
   * @param {string} dbRow.to_address
   * @param {string} dbRow.value
   * @param {string} dbRow.input
   * @param {string} dbRow.type
   * @param {string} dbRow.highlighted_events
   * @param {number} dbRow.block_number
   *
   *
   * @returns {object}
   */
  formatDbData(dbRow) {
    const oThis = this;

    const formattedData = {
      id: dbRow.id,
      txHash: dbRow.tx_hash,
      data: JSON.parse(dbRow.data),
      fromAddress: dbRow.from_address,
      toAddress: dbRow.to_address,
      value: dbRow.value,
      input: dbRow.input,
      type: dbRow.type,
      highlightedEvents: JSON.parse(dbRow.highlighted_events),
      blockNumber: dbRow.block_number,
    };

    return formattedData;
  }

  /**
   * This method gets the response for the array of ids passed.
   *
   * @param {array} ids
   *
   * @returns {Promise<void>}
   */
  async getByIds(ids) {
    const oThis = this;

    const response = {};

    const dbRows = await oThis
      .select("*")
      .where({ id: ids })
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response[formatDbRow.id] = formatDbRow;
    }

    return response;
  }



  /**
   * Get max and min block number.
   *
   * @returns {Promise<Map>}
   */
  async getMaxAndMinBlockNumber() {
    const oThis = this;
    const dbRows = await oThis
      .select(
        "MAX(block_number) as maxBlockNumber, MIN(block_number) as minBlockNumber"
      )
      .fire();

    return dbRows[0];
  }

  async updateHighlightedEvents(id, highlightedEvents) {
    const oThis = this;
    await oThis
      .update({ highlighted_events: JSON.stringify(highlightedEvents) })
      .where({ id: id })
      .fire();
  }

  /**
   * This method gets the all valid transactions.
   *
   * @returns {Promise<Map>}
   */
  async fetchAllValidTransactions() {
    const oThis = this;
    const response = [];
    const dbRows = await oThis
      .select("*")
      .where(['input != "0x"'])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }
    return response;
  }

  /**
   * This method inserts bulk entry in the table.
   *
   * @param {object} insertColumns
   * @param {string} insertValues
   *
   * @returns {Promise<*>}
   */
  async insertRecords(insertColumns, insertValues) {
    const oThis = this;
    return oThis.insertMultiple(insertColumns, insertValues).fire();
  }

   /**
   * This method gets the transactions in a blockNumbe.
   *
   * @param {integer} blockNumber
   *
   * @returns {Promise<Map>}
   *
   */
   async getTransactionDetailsWithoutData(blockNumber) {
    const oThis = this;
    const response = [];
    const dbRows = await oThis
      .select("*")
      .where({ block_number: blockNumber })
      .where(['input != "0x"'])
      .where(["data IS NULL"])
      .fire();

    //

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }

  /**
   * This method gets the transactions in a blockNumbe.
   *
   * @param {integer} blockNumber
   *
   * @returns {Promise<Map>}
   *
   */
    async getTransactionsByBlockNumber(blockNumber) {
      const oThis = this;
      const response = [];
      const dbRows = await oThis
        .select("*")
        .where({ block_number: blockNumber })
        .where(['input != "0x"'])
        .where(["highlighted_events IS NULL"])
        .fire();
  
      //
  
      for (let index = 0; index < dbRows.length; index++) {
        const formatDbRow = oThis.formatDbData(dbRows[index]);
        response.push(formatDbRow);
      }
  
      return response;
    }

    /**
   * Get max and min block number.
   *
   * @returns {Promise<Map>}
   */
    async getMaxAndMinBlockNumberWithoutLogs() {
      const oThis = this;
      const dbRows = await oThis
        .select(
          "MAX(block_number) as maxBlockNumber, MIN(block_number) as minBlockNumber"
        )
        .where(["data IS NULL"])
        .fire();
  
      return dbRows[0];
    }

}

module.exports = TransactionModel;
