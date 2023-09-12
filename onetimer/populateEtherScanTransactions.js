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
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TransactionModel = require(rootPrefix + '/app/models/mysql/main/Transaction');

const API_ENDPOINT = "https://api.etherscan.io/api";
const API_KEY = coreConstants.etherscanApiKey;

const start_block = 17700000; // 17700000 
const end_block = 17700100; // example block


class PopulateTransactionsFromEtherscan {
  constructor() {}

  async perform() {
    console.log('Start Perform');
    // Fetch Transactions
    for (let block = start_block; block < end_block; block++) {
      console.log('block: ', block);
      let transactionsData = await this.fetchTransactions(block);

      let txArray = [];
      for (let tx of transactionsData) {
        txArray.push([tx.transaction_hash, tx.data, tx.from_address, tx.to_address, tx.value, tx.type, tx.input, tx.block_number]);
      }
      console.log('Total Tx in block: ', txArray.length);
      
      if(txArray.length == 0) {
        continue;
      }

      let transactionObj = new TransactionModel();
      await transactionObj.insertRecords(['tx_hash', 'data', 'from_address', 'to_address', 'value', 'type', 'input', 'block_number'],txArray);
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
            data: JSON.stringify(tx),
            transaction_hash: tx.hash,
            from_address: tx.from,
            to_address: tx.to,
            input: tx.input,
            value: tx.value,
            type: tx.type,
            block_number: numberValue
        });
    }

    return transactionsData;
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