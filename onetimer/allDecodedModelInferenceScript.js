const OpenAIApi = require("openai");
const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const rootPrefix = "..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails"),
  coreConstants = require(rootPrefix + "/config/coreConstants"),
  trainedTransactionsArray = require(rootPrefix +
    "/lib/allDecodedTrainedTransactionsArray.json");

class ModelInference {
  constructor() {
    const oThis = this;

    oThis.noOfInferences = 50;
    oThis.modelName = "ft:gpt-3.5-turbo-0613:true-sparrow::7z1pp4dl";
    oThis.txnTypeLimit = oThis.noOfInferences / 9;
  }

  async perform() {
    console.log("Start Perform");
    const oThis = this;

    const openai = new OpenAIApi();

    let fetchTransactionDetailObj = new TransactionDetailModel();
    // let transactionDetails = await fetchTransactionDetailObj.getValidTransactionDetailsForAllNonDecodedEvents(
    // let transactionDetails = await fetchTransactionDetailObj.getValidTransactionDetailsForSomeNonDecodedEvents(
    let transactionDetails = await fetchTransactionDetailObj.getRowsWithValidHighlightedEventTexts(
      oThis.noOfInferences * 100,
      0,
      trainedTransactionsArray
    );

    console.log("transactionDetails length", transactionDetails.length);

    const processedTransactions = await oThis.processTransactions(
      transactionDetails
    );

    const dataForCsv = [];

    for (let txDetail of processedTransactions) {
      console.log("Transaction hash: ", txDetail.data.hash);
      const transactionDetails = oThis.getTransactionDetails(txDetail);
      const prompt = oThis.generatePrompt(transactionDetails);

      let completion = null;

      try {
        completion = await openai.chat.completions.create({
          messages: prompt.messages,
          model: oThis.modelName,
        });
      } catch (error) {
        console.log("Error in completion: ", error);
        continue;
      }

      // const completion = {
      //   choices: [
      //     {
      //       index: 0,
      //       message: {
      //         role: "assistant",
      //         content:
      //           '["Transfer 197.429455329644342 0x6e2a43be0b1d33b726f0ca3b8de60b3482b8b050 To 0x1a3e169d78fa471f0a978f5864a5230e05eb768a"]',
      //       },
      //       finish_reason: "stop",
      //     },
      //   ],
      // };

      console.log("completion.choices[0]: ", completion.choices[0]);

      const completionText = completion.choices[0].message.content;

      let parsedCompletionText = null;

      try {
        parsedCompletionText = JSON.parse(completionText);
      } catch (error) {
        console.log("Error in parsing completion text: ", error);
        continue;
      }

      const isMatch = oThis.matchResult(
        parsedCompletionText,
        transactionDetails.output
      );

      const data = {
        modelName: oThis.modelName,
        systemPrompt: prompt.messages[0].content,
        userPrompt: prompt.messages[1].content,
        transactionHash: transactionDetails.transactions.hash,
        transactionType: txDetail.txnType,
        trainedModelOutput: parsedCompletionText,
        expectedOutput: transactionDetails.output,
        isSame: isMatch,
      };

      dataForCsv.push(data);
    }

    console.log("Writing to CSV file");
    await oThis.writeDataToCsvFile(dataForCsv);
    console.log("End Perform");
  }

  getTransactionDetails(txDetail) {
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

    const transactionDetails = {
      id: txDetail.id,
      event_logs: decodedLogs,
      token_transfers: txDetail.data.token_transfers,
      transactions: transactions,
      output: txDetail.highlightedEventTexts,
    };

    return transactionDetails;
  }

  generatePrompt(trainingDataItem) {
    const prompt = {
      messages: [
        {
          role: "system",
          content: JSON.stringify(
            `You are an expert in Ethereum blockchain and its various protocols and smart contracts with specialization in understanding Ethereum transactions, event logs, and token transfers. Your primary task is to meticulously analyze Ethereum blockchain transactions and generate concise one-line summaries. Your analysis should include inspecting token transfers to craft desired summaries as the event logs might not always be decoded.Pay close attention to intelligently group related events into one primary action. If a transaction contains multiple groupings of the same events or different unrelated events that hold critical importance, create one-line summaries for each distinct grouping of events to ensure all relevant details are captured effectively.Additionally, it is crucial to ensure accurate representation of token and total values based on their associated decimal places. Your focus should be on delivering clear and concise summaries that extract essential information from the transactions`
          ),
        },
        {
          role: "user",
          content: JSON.stringify({
            event_logs: JSON.stringify(trainingDataItem.event_logs),
            token_transfers: JSON.stringify(trainingDataItem.token_transfers),
            transactions: JSON.stringify(trainingDataItem.transactions),
          }),
        },
      ],
    };
    return prompt;
  }

  matchResult(actual, expected) {
    if (actual.length !== expected.length) {
      return false;
    }
    return actual.every((value, index) => value === expected[index]);
  }

  createCsvString(data) {
    const header = [
      "Model Name",
      "System Prompt",
      "User Prompt",
      "Transaction Hash",
      "Transaction Type",
      "Trained Model Output",
      "Expected Output",
      "Is it Same",
    ].join("*");

    // Create an array of data rows
    const rows = data.map((item) =>
      [
        item.modelName,
        item.systemPrompt,
        item.userPrompt,
        item.transactionHash,
        item.transactionType,
        item.trainedModelOutput.join(";"),
        item.expectedOutput.join(";"),
        item.isSame ? "Yes" : "No",
      ].join("*")
    );

    const csvString = [header, ...rows].join("\n");

    return csvString;
  }

  writeDataToCsvFile(data) {
    const oThis = this;

    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const directory = "./onetimer/output";

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const csvFileName = `model_inference_output_${timestamp}.csv`;
    const csvFilePath = path.join(directory, csvFileName);

    const csvString = oThis.createCsvString(data);

    try {
      fs.writeFileSync(csvFilePath, csvString);
      console.log("CSV file has been written successfully");
    } catch (error) {
      console.error("Error writing CSV:", error);
    }
  }

  async processTransactions(transactionDetails) {
    const oThis = this;

    let txnTypeToCountMap = {},
      transactionsArr = [],
      totalProcessedTransactions = 0;

    for (let txDetail of transactionDetails) {
      if (totalProcessedTransactions >= oThis.noOfInferences) {
        break;
      }

      if (txnTypeToCountMap[txDetail.txnType]) {
        if (txnTypeToCountMap[txDetail.txnType] >= oThis.txnTypeLimit) {
          continue;
        }

        txnTypeToCountMap[txDetail.txnType] =
          txnTypeToCountMap[txDetail.txnType] + 1;
      } else {
        txnTypeToCountMap[txDetail.txnType] = 1;
      }

      transactionsArr.push(txDetail);
      console.log("Transaction hash: ", txDetail.data.hash);
      totalProcessedTransactions++;
    }

    console.log("Total transactions: ", transactionsArr.length);
    console.log("txnTypeToCountMap: ", txnTypeToCountMap);

    return transactionsArr;
  }
}

const generateHighlightedEvents = new ModelInference();

generateHighlightedEvents
  .perform()
  .then(function(rsp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.log("Error in script: ", err);
    process.exit(1);
  });
