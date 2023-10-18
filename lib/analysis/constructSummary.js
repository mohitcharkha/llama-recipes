const BigNumber = require("bignumber.js");
const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails"),
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails"),
  FormatSwapEvents = require(rootPrefix + "/lib/analysis/swap"),
  FormatTransferEvents = require(rootPrefix + "/lib/analysis/tokenTransfer");

// Script to run: node lib/analysis/constructSummary.js swap/ tokenTransfer

let AllTranactionsCount = 0;

class ConstructSummary {
  constructor() {
    const oThis = this;
    oThis.response = {};
    console.log("Start Constructor");
  }

  async perform() {
    const oThis = this;
    console.log("Start Perform");
    const category = process.argv[2]; // swap/ tokenTransfer
    console.log("category: ", category);

    let limit = 5000;
    let offset = 0;

    while (true) {
      console.log("Current offset: ", offset);

      let transactionDetails = await oThis.fetchTransactionDetailObj(
        limit,
        offset,
        category
      );

      console.log("transactionDetails Length: ", transactionDetails.length);

      if (transactionDetails.length == 0) {
        break;
      }

      for (let txDetail of transactionDetails) {
        AllTranactionsCount++;

        console.log("txDetail.transactionHash: ", txDetail.transactionHash);

        if (category == "swap") {
          const swapSummary = new FormatSwapEvents().perform(txDetail);
          //console.log("swapSummary: ", swapSummary);

          if (swapSummary.type) {
            oThis.setAllCounts(
              txDetail.transactionHash,
              swapSummary,
              swapSummary.kind,
              swapSummary.reason
            );
            await oThis.updateAnalysisDetails(
              swapSummary.analysisDetails,
              txDetail
            );

            continue;
          }
        }

        if (category == "tokenTransfer") {
          const transferSummarry = new FormatTransferEvents().perform(txDetail);
          if (transferSummarry.type) {
            oThis.setAllCounts(txDetail.transactionHash, transferSummarry, transferSummarry.kind, transferSummarry.reason);
             await oThis.updateAnalysisDetails(
              transferSummarry.analysisDetails,
              txDetail
            );
            continue;
          }
        }
      }
      offset = offset + limit;
    }
    console.log("::Response from script:: ", oThis.response);
    console.log("::Response from script:: ", JSON.stringify( oThis.response));

    console.log("AllTranactionsCount: ", AllTranactionsCount);
  }

  setAllCounts(txHash, summary, actionName, reason) {
    const oThis = this;

    oThis.response[actionName] = oThis.response[actionName] || {};
    oThis.response[actionName][summary.type] =
      oThis.response[actionName][summary.type] || 0;
    oThis.response[actionName][summary.type]++;

    if (summary.type == "unsuccessful_match") {


      oThis.response[summary.subkind] = oThis.response[summary.subkind] || {};

      oThis.response[summary.subkind][reason] ||= { "Count": 0, "TxHash": {} };
      oThis.response[summary.subkind][reason]["Count"]++;
      if (!oThis.response[summary.subkind][reason]["TxHash"][txHash]) {
        oThis.response[summary.subkind][reason]["TxHash"][txHash] = {
              "TxHash": txHash

        }
      }
  
    }
  }

  async updateAnalysisDetails(analysisDetails, txDetail) {
    const oThis = this;

    await new TransactionDetailModel()
      .update({
        analysis_details: JSON.stringify(analysisDetails)
      })
      .where({ id: txDetail.id })
      .fire();
  }

  async fetchTransactionDetailObj(limit, offset, category) {
    const oThis = this;

    console.log("category in fetchTransactionDetailObj: ", category);

    if (category == "swap") {
      const response = await oThis.fetchSwap(limit, offset);
      return response;
    }

    if (category == "basicEtherTransfer") {
      const response = await oThis.fetchBasicEtherTransfers(limit, offset);
      return response;
    }

    if (category == "tokenTransfer") {
      const response = await oThis.fetchTransfers(limit, offset);
      return response;
    }

    if (category == "approved") {
      const response = await oThis.fetchApproved(limit, offset);
      return response;
    }

    if (category == "revoked") {
      const response = await oThis.fetchRevoked(limit, offset);
      return response;
    }

    if (category == "mint") {
      const response = await oThis.fetchMint(limit, offset);
      return response;
    }

    if (category == "sale") {
      const response = await oThis.fetchSale(limit, offset);
      return response;
    }

    if (category == "deposit") {
      const response = await oThis.fetchDeposit(limit, offset);
      return response;
    }
  }

  async fetchTransfers(limit, offset) {
    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Transfer'"
      )
      //.where(['transaction_hash = "0x014c75ccdbc859b9a6c23ad18d88e187e0c5d62519dba680dbe3acd527c0abfc"'])

      .where("JSON_UNQUOTE(JSON_EXTRACT(data, '$.raw_input')) != '0x'")
      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async fetchSwap(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      //.where(['transaction_hash = "0x014c75ccdbc859b9a6c23ad18d88e187e0c5d62519dba680dbe3acd527c0abfc"'])
      //.where(["total_decoded_events = total_events"])
      .where(["status = ?", transactionDetailsConstants.successStatus])
      .where([
        "highlighted_event_status = ?",
        transactionDetailsConstants.successHighlightedEventStatus
      ])
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = " +
          "'Swap'"
      )
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

  async fetchBasicEtherTransfers(limit, offset) {
    // Query for basic transfers   // Total count in my local db: 4109
    // select count(*) from transactions_details where
    // transaction_hash is not null
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Transfer' and JSON_LENGTH(highlighted_event_texts)  = 1
    // and JSON_UNQUOTE(JSON_EXTRACT(data, '$.raw_input')) = '0x'
    // and JSON_UNQUOTE(JSON_EXTRACT(data, '$.value')) != '0'
    // and JSON_LENGTH(JSON_EXTRACT(logs_data, '$.items')) = 0;

    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Transfer'"
      )
      .where(" JSON_LENGTH(highlighted_event_texts) = 1")
      .where("JSON_LENGTH(JSON_EXTRACT(logs_data, '$.items')) = 0")
      .where("JSON_UNQUOTE(JSON_EXTRACT(data, '$.raw_input')) = '0x'")
      .where("JSON_UNQUOTE(JSON_EXTRACT(data, '$.value')) != '0'")
      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async fetchApproved(limit, offset) {
    // Query to fetch Approve count  // Total count in my local db: 1420
    // select count(*) from transactions_details where
    // transaction_hash is not null
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Approved' and JSON_LENGTH(highlighted_event_texts)  = 1;
    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Approved'"
      )
      .where(" JSON_LENGTH(highlighted_event_texts) = 1")

      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async fetchRevoked(limit, offset) {
    // Query to fetch Revoked count  // Total count in my local db: 53
    //  select count(*) from transactions_details where
    //  transaction_hash is not null
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Revoked' ;

    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Revoked'"
      )
      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async fetchMint(limit, offset) {
    //  select count(*) from transactions_details where
    //  transaction_hash is not null
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Mint'
    // and JSON_LENGTH(highlighted_event_texts) = 1;

    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Mint'"
      )
      .where(" JSON_LENGTH(highlighted_event_texts) = 1")

      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async fetchSale(limit, offset) {
    //  select count(*) from transactions_details where
    //  transaction_hash is not null
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Sale:'
    // and JSON_LENGTH(highlighted_event_texts) = 1;

    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Sale:'"
      )
      .where(" JSON_LENGTH(highlighted_event_texts) = 1")

      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async fetchDeposit(limit, offset) {
    //      select count(*) from transactions_details where
    //  transaction_hash is not null
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Deposit';

    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Deposit'"
      )

      .limit(limit)
      .offset(offset)
      .fire();

    console.log("transactionDetails", transactionDetails.length);

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
