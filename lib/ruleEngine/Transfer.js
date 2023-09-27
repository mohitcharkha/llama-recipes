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
    // let isEthercanTextTransfer = false;
    // const highlightedEventTexts = txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 0 ? txDetail.highlightedEventTexts[0] : null;
    // if (oThis.checkIfHighlightedEventTextIsTransfer(highlightedEventTexts) ) {
    //   isEthercanTextTransfer = true;
    // }

    if(logsData.items.length == 0) {
      // ZeroEvents++;

      if (data.raw_input == "0x" && data.value != "0") {

        let formattedAmount = oThis.convertToDecimal(data.value, 18);
        const toAddress = data.to.hash;
        formattedText = `Transfer ${formattedAmount} Ether To ${toAddress}`;

        // console.log('formattedText: ', formattedText);
        // console.log('highlightedEventText: ', txDetail.highlightedEventTexts[0]);
        if (txDetail.highlightedEventTexts[0].toUpperCase() == formattedText.toUpperCase()) {
          // console.log('EEqual: ', txDetail.transactionHash);
          // console.log('formattedText: ', formattedText);
          // console.log('highlightedEventText: ', txDetail.highlightedEventTexts[0]);
          // MatchCount++;

          return oThis.getAllCounts(true, 'MatchCount');
        } else {
          console.log('Not Equal: ', txDetail.transactionHash);
          console.log('highlightedEventText: ', txDetail.highlightedEventTexts[0]);
          console.log('formattedText: ', formattedText);
          // NotEqualCount++;

          return oThis.getAllCounts(false, 'NotEqualCount');
        }
      } else {
          // if (isEthercanTextTransfer) {
          //   // console.log('TransferInEtherscanNotInScript::', txDetail.transactionHash);
          //   // SwapInEtherscanNotInScript++;
          //   // NotEqualCount++;
          // }
        } 
      }


    if (txDetail.logsData["items"].length == 1) {
      const itemData = logsData.items[0];

      if (!itemData.decoded ) {
        

        return oThis.getAllCounts(false, 'EventsNotDecoded');
      }
      const method = oThis.getMethodName(itemData);
      const contractAddress = itemData.address.hash;


      if (method == "Transfer") {
        const toAddress = itemData.decoded.parameters[1].value;
        const amount = itemData.decoded.parameters[2].value;

        const decimal = data.token_transfers[0].total.decimals;
        let formattedAmount = oThis.convertToDecimal(amount, decimal);
        formattedAmount = oThis.convertToNumberWithCommas(formattedAmount);
        
        formattedText = `Transfer ${formattedAmount} ${contractAddress} To ${toAddress}`;

        if (txDetail.highlightedEventTexts[0].toUpperCase() == formattedText.toUpperCase()) {
          console.log('EEqual: ', txDetail.transactionHash);

          return oThis.getAllCounts(true, 'MatchCount');
        } else {
          console.log('Not Equal: ', txDetail.transactionHash);
          console.log('highlightedEventText: ', txDetail.highlightedEventTexts[0]);
          console.log('formattedText: ', formattedText);

          return oThis.getAllCounts(false, 'NotEqualCount');
        }
      } else {

        return oThis.getAllCounts(false, 'Other');
      }

    }

    return oThis.getAllCounts(false, 'Other');

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

  getAllCounts(matched , type) {
    const oThis = this;

    return {
      matched: matched,
      type: type
    }

  }
}

module.exports = new FormatApproval();