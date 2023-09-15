/*
 *
 * Create training data for the model
 *
 * Usage: node onetimer/generateTrainingData.js
 *
 */

const { writeFileSync } = require("fs");
const { join } = require("path");

const rootPrefix = "..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails");

class GenerateTrainingData {
  constructor() {
    const oThis = this;
    oThis.txnTypeLimit = 20;
  }

  async perform() {
    console.log("Start Perform");

    const oThis = this;

    // Fetch all valid transactions
    console.log("Fetching all valid transactions....");

    let limit = 100;
    let offset = 0;

    // Map of txn_type to count of transactions
    let txnTypeToCountMap = {};

    while (true) {
      console.log("Current offset: ", offset);

      let fetchTransactionDetailObj = new TransactionDetailModel();
      let transactionDetails = await fetchTransactionDetailObj.getRowsWithValidHighlightedEventTexts(
        limit,
        offset
      );

      if (transactionDetails.length == 0) {
        break;
      } else {
        offset = offset + limit;
      }

      for (let txDetail of transactionDetails) {
        // Count of transactions for each txn_type
        if (txnTypeToCountMap[txDetail.txnType]) {
          // check if count is less than limit
          if (txnTypeToCountMap[txDetail.txnType] >= oThis.txnTypeLimit) {
            continue;
          }

          txnTypeToCountMap[txDetail.txnType] =
            txnTypeToCountMap[txDetail.txnType] + 1;
        } else {
          txnTypeToCountMap[txDetail.txnType] = 1;
        }

        // Get training data detail

        const trainingDataDetail = oThis.getTrainingDataDetail(txDetail);

        // Generate prompt

        const prompt = oThis.generatePrompt(trainingDataDetail);

        // Write to file

        try {
          const data = JSON.stringify(prompt) + "\n";
          writeFileSync(join(__dirname, "training_dataset.jsonl"), data, {
            flag: "a+",
          });
        } catch (error) {
          console.error(error.message);
        }
      }
    }

    console.log("txnTypeToCountMap: ", txnTypeToCountMap);

    // Log total count of transactions
    let totalCount = 0;
    for (let txnType in txnTypeToCountMap) {
      totalCount = totalCount + txnTypeToCountMap[txnType];
    }
    console.log("Total count of transactions: ", totalCount);

    console.log("End Perform");
  }

  getTrainingDataDetail(txDetail) {
    // Format decoded logs
    let decodedLogs = [];
    for (let item of txDetail.logsData.items) {
      decodedLogs.push({
        decoded_log: item.decoded,
        address: item.address,
      });
    }

    // Format transactions
    let transactions = {
      hash: txDetail.data.hash,
      to: txDetail.data.to,
      from: txDetail.data.from,
      type: txDetail.data.type,
      value: txDetail.data.value,
      method: txDetail.data.method,
      status: txDetail.data.status,
      tx_tag: txDetail.data.tx_tag,
      actions: txDetail.data.actions,
      tx_types: txDetail.data.tx_types,
      decoded_input: txDetail.data.decoded_input,
      created_contract: txDetail.data.created_contract,
      has_error_in_internal_txs: txDetail.data.has_error_in_internal_txs,
    };

    const trainingDataDetail = {
      id: txDetail.id,
      event_logs: decodedLogs,
      token_transfers: txDetail.data.token_transfers,
      transactions: transactions,
      output: txDetail.highlightedEventTexts,
    };

    return trainingDataDetail;
  }

  generatePrompt(trainingDataItem) {
    const prompt = {
      messages: [
        {
          role: "system",
          content: `You are an expert in Ethereum blockchain and its various protocols and smart contracts with specialization in understanding Ethereum transactions, event logs, and token transfers. Your primary task is to meticulously analyze Ethereum blockchain transactions and generate concise one-line summaries. 
Your analysis should include inspecting token transfers to craft desired summaries as the event logs might not always be decoded.Pay close attention to intelligently group related events into one primary action. If a transaction contains multiple groupings of the same events or different unrelated events that hold critical importance, create one-line summaries for each distinct grouping of events to ensure all relevant details are captured effectively.
Additionally, it is crucial to ensure accurate representation of token and total values based on their associated decimal places. Your focus should be on delivering clear and concise summaries that extract essential information from the transactions`,
        },
        {
          role: "user",
          content: JSON.stringify({
            event_logs: trainingDataItem.event_logs,
            token_transfers: trainingDataItem.token_transfers,
            transactions: trainingDataItem.transactions,
          }),
        },
        {
          role: "assistant",
          content: JSON.stringify(trainingDataItem.output),
        },
      ],
    };
    return prompt;
  }
}

const generateTrainingData = new GenerateTrainingData();

generateTrainingData
  .perform()
  .then(function(rsp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.log("Error in script: ", err);
    process.exit(1);
  });
