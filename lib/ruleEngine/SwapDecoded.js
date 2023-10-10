const BigNumber = require("bignumber.js");
const rootPrefix = "../..",
  TransactionDetailModel = require(rootPrefix +
    "/app/models/mysql/main/TransactionsDetails");

let totalEvents = 0;
class FormatSwap {
  /**
   * Constructor for HTTP request.
   *
   * @param {object} params
   * @param {string} params.txHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;


    oThis.notSwapCounts = {};
    oThis.swapSummary = {};
    oThis.notMathingCases = {};
  }

  async perform() {
    const oThis = this;
    console.log("Start Perform");

    let limit = 5000;
    let offset = 0;

    while (true) {
      console.log("Current offset: ", offset);
      let transactionDetails = await oThis.fetchTransactionDetailObj(
        limit,
        offset
      );
      totalEvents = totalEvents + transactionDetails.length;

      if (transactionDetails.length == 0) {
        break;
      }

      for (let txDetail of transactionDetails) {
        console.log("txHash: ", txDetail.transactionHash);

        oThis.processTransaction(txDetail);
      }
      offset = offset + limit;

      // if(offset > 5000) {
      //   break;
      // }
    }

    // console.log("notSwapCounts: ", oThis.notSwapCounts);
    // console.log("elseEvents: ", oThis.elseEvents);
    console.log("totalEvents: ", totalEvents);
    console.log("oThis.swapSummary: ", oThis.swapSummary)
    console.log("oThis.notMathingCases: ", oThis.notMathingCases);
    console.log("oThis.notMathingCases: ", JSON.stringify(oThis.notMathingCases));
  }

  /**
   * Perform
   * @param {object} txDetail
   *
   * @return {Promise<*>}
   */
  processTransaction(txDetail) {
    const oThis = this;

    let swapEvents = oThis.getSwapEvents(txDetail);
    console.log("swapEvents: ", swapEvents);

    if (swapEvents.length == 0) {
      oThis.notSwapCounts["No Decoded Swap Event"] =  oThis.notSwapCounts["No Decoded Swap Event"] || 0;
      oThis.notSwapCounts["No Decoded Swap Event"]++;
      return;
    }

    const mandatoryParamsPresent = oThis.checkIfMandatoryParamsPresent(swapEvents);
    if (!mandatoryParamsPresent) {
      return;
    }

    oThis.swapSummary["Script Identified as Swap"] = oThis.swapSummary["Script Identified as Swap"] || 0;
    oThis.swapSummary["Script Identified as Swap"]++;

    // const checkMandatoryParamsHasValue = oThis.checkMandatoryParamsHasValue(swapEvents);
    // if (!checkMandatoryParamsHasValue) {
    //   return;
    // }

    oThis.getSwapSummary(swapEvents, txDetail);
  }

