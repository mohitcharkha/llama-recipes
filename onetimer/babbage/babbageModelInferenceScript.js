const OpenAIApi = require("openai");
const fs = require("fs");
const path = require("path");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails"),
  coreConstants = require(rootPrefix + "/config/coreConstants"),
  trainedTransactionsArray = require(rootPrefix +
    "/lib/nonDecodedTrainedTransactionsArray.json");

class ModelInference {
  constructor() {
    const oThis = this;

    oThis.systemPrompt = `You are an expert in Ethereum blockchain and its various protocols and smart contracts with specialization in understanding Ethereum transactions, event logs, and token transfers. Your primary task is to meticulously analyze Ethereum blockchain transactions and generate concise one-line summaries. Your analysis should include inspecting token transfers to craft desired summaries as the event logs might not always be decoded.Pay close attention to intelligently group related events into one primary action. If a transaction contains multiple groupings of the same events or different unrelated events that hold critical importance, create one-line summaries for each distinct grouping of events to ensure all relevant details are captured effectively. Additionally, it is crucial to ensure accurate representation of token and total values based on their associated decimal places. Your focus should be on delivering clear and concise summaries that extract essential information from the transactions`;
    oThis.userPrompt = null;
    oThis.trainedEventTypes = [
      "Swap",
      "Burn",
      "Transfer",
      "Approved",
      "Withdraw",
      "Executed",
      "Mint",
      "'Sale:'",
      "Revoked",
      "Enable",
      "Wrap",
      "Deposit",
      "Supply",
      "Unwrap",
      "Cancel",
      "Remove",
      "Add",
      "Stake",
      "Repay",
      "Borrow",
      "Collect",
      "Disable",
    ];

    oThis.noOfInferences = 50;
    oThis.modelName = "ft:babbage-002:true-sparrow:rio:83hMbTpW";
    oThis.txnTypeLimit = oThis.noOfInferences / 17;
  }

  async perform() {
    console.log("Start Perform");
    const oThis = this;

    const openai = new OpenAIApi();

    const omitTransactionHashes = trainedTransactionsArray;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj.getValidTransactionDetails(
      // let transactionDetails = await fetchTransactionDetailObj.getValidTransactionDetailsForSomeNonDecodedEvents(
      // let transactionDetails = await fetchTransactionDetailObj.getValidTransactionDetailsForZeroNonDecodedEvents(
      oThis.noOfInferences * 100,
      0,
      omitTransactionHashes
    );

    console.log("transactionDetails length", transactionDetails.length);

    const processedTransactions = await oThis.processTransactions(
      transactionDetails
    );

    const dataForCsv = [];

    for (let txDetail of processedTransactions) {
      const transactionDetails = oThis.getTransactionDetails(txDetail);
      const prompt = oThis.generatePrompt(transactionDetails);

      let completion = null;

      try {
        completion = await openai.completions.create({
          model: oThis.modelName,
          prompt: prompt,
        });
      } catch (error) {
        console.log(
          "Error in completion for hash:",
          txDetail.data.hash,
          "Error:",
          error.code,
          "\n\n Error:",
          error
        );
        continue;
      }

      console.log("Completion", completion);

      console.log("Transaction hash: ", txDetail.data.hash);

      // completion = {
      //   id: "cmpl-83kzklJGPQiym97xjKovHGEP7bgxL",
      //   object: "text_completion",
      //   created: 1695906324,
      //   model: "ft:babbage-002:true-sparrow:rio:83hMbTpW",
      //   choices: [
      //     {
      //       text: '["Swap 0.30715621648634070 Ether For 5,',
      //       index: 0,
      //       logprobs: null,
      //       finish_reason: "length",
      //     },
      //   ],
      //   usage: {
      //     prompt_tokens: 3549,
      //     completion_tokens: 16,
      //     total_tokens: 3565,
      //   },
      // };

      const completionText = completion.choices[0].text;

      let parsedCompletionText = null;

      let isExactMatch = false,
        isMatch = false,
        isClassificationMatching = false;

      try {
        parsedCompletionText = JSON.parse(completionText);
        isExactMatch = oThis.isExactMatch(
          parsedCompletionText,
          transactionDetails.output
        );

        isMatch = oThis.isMatch(
          parsedCompletionText,
          transactionDetails.output
        );
        isClassificationMatching = oThis.isClassificationMatching(
          parsedCompletionText,
          transactionDetails.output
        );
      } catch (error) {
        console.log("Error in parsing completion text");
      }

      try {
        isClassificationMatching =
          oThis.extractFirstWordFromModelOutput(completionText) ===
          txDetail.txnType;
      } catch (error) {
        console.log("Error fetching first word text: ", error);
      }

      const data = {
        modelName: oThis.modelName,
        systemPrompt: oThis.systemPrompt,
        userPrompt: oThis.userPrompt,
        transactionHash: transactionDetails.transactions.hash,
        transactionType: txDetail.txnType,
        trainedModelOutput: completionText,
        expectedOutput: transactionDetails.output,
        isExactSame: isExactMatch,
        isSame: isMatch,
        noOfSummaries: transactionDetails.output.length,
        isClassificationMatching: isClassificationMatching,
      };

      dataForCsv.push(data);
    }

    console.log("Writing to CSV file");
    oThis.writeDataToCsvFile(dataForCsv);
    console.log("End Perform");
  }

