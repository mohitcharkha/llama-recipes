#!/usr/bin/env node

/*
 *
 * Format Swap Events
 *
 * Usage: node onetimer/ruleBased/formatSwapEvents.js
 *
 */

const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');
  FormatSwapEvents = require(rootPrefix + '/lib/ruleEngine/Swap');
  FormatTransferEvents = require(rootPrefix + '/lib/ruleEngine/Transfer'),
  FormatApprovalEvents = require(rootPrefix + '/lib/ruleEngine/Approve');

let MatchCount = 0;
let SwapInEtherscanNotInScript = 0;
let SwapInScriptNotInEtherscan = 0;
let AmountsNotEqual = 0;
let TokenAddressNotFound = 0;
let MultipleHighlightedEventTexts = 0;

let allApprovals = 0;

let AllTranactionsCount = 0;
let ZeroEvents = 0;
let EventsNotDecoded = 0;
let Other = 0;

let NotEqualCount = 0;
class ConstructSummary {
  constructor() {
    const oThis = this;
    oThis.response = {};
  // let result = {
  //     Transfer: {
  //     exact_match: 1000,
  //     same_action_different_language: 10,
  //     script_classification_failed_for_given_action: 10,
  //     etherscan_does_not_classify_as_given_action: 10,
  //     etherscan_does_not_have_any_text: 2,
  //   }
  // }

    // oThis.formatSwapEventsObj = new FormatSwapEvents();
  }

  async perform() {
    const oThis = this;
    console.log("Start Perform");

    let limit = 100;
    let offset = 0;
    while (true) {
      console.log("Current offset: ", offset);

      let transactionDetails = await oThis.fetchTransactionDetailObj(limit, offset);

      if (transactionDetails.length == 0) {
        break;
      }

      for (let txDetail of transactionDetails) {

        // Remove this condition after adding code for multiple highlighted event texts
        if (txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 1) {
          MultipleHighlightedEventTexts++;
          continue;
        }
        
        AllTranactionsCount++;
        
        console.log('txDetail.transactionHash: ', txDetail.transactionHash);
        
        const transferSummarry = new FormatTransferEvents().perform(txDetail);
        if (transferSummarry.type) {
          oThis.setAllCounts(transferSummarry, transferSummarry.kind);
          continue;
        } 

        const approveSummarry = new FormatApprovalEvents().perform(txDetail);
        if (approveSummarry.type) {
          oThis.setAllCounts(approveSummarry, approveSummarry.kind);
          continue;
        }

        const swapSummarry = new FormatSwapEvents().perform(txDetail);
        if (swapSummarry.type) {
          oThis.setAllCounts(swapSummarry, swapSummarry.kind);
          continue;
        }
      }
      offset = offset + limit;
      
      // if (offset > 1000) {
      //   break;
      // }
     
    }
    console.log('::RESPONSE:: ', oThis.response);
    console.log('AllTranactionsCount: ', AllTranactionsCount);
  }

  setAllCounts(summary, actionName) {
    const oThis = this;

    oThis.response[actionName] = oThis.response[actionName] || {};
    oThis.response[actionName][summary.type] = oThis.response[actionName][summary.type] || 0;
    oThis.response[actionName][summary.type]++;
  }

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select('*')
      // .where('highlighted_event_texts is not null')
      .where('transaction_hash is not null')
      // .where(['transaction_hash = "0xfef5262dff0d68ce31454e9508af8814728be82c70c8e947bd15b274d3d57240"'])
      // .where('total_events = 0 ')
      // .where('total_events = 1')
      // .where('JSON_EXTRACT(data, "$.raw_input") = "0x"')
      // .where("SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Revoked'")
      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(new TransactionDetailModel().formatDbData(txDetail));
    }

    return formattedTransactionDetails;
  }

}

const constructSummary = new ConstructSummary();

constructSummary
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });
