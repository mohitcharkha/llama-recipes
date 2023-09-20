const rootPrefix = "../../../..",
  ModelBase = require(rootPrefix + "/app/models/mysql/Base"),
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails"),
  databaseConstants = require(rootPrefix + "/lib/globalConstant/database");

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

    oThis.tableName = "transactions_details";
  }

  /**
   * Format Db data.
   *
   * @param {object} dbRow
   *
   * @returns {object}
   */
  formatDbData(dbRow) {
    const oThis = this;

    const formattedData = {
      id: dbRow.id,
      status: dbRow.status,
      transactionHash: dbRow.transaction_hash,
      blockNumber: dbRow.block_number,
      data: JSON.parse(dbRow.data),
      logsData: JSON.parse(dbRow.logs_data),
      highlightedEventStatus: dbRow.highlighted_event_status,
      highlightedEventHtml: dbRow.highlighted_event_html,
      highlightedEventTexts: JSON.parse(dbRow.highlighted_event_texts),
      highlightedEventContractAddress: dbRow.highlighted_event_contract_address,
      highlightedEventMethodName: dbRow.highlighted_event_method_name,
      highlightedEventExtraData: JSON.parse(dbRow.highlighted_event_extra_data),
      isHighlightedEventDecoded: dbRow.is_highlighted_event_decoded,
      totalEvents: dbRow.total_events,
      totalDecodedEvents: dbRow.total_decoded_events,
    };

    if (dbRow.txn_type) {
      formattedData.txnType = dbRow.txn_type;
    }

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
      .where(["status = ?", transactionDetailsConstants.pendingStatus])
      .fire();

    return dbRows[0];
  }

  /**
   * Get max and min block number for highlighted event.
   *
   * @returns {Promise<Map>}
   */
  async getMaxAndMinBlockNumberWithoutHighlightedEvent() {
    const oThis = this;
    const dbRows = await oThis
      .select(
        "MAX(block_number) as maxBlockNumber, MIN(block_number) as minBlockNumber"
      )
      .where([
        "highlighted_event_status = ?",
        transactionDetailsConstants.pendingHighlightedEventStatus,
      ])
      .fire();

    return dbRows[0];
  }

  /**
   * This method gets the transactions in a blockNumber.
   *
   * @param {integer} blockNumber
   *
   * @returns {Promise<Map>}
   *
   */
  async getRowsByBlockNumber(blockNumber) {
    const oThis = this;
    const response = [];
    const dbRows = await oThis
      .select("*")
      .where({ block_number: blockNumber })
      .where(["status = ?", transactionDetailsConstants.pendingStatus])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }

  /**
   * This method gets the transactions by transaction_hash
   *
   * @param {string} transactionHash
   *
   * @returns {Promise<Map>}
   *
   */
  async getByTransactionHash(transactionHash) {
    const oThis = this;
    const response = [];
    const dbRows = await oThis
      .select("*")
      .where({ transaction_hash: transactionHash })
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }
    return response;
  }

  /**
   * This method gets the transactions in a blockNumber.
   *
   * @param {integer} blockNumber
   *
   * @returns {Promise<Map>}
   *
   */
  async getRowsByBlockNumberForHighlightedEvent(blockNumber) {
    const oThis = this;
    const response = [];
    const dbRows = await oThis
      .select("*")
      .where({ block_number: blockNumber })
      .where([
        "highlighted_event_status = ?",
        transactionDetailsConstants.pendingHighlightedEventStatus,
      ])
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
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
   * This method gets the transactions in a blockNumber.
   *
   * @param {integer} blockNumber
   *
   * @returns {Promise<Map>}
   *
   */
  async getRowsToParseHighlightedEvent(limit, offset) {
    const oThis = this;
    const response = [];
    const dbRows = await oThis
      .select("*")
      .where([
        "highlighted_event_status = ?",
        transactionDetailsConstants.successHighlightedEventStatus,
      ])
      .offset(offset)
      .limit(limit)
      .fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }

  /**
   * This method gets the transaction with valid highlighted event text.
   *
   * @param {integer} blockNumber
   *
   * @returns {Promise<Map>}
   */

  async getValidTransactionDetailsForZeroNonDecodedEvents(
    limit,
    offset,
    trainedTransactionHashesArray
  ) {
    const oThis = this;
    const response = [];
    let query = await oThis
      .select(
        "*, SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) AS txn_type"
      )
      .where([
        "highlighted_event_texts is not null and highlighted_event_status = 'SUCCESS' and status = 'SUCCESS' and total_events >0 and total_decoded_events = total_events",
      ])
      .offset(offset)
      .limit(limit)
      .order_by("id asc");

    if (trainedTransactionHashesArray.length > 0) {
      query = query.where([
        "transaction_hash NOT IN (?)",
        trainedTransactionHashesArray,
      ]);
    }

    const dbRows = await query.fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }

  async getValidTransactionDetailsForAllNonDecodedEvents(
    limit,
    offset,
    trainedTransactionHashesArray
  ) {
    const oThis = this;
    const response = [];
    let query = await oThis
      .select(
        "*, SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) AS txn_type"
      )
      .where([
        "highlighted_event_texts is not null and highlighted_event_status = 'SUCCESS' and status = 'SUCCESS' and  total_events >0 and total_decoded_events = 0",
      ])
      .offset(offset)
      .limit(limit)
      .order_by("id asc");

    if (trainedTransactionHashesArray.length > 0) {
      query = query.where([
        "transaction_hash NOT IN (?)",
        trainedTransactionHashesArray,
      ]);
    }

    const dbRows = await query.fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }

  async getValidTransactionDetailsForSomeNonDecodedEvents(
    limit,
    offset,
    trainedTransactionHashesArray
  ) {
    const oThis = this;
    const response = [];
    let query = await oThis
      .select(
        "*, SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) AS txn_type"
      )
      .where([
        "highlighted_event_texts is not null and highlighted_event_status = 'SUCCESS' and status = 'SUCCESS' and total_events >0 and total_decoded_events > 0 and total_decoded_events != total_events",
      ])
      // .where([
      //   "transaction_hash IN (?)",
      //   [
      //     "0x22774c3b3705e5f0bd1c70e266dc62475a6860bd620fe93e8071590d77f08032",
      //     "0x5869eef6a8f997319a0a960e0b069d62c36663fe74a77ddb09645bd7e1905819",
      //   ],
      // ])
      .offset(offset)
      .limit(limit)
      .order_by("id asc");

    if (trainedTransactionHashesArray.length > 0) {
      query = query.where([
        "transaction_hash NOT IN (?)",
        trainedTransactionHashesArray,
      ]);
    }

    const dbRows = await query.fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }

  async getValidTransactionDetails(
    limit,
    offset,
    trainedTransactionHashesArray
  ) {
    const oThis = this;
    const response = [];
    let query = await oThis
      .select(
        "*, SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) AS txn_type"
      )
      .where([
        "highlighted_event_texts is not null and highlighted_event_status = 'SUCCESS' and status = 'SUCCESS' and total_events >0",
      ])
      // .where([
      //   "transaction_hash IN (?)",
      //   [
      //     "0x22774c3b3705e5f0bd1c70e266dc62475a6860bd620fe93e8071590d77f08032",
      //     "0x5869eef6a8f997319a0a960e0b069d62c36663fe74a77ddb09645bd7e1905819",
      //   ],
      // ])
      .offset(offset)
      .limit(limit);

    if (trainedTransactionHashesArray.length > 0) {
      query = query.where([
        "transaction_hash NOT IN (?)",
        trainedTransactionHashesArray,
      ]);
    }

    const dbRows = await query.fire();

    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = oThis.formatDbData(dbRows[index]);
      response.push(formatDbRow);
    }

    return response;
  }
}

module.exports = TransactionsDetailsModel;
