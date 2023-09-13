#!/usr/bin/env node

/*
 *
 * Populate transaction logs from etherscan
 *
 * Usage: node onetimer/populateTransactionsDataFromBlockscout.js
 *
 */

const rootPrefix = "..",
  httpRequest = require(rootPrefix + "/lib/HttpRequest"),
  basicHelper = require(rootPrefix + "/helpers/basic"),
  TransactionDetailModel = require(rootPrefix + "/app/models/mysql/main/TransactionsDetails"),
  TransactionLogModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionLog"),
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails");

const BASE_ENDPOINT = "https://eth.blockscout.com/api/v2/";

class PopulateTransactionsDataFromBlockscout {
  constructor() {}

  async perform() {
    console.log("Start Perform");
    let transactionDetailObj = new TransactionDetailModel();
    
    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");

    const blockNumbersData = await transactionDetailObj.getMaxAndMinBlockNumberWithoutLogs();
    const startBlockNumber = blockNumbersData.minBlockNumber;
    const endBlockNumber = blockNumbersData.maxBlockNumber;

    let currentBlockNumber = startBlockNumber;

    while (currentBlockNumber <= endBlockNumber) {
      console.log("Current block number: ", currentBlockNumber);
      let transactionDetailObj = new TransactionDetailModel();
      let transactionDetails = await transactionDetailObj.getRowsByBlockNumber(
        currentBlockNumber
      );

      for (let i = 0; i < transactionDetails.length; i++) {
        const transactionDetail = transactionDetails[i];
        const transactionHash = transactionDetail.transactionHash;

        console.log("Fetching transaction logs for transactionHash: ",transactionHash);

        const transactionLogsData = await this.fetchTransactionLogs(transactionHash);
        const transactionInfoData = await this.fetchTransactionInfo(transactionHash);

        // append different status for empty and non-empty transaction logs/info data
        let status =
       !transactionInfoData.hash
            ? transactionDetailsConstants.failedStatus
            : transactionDetailsConstants.successStatus;  

        if (transactionInfoData.raw_input == '0x') {
          status = transactionDetailsConstants.ignoreStatus;  
        }

      console.log("Update transaction details in DB....");
      let transactionDetailObj = new TransactionLogModel();
      await transactionDetailObj.updateById( oThis.transaction.id,
        {
          data:  JSON.stringify(transactionInfoData || {}),
          logs_data:  JSON.stringify(transactionLogsData || {}),
          status: status
        }
      );
      }

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
      return Promise.reject(response.data);
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
        return Promise.reject(response.data);
      }
  
      return JSON.parse(response.data.responseData);
    }

}

const populateTransactionsDataFromBlockscout = new PopulateTransactionsDataFromBlockscout();

populateTransactionsDataFromBlockscout
  .perform()
  .then(function(rsp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.log("Error in script: ", err);
    process.exit(1);
  });
