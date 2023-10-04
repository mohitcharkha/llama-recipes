const BigNumber = require("bignumber.js");
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

    oThis.isEthercanTextSwap = false;
  }

  /**
   * Perform
   * @param {object} txDetail
   *
   * @return {Promise<*>}
   */
  perform(txDetail) {
    const oThis = this;
    const highlightedEventTexts =
      txDetail.highlightedEventTexts &&
      txDetail.highlightedEventTexts.length == 1
        ? txDetail.highlightedEventTexts[0]
        : null;
    if (oThis.checkIfHighlightedEventTextIsSwap(highlightedEventTexts)) {
      oThis.isEthercanTextSwap = true;
    }

    let swapEvents = oThis.getSwapEvents(txDetail);

    if (swapEvents.length > 1) {
      return oThis.returnResult("Swap");
    }

    swapEvents = swapEvents.slice(0, 1);
    for (let swapEvent of swapEvents) {
      const eventLog = swapEvent.eventLog;
      const swapContractAddress = eventLog.address.hash.toLowerCase();

      let transferEventBeforeSwap = 0;
      for (let i = swapEvent.index - 1; i >= 0; i--) {
        const eventLog = txDetail.tempLogsData["items"][i];
        if (oThis.getMethodName(eventLog) === "Transfer") {
          transferEventBeforeSwap++;
        }
      }

      if (transferEventBeforeSwap < 2) {
        return oThis.returnResult("Swap");
      }

      const tokenTransfers = txDetail.data.token_transfers;

      let incomingAmount = new BigNumber(0);
      let outgoingAmount = new BigNumber(0);
      let incomingTokenAddress = null;
      let outgoingTokenAddress = null;

      for (let tokenTransfer of tokenTransfers) {
        const tokenTransferToAddress = tokenTransfer.to.hash.toLowerCase();
        const tokenTransferFromAddress = tokenTransfer.from.hash.toLowerCase();

        if (tokenTransferToAddress == swapContractAddress) {
          const decimal = tokenTransfer.total.decimals;
          const formattedOutgoingAmount = oThis.convertToDecimal(
            tokenTransfer.total.value,
            decimal
          );
          incomingAmount = incomingAmount.plus(formattedOutgoingAmount);
          incomingTokenAddress = tokenTransfer.token.address;
        }

        if (tokenTransferFromAddress == swapContractAddress) {
          const decimal = tokenTransfer.total.decimals;
          const formattedOutgoingAmount = oThis.convertToDecimal(
            tokenTransfer.total.value,
            decimal
          );
          outgoingAmount = outgoingAmount.plus(formattedOutgoingAmount);
          outgoingTokenAddress = tokenTransfer.token.address;
        }
      }

      if (
        incomingTokenAddress &&
        incomingTokenAddress.toUpperCase() ==
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase()
      ) {
        incomingTokenAddress = "Ether";
      }

      if (
        outgoingTokenAddress &&
        outgoingTokenAddress.toUpperCase() ==
          "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase()
      ) {
        outgoingTokenAddress = "Ether";
      }

      const swapSummarry = `Swap ${oThis.convertToNumberWithCommas(
        incomingAmount.toString()
      )} ${incomingTokenAddress} For ${oThis.convertToNumberWithCommas(
        outgoingAmount.toString()
      )} ${outgoingTokenAddress}`;

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        swapSummarry,
        "Swap"
      );
    }

    return oThis.returnResult("Swap");
  }

  returnResult(kind) {
    const oThis = this;
    if (oThis.isEthercanTextSwap) {
      console.log("script_classification_failed_for_given_action: ", kind);
      return {
        kind: kind,
        type: "script_classification_failed_for_given_action",
      };
    }

    return {
      kind: kind,
      type: null,
    };
  }

  checkIfEqual(highlightedEventTexts, formattedText, kind) {
    const oThis = this;

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      console.log("etherscan_does_not_have_any_text: ", kind);
      return {
        kind: kind,
        type: "etherscan_does_not_have_any_text",
      };
    }

    const highlightedEventText = highlightedEventTexts[0];

    if (
      oThis.getFormattedHighlightEventText(highlightedEventText) ==
      formattedText.toUpperCase()
    ) {
      console.log("exact_match: ", kind);
      return {
        kind: kind,
        type: "exact_match",
      };
    }

    if (oThis.isEthercanTextSwap) {
      console.log("same_action_different_language: ", kind);
      console.log("same_action_different_language:", formattedText);

      return {
        kind: kind,
        type: "same_action_different_language",
      };
    } else {
      console.log("etherscan_does_not_classify_as_given_action: ", kind);
      return {
        kind: kind,
        type: "etherscan_does_not_classify_as_given_action",
      };
    }
  }

  getFormattedHighlightEventText(highlightedEventTexts) {
    const oThis = this;

    if (!highlightedEventTexts) {
      return null;
    }

    return (
      highlightedEventTexts &&
      highlightedEventTexts.split(" On")[0].toUpperCase()
    );
  }

  convertToNumberWithCommas(value) {
    let parts = value.split(".");
    parts[0] = Number(parts[0]).toLocaleString("en-US");
    return parts.join(".");
  }

  convertToDecimal(value, decimal) {
    // if (!decimal) {
    //   decimal = 18;
    // }
    return new BigNumber(value)
      .dividedBy(new BigNumber(10).pow(decimal))
      .toString();
  }

  getSwapEvents(formattedTxDetail) {
    const oThis = this,
      swapEvents = [];

    let index = 0;
    for (let eventLog of formattedTxDetail.tempLogsData["items"]) {
      if (oThis.isSwapEvent(eventLog)) {
        swapEvents.push({
          index: index,
          eventLog: eventLog,
        });
      }
      index++;
    }

    return swapEvents;
  }

  isSwapEvent(event) {
    const oThis = this;

    return oThis.getMethodName(event) === "Swap";
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split("(")[0];

    return method || event.temp_function_name;
  }

  checkIfHighlightedEventTextIsSwap(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(" ");

    return highlightedEventTextArr[0].toUpperCase() == "SWAP";
  }

  checkIfGeneratedTextIsSwap(generatedText) {
    const oThis = this;

    if (!generatedText) {
      return false;
    }

    const generatedTextArr = generatedText.split(" ");

    return generatedTextArr[0].toUpperCase() == "SWAP";
  }

  check4DigitsEqual(highlightedEventText, swapSummarry) {
    const oThis = this;

    highlightedEventText = highlightedEventText.split(" On")[0];
    const highlightedEventTextArr = highlightedEventText.split(" ");
    const swapSummarryArr = swapSummarry.split(" ");

    const highlightedEventTextArrLength = highlightedEventTextArr.length;
    const swapSummarryArrLength = swapSummarryArr.length;

    if (highlightedEventTextArrLength != swapSummarryArrLength) {
      return false;
    }

    for (let i = 0; i < highlightedEventTextArrLength; i++) {
      const highlightedEventText = highlightedEventTextArr[i];
      const swapSummarry = swapSummarryArr[i];

      if (i == 1 || i == 4) {
        // remove comma and decimal from string
        const highlightedEventTextWithoutCommaAndDecimal = highlightedEventText
          .replace(/,/g, "")
          .replace(/\./g, "");
        const swapSummarryWithoutCommaAndDecimal = swapSummarry
          .replace(/,/g, "")
          .replace(/\./g, "");

        console.log(
          "highlightedEventTextWithoutCommaAndDecimal: ",
          highlightedEventTextWithoutCommaAndDecimal
        );

        console.log(
          "swapSummarryWithoutCommaAndDecimal: ",
          swapSummarryWithoutCommaAndDecimal
        );

        if (
          highlightedEventTextWithoutCommaAndDecimal.length < 4 ||
          swapSummarryWithoutCommaAndDecimal.length < 4
        ) {
          if (
            highlightedEventTextWithoutCommaAndDecimal !=
            swapSummarryWithoutCommaAndDecimal
          ) {
            console.log("111");
            return false;
          }
        } else {
          // check if first 4 digits are equal
          const highlightedEventTextFirst4Digits = highlightedEventTextWithoutCommaAndDecimal.substring(
            0,
            4
          );
          const swapSummarryFirst4Digits = swapSummarryWithoutCommaAndDecimal.substring(
            0,
            4
          );

          if (highlightedEventTextFirst4Digits != swapSummarryFirst4Digits) {
            console.log("222");
            return false;
          }
        }
        continue;
      }

      if (highlightedEventText.toUpperCase() != swapSummarry.toUpperCase()) {
        console.log("333");

        return false;
      }
    }

    return true;
  }
}

module.exports = FormatSwap;