  getSwapSummary(swapEvents, txDetail) {
    const oThis = this;

    const swapDetailsArray = oThis.getSwapDetails(swapEvents);
    const data = txDetail.data;
    const tokenTransfers = data.token_transfers;

    const formattedSwapDetailsArray = [];
    
    let decimalNull = false;
    for (let i = 0; i < swapDetailsArray.length; i++) {
      const swapDetail = swapDetailsArray[i];
      console.log("swapDetail1: ", swapDetail);
      const swapContractAddress = swapDetail.swapContractAddress.toLowerCase();
      const currentSwapIndex = swapDetail.index;
      const previousSwapIndex = i > 0 ? swapDetailsArray[i - 1].index : 0;

      for (let tokenTransferObj of tokenTransfers) {
        // console.log("tokenTransferObj: ", tokenTransferObj);
        const tokenTransferFromAddress = tokenTransferObj.from.hash.toLowerCase();
        const tokenTransferToAddress = tokenTransferObj.to.hash.toLowerCase();
        const tokenTransferLogIndex = tokenTransferObj.log_index;

        if(tokenTransferLogIndex < currentSwapIndex && tokenTransferLogIndex >= previousSwapIndex) {
          if (!swapDetail.outgoingAddress && tokenTransferFromAddress == swapContractAddress) {
            // console.log("tokenTransferObj: ", tokenTransferObj);
            swapDetail.outgoingAddress = tokenTransferObj.token.address;
            const decimal = tokenTransferObj.total.decimals;
            if (decimal == null) {
              decimalNull = true;
            }
            swapDetail.outgoingDecimal = decimal;
            // console.log("swapDetail.outgoingAmount: ", swapDetail.outgoingAmount);
            // console.log("decimal: ", decimal);
            swapDetail.outgoingAmount = oThis.formatNumber(swapDetail.outgoingAmount , decimal);
          }
          if (!swapDetail.incomingAddress && tokenTransferToAddress == swapContractAddress) {
            swapDetail.incomingAddress = tokenTransferObj.token.address;
            const decimal = tokenTransferObj.total.decimals;
            swapDetail.incomingDecimal = decimal;
            if (decimal == null) {
              decimalNull = true;
            }
            // console.log("swapDetail.incomingAmount: ", swapDetail.incomingAmount);
            // console.log("decimal: ", decimal);
            swapDetail.incomingAmount = oThis.formatNumber(swapDetail.incomingAmount , decimal);
          }
        }   
      }
      console.log("swapDetail2: ", swapDetail);


      if (i != 0 && !swapDetail.incomingAddress) {
        swapDetail.incomingAddress = formattedSwapDetailsArray[i-1].outgoingAddress;
        swapDetail.incomingAmount = oThis.formatNumber(swapDetail.incomingAmount ,  formattedSwapDetailsArray[i-1].outgoingDecimal);
      } 

      if (i == (swapDetailsArray.length - 1) && !swapDetail.outgoingAddress) {
        swapDetail.outgoingAddress = "Ether"
        swapDetail.outgoingAmount = oThis.formatNumber(swapDetail.outgoingAmount,  18);
      }

      formattedSwapDetailsArray.push(swapDetail);
    }    

    const message = "Swap {incomingAmount} {incomingTokenAddress} For {outgoingAmount} {outgoingTokenAddress}"

    const swapSummarryArray = [];
    for (let swapDetail of formattedSwapDetailsArray) {
      const swapSummary = message
        .replace("{incomingAmount}", swapDetail.incomingAmount)
        .replace("{incomingTokenAddress}", swapDetail.incomingAddress)
        .replace("{outgoingAmount}", swapDetail.outgoingAmount)
        .replace("{outgoingTokenAddress}", swapDetail.outgoingAddress);

      swapSummarryArray.push(swapSummary);
    }

    
    return oThis.checkIfEqual( txDetail.highlightedEventTexts, swapSummarryArray, txDetail.transactionHash, swapEvents.length , decimalNull);
  }

  checkIfEqual(highlightedEventTexts, formattedTextArr, txHash, swapEventsLength, decimalNull) {
    const oThis = this;

    console.log("swapSummarryFrom Etherscan: ", highlightedEventTexts);
    console.log("swapSummarryArray: ", formattedTextArr);

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      oThis.swapSummary["Summary not present in Etherscan"] = oThis.swapSummary["Summary not present in Etherscan"] || 0;
      oThis.swapSummary["Summary not present in Etherscan"]++;

      oThis.notMathingCases["Summary not present in Etherscan"] ||= { "Count": 0, "TxHash": {} };
      oThis.notMathingCases["Summary not present in Etherscan"]["Count"]++;
      if (!oThis.notMathingCases["Summary not present in Etherscan"]["TxHash"][txHash]) {
        oThis.notMathingCases["Summary not present in Etherscan"]["TxHash"][txHash] = {
          "TxHash": txHash,
          "swapSummarryFrom Etherscan": highlightedEventTexts,
          "swapSummarryArray": formattedTextArr
        }
      } 

      return;
    }

