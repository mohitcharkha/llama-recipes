#!/usr/bin/env node

/*
 *
 * Constructs summary using templates
 *
 * Usage: node onetimer/hybrid/constructSummary.js
 *
 */

const lodash = require("lodash");
const BigNumber = require("bignumber.js");

const fs = require("fs"),
  parse = require("csv-parse");

const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails");

let totalEvents = 0;
class ConstructSummary {
  constructor() {
    const oThis = this;
    oThis.response = {};
    oThis.BigNumber = BigNumber;

    oThis.eventType = "Transfer";
  }

  async perform() {
    const oThis = this;

    await oThis.processFromCsv();

    console.log("::RESPONSE:: ", oThis.response);
    console.log("::totalEvents:: ", totalEvents);
  }

  async processFromCsv() {
    const oThis = this;
    console.log("Start Perform");

    const csvFilePath = "./inference_50k.csv";
    const csvRows = await oThis.readDataFromCsv(csvFilePath);
    console.log("csvRows: ", csvRows.length);

    let page = 1;
    const template = oThis.getTemplate(oThis.eventType);
    while (true) {
      console.log("Current page: ", page);
      const txDetails = await oThis.getTxDetailsForCsvRows(csvRows, page);

      if (txDetails == null) {
        break;
      }

      console.log("txDetails: ", txDetails.length);
      totalEvents = totalEvents + txDetails.length;

      for (let txDetail of txDetails) {
        // console.log("txDetail.transactionHash: ", txDetail.transactionHash);
        const summary = oThis.constructSummary(txDetail, template);
        if (summary.type) {
          oThis.setAllCounts(summary, summary.kind);
        }
      }

      page++;
    }
  }

  async getTxDetailsForCsvRows(csvRows, page) {
    const oThis = this;

    let transactionHashArr = [];
    let start = (page - 1) * 10000;
    for (let i = start; i < start + 10000; i++) {
      let csvRow = csvRows[i];
      if (!csvRow) {
        break;
      }
      const modelOutput = csvRow[2];
      if (modelOutput == oThis.eventType) {
        transactionHashArr.push(csvRow[0]);
      }
    }

    if (transactionHashArr.length == 0) {
      return null;
    }

    return oThis.fetchTransactionDetailObjForTxHashes(transactionHashArr);
  }

  constructSummary(txDetail, template) {
    const oThis = this;

    let preprocessedVariablesValues = null;
    if (template.preprocessed_variables) {
      const preprocessedVariables = template.preprocessed_variables;
      const args = {};
      for (let arg of preprocessedVariables.function.args) {
        args[arg.name] = oThis.getActualValue(arg, txDetail);
      }

      const functionArguments = "args";
      const functionDefinition = preprocessedVariables.function.value;
      const dynamicFunction = new Function(
        functionArguments,
        functionDefinition
      );
      preprocessedVariablesValues = dynamicFunction(args);

      // preprocessedVariablesValues = oThis.getSwapDetails(args);

      // console.log("preprocessedVariablesValues::: ", preprocessedVariablesValues);
    }

    return oThis.generateSummary(
      txDetail,
      template,
      preprocessedVariablesValues
    );
  }

  generateSummary(txDetail, template, preprocessedVariablesValue) {
    const oThis = this;

    let formattedTextArr = [];
    const variablesMap = {};

    if (template.message.function) {
      const args = {
        template: template,
        preprocessedVariables: preprocessedVariablesValue,
      };

      const functionArguments = "args";
      const functionDefinition = template.message.function.value;
      const dynamicFunction = new Function(
        functionArguments,
        functionDefinition
      );
      formattedTextArr = dynamicFunction(args);
    } else {
      for (let variable in template.variables) {
        const variableData = template.variables[variable];
        let dataPoint =
          variableData.data_point == "data"
            ? txDetail.data
            : txDetail.tempLogsData;

        let variableValue = null;
        if (variableData.function) {
          const args = {};
          for (let arg of variableData.function.args) {
            args[arg.name] = lodash.get(dataPoint, arg.path);
          }

          variableValue = oThis[variableData.function.name](args);
        } else {
          if (variableData.data_point == "preprocessed_variables") {
            variableValue = preprocessedVariablesValue[variableData.path];
          } else {
            variableValue = lodash.get(dataPoint, variableData.path);
          }
        }
        variablesMap[variable] = variableValue;
      }
      // console.log("variablesMap: ", variablesMap);

      let message = template.message;
      for (let variable in variablesMap) {
        message = message.replace(`{${variable}}`, variablesMap[variable]);
      }
      formattedTextArr.push(message);
    }

    return oThis.checkIfEqual(
      txDetail,
      txDetail.highlightedEventTexts,
      formattedTextArr,
      template.type
    );
  }

  returnResult() {
    const oThis = this;

    return {
      did_not_match: true,
      kind: "",
      type: null,
    };
  }

  fetchActionType(highlightedEventTexts) {
    const oThis = this;

    if (!highlightedEventTexts || highlightedEventTexts.length == 0) {
      return "";
    }

    const firstWord = highlightedEventTexts[0].split(" ")[0];
    return firstWord;
  }



  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    return methodCall && methodCall.split("(")[0];
  }

  checkIfEqual(txDetail, highlightedEventTexts, formattedTextArr, kind) {
    const oThis = this;

    const firstWord = oThis.fetchActionType(highlightedEventTexts)
    // console.log("firstWord=", firstWord);
    // console.log("highlightedEventTexts=", highlightedEventTexts);

    const isSameActionINEtherscan = firstWord == oThis.eventType;
    const isSameActionInTemplate = formattedTextArr.length > 0;

    if (isSameActionINEtherscan){
      if (isSameActionInTemplate){
          kind = "same_action_in_etherscan_and_script"
      } else{
          kind = "same_action_in_etherscan_but_not_script"
      }
    }else {
      if (isSameActionInTemplate){
        kind = "same_action_in_script_but_not_etherscan"
      } else{
        kind = "different_action_in_etherscan_and_script"
      }
    }


    // const subKind = ""
    // const subKind = oThis.processFailedReasonsSwap(txDetail);
    const subKind = oThis.processFailedReasonsTransfer(txDetail);

    if (formattedTextArr == null || formattedTextArr.length == 0) {
      console.log("template_did_not_generate_any_summary: ", kind);
      return {
        kind: kind,
        subKind: subKind,
        type: "template_did_not_generate_any_summary"
      }
    }

    let isAllEqual = true;
    if (highlightedEventTexts.length == formattedTextArr.length) {
      for (let i = 0; i < highlightedEventTexts.length; i++) {
        let highlightedEventText = highlightedEventTexts[i];
        if (highlightedEventText.split(" ")[0].toUpperCase() == "SWAP") {
          highlightedEventText = highlightedEventText
            .split(" On")[0]
            .toUpperCase();
        }
        let formattedText = formattedTextArr[i];

        if (
          formattedText
            .toUpperCase()
            .includes(
              "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase()
            )
        ) {
          formattedText = formattedText
            .toUpperCase()
            .replace(
              "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase(),
              "Ether"
            );
        }

        if (highlightedEventText.toUpperCase() != formattedText.toUpperCase()) {
          isAllEqual = false;
          break;
        }
      }

      if (isAllEqual) {
        return {
          kind: kind,
          subKind: subKind,
          type: "exact_match",
        };
      }
    }

    if(kind == 'same_action_in_etherscan_and_script' && subKind == 'unknown'){
      console.log("===same_action_in_etherscan_and_script:incorrect_match==")
      console.log("highlightedEventTexts",highlightedEventTexts)
      console.log("formattedTextArr",formattedTextArr)
      console.log("txDetail.transactionHash: ", txDetail.transactionHash);
    }

    return {
      kind: kind,
      subKind: subKind,
      type: "incorrect_match"
    }

  }

  setAllCounts(summary, actionName) {
    const oThis = this;

    oThis.response[actionName] = oThis.response[actionName] || {};
    oThis.response[actionName][summary.type] = oThis.response[actionName][summary.type] || {};
    
    
    oThis.response[actionName][summary.type][summary.subKind] =
      oThis.response[actionName][summary.type][summary.subKind] || 0;
    oThis.response[actionName][summary.type][summary.subKind]++;
  }

  getActualValue(trigger, txDetail) {
    const oThis = this;
    let events = txDetail.logsData;
    let data = txDetail.data;

    if (trigger.data_point == "library") {
      return oThis[trigger.name];
    }
    const dataPoint = trigger.data_point == "data" ? data : events;

    return lodash.get(dataPoint, trigger.path);
  }

  // This function will return template for given event type
  getTemplate(eventType) {
    const oThis = this;
    let templatesMap = {};

    const fs = require("fs");
    const path = require("path");
    const directoryPath = path.join(__dirname, "../../lib/templates");

    fs.readdirSync(directoryPath).forEach(function(file) {
      let templateJson = require("../../lib/templates/" + file);
      templatesMap[templateJson.type] = templateJson;
    });

    return templatesMap[eventType];
  }

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      // .where('highlighted_event_texts is not null')
      .where("transaction_hash is not null")
      .where([
        'transaction_hash = "0x5b81d74943d4529bd5d64d81cf48b008ea302f2dfbff633af45697dd062d2d9d"',
      ])
      // .where('total_events = 0 ')
      // .where('total_events = 1')
      // .where('JSON_EXTRACT(data, "$.raw_input") = "0x"')
      // .where("SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Revoked'")
      .limit(1)
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

  async fetchTransactionDetailObjForTxHashes(transactionHashArr) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where(["transaction_hash IN (?)", transactionHashArr])
      .fire();

    console.log("transactionDetails::", transactionDetails.length);

    let formattedTransactionDetails = [];

    for (let txDetail of transactionDetails) {
      formattedTransactionDetails.push(
        new TransactionDetailModel().formatDbData(txDetail)
      );
    }

    return formattedTransactionDetails;
  }

  async readDataFromCsv(csvFilePath) {
    const csvRows = [];

    return new Promise(function(onResolve) {
      try {
        if (fs.existsSync(`${csvFilePath}`)) {
          fs.createReadStream(`${csvFilePath}`)
            .pipe(parse({ delimiter: ",", from_line: 2 }))
            .on("data", (data) => csvRows.push(data))
            .on("end", () => onResolve(csvRows));
        } else {
          return onResolve(csvRows);
        }
      } catch (err) {
        console.log("Error in reading file path :: ", csvFilePath, err);

        return onResolve(csvRows);
      }
    });
  }

  formatNumber(args) {
    const oThis = this;

    const number = args.number;
    const decimal = args.decimal || 18;
    const value = new BigNumber(number)
      .dividedBy(new BigNumber(10).pow(decimal))
      .toString();

    let parts = value.split(".");
    parts[0] = Number(parts[0]).toLocaleString("en-US");
    return parts.join(".");
  }

  processFailedReasonsTransfer(txDetail) {
    const oThis = this;    
    
    const firstWord = oThis.fetchActionType(txDetail.highlightedEventTexts)
    if (firstWord == 'Withdraw'){
      return 'withdraw'
    }

    if (txDetail.data.token_transfers.length > 0 && txDetail.data.token_transfers[0].token.type == "ERC-721"){
      return "Erc-721"
    }

    return "unknown"
  }


  processFailedReasonsSwap(txDetail) {
    const oThis = this;

    let swapEvents = oThis.getSwapEvents(txDetail);
    console.log("swapEvents: ", swapEvents);

    if (swapEvents.length == 0) {
      return "no-decoded-swap-event";
    }

    return "unknown"
  }

  getSwapEvents(formattedTxDetail) {
    const oThis = this,
      swapEvents = [];

    for (let eventLog of formattedTxDetail.logsData["items"]) {
      if (oThis.isSwapEvent(eventLog)) {
        swapEvents.push(eventLog);
      }
    }

    return swapEvents;
  }

  isSwapEvent(event) {
    const oThis = this;

    return oThis.getMethodName(event) === "Swap";
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
