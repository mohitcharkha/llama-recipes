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
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails"),
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');


class PopulateHighlightedEvent {
  constructor() {}

  async perform() {
    console.log("Start Perform");
    let blockNumbertransactionDetailObj = new TransactionDetailModel();
    
    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");

    const blockNumbersData = await blockNumbertransactionDetailObj.getMaxAndMinBlockNumberWithoutHighlightedEvent();
    const startBlockNumber = blockNumbersData.minBlockNumber;
    const endBlockNumber = blockNumbersData.maxBlockNumber;

    let currentBlock = startBlockNumber;

    while (currentBlock <= endBlockNumber) {
      console.log("Current block number: ", currentBlock);

      let fetchTransactionDetailObj = new TransactionDetailModel();
      let transactionDetails = await fetchTransactionDetailObj.getRowsByBlockNumberForHighlightedEvent(
        currentBlock
      );

      // console.log("Total transactions: ", transactionDetails.length);

      for (let tx of transactionDetails) {
        let highlightedEvents = await this.parseData(tx.transactionHash);
        console.log('highlightedEvents: ', tx.id);
          let updateTransactionDetailObj = new TransactionDetailModel();
          await updateTransactionDetailObj.updateById(tx.id, highlightedEvents);
        await basicHelper.sleep(50);
      }
      currentBlock++;
    }
    console.log('End Perform');
  }

  extractIDMFromElement(text) {
    htmlObj = cheerio.load(text);
    highlightedEventsIDM = htmlObj('#spanFullIDM');
    highlightedEventHtml = highlightedEventsIDM.html();
    highlightedEventIDMText = highlightedEventsIDM.text();
    const highlightedEventsIDMData = {
      html: highlightedEventHtml,
      text: highlightedEventIDMText
    }
    return {
        highlighted_event_idm: JSON.stringify(highlightedEventsIDMData),
        highlighted_event_status:  transactionDetailsConstants.successHighlightedEventStatus
      }
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

    return { 
      highlighted_event_html: data.data.responseData, 
      highlighted_event_status:  transactionDetailsConstants.successHighlightedEventStatus
    }
    

    // const texts = this.extractTextFromElement(data.data.responseData);
    // if (texts.length > 0) {
    //   return { 
    //     highlighted_event_texts: JSON.stringify(texts), 
    //     highlighted_event_status:  transactionDetailsConstants.successHighlightedEventStatus
    //   }    }else{
    //   return this.extractIDMFromElement(data.data.responseData);
    // }
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