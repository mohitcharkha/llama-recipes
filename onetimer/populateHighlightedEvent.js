#!/usr/bin/env node

/*
 *
 * Populate HighlightedEvent from etherscan web page
 *
 * Usage: node onetimer/populateHighlightedEvent.js
 *
 */

const rootPrefix = '..',
  httpRequest = require(rootPrefix + '/lib/HttpRequest'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails"),
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');
  const offset = 4000;
class PopulateHighlightedEvent {
  constructor() {}

  async perform() {
    console.log("Start Perform");
    let blockNumbertransactionDetailObj = new TransactionDetailModel();
    
    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");

    const blockNumbersData = await blockNumbertransactionDetailObj.getMaxAndMinBlockNumberWithoutHighlightedEvent();
    const startBlockNumber = blockNumbersData.minBlockNumber; // replace with min block number 
    const endBlockNumber = blockNumbersData.maxBlockNumber; // replace with max block number

    console.log("blockNumbersData", blockNumbersData);

    let currentBlock = parseInt(startBlockNumber) + 4000;

    while (currentBlock <= endBlockNumber) {
      console.log("Current block number: ", currentBlock);

      let fetchTransactionDetailObj = new TransactionDetailModel();
      let transactionDetails = await fetchTransactionDetailObj.getRowsByBlockNumberForHighlightedEvent(
        currentBlock
      );

      for (let tx of transactionDetails) {
        let highlightedEvents = await this.parseData(tx.transactionHash);
        console.log('highlightedEvents: ', tx.id);
          let updateTransactionDetailObj = new TransactionDetailModel();
          await updateTransactionDetailObj.updateById(tx.id, highlightedEvents);
        await basicHelper.sleep(2000);
      }
      currentBlock = offset + currentBlock;
    }
    console.log('End Perform');
  }

  async parseData(txHash) {
    console.log('fetch for tx hash:', txHash);
    let  url = 'https://etherscan.io/tx/' + txHash;
    let req = new httpRequest({resource: url, header: {}});
    let data = await req.get({});

    if (data.data.response.status == 302){
      console.log('Sleep for 20 sec \n 302 error -- data: ', data);
      await basicHelper.sleep(20000);
      let req2 = new httpRequest({resource: url, header: {}});
      data = await req2.get({});
    }

    if (data.data.response.status != 200 && data.data.response.status > 204){
      console.log('data: ', data);
      return Promise.reject(new Error('Error in fetching data'));
    }

    return { 
      highlighted_event_html: data.data.responseData, 
      highlighted_event_status:  transactionDetailsConstants.successHighlightedEventStatus
    }
  }
}


const populateHighlightedEvent = new PopulateHighlightedEvent();

populateHighlightedEvent
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });