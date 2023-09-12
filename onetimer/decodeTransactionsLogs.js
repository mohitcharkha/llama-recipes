#!/usr/bin/env node

/*
 *
 * Decode events in transaction logs
 *
 * Usage: node onetimer/decodeTransactionsLogs.js
 *
 */

const rootPrefix = "..",
  TransactionLogModel = require(rootPrefix + "/app/models/mysql/main/TransactionLog"),
  decodeLogs =  require(rootPrefix + '/lib/decodeLogs');

class DecodeTransactionsLogs {
  constructor() {}

  async perform() {
    console.log("Start Perform");   

    let offset = 0;
    let limit = 1000;
    while (true) {
      let txHashes = await new TransactionLogModel().getPaginatedTxHash(limit, offset);
      if (txHashes.length === 0) {
        break;
      }

      for (let index in txHashes) {
        const txHash = txHashes[index];
        const decodeLibObj = new decodeLogs({txHash: txHash});
        try{
          await decodeLibObj.perform();
        } catch(err) {
          console.log("Error in decoding txHash: ", txHash);
        }
      }
      
      offset += limit;
    }


    console.log("End Perform");
  }
}

const decodeTransactionsLogs = new DecodeTransactionsLogs();

decodeTransactionsLogs
  .perform()
  .then(function(rsp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.log("Error in script: ", err);
    process.exit(1);
  });
