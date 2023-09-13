const rootPrefix = '../../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  databaseConstants = require(rootPrefix + '/lib/globalConstant/database');

// Declare variables.
const dbName = databaseConstants.mainDbName;

/**
 * Class for TransactionsDetails Model.
 *
 * @class TransactionsDetailsModel
 */
class TransactionsDetailsModel extends ModelBase {
  /**
   * Constructor for TransactionsDetails Model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'transactions_details';
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
      transaction_hash: dbRow.transaction_hash,
      block_number: dbRow.block_number,
      data: JSON.parse(dbRow.data),
      logsData: JSON.parse(dbRow.logs_data),
      highlightedEventStatus: dbRow.highlighted_event_status,
      highlightedEventHtml: JSON.parse(dbRow.highlighted_event_html),
      highlightedEventTexts: JSON.parse(dbRow.highlighted_event_texts),
      highlightedEventContractAddress: dbRow.highlighted_event_contract_address,
      highlightedEventMethodName: JSON.parse(dbRow.highlighted_event_method_name),
    };

    return formattedData;
  }

   
  /**
   * Insert records.
   * 
   * @param {array} insertColumns
   * @param {array} insertValues
   * 
   * @returns {Promise<*>}
   */
  async insertRecords(insertColumns, insertValues) {
    const oThis = this;

    return oThis.insertMultiple(insertColumns, insertValues).fire();
  }
}

module.exports = TransactionsDetailsModel;