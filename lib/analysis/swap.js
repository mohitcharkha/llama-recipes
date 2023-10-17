const BigNumber = require("bignumber.js");
const rootPrefix = "../..";

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
    oThis.analysisDetails = {};
  }

  /**
   * Perform
   * @param {object} txDetail
   *
   * @return {Promise<*>}
   */
  perform(txDetail) {
    const oThis = this;

    let swapEvents = oThis.getSwapEvents(txDetail);

    if (swapEvents.length == 0) {
      oThis.analysisDetails.type = "Swap1";
      oThis.analysisDetails.typeDescription = "No Decoded Swap Event";
      oThis.analysisDetails.isMatched = false;
      oThis.analysisDetails.reason = "No Decoded Swap Event";
      return {
        kind: "Swap",
        subkind: oThis.analysisDetails.type,
        type: "unsuccessful_match",
        reason: "No Decoded Swap Event",
        analysisDetails: oThis.analysisDetails
      };
    }

    const mandatoryParamsPresent = oThis.checkIfMandatoryParamsPresent(
      swapEvents
    );
    if (!mandatoryParamsPresent) {
      oThis.analysisDetails.isMatched = false;
      oThis.analysisDetails.reason =
        "Mandatory parameters were not present for ether value calculation";
      return {
        kind: "Swap",
        subkind: oThis.analysisDetails.type,
        type: "unsuccessful_match",
        reason:
          "Mandatory parameters were not present for ether value calculation",
        analysisDetails: oThis.analysisDetails
      };
    }

    return oThis.getSwapSummary(swapEvents, txDetail);
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
      // console.log("swapDetail1: ", swapDetail);
      const swapContractAddress = swapDetail.swapContractAddress.toLowerCase();
      const currentSwapIndex = swapDetail.index;
      const previousSwapIndex = i > 0 ? swapDetailsArray[i - 1].index : 0;

      for (let tokenTransferObj of tokenTransfers) {
        // console.log("tokenTransferObj: ", tokenTransferObj);
        const tokenTransferFromAddress = tokenTransferObj.from.hash.toLowerCase();
        const tokenTransferToAddress = tokenTransferObj.to.hash.toLowerCase();
        const tokenTransferLogIndex = tokenTransferObj.log_index;

        if (
          tokenTransferLogIndex < currentSwapIndex &&
          tokenTransferLogIndex >= previousSwapIndex
        ) {
          if (
            !swapDetail.outgoingAddress &&
            tokenTransferFromAddress == swapContractAddress
          ) {
            // console.log("tokenTransferObj: ", tokenTransferObj);
            swapDetail.outgoingAddress = tokenTransferObj.token.address;
            const decimal = tokenTransferObj.total.decimals;
            if (decimal == null) {
              decimalNull = true;
            }
            swapDetail.outgoingDecimal = decimal;
            // console.log("swapDetail.outgoingAmount: ", swapDetail.outgoingAmount);
            // console.log("decimal: ", decimal);
            swapDetail.outgoingAmount = oThis.formatNumber(
              swapDetail.outgoingAmount,
              decimal
            );
          }
          if (
            !swapDetail.incomingAddress &&
            tokenTransferToAddress == swapContractAddress
          ) {
            swapDetail.incomingAddress = tokenTransferObj.token.address;
            const decimal = tokenTransferObj.total.decimals;
            swapDetail.incomingDecimal = decimal;
            if (decimal == null) {
              decimalNull = true;
            }
            // console.log("swapDetail.incomingAmount: ", swapDetail.incomingAmount);
            // console.log("decimal: ", decimal);
            swapDetail.incomingAmount = oThis.formatNumber(
              swapDetail.incomingAmount,
              decimal
            );
          }
        }
      }
      // console.log("swapDetail2: ", swapDetail);

      if (i != 0 && !swapDetail.incomingAddress) {
        swapDetail.incomingAddress =
          formattedSwapDetailsArray[i - 1].outgoingAddress;
        swapDetail.incomingAmount = oThis.formatNumber(
          swapDetail.incomingAmount,
          formattedSwapDetailsArray[i - 1].outgoingDecimal
        );
      }

      if (i == swapDetailsArray.length - 1 && !swapDetail.outgoingAddress) {
        swapDetail.outgoingAddress = "Ether";
        swapDetail.outgoingAmount = oThis.formatNumber(
          swapDetail.outgoingAmount,
          18
        );
      }

      formattedSwapDetailsArray.push(swapDetail);
    }

    console.log("formattedSwapDetailsArray: ", formattedSwapDetailsArray);

    const message =
      "Swap {incomingAmount} {incomingTokenAddress} For {outgoingAmount} {outgoingTokenAddress}";

    const swapSummarryArray = [];
    for (let swapDetail of formattedSwapDetailsArray) {
      const swapSummary = message
        .replace("{incomingAmount}", swapDetail.incomingAmount)
        .replace("{incomingTokenAddress}", swapDetail.incomingAddress)
        .replace("{outgoingAmount}", swapDetail.outgoingAmount)
        .replace("{outgoingTokenAddress}", swapDetail.outgoingAddress);

      swapSummarryArray.push(swapSummary);
    }

    return oThis.checkIfEqual(
      txDetail.highlightedEventTexts,
      swapSummarryArray,
      txDetail.transactionHash,
      swapEvents.length,
      decimalNull
    );
  }

  checkIfEqual(
    highlightedEventTexts,
    formattedTextArr,
    txHash,
    swapEventsLength,
    decimalNull
  ) {
    const oThis = this;

    console.log("swapSummarryFrom Etherscan: ", highlightedEventTexts);
    console.log("swapSummarryArray: ", formattedTextArr);

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      oThis.analysisDetails.isMatched = false;
      oThis.analysisDetails.reason = "Summary not present in Etherscan";
      return {
        kind: "Swap",
        type: "unsuccessful_match",
        reason: "Summary not present in Etherscan",
        subkind: oThis.analysisDetails.type,
        analysisDetails: oThis.analysisDetails
      };
    }

    if (highlightedEventTexts[0] == "Executed Swap With 0x Protocol") {
      highlightedEventTexts.shift();
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
          oThis.analysisDetails.isMatched = false;
          break;
        }
      }

      if (isAllEqual) {
        oThis.analysisDetails.isMatched = true;

        return {
          kind: "Swap",
          type: "exact_match",
          analysisDetails: oThis.analysisDetails,
          subkind: oThis.analysisDetails.type
        };
      } else {
        if (decimalNull) {
          oThis.analysisDetails.isMatched = false;
          oThis.analysisDetails.reason =
            "Swap summary not matched due to decimal null";
          return {
            kind: "Swap",
            type: "unsuccessful_match",
            reason: "Swap summary not matched due to decimal null",
            analysisDetails: oThis.analysisDetails,
            subkind: oThis.analysisDetails.type
          };
        } else {
          oThis.analysisDetails.isMatched = false;
          oThis.analysisDetails.reason =
            "Swap summaries having equal length but not matched due to incorrect address or incorrect ether value";
          return {
            kind: "Swap",
            type: "unsuccessful_match",
            reason:
              "Swap summaries having equal length but not matched due to incorrect address or incorrect ether value",
            analysisDetails: oThis.analysisDetails,
            subkind: oThis.analysisDetails.type
          };
        }
      }
    }

    if (highlightedEventTexts.length > swapEventsLength) {
      oThis.analysisDetails.isMatched = false;
      oThis.analysisDetails.reason =
        "Etherscan Swap summaries length is greater than decoded swap events";
      return {
        kind: "Swap",
        type: "unsuccessful_match",
        reason:
          "Etherscan Swap summaries length is greater than decoded swap events",
        analysisDetails: oThis.analysisDetails,
        subkind: oThis.analysisDetails.type
      };
    }

    oThis.analysisDetails.isMatched = false;
    oThis.analysisDetails.reason =
      "Decoded swap events are greater than Etherscan Swap summaries length";

    return {
      kind: "Swap",
      type: "unsuccessful_match",
      reason:
        "Decoded swap events are greater than Etherscan Swap summaries length",
      analysisDetails: oThis.analysisDetails,
      subkind: oThis.analysisDetails.type
    };
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
        swapDetail.incomingAmount = oThis.assignBiggerValue(
          paramsNameToValueMap["amount0In"],
          paramsNameToValueMap["amount1In"]
        );
        swapDetail.outgoingAmount = oThis.assignBiggerValue(
          paramsNameToValueMap["amount0Out"],
          paramsNameToValueMap["amount1Out"]
        );
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

    let value = new BigNumber(number)
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
      if (
        mandatoryParamsNameToValueMap["amount0In"] == "0" &&
        mandatoryParamsNameToValueMap["amount1In"] == "0"
      ) {
        oThis.notSwapCounts["Swap All AmountIn Zero"] =
          oThis.notSwapCounts["Swap All AmountIn Zero"] || 0;
        oThis.notSwapCounts["Swap All AmountIn Zero"]++;
        return false;
      }
      if (
        mandatoryParamsNameToValueMap["amount0Out"] == "0" &&
        mandatoryParamsNameToValueMap["amount1Out"] == "0"
      ) {
        oThis.notSwapCounts["Swap All AmountOut Zero"] =
          oThis.notSwapCounts["Swap All AmountOut Zero"] || 0;
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

      if (
        event.decoded.method_id == "3b841dc9" ||
        event.decoded.method_id == "19b47279"
      ) {
        oThis.analysisDetails.type = "Swap 2";
        oThis.analysisDetails.typeDescription =
          "Swap method id is 3b841dc9 or 19b47279";
        oThis.analysisDetails.isMatched = false;
        oThis.analysisDetails.reason = "Swap method id is 3b841dc9 or 19b47279";
        return false;
      }

      if (
        event.decoded.method_id == "c42079f9" ||
        event.decoded.method_id == "e3a54b69"
      ) {
        mandatoryParams = ["amount0", "amount1"];
        oThis.analysisDetails.type = "Swap 3";
        oThis.analysisDetails.typeDescription =
          "Swap method id is c42079f9 or e3a54b69";
      } else {
        oThis.elseEvents = oThis.elseEvents || [];
        if (!oThis.elseEvents.includes(event.decoded.method_id)) {
          oThis.elseEvents.push(event.decoded.method_id);
        }
        oThis.analysisDetails.type = "Swap 4";
        oThis.analysisDetails.typeDescription = "Swap method id is d78ad95f";
        mandatoryParams = [
          "amount0In",
          "amount1In",
          "amount0Out",
          "amount1Out"
        ];
      }

      for (let param of mandatoryParams) {
        if (!presentParams.includes(param)) {
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
}

module.exports = FormatSwap;
