const BigNumber = require("bignumber.js");
// Script without triggers
const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails"),
  FormatTransferEvents = require(rootPrefix +
    "/lib/ruleBasedWithoutTrigger/Transfer"),
  FormatApproveEvents = require(rootPrefix +
    "/lib/ruleBasedWithoutTrigger/Approve"),
  FormatBasicEtherEvents = require(rootPrefix +
    "/lib/ruleBasedWithoutTrigger/BasicEtherTransfer"),
  FormatMintEvents = require(rootPrefix + "/lib/ruleBasedWithoutTrigger/Mint"),
  FormatSaleEvents = require(rootPrefix + "/lib/ruleBasedWithoutTrigger/Sale"),
  FormatDepositEvents = require(rootPrefix +
    "/lib/ruleBasedWithoutTrigger/Deposit"),
  FormatRevokeEvents = require(rootPrefix +
    "/lib/ruleBasedWithoutTrigger/Revoke");

// Script to run: node onetimer/ruleBased/constructSummary3.js revoked

let AllTranactionsCount = 0;

class ConstructSummary {
  constructor() {
    const oThis = this;
    oThis.response = {};
  }

  async perform() {
    const oThis = this;
    console.log("Start Perform");
    const category = process.argv[2]; // transfer, approved, revoked, basicEtherTransfer, mint
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

      if (transactionDetails.length == 0) {
        break;
      }

      for (let txDetail of transactionDetails) {
        AllTranactionsCount++;

        console.log("txDetail.transactionHash: ", txDetail.transactionHash);

        if (category == "basicEtherTransfer") {
          const transferSummarry = new FormatBasicEtherEvents().perform(
            txDetail
          );
          console.log("transferSummarry: ", transferSummarry);
          if (transferSummarry.type) {
            oThis.setAllCounts(transferSummarry, transferSummarry.kind);
            continue;
          }
        }

        if (category == "transfer") {
          const transferSummarry = new FormatTransferEvents().perform(txDetail);
          console.log("transferSummarry: ", transferSummarry);
          if (transferSummarry.type) {
            oThis.setAllCounts(transferSummarry, transferSummarry.kind);
            continue;
          }
        }

        if (category == "approved") {
          const approveSummarry = new FormatApproveEvents().perform(txDetail);
          console.log("approveSummarry: ", approveSummarry);
          if (approveSummarry.type) {
            oThis.setAllCounts(approveSummarry, approveSummarry.kind);
            continue;
          }
        }

        if (category == "revoked") {
          const revokeSummarry = new FormatRevokeEvents().perform(txDetail);
          console.log("revokeSummarry: ", revokeSummarry);
          if (revokeSummarry.type) {
            oThis.setAllCounts(revokeSummarry, revokeSummarry.kind);
            continue;
          }
        }

        if (category == "mint") {
          const mintSummarry = new FormatMintEvents().perform(txDetail);
          console.log("mintSummarry: ", mintSummarry);
          if (mintSummarry.type) {
            oThis.setAllCounts(mintSummarry, mintSummarry.kind);
            continue;
          }
        }

        if (category == "sale") {
          const saleSummarry = new FormatSaleEvents().perform(txDetail);
          console.log("saleSummarry: ", saleSummarry);
          if (saleSummarry.type) {
            oThis.setAllCounts(saleSummarry, saleSummarry.kind);
            continue;
          }
        }

        if (category == "deposit") {
          const depositSummary = new FormatDepositEvents().perform(txDetail);
          console.log("depositSummary: ", depositSummary);
          if (depositSummary.type) {
            oThis.setAllCounts(depositSummary, depositSummary.kind);
            continue;
          }
        }
      }
      offset = offset + limit;
    }
    console.log("::Response from script:: ", oThis.response);
    console.log("AllTranactionsCount: ", AllTranactionsCount);
  }

  setAllCounts(summary, actionName) {
    const oThis = this;

    oThis.response[actionName] = oThis.response[actionName] || {};
    oThis.response[actionName][summary.type] =
      oThis.response[actionName][summary.type] || 0;
    oThis.response[actionName][summary.type]++;
  }

  async fetchTransactionDetailObj(limit, offset, category) {
    const oThis = this;

    if (category == "basicEtherTransfer") {
      const response = await oThis.fetchBasicEtherTransfers(limit, offset);
      return response;
    }

    if (category == "transfer") {
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
    // Query to fetch Transfer count  // Total count in my local db: 2071
    //         select count(*) from transactions_details where
    // transaction_hash is not null and JSON_LENGTH(highlighted_event_texts)  = 1
    // and SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Transfer'
    // and JSON_UNQUOTE(JSON_EXTRACT(data, '$.raw_input')) != '0x';

    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Transfer'"
      )
      .where(" JSON_LENGTH(highlighted_event_texts) = 1")
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
