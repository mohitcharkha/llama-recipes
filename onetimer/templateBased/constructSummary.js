#!/usr/bin/env node

/*
 *
 * Constructs summary using templates
 *
 * Usage: node onetimer/templateBased/constructSummary.js
 *
 */

const lodash = require('lodash');


const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix + "/app/models/mysql/main/TransactionsDetails");

let TemplateMatchCount = 0;
let MatchCount = 0;
let AllTranactionsCount = 0;

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
        const mintSummarry = oThis.constructSummaryIfTemplateMatched(txDetail , templatesArray); 
        if (mintSummarry.type) {
          oThis.setAllCounts(mintSummarry, mintSummarry.kind);
        } 

        console.log("txDetail.highlightedEventTexts: ", txDetail.highlightedEventTexts);
      }
      offset = offset + limit;

      // if (offset > 1000) {
      //   break;
      // }
    }
    console.log("::RESPONSE:: ", oThis.response);
    console.log("AllTranactionsCount: ", AllTranactionsCount);
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
    if (templateMatched) {
      console.log("txDetail.transactionHash: ", txDetail.transactionHash);
      
      return oThis.generateSummary(txDetail, matchedTemplate);
    } 

    console.log("Unmatched txDetail.transactionHash: ", txDetail.transactionHash);
    return oThis.returnResult();
  }

  generateSummary(txDetail, matchedTemplate) {
    const oThis = this;

    const variablesMap = {};
    const formattedTextArr = [];

    for (let variable in matchedTemplate.variables) {
      const variableData = matchedTemplate.variables[variable];
      let dataPoint = variableData.data_point == "data" ? txDetail.data : txDetail.tempLogsData;

      // Here we use lodash's get function to safely access nested properties
      console.log("variable.path: ", variableData.path);
      console.log("dataPoint: ", dataPoint);
      const variableValue = lodash.get(dataPoint, variableData.path);
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

    console.log("highlightedEventTexts: ", highlightedEventTexts);
    console.log("formattedTextArr: ", formattedTextArr);

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
        const highlightedEventText = highlightedEventTexts[i];
        let formattedText = formattedTextArr[i];

        if (highlightedEventText.toUpperCase() != formattedText.toUpperCase()) {
          isAllEqual = false;
          break;
        }
      }

      if (isAllEqual) {
        MatchCount++;
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

    let events = txDetail.tempLogsData;
    let data = txDetail.data;

    // loop trigger events
    for (let trigger of template.triggers) {
      const dataPoint = trigger.data_point == "data" ? data : events;

      // Here we use lodash's get function to safely access nested properties
      const leftValue = lodash.get(dataPoint, trigger.path);
      const rightValue = trigger.value;

      console.log("leftValue: ", leftValue);
      console.log("rightValue: ", rightValue);
  
      if (!oThis.evaluateCondition(leftValue, trigger.condition, rightValue)) {
          return false;
      }
    }

    return true;
  }

  evaluateCondition(leftValue, operator, rightValue) {
    switch (operator) {
        case "equals":
            return leftValue == rightValue;
        case "notEquals":
            return leftValue != rightValue;
        case "presentIn":
            return rightValue.includes(leftValue);
        case "notPresentIn":
            return !rightValue.includes(leftValue);
        default:
            throw new Error(`Unsupported operator: ${operator}`);
    }
  };

  // This function will return all the templates present in all json files in lib/templates/ folder
  getAllTemplates() {
    const oThis = this;
    let templatesArray = [];

    const fs = require("fs");
    const path = require("path");

    const directoryPath = path.join(__dirname, "../../lib/templates");
    console .log("directoryPath: ", directoryPath);

    fs.readdirSync(directoryPath).forEach(function(file) {
      let templateName = file.split(".")[0];
      console.log("templateName: ", templateName);
      let templateJson = require("../../lib/templates/" + file);
      templatesArray.push(templateJson);
    }); 

    return templatesArray;
  }
    

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      // .where('highlighted_event_texts is not null')
      .where("transaction_hash is not null")
      // .where(['transaction_hash = "0x2fe00b754c2b28ac748034320c13c1e6c177f505b2cb7cac970af014063da05d"'])
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
