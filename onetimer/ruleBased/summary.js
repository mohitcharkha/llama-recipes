#!/usr/bin/env node

/*
 *
 * Format Swap Events
 *
 * Usage: node onetimer/ruleBased/formatSwapEvents.js
 *
 */

// Todo:: Delete later temp file
const BigNumber = require("bignumber.js");

const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails"),
  FormatSwap2Events = require(rootPrefix + "/lib/ruleEngine/Swap2");

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
  }

  async perform() {
    const oThis = this;
    console.log("Start Perform");

    let limit = 100;
    let offset = 0;
    while (true) {
      console.log("Current offset: ", offset);

      let transactionDetails = await oThis.fetchTransactionDetailObj(
        limit,
        offset
      );

      if (transactionDetails.length == 0) {
        break;
      }

      for (let txDetail of transactionDetails) {
        AllTranactionsCount++;

        const swap2Summarry = new FormatSwap2Events().perform(txDetail);
        if (swap2Summarry.type) {
          oThis.setAllCounts(swap2Summarry, swap2Summarry.kind);
          continue;
        }
      }
      offset = offset + limit;
    }
    console.log("AllTranactionsCount: ", AllTranactionsCount);
    console.log("::RESPONSE:: ", oThis.response);
  }

  setAllCounts(summary, actionName) {
    const oThis = this;

    oThis.response[actionName] = oThis.response[actionName] || {};
    oThis.response[actionName][summary.type] =
      oThis.response[actionName][summary.type] || 0;
    oThis.response[actionName][summary.type]++;
  }

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")

      .limit(limit)
      .offset(offset)
      .fire();

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
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
    console.log("Error in script: ", err);
    process.exit(1);
  });
