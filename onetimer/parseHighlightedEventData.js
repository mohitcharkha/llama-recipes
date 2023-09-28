#!/usr/bin/env node

/*
 *
 * Populate HighlightedEvent from etherscan web page
 *
 * Usage: node onetimer/parseHighlightedEventData.js
 *
 */

const cheerio = require('cheerio');

const rootPrefix = '..',
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');

class ParseHighlightedEvent {
  constructor() {}

  async perform() {
    console.log("Start Perform");
    
    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");

    let limit = 300;
    let maxId = 0
    while (true) {
      console.log("Current maxId: ", maxId);

      let fetchTransactionDetailObj = new TransactionDetailModel();
      let transactionDetails = await fetchTransactionDetailObj.getRowsToParseHighlightedEvent(
        limit, maxId
      );

      if (transactionDetails.length == 0) {
        break;
      }

      let promises = [];
      for (let txDetail of transactionDetails) {
        maxId = txDetail.id;
        console.log('highlightedEvents: ', txDetail.id);
        let updateParams = await this.parseData(txDetail);
        let updateTransactionDetailObj = new TransactionDetailModel();
        let prm =  updateTransactionDetailObj.updateById(txDetail.id, updateParams);
        promises.push(prm);
        if (promises.length == 15) {
          await Promise.all(promises);
          promises = [];
        }
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    }
    console.log('End Perform');
  }

  async parseData(txDetail) {
    let html = txDetail.highlightedEventHtml;
    let updateParams = {};

    const  response = this.extractTextFromElement(html);
    let texts = response.texts;
    let eventContactAddress = response.eventContactAddress;
    let eventMethodName = response.eventMethodName;
    let eventMethodId = response.eventMethodId;

    if (texts && texts.length > 0) {
      updateParams["highlighted_event_texts"] =  JSON.stringify(texts);
    }
    if (eventContactAddress) {
      updateParams["highlighted_event_contract_address"] = eventContactAddress;
    }
    if (eventMethodName) {
      updateParams["highlighted_event_method_name"] = eventMethodName;
    }
    if (eventMethodId) {
      updateParams["highlighted_event_extra_data"] = JSON.stringify({"highlighted_event_method_id": eventMethodId});
    }

    if ((!texts || texts.length == 0) && !eventMethodName){
      const extraData = this.extractIDMFromElement(html);
      if (extraData){
        updateParams['highlighted_event_extra_data'] = JSON.stringify(extraData);
      } else{
        updateParams['highlighted_event_extra_data'] = null;
      }
    }

    return updateParams;
  }

extractTextFromElement(html) {
  const htmlObj = cheerio.load(html);

  function recursiveTextExtraction(element) {
      let result = [];
      
      element.contents().each(function() {
          const tagType = this.type;
          const currentElement = htmlObj(this);

          if (tagType === 'text') {
              result.push(this.data.trim());
          } else if (tagType === 'tag') {
              const tagName = this.name;

              if (tagName === 'div' && currentElement.attr('class')) {
                  return; // skip div with any class
              }

              if (tagName === 'a') {
                  const href = currentElement.attr('href');

                  if (href && /^\/token\/0x[a-fA-F0-9]{40}$/.test(href)) {
                      result.push(href.split('/token/')[1]);
                  } else if (href && /^\/address\/0x[a-fA-F0-9]{40}$/.test(href)) {
                      const title = currentElement.attr('title'); // Extract the full address from the title
                      result.push(title || href.split('/address/')[1]);
                  } else {
                      result.push(currentElement.text().trim());
                  }
              } else if (tagName === 'span') {
                  result.push(...recursiveTextExtraction(currentElement));
              } else {
                  result.push(currentElement.text().trim());
              }
          }
      });

      return result;
  }
  let textResults = [];
  let highlightedEvents = htmlObj('#wrapperContent .d-flex.flex-wrap.align-items-center');
  highlightedEvents.each(function() {
      const outputText = recursiveTextExtraction(htmlObj(this)).join(' ').replace(/\s+/g, ' ').trim();
      textResults.push(outputText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  });

  if (textResults.length === 0) {
    let highlightedEvents = htmlObj('#wrapperContent .d-flex.align-items-baseline');

    highlightedEvents.each(function() {
        const targetSpan = htmlObj(this).children().eq(1); // Navigating to the second span
        const outputText = recursiveTextExtraction(targetSpan).join(' ').replace(/\s+/g, ' ').trim();
        textResults.push(outputText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    });
  }

  // check for contract address

  if (textResults.length > 0) {
    return { texts: textResults };
  }

  let targetElement = htmlObj('span[data-bs-title^="0x"].badge').filter(function(f) {
    return /^(\w+\s*)+$/.test(htmlObj(this).text().trim());
  });

  // Extract the values
  let spanText = targetElement.text().trim();  // This will give you "Transfer" or any other text contained in the span
  if(spanText){
    let fullDataTitleValue = targetElement.attr('data-bs-title');  // This extracts the value of the data-bs-title attribute
    let matchedHex = fullDataTitleValue.match(/(0x[a-fA-F0-9]+)/);
    let hexValue = matchedHex ? matchedHex[1] : null;  // extracting the matched hex value or defaulting to null if no match
    return { eventMethodName: spanText,  eventMethodId: hexValue};
  }
  return {};
}


  extractIDMFromElement(text) {
    let htmlObj = cheerio.load(text);
    let highlightedEventsIDM = htmlObj('#spanFullIDM');
    let highlightedEventHtml = highlightedEventsIDM.html();
    let highlightedEventIDMText = highlightedEventsIDM.text();
    const highlightedEventsIDMData = {
      html: highlightedEventHtml,
      text: highlightedEventIDMText
    }
    if (!highlightedEventIDMText){
      return null;
    }
    return {
        highlighted_event_idm: highlightedEventsIDMData
      };
  } 

}


const parseHighlightedEvent = new ParseHighlightedEvent();

parseHighlightedEvent
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

