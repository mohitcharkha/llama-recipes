const rootPrefix = "../../../..",
  ModelBase = require(rootPrefix + "/app/models/mysql/Base"),
  databaseConstants = require(rootPrefix + "/lib/globalConstant/database");

// Declare variables.
const dbName = databaseConstants.mainDbName;

/**
 * Class for transaction log model.
 *
 * @class TransactionLogModel
 */
class TransactionLogModel extends ModelBase {
  /**
   * Constructor for transaction log model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = "transaction_logs";
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   * @param {number} dbRow.id
   * @param {string} dbRow.tx_hash
   * @param {number} dbRow.block_number
   * @param {string} dbRow.data
   * @param {string} dbRow.decode_status
   * @param {string} dbRow.decoded_events
   * @param {string} dbRow.decoded_input
   * @param {string} dbRow.status
   *
   * @returns {object}
   */
  formatDbData(dbRow) {
    const oThis = this;

    const formattedData = {
      id: dbRow.id,
      txHash: dbRow.tx_hash,
      blockNumber: dbRow.block_number,
      data: JSON.parse(dbRow.data),
      decodeStatus: dbRow.decode_status,
      decodedEvents: JSON.parse(dbRow.decoded_events),
      decodedInput: JSON.parse(dbRow.decoded_input),
      status: dbRow.status,
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

  async getPaginatedTxHash(limit, offset) {
    const oThis = this;

    const txHashes = [];

    const dbRows = await oThis
      .select("tx_hash")
      .where({ status: "SUCCESS" })
      .limit(limit)
      .offset(offset)
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const txHash = dbRows[index].tx_hash;
      txHashes.push(txHash);
    }

    return txHashes;
  }

  /**
   * This method gets the row for the txHash.
   * 
   * @param {string} txHash
   * 
   * @returns {Promise<TransactionLogModel>}
   */
  async fetchByTxHash(txHash) {
    const oThis = this;

    const dbRows = await oThis
      .select("*")
      .where({ tx_hash: txHash })
      .fire();

    if (dbRows.length === 0) {
      return {};
    }

    return oThis.formatDbData(dbRows[0]);
  }

    /**
   * This method updates the row by id.
   * 
   * @param {integer} id
   * 
   * @returns {Promise<void>}
   */
    async updateById(id, updateParams) {
      const oThis = this;

      await oThis
        .update(updateParams)
        .where({ id: id })
        .fire();
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
}

module.exports = TransactionLogModel;