  getTransactionDetails(txDetail) {
    // Format event logs
    let eventLogs = [];
    for (let item of txDetail.logsData.items) {
      eventLogs.push({
        data: item.data,
        index: item.index,
        topics: item.topics,
        address: {
          hash: item.address.hash,
          name: item.address.name,
        },
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
      event_logs: eventLogs,
      token_transfers: txDetail.data.token_transfers,
      transactions: transactions,
      output: txDetail.highlightedEventTexts,
    };

    return transactionDetails;
  }

  generatePrompt(trainingDataItem) {
    const oThis = this;
    const transactionDetails = JSON.stringify({
      event_logs: trainingDataItem.event_logs,
      token_transfers: trainingDataItem.token_transfers,
      transactions: trainingDataItem.transactions,
    });

    oThis.userPrompt = transactionDetails;

    const context = oThis.systemPrompt;

    const promptString = `Transaction details: ${transactionDetails}\ncontext: ${context}`;

    const prompt = `${promptString}\n\n###\n\n`;
    return prompt;
  }

  isExactMatch(actual, expected) {
    if (actual.length !== expected.length) {
      return false;
    }
    return actual.every((value, index) => value === expected[index]);
  }

  isMatch(actual, expected) {
    const oThis = this;
    actual = oThis.removeNumbersSeparatedByCommaOrPeriod(actual);
    expected = oThis.removeNumbersSeparatedByCommaOrPeriod(expected);

    return actual === expected;
  }

  isClassificationMatching(actual, expected) {
    const oThis = this;

    let actualFirstWords = [],
      expectedFirstWords = [];

    for (let i = 0; i < actual.length; i++) {
      actualFirstWords.push(oThis.getFirstWord(actual[i]));
    }

    for (let i = 0; i < expected.length; i++) {
      expectedFirstWords.push(oThis.getFirstWord(expected[i]));
    }

    return oThis.isExactMatch(actualFirstWords, expectedFirstWords);
  }

  extractFirstWordFromModelOutput(modelOutput) {
    // example: modelOutput='["Swap 0.30715621648634070 Ether For 5,'
    // answer= Swap

    const firstWord = modelOutput.split(" ")[0];

    // clean the first word
    const cleanedFirstWord = firstWord.replace(/[^a-zA-Z ]/g, "");

    console.log(cleanedFirstWord);
    return cleanedFirstWord;
  }

  getFirstWord(str) {
    return str.split(" ")[0];
  }

  removeNumbersSeparatedByCommaOrPeriod(input) {
    // Use regular expression to match numbers separated by , or .
    const regex = /\d+(?:[,.]\d+)*/g;

    // Replace the matched numbers with an empty string
    const result = input.toString().replace(regex, "");

    return result;
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
      "Is it exactly same",
      "Is it Same",
      "No Of Summaries",
      "Is Classification matching",
    ].join("*");

    // Create an array of data rows
    const rows = data.map((item) =>
      [
        item.modelName,
        item.systemPrompt,
        item.userPrompt,
        item.transactionHash,
        item.transactionType,
        item.trainedModelOutput,
        item.expectedOutput.join(";"),
        item.isExactSame ? "Yes" : "No",
        item.isSame ? "Yes" : "No",
        item.noOfSummaries,
        item.isClassificationMatching ? "Yes" : "No",
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
    const directory = "./onetimer/babbage/output";

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const csvFileName = `babbage_model_inference_output_${timestamp}.csv`;
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
      if (!oThis.trainedEventTypes.includes(txDetail.txnType)) {
        continue;
      }

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
      totalProcessedTransactions++;
    }

    console.log("Total transactions: ", transactionsArr.length);
    console.log("txnTypeToCountMap: ", txnTypeToCountMap);
    console.log(
      "Total differnet event types",
      Object.keys(txnTypeToCountMap).length
    );

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
