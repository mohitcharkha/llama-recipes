const OpenAIApi = require("openai");

const rootPrefix = "..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails"),
  coreConstants = require(rootPrefix + "/config/coreConstants"),
  trainedTransactionsArray = require(rootPrefix +
    "/lib/trainedTransactionsArray");

class ModelInference {
  constructor() {
    const oThis = this;

    oThis.modelName = "ft:gpt-3.5-turbo-0613:true-sparrow::7z1pp4dl";
  }

  async perform() {
    console.log("Start Perform");
    const oThis = this;

    const openai = new OpenAIApi();

    let fetchTransactionDetailObj = new TransactionDetailModel();

    let transactionDetails = await fetchTransactionDetailObj.getByTransactionHash(
      "0xd0200aac2f599055344e1509ea5adb1e25d666b81a99a98bcd53afd865276b0b"
    );

    for (let txDetail of transactionDetails) {
      console.log("Transaction hash: ", txDetail.data.hash);
      const trainingDataDetail = oThis.getTrainingDataDetail(txDetail);
      const prompt = oThis.generatePrompt(trainingDataDetail);

      console.log("Prompt\n", prompt.messages[1].content);

      const completion = await openai.chat.completions.create({
        messages: prompt.messages,
        model: oThis.modelName,
      });

      const completionText = completion.choices[0].message.content;

      const parsedCompletionText = JSON.parse(completionText);

      console.log("\nModel Output:\n", parsedCompletionText);

      console.log("Expected Output:\n", trainingDataDetail.output);

      // Compare parsedCompletionText with trainingDataDetail.output
      let isMatch = true;
      for (let i = 0; i < parsedCompletionText.length; i++) {
        if (parsedCompletionText[i] != trainingDataDetail.output[i]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        console.log("Matched");
      } else {
        console.log("Not Matched");
      }
    }
    console.log("----------------End Perform------------------");
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
      ],
    };
    return prompt;
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
