#!/usr/bin/env node

/*
 *
 * Populate transactions from etherscan
 *
 * Usage: node onetimer/populateEtherScanTransactions.js
 *
 */

const rootPrefix = '..',
  httpRequest = require(rootPrefix + '/lib/HttpRequest'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails"),
  TransactionsDetailsModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');

const API_ENDPOINT = "https://api.etherscan.io/api";
const API_KEY = coreConstants.etherscanApiKey;

const start_block = 17700000;
const offset = 20000;
const numberOfBlocks = 20;


class PopulateTransactionsFromEtherscan {
  constructor() {}

  async perform() {
    const oThis = this;
    console.log('Start Perform');

    const blocksArray = oThis.getBlocksArray(start_block);

    console.log('Total blocks: ', blocksArray);
    // Fetch Transactions
    for (let block of blocksArray) {
      console.log('block: ', block);
      let transactionsData = await this.fetchTransactions(block);

      let txArray = [];
      for (let tx of transactionsData) {
        txArray.push([ tx.transaction_hash, tx.block_number, transactionDetailsConstants.pendingStatus, transactionDetailsConstants.pendingHighlightedEventStatus]);
      }
      console.log('Total Tx in block: ', txArray.length);
      
      if(txArray.length == 0) {
        continue;
      }

      let transactionObj = new TransactionsDetailsModel();
      await transactionObj.insertRecords(['transaction_hash', 'block_number', 'status', 'highlighted_event_status'],txArray);
      // await basicHelper.sleep(200);
    }
      console.log('End Perform');
  }

  // Function to fetch transactions
  async fetchTransactions(block) {
    let transactionsData = [];

    let req = new httpRequest({resource: API_ENDPOINT, header: {}});
    const params = {
      module: 'proxy',
      action: 'eth_getBlockByNumber',
      tag: block.toString(16),
      boolean: 'true',
      apikey: API_KEY
    };
    const response = await req.get(params);
    const responseData = response.data.responseData;
    let etherscanResponse= JSON.parse(responseData);

    // console.log("response------");
    // console.log(JSON.stringify(etherscanResponse));

    for (let tx of etherscanResponse.result.transactions) {
      const hexString = tx.blockNumber;
      const numberValue = parseInt(hexString, 16);  
      transactionsData.push({
            transaction_hash: tx.hash,
            block_number: numberValue
        });
    }

    return transactionsData;
  }

  // Function to get blocks array using start block and offset
  getBlocksArray(start_block) {
    let blocksArray = [];
    for (let i = 0; i < numberOfBlocks; i++) {
      blocksArray.push(start_block + (i * offset));
    }
    return blocksArray;
  }
}

const populateTransactionsFromEtherscan = new PopulateTransactionsFromEtherscan();

populateTransactionsFromEtherscan
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });