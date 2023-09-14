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
    
    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");

    let limit = 100;
    let offset = 0;
    while (true) {
      console.log("Current offset: ", offset);

      let fetchTransactionDetailObj = new TransactionDetailModel();
      let transactionDetails = await fetchTransactionDetailObj.getRowsToParseHighlightedEvent(
        limit, offset
      );

      if (transactionDetails.length == 0) {
        break;
      } else {
        offset = offset + limit;
      }

      for (let txDetail of transactionDetails) {
        console.log('highlightedEvents: ', txDetail.id);
        let updateParams = await this.parseData(txDetail);
        let updateTransactionDetailObj = new TransactionDetailModel();
        await updateTransactionDetailObj.updateById(txDetail.id, updateParams);
      }
      currentBlock++;
    }
    console.log('End Perform');
  }

  async parseData(txDetail) {
    let html = txDetail.highlightedEventHtml;
    const updateParams = {};

    const {texts, eventContactAddress, eventMethodName} = this.extractTextFromElement(html);
    if (texts.length > 0) {
      updateParams =  { 
        highlighted_event_texts: JSON.stringify(texts),
        highlighted_event_contract_address: eventContactAddress,
        highlighted_event_method_name: eventMethodName

      }    
    }
    const extraData = this.extractIDMFromElement(data.data.responseData);
    updateParams['highlighted_event_extra_data'] = JSON.stringify(extraData);
    return updateParams;
  }

  extractTextFromElement(html) {
    const htmlObj = cheerio.load(html);
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

// Decode the tx input

//   hex_string = "5363616d2e20486f6e6579706f742e20313030207461782e"
// decoded_string = bytes.fromhex(hex_string).decode('utf-8')
// print(decoded_string)