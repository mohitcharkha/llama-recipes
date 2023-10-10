#!/usr/bin/env node

/*
 *
 * Constructs summary using templates
 *
 * Usage: node onetimer/hybrid/constructSummary.js
 *
 */

const lodash = require('lodash');
const BigNumber = require('bignumber.js');

const fs = require('fs'),
  parse = require('csv-parse');

const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix + "/app/models/mysql/main/TransactionsDetails");

let totalEvents = 0;
class ConstructSummary {
  constructor() {
    const oThis = this;
    oThis.response = {};
    oThis.BigNumber = BigNumber;

    oThis.eventType = "Swap";
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
    while(true) {
      console.log("Current page: ", page);
      const txDetails = await oThis.getTxDetailsForCsvRows(csvRows, page);

      if (txDetails == null) {
        break;
      }

      console.log("txDetails: ", txDetails.length);
      totalEvents = totalEvents + txDetails.length;

      for (let txDetail of txDetails) {
        console.log("txDetail.transactionHash: ", txDetail.transactionHash);

        const template = oThis.getTemplate(oThis.eventType);
        const summary = oThis.constructSummary(txDetail , template);
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
    let start = (page - 1) * 1000;
    for(let i = start; i < start + 1000; i++) {
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
      const dynamicFunction =  new Function(functionArguments, functionDefinition);
      preprocessedVariablesValues = dynamicFunction(args);
      
      // console.log("preprocessedVariablesValues::: ", preprocessedVariablesValues);
    }

    return oThis.generateSummary(txDetail, template, preprocessedVariablesValues);
  }

  generateSummary(txDetail, template, preprocessedVariablesValue) {
    const oThis = this;

    const args = {
      template: template,
      preprocessedVariables: preprocessedVariablesValue
    };
    
    const functionArguments = "args"; 
    const functionDefinition = template.message.function.value;
    const dynamicFunction =  new Function(functionArguments, functionDefinition);
    const formattedTextArr = dynamicFunction(args);

    return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedTextArr, template.type);
  }

  constructSwapSummary(args) {
    const preprocessedVariables = args.preprocessedVariables;
    const template = args.template;
    const formattedTextArr = [];

    for (let item of preprocessedVariables) {      
      let message = template.message.text;
      for (let variable of template.variables) {
        let variable2 = '{' + variable + '}';
        message = message.replace(variable2, item[variable]);
      }
      formattedTextArr.push(message);
    }

    return formattedTextArr;
  }

  returnResult() {
    const oThis = this;

    return {
      did_not_match: true,
      kind: "",
      type: null
    }
  }

  checkIfEqual(highlightedEventTexts, formattedTextArr, kind) {
    const oThis = this;

    // console.log("highlightedEventTexts:: ", highlightedEventTexts);
    // console.log("formattedTextArr:: ", formattedTextArr);

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      console.log("etherscan_does_not_have_any_text: ", kind);
      return {
        kind: kind,
        type: "etherscan_does_not_have_any_text"
      }
    }

    if (formattedTextArr == null || formattedTextArr.length == 0) {
      console.log("template_did_not_generate_any_summary: ", kind);
      return {
        kind: kind,
        type: "template_did_not_generate_any_summary"
      }
    }

    let isAllEqual = true;
    if (highlightedEventTexts.length == formattedTextArr.length) {
      for (let i = 0; i < highlightedEventTexts.length; i++) {
        let highlightedEventText = highlightedEventTexts[i];
        if (highlightedEventText.split(" ")[0].toUpperCase() == "SWAP") {
          highlightedEventText = highlightedEventText.split(" On")[0].toUpperCase()
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
          type: "exact_match",
        }
      }
    }


    let sameActionDifferentLanguage = false;
    if (formattedTextArr[0] && highlightedEventTexts[0] && formattedTextArr[0].split(" ")[0].toUpperCase() == highlightedEventTexts[0].split(" ")[0].toUpperCase()) {
      sameActionDifferentLanguage = true;
    }

    if (sameActionDifferentLanguage) {
      console.log("same_action_different_language: ", kind);
      return {
        kind: kind,
        type: "same_action_different_language"
      }
    } else{
      console.log("etherscan_does_not_classify_as_given_action: ", kind);

      return {
        kind: kind,
        type: "etherscan_does_not_classify_as_given_action"
      }
    }
  }

  setAllCounts(summary, actionName) {
    const oThis = this;

    oThis.response[actionName] = oThis.response[actionName] || {};
    oThis.response[actionName][summary.type] =
      oThis.response[actionName][summary.type] || 0;
    oThis.response[actionName][summary.type]++;
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
      .where(['transaction_hash = "0x5b81d74943d4529bd5d64d81cf48b008ea302f2dfbff633af45697dd062d2d9d"'])
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
            .pipe(parse({ delimiter: ',', from_line: 2 }))
            .on('data', (data) => csvRows.push(data))
            .on('end', () => onResolve(csvRows));
        } else {
          return onResolve(csvRows);
        }
      } catch (err) {
        console.log('Error in reading file path :: ', csvFilePath, err);

        return onResolve(csvRows);
      }
    });
  }

    // async processFromDb() {
  //   const oThis = this;
  //   console.log("Start Perform");

  //   let limit = 100;
  //   let offset = 0;

  //   const template = oThis.getTemplate(oThis.eventType);

  //   while (true) {
  //     console.log("Current offset: ", offset);
  //     let transactionDetails = await oThis.fetchTransactionDetailObj(
  //       limit,
  //       offset
  //     );
  //     if (transactionDetails.length == 0) {
  //       break;
  //     }
  
  //     for (let txDetail of transactionDetails) {
  //       console.log("txDetail.transactionHash: ", txDetail.transactionHash);

  //       const summary = oThis.constructSummary(txDetail , template);
  //       if (summary.type) {
  //         oThis.setAllCounts(summary, summary.kind);
  //       } 
  //     }
  //     offset = offset + limit;

  //     if (offset > 1) {
  //       break;
  //     }
  //   }
  // }
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
