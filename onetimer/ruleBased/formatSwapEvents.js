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

let MatchCount = 0;
let SwapInEtherscanNotInScript = 0;
let SwapInScriptNotInEtherscan = 0;
let AmountsNotEqual = 0;
let MultipleHighlightedEventTexts = 0;

let NotEqualCount = 0;
class FormatSwapEvents {
  constructor() {}

  async perform() {
    const oThis = this;
    console.log("Start Perform");

    let limit = 100;
    let offset = 0;
    while (true) {
      console.log("Current offset: ", offset);

      let transactionDetails = await oThis.fetchTransactionDetailObj(limit, offset);
      console.log("transactionDetails: ", transactionDetails.length);

      if (transactionDetails.length == 0) {
        break;
      }

      for (let txDetail of transactionDetails) {

        // Remove this condition after adding code for multiple highlighted event texts
        if (txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 1) {
          MultipleHighlightedEventTexts++;
          continue;
        }

        let isEthercanTextSwap = false;
        const highlightedEventTexts = txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 0 ? txDetail.highlightedEventTexts[0] : null;
        if (oThis.checkIfHighlightedEventTextIsSwap(highlightedEventTexts) ) {
          isEthercanTextSwap = true;
        }

        const swapEvents = oThis.getSwapEvents(txDetail);
        if (swapEvents.length == 0) {
          if (isEthercanTextSwap) {
            SwapInEtherscanNotInScript++;
          }
          continue;
        }
        
        oThis.getSwapSummary(txDetail, swapEvents);
      }
      offset = offset + limit;
      
      // if (offset > 1000) {
      //   break;
      // }
     
    }
    console.log('MatchCount: ', MatchCount);
    console.log('SwapInEtherscanNotInScript: ', SwapInEtherscanNotInScript);
    console.log('SwapInScriptNotInEtherscan: ', SwapInScriptNotInEtherscan);
    console.log('AmountsNotEqual: ', AmountsNotEqual);
    console.log('NotEqualCount: ', NotEqualCount);
    console.log('MultipleHighlightedEventTexts: ', MultipleHighlightedEventTexts);
    console.log('End Perform');
  }

  getSwapSummary(txDetail, swapEvents) {
    const oThis = this;

    for (let swapEvent of swapEvents) {
      const eventLog = swapEvent.eventLog;

      // get the contract address in the event log
      const swapContractAddress = eventLog.address.hash.toLowerCase();

      let transferEventBeforeSwap = 0;
      for (let i = swapEvent.index - 1; i >= 0; i--) {
        const eventLog = txDetail.tempLogsData["items"][i];
        if (oThis.getMethodName(eventLog) === 'Transfer') {
          transferEventBeforeSwap++;
        }
      }

      if (transferEventBeforeSwap < 2) {
        // NotEqualCount++;
        return;
      }

      const tokenTransfers = txDetail.data.token_transfers;

      let incomingAmount = new BigNumber(0);
      let outgoingAmount = new BigNumber(0);
      let incomingTokenAddress = null;
      let outgoingTokenAddress = null;


      for (let tokenTransfer of tokenTransfers) {
        const tokenTransferToAddress = tokenTransfer.to.hash.toLowerCase();
        const tokenTransferFromAddress = tokenTransfer.from.hash.toLowerCase();

        if (tokenTransferToAddress == swapContractAddress) {
          const decimal = tokenTransfer.total.decimals;
          const formattedOutgoingAmount = oThis.convertToDecimal(tokenTransfer.total.value, decimal);
          incomingAmount = incomingAmount.plus(formattedOutgoingAmount);
          incomingTokenAddress = tokenTransfer.token.address;
        }

        if (tokenTransferFromAddress == swapContractAddress) {
          const decimal = tokenTransfer.total.decimals;
          const formattedOutgoingAmount = oThis.convertToDecimal(tokenTransfer.total.value, decimal);
          outgoingAmount = outgoingAmount.plus(formattedOutgoingAmount);
          outgoingTokenAddress = tokenTransfer.token.address;
        }
      }

      if (incomingTokenAddress == null || outgoingTokenAddress == null) {
        NotEqualCount++;
      
        console.log('no incoming or outgoing token address');
        return;
      }

      if (incomingTokenAddress.toUpperCase() == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase()){
        incomingTokenAddress = "Ether";
      }

      if (outgoingTokenAddress.toUpperCase() == "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase()){
        outgoingTokenAddress = "Ether";
      }

      const swapSummarry = `Swap ${oThis.convertToNumberWithCommas(incomingAmount.toString())} ${incomingTokenAddress} For ${oThis.convertToNumberWithCommas(outgoingAmount.toString())} ${outgoingTokenAddress}`;
      const highlightedEventTexts = txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 0 ? txDetail.highlightedEventTexts[0] : null;
     
      const equal = oThis.getFormattedHighlightEventText(highlightedEventTexts) == swapSummarry.toUpperCase();

      if (!equal) {
        
        if (oThis.checkIfHighlightedEventTextIsSwap(highlightedEventTexts) && !oThis.checkIfGeneratedTextIsSwap(swapSummarry)) {
          
        } else if (!oThis.checkIfHighlightedEventTextIsSwap(highlightedEventTexts) && oThis.checkIfGeneratedTextIsSwap(swapSummarry)) {
          SwapInScriptNotInEtherscan++;
        } else { 
          AmountsNotEqual++;
        } 
        
        NotEqualCount++;
      } else {
        
        MatchCount++;
      }

      // console.log('Equal or not: ', equal);
      // console.log('transaction_hash: ', txDetail.transactionHash);
      // console.log('highlightedEventText: ', highlightedEventTexts);
      // console.log('swapSummarry: ', swapSummarry);
      // console.log('--------------------------------------');

    }
  }

  getFormattedHighlightEventText(highlightedEventTexts) {
    const oThis = this;

    if (!highlightedEventTexts) {
      return null;
    }

    return (highlightedEventTexts && highlightedEventTexts.split(' On')[0].toUpperCase());
  }


  convertToNumberWithCommas(value) {
    let parts = value.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-US');
    return parts.join('.');
  }

  convertToDecimal(value, decimal) {
    // if (!decimal) {
    //   decimal = 18;
    // }
    return new BigNumber(value).dividedBy(new BigNumber(10).pow(decimal)).toString();
  }

  getSwapEvents(formattedTxDetail) {
    const oThis = this,
      swapEvents = [];

    let index = 0;
    for (let eventLog of formattedTxDetail.tempLogsData["items"]) {
      if (oThis.isSwapEvent(eventLog) ) {
        swapEvents.push(
          {
            index: index,
            eventLog: eventLog
          }
        )
      }
      index++;
    }

    return swapEvents;
  }

  isSwapEvent(event) {
    const oThis = this;

    return oThis.getMethodName(event) === 'Swap';
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split('(')[0];

    return method || event.temp_function_name;
  }
  
  checkIfHighlightedEventTextIsSwap(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(' ');

    return highlightedEventTextArr[0].toUpperCase() == 'SWAP';
  }

  checkIfGeneratedTextIsSwap(generatedText) {
    const oThis = this;

    if (!generatedText) {
      return false;
    }

    const generatedTextArr = generatedText.split(' ');

    return generatedTextArr[0].toUpperCase() == 'SWAP';
  }

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select('*')
      .where('highlighted_event_texts is not null')
      // .where(['transaction_hash = "0x315fb023079d13ada260f39129b02fdec567923431ccb2658d6e1c78f17be85d"'])
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


const formatSwapEvents = new FormatSwapEvents();

formatSwapEvents
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });
