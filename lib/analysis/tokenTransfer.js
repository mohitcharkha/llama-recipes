const BigNumber = require("bignumber.js");
const rootPrefix = "../..";

let totalEvents = 0;
class FormatTokenTransfer {
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

    const data = txDetail.data;
    let formattedText = "";

    if (data.token_transfers && data.token_transfers.length == 1) {
      if (
        data.token_transfers[0].total.value &&
        data.token_transfers[0].token.type == "ERC-20"
      ) {
        const tokenTransfers = data.token_transfers;
        const amount = tokenTransfers[0].total.value;
        const decimal = tokenTransfers[0].total.decimals || 18;
        const formattedAmount = oThis.convertToDecimal(amount, decimal);
        const formattedAmountWithCommas = oThis.convertToNumberWithCommas(
          formattedAmount
        );
        const tokenAddress = tokenTransfers[0].token.address;
        const toAddress = tokenTransfers[0].to.hash;
        formattedText = `Transfer ${formattedAmountWithCommas} ${tokenAddress} To ${toAddress}`;

        oThis.analysisDetails.type = "token_transfer_1";
        oThis.analysisDetails.typeDescription =
          "Token transfer having one token transfer and total value";

        return oThis.checkIfEqual(
          txDetail.highlightedEventTexts,
          formattedText,
          "Transfer",
          txDetail.transactionHash
        );
      } else {
        oThis.analysisDetails.type = "token_transfer_2";
        oThis.analysisDetails.typeDescription =
          "Token transfer having one token transfer and total value is 0";

        const tokenTransfers = data.token_transfers;
        const tokenAddress = tokenTransfers[0].token.address;
        formattedText = `Transfer 1 of ${tokenAddress}`;

        return oThis.checkIfEqual(
          txDetail.highlightedEventTexts,
          formattedText,
          "Transfer",
          txDetail.transactionHash
        );
      }
    } else {
      console.log("Token transfer not present in txDetail");
      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        "Transfer",
        txDetail.transactionHash
      );
    }
  }

  checkIfEqual(highlightedEventTexts, formattedText, kind, transactionHash) {
    const oThis = this;

    const highlightedEventText = highlightedEventTexts[0];

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("Transfer exact match: ", transactionHash);
      oThis.analysisDetails.isMatched = true;
      return {
        kind: kind,
        type: "exact_match",
        subkind: oThis.analysisDetails.type,
        analysisDetails: oThis.analysisDetails
      };
    } else {
      console.log("Transfer unsuccessful match: ", transactionHash);
      oThis.analysisDetails.isMatched = false;
      oThis.analysisDetails.reason = "need to check manually";
      return {
        kind: kind,
        type: "unsuccessful_match",
        subkind: oThis.analysisDetails.type,
        reason: "need to check manually",
        analysisDetails: oThis.analysisDetails
      };
    }
  }

  convertToDecimal(value, decimal) {
    return new BigNumber(value)
      .dividedBy(new BigNumber(10).pow(decimal))
      .toString();
  }

  convertToNumberWithCommas(value) {
    let parts = value.split(".");
    parts[0] = Number(parts[0]).toLocaleString("en-US");
    return parts.join(".");
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split("(")[0];

    return method || event.temp_function_name;
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

  async fetchTransactionDetailObj(limit, offset) {
    const oThis = this;

    let fetchTransactionDetailObj = new TransactionDetailModel();
    let transactionDetails = await fetchTransactionDetailObj
      .select("*")
      .where("transaction_hash is not null")
      .where([
        'transaction_hash = "0x011de16ab2eff9d6191e16cdf5518bf29e63477ec29f6d5d5526bfa5b9b8314e"'
      ])
      .where(
        "SUBSTRING_INDEX(JSON_UNQUOTE(JSON_EXTRACT(highlighted_event_texts, '$[0]')), ' ', 1) = 'Transfer'"
      )
      .where("JSON_UNQUOTE(JSON_EXTRACT(data, '$.raw_input')) != '0x'")
      // .limit(limit)
      // .offset(offset)
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

module.exports = FormatTokenTransfer;
