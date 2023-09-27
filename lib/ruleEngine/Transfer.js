const BigNumber = require('bignumber.js');
class FormatApproval {
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
    oThis.isEthercanTextTransfer = false;
  }


  /**
   * Perform
   * @param {object} txDetail
   *
   * @return {Promise<*>}
   */
  perform(txDetail) {
    const oThis = this;

    const logsData = txDetail.tempLogsData;
    const data = txDetail.data;
    let formattedText = "";
    const highlightedEventTexts = txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 0 ? txDetail.highlightedEventTexts[0] : null;
    if (oThis.checkIfHighlightedEventTextIsTransfer(highlightedEventTexts) ) {
      oThis.isEthercanTextTransfer = true;
    }

    if(logsData.items.length == 0) {
      // Basic Eth Transfer
      if (data.raw_input == "0x" && data.value != "0") {
        let formattedAmount = oThis.convertToDecimal(data.value, 18);
        const toAddress = data.to.hash;
        formattedText = `Transfer ${formattedAmount} Ether To ${toAddress}`;

        return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedText, "BasicEthTransfer");
      }
    }

    if (txDetail.logsData["items"].length == 1 && data.token_transfers && data.token_transfers.length > 0) {
      const itemData = logsData.items[0];     

        if (data.method == "transfer") {
          const tokenTransfers = data.token_transfers;
          const amount = tokenTransfers[0].total.value;
          const decimal = tokenTransfers[0].total.decimals || 18;
          const formattedAmount = oThis.convertToDecimal(amount, decimal);
          const formattedAmountWithCommas = oThis.convertToNumberWithCommas(formattedAmount);
          const tokenAddress = data.to.hash;
          const toAddress = tokenTransfers[0].to.hash;

          formattedText = `Transfer ${formattedAmountWithCommas} ${tokenAddress} To ${toAddress}`;

          return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedText, "Transfer");
        }
      if (itemData.decoded) {
        const method = oThis.getMethodName(itemData);
        const contractAddress = itemData.address.hash;
  
  
        if (method == "Transfer") {
          const toAddress = itemData.decoded.parameters[1].value;
          const amount = itemData.decoded.parameters[2].value;
  
          const decimal = data.token_transfers[0].total.decimals;
          let formattedAmount = oThis.convertToDecimal(amount, decimal);
          formattedAmount = oThis.convertToNumberWithCommas(formattedAmount);
          
          formattedText = `Transfer ${formattedAmount} ${contractAddress} To ${toAddress}`;
  
          return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedText, "Transfer");
        }
      }
    }

    return oThis.returnResult("Transfer");
  }

  returnResult(kind) {
    const oThis = this;
    if (oThis.isEthercanTextTransfer){
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



  checkIfEqual(highlightedEventTexts, formattedText, kind) {
    const oThis = this;

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      console.log("etherscan_does_not_have_any_text: ", kind);
      return {
        kind: kind,
        type: "etherscan_does_not_have_any_text"
      }
    }

    const highlightedEventText = highlightedEventTexts[0];

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("exact_match: ", kind);
      return {
        kind: kind,
        type: "exact_match"
      }
    }

    if (oThis.isEthercanTextTransfer){
      console.log("same_action_different_language: ", kind);
      console.log("same_action_different_language:", formattedText);

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

  convertToDecimal(value, decimal) {
    // if (!decimal) {
    //   decimal = 18;
    // }
    return new BigNumber(value).dividedBy(new BigNumber(10).pow(decimal)).toString();
  }

  convertToNumberWithCommas(value) {
    let parts = value.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-US');
    return parts.join('.');
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split('(')[0];
  
    return method || event.temp_function_name;
  }


  checkIfHighlightedEventTextIsTransfer(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(' ');

    return highlightedEventTextArr[0].toUpperCase() == 'TRANSFER';
  }
}

module.exports = FormatApproval;