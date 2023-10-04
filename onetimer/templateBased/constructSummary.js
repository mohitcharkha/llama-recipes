#!/usr/bin/env node

/*
 *
 * Constructs summary using templates
 *
 * Usage: node onetimer/templateBased/constructSummary.js
 *
 */

const lodash = require('lodash');
const BigNumber = require('bignumber.js');

const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix + "/app/models/mysql/main/TransactionsDetails");

let TemplateMatchCount = 0;
let MatchCount = 0;
let NotEqualCount = 0;
class ConstructSummary {
  constructor() {
    const oThis = this;
    oThis.response = {};
  }

  async perform() {
    const oThis = this;
    console.log("Start Perform");

    let limit = 100;
    let offset = 0;

    const templatesArray = oThis.getAllTemplates();

    while (true) {
      console.log("Current offset: ", offset);

      let transactionDetails = await oThis.fetchTransactionDetailObj(
        limit,
        offset
      );

      if (transactionDetails.length == 0) {
        break;
      }
  
      for (let txDetail of transactionDetails) {
        console.log("txDetail.transactionHash: ", txDetail.transactionHash);

        const mintSummarry = oThis.constructSummaryIfTemplateMatched(txDetail , templatesArray); 
        if (mintSummarry.type) {
          oThis.setAllCounts(mintSummarry, mintSummarry.kind);
        } 
      }
      offset = offset + limit;

      // if (offset > 1000) {
      //   break;
      // }
    }
    console.log("::RESPONSE:: ", oThis.response);
  }

  constructSummaryIfTemplateMatched(txDetail, templatesArray) {
    const oThis = this;

    let templateMatched = false,
    matchedTemplate = null;

    for (let template of templatesArray) {
      if (oThis.isTemplateMatched(template, txDetail)) {
        templateMatched = true;
        matchedTemplate = template;

        TemplateMatchCount++;
        break;
      }
    }

    console.log("templateMatched: ", templateMatched);
    let preprocessedVariablesValue = null;
    if (templateMatched) { 
      if (matchedTemplate.preprocessed_variables) {

        const preprocessedVariables = matchedTemplate.preprocessed_variables;
        const args = {};
        for (let arg of preprocessedVariables.function.args) {
          args[arg.name] = oThis.getActualValue(arg, txDetail);
        }
        preprocessedVariablesValue = oThis[preprocessedVariables.function.name](args);
        console.log("preprocessedVariablesValue: ", preprocessedVariablesValue);
      }
      return oThis.generateSummary(txDetail, matchedTemplate, preprocessedVariablesValue);
    } 

    return oThis.returnResult();
  }
  

  generateSummary(txDetail, matchedTemplate, preprocessedVariablesValue) {
    const oThis = this;

    const variablesMap = {};
    const formattedTextArr = [];

    for (let variable in matchedTemplate.variables) {
      const variableData = matchedTemplate.variables[variable];
      let dataPoint = variableData.data_point == "data" ? txDetail.data : txDetail.tempLogsData;

      let variableValue = null;
      if (variableData.function) {
        // variableValue = oThis[variable.function.name](lodash.get(dataPoint, variableData.path), variableData.decimal);
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
    console.log("variablesMap: ", variablesMap);

    let message = matchedTemplate.message;
    for (let variable in variablesMap) {
      message = message.replace(`{${variable}}`, variablesMap[variable]);
    }
    formattedTextArr.push(message);

    return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedTextArr, matchedTemplate.type);
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

    // console.log("highlightedEventTexts: ", highlightedEventTexts);
    // console.log("formattedTextArr: ", formattedTextArr);

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      console.log("etherscan_does_not_have_any_text: ", kind);
      return {
        kind: kind,
        type: "etherscan_does_not_have_any_text"
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
    if (formattedTextArr[0].split(" ")[0].toUpperCase() == highlightedEventTexts[0].split(" ")[0].toUpperCase()) {
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


  isTemplateMatched(template, txDetail) {
    const oThis = this;
  
    // loop trigger events
    for (let trigger of template.triggers) {
      if (trigger.function) {

        const args = {};
        for (let arg of trigger.function.args) {
          args[arg.name] = oThis.getActualValue(arg, txDetail);
        }
        eval(trigger.function.value);
        if (this[trigger.function.name](args)) {
          return true;
        }

        return false;
      }
      if (!oThis.evaluateCondition(trigger, txDetail)) {
          return false;
      }
    }

    return true;
  }

  evaluateCondition(trigger, txDetail) {
    const oThis = this;

    const condition = trigger.condition;
    switch (condition) {
        case "equals":
            return oThis.getActualValue(trigger, txDetail) == trigger.value;
        case "notEquals":
            return oThis.getActualValue(trigger, txDetail) != trigger.value;
        case "presentIn":
            return trigger.value.includes(oThis.getActualValue(trigger, txDetail));
        case "notPresentIn":
            return !trigger.value.includes(oThis.getActualValue(trigger, txDetail));
        case "contains":
            return oThis.getActualValue(trigger, txDetail) && oThis.getActualValue(trigger, txDetail).includes(trigger.value);
        case "or":
            for (let subTrigger of trigger.triggers) {
              // console.log("subTrigger: ", subTrigger);
                if (oThis.evaluateCondition(subTrigger, txDetail)) {
                    return true;
                }
            }
            return false;
        default:
            throw new Error(`Unsupported operator: ${condition}`);
    }
  };
  
  getActualValue(trigger, txDetail) {
    const oThis = this;
    let events = txDetail.tempLogsData;
    let data = txDetail.data;
    const dataPoint = trigger.data_point == "data" ? data : events;

    return lodash.get(dataPoint, trigger.path);
  }

  // This function will return all the templates present in all json files in lib/templates/ folder
  getAllTemplates() {
    const oThis = this;
    let templatesArray = [];

    const fs = require("fs");
    const path = require("path");

    const directoryPath = path.join(__dirname, "../../lib/templates");
    console .log("directoryPath: ", directoryPath);

    fs.readdirSync(directoryPath).forEach(function(file) {
      let templateJson = require("../../lib/templates/" + file);
      templatesArray.push(templateJson);
    }); 

    return templatesArray;
  }

  formatNumber(args) {
    const oThis = this;

    const number = args.number;
    const decimal = args.decimal || 18;
    const value =  new BigNumber(number).dividedBy(new BigNumber(10).pow(decimal)).toString();

    let parts = value.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-US');
    return parts.join('.');
  }

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      // .where('highlighted_event_texts is not null')
      .where("transaction_hash is not null")
      // .where(['transaction_hash = "0xad8f40bfd4086a5e0d6165b06e92d857bb99e63bafbffeae188e8c0cea303a52"'])
      // .where('total_events = 0 ')
      // .where('total_events = 1')
      // .where('JSON_EXTRACT(data, "$.raw_input") = "0x"')
      // .where("SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Revoked'")
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
