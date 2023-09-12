#!/usr/bin/env node

/*
 *
 * Populate HighlightedEvent from etherscan web page
 *
 * Usage: node onetimer/populateHighlightedEvent.js
 *
 */

const cheerio = require('cheerio');

const rootPrefix = '..',
  httpRequest = require(rootPrefix + '/lib/HttpRequest'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TransactionModel = require(rootPrefix + '/app/models/mysql/main/Transaction');

const startBlock = 17700000; // 17700000 
const endBlock = 17700015; // example block


class PopulateHighlightedEvent {
  constructor() {}

  async perform() {
    console.log('Start Perform');
    let currentBlock = startBlock;

    while(currentBlock < endBlock) {
      console.log('block: ', currentBlock);
      let transactionObj = new TransactionModel();
      let transactionsData = await transactionObj.getTransactionsByBlockNumber(currentBlock);
      for (let tx of transactionsData) {
        let highlightedEvents = await this.parseData(tx.txHash);
        let updateTransactionObj = new TransactionModel();
        console.log('highlightedEvents: ', tx.id);
        if (highlightedEvents.length > 0) {
          await updateTransactionObj.updateHighlightedEvents(tx.id, highlightedEvents);
        }
        await basicHelper.sleep(50);
      }
      currentBlock++;
    }
    console.log('End Perform');
  }

 
  extractTextFromElement(text) {
    const htmlObj = cheerio.load(text);
    let textResults = [];
    const highlightedEvents = htmlObj('#wrapperContent .d-flex.flex-wrap.align-items-center');
    highlightedEvents.each(function() {
      let element = htmlObj(this);
      let result = [];
      element.children().each(function() {
        const tagType = this.type;

        if (tagType === 'text') {
          result.push(this.data.trim());
        } else if (tagType === 'tag') {
          const text = htmlObj(this).text().trim();
          if (text) {
            result.push(text);
          }
        }
      });

      const outputText =  result.join(' ').replace(/\s+/g, ' ').trim();
      textResults.push(outputText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    });

    return textResults;
}

  async parseData(txHash) {
    console.log('fetch for tx hash:', txHash);
    let  url = 'https://etherscan.io/tx/' + txHash;
    let req = new httpRequest({resource: url, header: {}});
    const data = await req.get({});
    if (data.data.response.status != 200 && data.data.response.status > 399){
      console.log('data: ', data);
      return Promise.reject(new Error('Error in fetching data'));
    }
    const texts = this.extractTextFromElement(data.data.responseData);
    return texts;
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