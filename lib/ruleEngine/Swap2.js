const BigNumber = require('bignumber.js');
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
    const highlightedEventTexts = txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 0 ? txDetail.highlightedEventTexts[0] : null;
    if (oThis.checkIfHighlightedEventTextIsSwap(highlightedEventTexts) ) {
      oThis.isEthercanTextSwap = true;
    }

    let swapEvents = oThis.getSwapEvents(txDetail);

    if (swapEvents.length == 0) {
      return oThis.returnResult("Swap");
    }

    const swapMap = {};

    for (let swapEvent of swapEvents) {
      const eventLog = swapEvent.eventLog;
      const swapContractAddress = eventLog.address.hash.toLowerCase();

      if (!swapMap[swapContractAddress]) {
        swapMap[swapContractAddress] = {};
      }
    }

    const tokenTransfers = txDetail.data.token_transfers;
    for (let tokenTransfer of tokenTransfers) {
      const tokenTransferToAddress = tokenTransfer.to.hash.toLowerCase();

      if (swapMap[tokenTransferToAddress]) {
        if (!swapMap[tokenTransferToAddress].incomingAmount) {
          const decimal = tokenTransfer.total.decimals;
          const formattedIncomingAmount = oThis.convertToDecimal(tokenTransfer.total.value, decimal);
          swapMap[tokenTransferToAddress].incomingAmount = formattedIncomingAmount;
          swapMap[tokenTransferToAddress].incomingtTokenAddress = tokenTransfer.token.address;
        }
      }

      const tokenTransferFromAddress = tokenTransfer.from.hash.toLowerCase();
      if (swapMap[tokenTransferFromAddress]) {
        if (!swapMap[tokenTransferFromAddress].outgoingAmount) {
          const decimal = tokenTransfer.total.decimals;
          const formattedOutgoingAmount = oThis.convertToDecimal(tokenTransfer.total.value, decimal);
          console.log('formattedOutgoingAmount: ', formattedOutgoingAmount);

          swapMap[tokenTransferFromAddress].outgoingAmount = formattedOutgoingAmount;
          swapMap[tokenTransferFromAddress].outGoingtokenAddress = tokenTransfer.token.address;
        }
      }
    }

    const swapSummarryArr = [];
    for (let swapEvent in swapMap) {
      const swapData = swapMap[swapEvent];
      
      if (swapData.incomingAmount && swapData.outgoingAmount) {
        const swapSummarry = `Swap ${oThis.convertToNumberWithCommas(swapData.incomingAmount.toString())} ${swapData.incomingtTokenAddress} For ${oThis.convertToNumberWithCommas(swapData.outgoingAmount.toString())} ${swapData.outGoingtokenAddress}`;
        console.log('swapSummarry: ', swapSummarry);
        swapSummarryArr.push(swapSummarry);
      }

      console.log('swapSummarryArr: ', swapSummarryArr);
    }


    return oThis.checkIfEqual(txDetail.highlightedEventTexts, swapSummarryArr, "Swap");
  }

  returnResult(kind) {
    const oThis = this;
    if (oThis.isEthercanTextSwap){
      console.log("script_classification_failed_for_given_action: ", kind);
      return {
        kind: kind,
        type: "script_classification_failed_for_given_action"
      }
    }

    return {
      kind: kind,
      type: null
    }
  }


  checkIfEqual(highlightedEventTexts, formattedTextArr, kind) {
    const oThis = this;

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      console.log("etherscan_does_not_have_any_text: ", kind);
      return {
        kind: kind,
        type: "etherscan_does_not_have_any_text"
      }
    }

    // const highlightedEventText = highlightedEventTexts[0];
    if (highlightedEventTexts.length == formattedTextArr.length) {
      
      let isAllEqual = true;
      for (let i = 0; i < highlightedEventTexts.length; i++) {
        const highlightedEventText = highlightedEventTexts[i];
        let formattedText = formattedTextArr[i];
      
        console.log('formattedText before : ', formattedText);

        if (formattedText.toUpperCase().includes("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase())) {
          formattedText = formattedText.toUpperCase().replace("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toUpperCase(), "Ether");
        }

        console.log('formattedText: ', formattedText);

        if (oThis.getFormattedHighlightEventText(highlightedEventText) == formattedText.toUpperCase()) {
          continue;
        }

        isAllEqual = false;
        break;
      }
       
      if (isAllEqual) {
        return {
          kind: kind,
          type: "exact_match"
        }
      }
    }

    if (oThis.isEthercanTextSwap){
      // console.log("same_action_different_language: ", kind);
      console.log("same_action_different_language:", formattedTextArr);
      console.log("same_action_different_language:", highlightedEventTexts);


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

  getFormattedHighlightEventText(highlightedEventTexts) {
    const oThis = this;

    if (!highlightedEventTexts) {
      return null;
    }

    return (highlightedEventTexts && highlightedEventTexts.split(' On')[0].toUpperCase());
  }


  convertToNumberWithCommas(value) {
    let parts = value.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-US');
    return parts.join('.');
  }

  convertToDecimal(value, decimal) {
    // if (!decimal) {
    //   decimal = 18;
    // }
    return new BigNumber(value).dividedBy(new BigNumber(10).pow(decimal)).toString();
  }

  getSwapEvents(formattedTxDetail) {
    const oThis = this,
      swapEvents = [];

    let index = 0;
    for (let eventLog of formattedTxDetail.tempLogsData["items"]) {
      if (oThis.isSwapEvent(eventLog) ) {
        // check if there are 2 transfer events before swap event
        let transferEventBeforeSwap = 0;
        let lastSwapIndex = swapEvents.length > 0 ? swapEvents[swapEvents.length - 1].index : 0;
        for (let i = index - 1; i >= lastSwapIndex; i--) {
          const eventLog = formattedTxDetail.tempLogsData["items"][i];
          if (oThis.getMethodName(eventLog) === 'Transfer') {
            transferEventBeforeSwap++;
          }
        }

        if (transferEventBeforeSwap > 1) {
          swapEvents.push(
            {
              index: index,
              eventLog: eventLog
            }
          )
        }

      }
      index++;
    }

    return swapEvents;
  }

  isSwapEvent(event) {
    const oThis = this;

    return oThis.getMethodName(event) === 'Swap';
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split('(')[0];

    return method || event.temp_function_name;
  }
  
  checkIfHighlightedEventTextIsSwap(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(' ');

    return highlightedEventTextArr[0].toUpperCase() == 'SWAP';
  }

  checkIfGeneratedTextIsSwap(generatedText) {
    const oThis = this;

    if (!generatedText) {
      return false;
    }

    const generatedTextArr = generatedText.split(' ');

    return generatedTextArr[0].toUpperCase() == 'SWAP';
  }

  check4DigitsEqual(highlightedEventText, swapSummarry) {
    const oThis = this;

    highlightedEventText = highlightedEventText.split(' On')[0]
    const highlightedEventTextArr = highlightedEventText.split(' ');
    const swapSummarryArr = swapSummarry.split(' ');

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
        const highlightedEventTextWithoutCommaAndDecimal = highlightedEventText.replace(/,/g, '').replace(/\./g, '');
        const swapSummarryWithoutCommaAndDecimal = swapSummarry.replace(/,/g, '').replace(/\./g, '');

        console.log('highlightedEventTextWithoutCommaAndDecimal: ', highlightedEventTextWithoutCommaAndDecimal);

        console.log('swapSummarryWithoutCommaAndDecimal: ', swapSummarryWithoutCommaAndDecimal);

        if (highlightedEventTextWithoutCommaAndDecimal.length < 4 || swapSummarryWithoutCommaAndDecimal.length < 4) {
          if (highlightedEventTextWithoutCommaAndDecimal != swapSummarryWithoutCommaAndDecimal) {
            console.log('111');
            return false;
          }
        } else {
          // check if first 4 digits are equal
          const highlightedEventTextFirst4Digits = highlightedEventTextWithoutCommaAndDecimal.substring(0, 4);
          const swapSummarryFirst4Digits = swapSummarryWithoutCommaAndDecimal.substring(0, 4);

          if (highlightedEventTextFirst4Digits != swapSummarryFirst4Digits) {
            console.log('222');
            return false;
          } 
        }
        continue;

      }

      if (highlightedEventText.toUpperCase() != swapSummarry.toUpperCase()) {
        console.log('333');

        return false;
      }
    }

    return true;
  }
}

module.exports = FormatSwap;