#!/usr/bin/env node

/*
 *
 * Populate transaction logs from etherscan
 *
 * Usage: node onetimer/populateTransactionsLogs.js
 *
 */

const rootPrefix = "..",
  httpRequest = require(rootPrefix + "/lib/HttpRequest"),
  basicHelper = require(rootPrefix + "/helpers/basic"),
  TransactionModel = require(rootPrefix + "/app/models/mysql/main/Transaction"),
  TransactionLogModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionLog"),
  transactionLogsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionLogs");

const BASE_ENDPOINT = "https://eth.blockscout.com/api/v2/";

class PopulateTransactionsLogs {
  constructor() {}

  async perform() {
    console.log("Start Perform");

    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");
    let transactionObj = new TransactionModel();
    const transactions = await transactionObj.fetchAllValidTransactions();
    const blockNumbersData = await transactionObj.getMaxAndMinBlockNumber();
    const startBlockNumber = blockNumbersData.minBlockNumber;
    const endBlockNumber = blockNumbersData.maxBlockNumber;

    console.log("Total transactions fetched: ", transactions.length);

    let txLogsArray = [];

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const transactionHash = transaction.txHash;
      const blockNumber = transaction.blockNumber;

      console.log(
        "Fetching transaction logs for transactionHash: ",
        transactionHash
      );
      const transactionLogsData = await this.fetchTransactionLogs(
        transactionHash
      );

      txLogsArray.push([
        transactionHash,
        blockNumber,
        transactionLogsData,
        transactionLogsConstants.pendingStatus,
      ]);
    }

    let transactionLogObj = new TransactionLogModel();

    console.log("Inserting transaction logs in DB....");
    await transactionLogObj.insertRecords(
      ["tx_hash", "block_number", "data", "decode_status"],
      txLogsArray
    );

    let currentBlockNumber = startBlockNumber;

    while (currentBlockNumber < endBlockNumber) {
      console.log("Current block number: ", currentBlockNumber);
      let transactionObj = new TransactionModel();
      let transactions = await transactionObj.getTransactionsByBlockNumber(
        currentBlockNumber
      );

      let txLogsArray = [];

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        const transactionHash = transaction.txHash;
        const blockNumber = transaction.blockNumber;

        console.log(
          "Fetching transaction logs for transactionHash: ",
          transactionHash
        );

        const transactionLogsData = await this.fetchTransactionLogs(
          transactionHash
        );

        // append different status for empty and non-empty transaction logs data
        const status =
          transactionLogsData.length === 0
            ? transactionLogsConstants.failedStatus
            : transactionLogsConstants.successStatus;

        txLogsArray.push([
          transactionHash,
          blockNumber,
          transactionLogsData,
          transactionLogsConstants.pendingDecodeStatus,
          status,
        ]);
      }

      let transactionLogObj = new TransactionLogModel();

      console.log("Inserting transaction logs in DB....");
      await transactionLogObj.insertRecords(
        ["tx_hash", "block_number", "data", "decode_status", "status"],
        txLogsArray
      );
      currentBlockNumber++;
    }
    console.log("End Perform");
  }

  /**
   * Fetch transaction logs from blockscout
   *
   * @param {string} transactionHash
   * @returns {Promise<*>}
   */
  async fetchTransactionLogs(transactionHash) {
    const endpoint = BASE_ENDPOINT + `transactions/${transactionHash}/logs`;
    let req = new httpRequest({ resource: endpoint, header: {} });

    const response = await req.get();

    await basicHelper.sleep(200);

    if (response.data.statusCode !== 200) {
      console.error("Error in fetching transaction logs for txHash: ", txHash);
      return [];
    }

    return response.data.responseData;
  }
}

const populateTransactionLogs = new PopulateTransactionsLogs();

populateTransactionLogs
  .perform()
  .then(function(rsp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.log("Error in script: ", err);
    process.exit(1);
  });