    if (highlightedEventTexts[0] == "Executed Swap With 0x Protocol") {
      highlightedEventTexts.shift();
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
        oThis.swapSummary["Swap summary matched"] = oThis.swapSummary["Swap summary matched"] || 0;
        oThis.swapSummary["Swap summary matched"]++;

        return;
      } else {
        if (decimalNull){
          oThis.swapSummary["Swap summary not matched due to decimal null"] = oThis.swapSummary["Swap summary not matched due to decimal null"] || 0;
          oThis.swapSummary["Swap summary not matched due to decimal null"]++;

          oThis.notMathingCases["Swap summary not matched due to decimal null"] ||= { "Count": 0, "TxHash": {} };
          oThis.notMathingCases["Swap summary not matched due to decimal null"]["Count"]++;
          if (!oThis.notMathingCases["Swap summary not matched due to decimal null"]["TxHash"][txHash]) {
            oThis.notMathingCases["Swap summary not matched due to decimal null"]["TxHash"][txHash] = {
              "TxHash": txHash,
              "swapSummarryFrom Etherscan": highlightedEventTexts,
              "swapSummarryArray": formattedTextArr
            }
          }
        } else {
          oThis.swapSummary["Swap summary not matched"] = oThis.swapSummary["Swap summary not matched"] || 0;
          oThis.swapSummary["Swap summary not matched"]++;

          oThis.notMathingCases["Swap summaries length is equal but not matched"] ||= { "Count": 0, "TxHash": {} };
          oThis.notMathingCases["Swap summaries length is equal but not matched"]["Count"]++;
          if (!oThis.notMathingCases["Swap summaries length is equal but not matched"]["TxHash"][txHash]) {
            oThis.notMathingCases["Swap summaries length is equal but not matched"]["TxHash"][txHash] = {
              "TxHash": txHash,
              "swapSummarryFrom Etherscan": highlightedEventTexts,
              "swapSummarryArray": formattedTextArr
            }
          } 
        }
        
        return;
      }
      
    }
    oThis.swapSummary["Swap summary not matched"] = oThis.swapSummary["Swap summary not matched"] || 0;
    oThis.swapSummary["Swap summary not matched"]++;

    if (highlightedEventTexts.length > swapEventsLength) {
      oThis.notMathingCases["Etherscan Swap summaries length is greater than decoded swap events"] ||= { "Count": 0, "TxHash": {} };
      oThis.notMathingCases["Etherscan Swap summaries length is greater than decoded swap events"]["Count"]++;
      if (!oThis.notMathingCases["Etherscan Swap summaries length is greater than decoded swap events"]["TxHash"][txHash]) {
        oThis.notMathingCases["Etherscan Swap summaries length is greater than decoded swap events"]["TxHash"][txHash] = {
          "TxHash": txHash,
          "swapSummarryFrom Etherscan": highlightedEventTexts,
          "swapSummarryArray": formattedTextArr
        }
      } 
      return;
    }

    oThis.notMathingCases["Script generated more summaries than etherscan"] ||= { "Count": 0, "TxHash": {} };
    oThis.notMathingCases["Script generated more summaries than etherscan"]["Count"]++;
    if (!oThis.notMathingCases["Script generated more summaries than etherscan"]["TxHash"][txHash]) {
      oThis.notMathingCases["Script generated more summaries than etherscan"]["TxHash"][txHash] = {
        "TxHash": txHash,
        "swapSummarryFrom Etherscan": highlightedEventTexts,
        "swapSummarryArray": formattedTextArr
      }
    }
    return;
  }

  getSwapDetails(swapEvents) {
    const oThis = this;

    const swapDetails = [];
    for (let event of swapEvents) {
      const parameters = event.decoded.parameters;
      const methodId = event.decoded.method_id;
      const logIndex = event.index;

      const paramsNameToValueMap = {};
      for (let param of parameters) {
        if (!paramsNameToValueMap[param.name]) {
          paramsNameToValueMap[param.name] = param.value;
        }
      }
      const swapDetail = {
        swapContractAddress: event.address.hash,
        index: logIndex
      };

      if (methodId == "d78ad95f") {
        swapDetail.incomingAmount = oThis.assignBiggerValue( paramsNameToValueMap["amount0In"], paramsNameToValueMap["amount1In"]);
        swapDetail.outgoingAmount = oThis.assignBiggerValue( paramsNameToValueMap["amount0Out"], paramsNameToValueMap["amount1Out"]);
      } else {
        if (paramsNameToValueMap["amount0"] < 0) {
          swapDetail.outgoingAmount = paramsNameToValueMap["amount0"];
          swapDetail.incomingAmount = paramsNameToValueMap["amount1"];
        } else {
          swapDetail.outgoingAmount = paramsNameToValueMap["amount1"];
          swapDetail.incomingAmount = paramsNameToValueMap["amount0"];
        }
      }

      swapDetails.push(swapDetail);
    }

    return swapDetails;
  }

  assignBiggerValue(amount0In, amount1In) {
    const amount0 = BigInt(amount0In);
    const amount1 = BigInt(amount1In);

    // Assign bigger value
    return amount0 >= amount1 ? amount0In : amount1In;
}


  addNumbers(num1, num2) {
    return new BigNumber(num1).plus(num2).toString(10);
  }

  formatNumber(number, decimal) {
    const oThis = this;

    if (decimal == 0) {
      return oThis.addCommas(number);
    }
    decimal = decimal || 18;

    let value =  new BigNumber(number)
      .dividedBy(new BigNumber(10).pow(decimal))
      .toString(10);
    
    if (value.startsWith("-")) {
      value = value.replace("-", "");
    }

    return oThis.addCommas(value);
  }

  addCommas(value) {
    let parts = value.split(".");
    parts[0] = parts[0].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }


  checkMandatoryParamsHasValue(swapEvents) {
    const oThis = this;

    for (let event of swapEvents) {
      const parameters = event.decoded.parameters;
      // push param name against value in map for each event
      const mandatoryParamsNameToValueMap = {};
      for (let param of parameters) {
        if (!mandatoryParamsNameToValueMap[param.name]) {
          mandatoryParamsNameToValueMap[param.name] = param.value;
        }
      }
      console.log("mandatoryParamsMap: ", mandatoryParamsNameToValueMap);
      if (mandatoryParamsNameToValueMap["amount0In"] == '0' && mandatoryParamsNameToValueMap["amount1In"] == '0') {
        oThis.notSwapCounts["Swap All AmountIn Zero"] =  oThis.notSwapCounts["Swap All AmountIn Zero"] || 0;
        oThis.notSwapCounts["Swap All AmountIn Zero"]++;
        return false;
      }
      if (mandatoryParamsNameToValueMap["amount0Out"] == '0' && mandatoryParamsNameToValueMap["amount1Out"] == '0') {
        oThis.notSwapCounts["Swap All AmountOut Zero"] =  oThis.notSwapCounts["Swap All AmountOut Zero"] || 0;
        oThis.notSwapCounts["Swap All AmountOut Zero"]++;
        return false;
      }
    }

    return true;
  }

  checkIfMandatoryParamsPresent(swapEvents) {
    const oThis = this;

    let mandatoryParamsPresent = true;
    for (let event of swapEvents) {
      const parameters = event.decoded.parameters;
      const presentParams = parameters.map(param => param.name);

      let mandatoryParams = [];

      // Just show method name Swap
      if (event.decoded.method_id == "3b841dc9" || event.decoded.method_id == "19b47279") {
        return false;
      }

      if (event.decoded.method_id == "c42079f9" || event.decoded.method_id == "e3a54b69") {
        mandatoryParams = ["amount0", "amount1"];
      } else {
        oThis.elseEvents = oThis.elseEvents || [];
        if (!oThis.elseEvents.includes(event.decoded.method_id)) {
          oThis.elseEvents.push(event.decoded.method_id);
        }
        mandatoryParams = ["amount0In", "amount1In", "amount0Out", "amount1Out"];
      }

      for (let param of mandatoryParams) {
        if (!presentParams.includes(param)) { 
          oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"] ||= { "Count": 0, "Debug": [], "Params": [], "TxHash": [] };

          oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["Count"]++;
          if (!oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["Debug"].includes(event.decoded.method_id)) {
            oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["Debug"].push(event.decoded.method_id);
          }

          if (!oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["Params"].includes(param)) {
            oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["Params"].push(param);
          }

          if (!oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["TxHash"].includes(event.tx_hash)) {
            oThis.notSwapCounts["Swap AmountIn AmountOut Not Present"]["TxHash"].push(event.tx_hash);
          }

          mandatoryParamsPresent = false;
        }
      } 
    }

    return mandatoryParamsPresent;
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

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    return methodCall && methodCall.split("(")[0];
  }

  async fetchTransactionDetailObj(limit, offset) {
    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      // .where(['transaction_hash = "0x990be5a6d679b970a1204c2d8a1f34e952082a73635ab104c7f27c6791717652"'])
      // .where(["total_decoded_events = total_events"])
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
}

const constructSummary = new FormatSwap();

constructSummary
  .perform()
  .then(function(rsp) {
    process.exit(0);
  })
  .catch(function(err) {
    console.log("Error in script: ", err);
    process.exit(1);
  });

