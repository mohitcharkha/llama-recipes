// #!/usr/bin/env node

// /*
//  *
//  * Format Swap Events
//  *
//  * Usage: node onetimer/ruleBased/formatSwapEvents.js
//  *
//  */

// const BigNumber = require('bignumber.js');

// const rootPrefix = '../..',
//   TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');
//   FormatSwapEvents = require(rootPrefix + '/lib/ruleEngine/Swap');
//   FormatTransferEvents = require(rootPrefix + '/lib/ruleEngine/Transfer'),
//   FormatApprovalEvents = require(rootPrefix + '/lib/ruleEngine/Approve');

// let MatchCount = 0;
// let SwapInEtherscanNotInScript = 0;
// let SwapInScriptNotInEtherscan = 0;
// let AmountsNotEqual = 0;
// let TokenAddressNotFound = 0;
// let MultipleHighlightedEventTexts = 0;

// let allApprovals = 0;

// let AllTranactionsCount = 0;
// let ZeroEvents = 0;
// let EventsNotDecoded = 0;
// let Other = 0;

// let NotEqualCount = 0;
// class FormatEvents {
//   constructor() {
//     const oThis = this;

//     oThis.formatSwapEventsObj = new FormatSwapEvents();

//   }

//   async perform() {
//     const oThis = this;
//     console.log("Start Perform");

//     let limit = 100;
//     let offset = 0;
//     while (true) {
//       console.log("Current offset: ", offset);

//       let transactionDetails = await oThis.fetchTransactionDetailObj(limit, offset);

//       if (transactionDetails.length == 0) {
//         break;
//       }

//       for (let txDetail of transactionDetails) {

//         // Remove this condition after adding code for multiple highlighted event texts
//         if (txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 1) {
//           MultipleHighlightedEventTexts++;
//           continue;
//         }
        
//         AllTranactionsCount++;
        
//         console.log('txDetail.transactionHash: ', txDetail.transactionHash);

//         const transferSummarry = FormatTransferEvents.perform(txDetail);
//         oThis.setAllCounts(transferSummarry);
        
//         // const approveSummarry = FormatApprovalEvents.perform(txDetail);

//         // console.log('approveSummarry: ', approveSummarry);
//         // oThis.setAllCounts(approveSummarry);

//         // const swapSummarry = oThis.formatSwapEventsObj.perform(txDetail);
//         // oThis.setAllCounts(swapSummarry);

//       }
//       offset = offset + limit;
      
//       // if (offset > 1000) {
//       //   break;
//       // }
     
//     }
//     console.log('MatchCount: ', MatchCount);
//     console.log('AllTranactionsCount: ', AllTranactionsCount);
//     console.log('Other: ', Other);
//     console.log('ZeroEvents: ', ZeroEvents);
//     console.log('EventsNotDecoded: ', EventsNotDecoded);
//     console.log('SwapInEtherscanNotInScript: ', SwapInEtherscanNotInScript);
//     console.log('SwapInScriptNotInEtherscan: ', SwapInScriptNotInEtherscan);
//     // console.log('AmountsNotEqual: ', AmountsNotEqual + TokenAddressNotFound);
//     console.log('NotEqualCount: ', NotEqualCount);
//     // console.log('MultipleHighlightedEventTexts: ', MultipleHighlightedEventTexts);

//     console.log('End Perform');
//   }

//   setAllCounts(swapSummarry) {
//     const oThis = this;

//     if (swapSummarry.matched == true) {
//       MatchCount++;

//       return;
//     } 

//     const type = swapSummarry.type;
//     switch (type) {
//       case 'SwapInEtherscanNotInScript':
//         SwapInEtherscanNotInScript++;
//         NotEqualCount++;
//         break;
//       case 'SwapInScriptNotInEtherscan':
//         SwapInScriptNotInEtherscan++;
//         NotEqualCount++;
//         break;
//       case 'AmountsNotEqual':
//         AmountsNotEqual++;
//         NotEqualCount++;
//         break;
//       case 'TokenAddressNotFound':
//         TokenAddressNotFound++;
//         NotEqualCount++;
//         break;
//       case 'ZeroEvents':
//         ZeroEvents++;
//         NotEqualCount++;
//         break;
//       case 'EventsNotDecoded':
//         EventsNotDecoded++;
//         break;
//       case 'NotEqualCount':
//         NotEqualCount++;
//         break;
//       case 'Other':
//         Other++;
//         break;
//       default:
//         console.log('Invalid type: ', type);
//     }
//   }

//   async fetchTransactionDetailObj(limit, offset) {
//     let fetchTransactionDetailObj = new TransactionDetailModel();
//     let transactionDetails = await fetchTransactionDetailObj
//       .select('*')
//       // .where('highlighted_event_texts is not null')
//       .where('transaction_hash is not null')
//       // .where(['transaction_hash = "0x315fb023079d13ada260f39129b02fdec567923431ccb2658d6e1c78f17be85d"'])
//       .limit(limit)
//       .offset(offset)
//       .fire();

//     console.log("transactionDetails", transactionDetails.length);

//     let formattedTransactionDetails = [];

//     for (let txDetail of transactionDetails) {
//       formattedTransactionDetails.push(new TransactionDetailModel().formatDbData(txDetail));
//     }

//     return formattedTransactionDetails;
//   }

//   getMethodName(event) {
//     const methodCall = event && event.decoded && event.decoded.method_call;
//     // check if method call is swap event by splitting the method call
//     const method = methodCall && methodCall.split('(')[0];
  
//     return method || event.temp_function_name;
//   }

//   convertToDecimal(value, decimal) {
//     // if (!decimal) {
//     //   decimal = 18;
//     // }
//     return new BigNumber(value).dividedBy(new BigNumber(10).pow(decimal)).toString();
//   }

//   convertToNumberWithCommas(value) {
//     let parts = value.split('.');
//     parts[0] = Number(parts[0]).toLocaleString('en-US');
//     return parts.join('.');
//   }

//   checkIfHighlightedEventTextIsTransfer(highlightedEventText) {
//     const oThis = this;

//     if (!highlightedEventText) {
//       return false;
//     }

//     const highlightedEventTextArr = highlightedEventText.split(' ');

//     return highlightedEventTextArr[0].toUpperCase() == 'TRANSFER';
//   }
// }

// const formatSwapEvents = new FormatEvents();

// formatSwapEvents
//   .perform()
//   .then(function(rsp) {
//     process.exit(0); 
//   })
//   .catch(function(err) {
//     console.log('Error in script: ', err);
//     process.exit(1); 
//   });
