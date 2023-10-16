#!/usr/bin/env node

/*
 *
 * Populate Report
 *
 * Usage: node onetimer/reportData.js
 *
 */

const cheerio = require('cheerio');

const rootPrefix = '..',
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');

class ReportData {
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
      let transactionDetails = await fetchTransactionDetailObj
        .select('id, logs_data')
        .where(['status = "SUCCESS"'])
        .limit(limit)
        .offset(offset)
        .fire();

      if (transactionDetails.length == 0) {
        break;
      }

      let promises = [];
      for (let txDetail of transactionDetails) {
        const formattedTxDetail = new TransactionDetailModel().formatDbData(txDetail);
        let decodeEventCount = 0;
        let totalEventCount = 0;
        for (let eventLog of formattedTxDetail.logsData["items"]) {
          totalEventCount++;
          if (eventLog && eventLog.decoded && eventLog.decoded.method_id){
            decodeEventCount++;
          }
        }
        console.log('totalEventCount, decodeEventCount', totalEventCount, decodeEventCount);

        if (totalEventCount == 0) {
          continue;
        }
        let updateTransactionDetailObj = new TransactionDetailModel();
        let prm =  updateTransactionDetailObj.updateById(txDetail.id, {
          total_events: totalEventCount, total_decoded_events: decodeEventCount
        });
        promises.push(prm);

        if (promises.length == 10) {
          await Promise.all(promises);
          promises = [];
        }
      }
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      offset = offset + limit;
    }
    console.log('End Perform');
  }
}


const reportData = new ReportData();

reportData
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

