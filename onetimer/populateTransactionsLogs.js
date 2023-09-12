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
    const blockNumbersData = await transactionObj.getMaxAndMinBlockNumber();
    const startBlockNumber = blockNumbersData.minBlockNumber;
    const endBlockNumber = blockNumbersData.maxBlockNumber;



    let currentBlockNumber = startBlockNumber;

    while (currentBlockNumber <= endBlockNumber) {
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

        const transactionInfoData = await this.fetchTransactionInfo(
          transactionHash
        );

        // append different status for empty and non-empty transaction logs/info data
        const status =
        !transactionLogsData["items"] || transactionLogsData["items"].length === 0 || !transactionInfoData.hash
            ? transactionLogsConstants.failedStatus
            : transactionLogsConstants.successStatus;  

        txLogsArray.push([
          transactionHash,
          blockNumber,
          JSON.stringify(transactionLogsData || {}),
          JSON.stringify(transactionInfoData || {}),
          transactionLogsConstants.pendingDecodeStatus,
          status,
        ]);
      }

      let transactionLogObj = new TransactionLogModel();

      console.log("Inserting transaction logs in DB....");
      await transactionLogObj.insertRecords(
        ["tx_hash", "block_number", "data", "info_data", "decode_status", "status"],
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

    // console.log('response: ', response);
    await basicHelper.sleep(50);

    if (response.data.response.status !== 200) {
      console.error("Error in fetching transaction logs for txHash: ", transactionHash);
      return [];
    }

    return JSON.parse(response.data.responseData);
  }

  /**
   * Fetch transaction info from blockscout
   *
   * @param {string} transactionHash
   * @returns {Promise<*>}
   */
    async fetchTransactionInfo(transactionHash) {
      const endpoint = BASE_ENDPOINT + `transactions/${transactionHash}`;
      let req = new httpRequest({ resource: endpoint, header: {} });
  
      const response = await req.get();
  
      await basicHelper.sleep(50);
  
      if (response.data.response.status !== 200) {
        console.error("Error in fetching transaction info for txHash: ", transactionHash);
        return {};
      }
  
      return JSON.parse(response.data.responseData);
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
