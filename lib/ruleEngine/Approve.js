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

    console.log('In FormatApproval::');

    const logsData = txDetail.tempLogsData;
    const data = txDetail.data;
    let formattedText = "";

    let isEthercanTextApprove = false;
    const highlightedEventTexts = txDetail.highlightedEventTexts && txDetail.highlightedEventTexts.length > 0 ? txDetail.highlightedEventTexts[0] : null;
    if (oThis.checkIfHighlightedEventTextIsApprove(highlightedEventTexts) ) {
      isEthercanTextApprove = true;
      // console.log('isEthercanTextApprove: ', isEthercanTextApprove);
    }

    



    if (txDetail.logsData["items"].length == 1) {
      const itemData = logsData.items[0];     
      const method = oThis.getMethodName(itemData);

      if (method == "Approval" || method == "ApprovalForAll") {
        // console.log('itemData: ', itemData);

        if(!data.decoded_input) {
          // ZeroDecodedEvents++;
          // if (isEthercanTextApprove) {
          //   console.log('ApproveInEtherscanNotInScript::', txDetail.transactionHash);
          // }

          return oThis.getAllCounts(false, 'ZeroDecodedEvents');
        }

        // const spender = itemData.
        const spender = data.decoded_input.parameters[0].value;
        const contractAddress = data.to.hash;



        if (data.decoded_input.parameters[1].value == 0) {
          formattedText = `Revoked ${contractAddress} From Trade On ${spender}`;
        } else {
          formattedText = `Approved ${contractAddress} For Trade On ${spender}`;
        }

        if (formattedText.toUpperCase() == txDetail.highlightedEventTexts[0].toUpperCase()) {

          return oThis.getAllCounts(true, 'MatchCount');
        } else {
          return oThis.getAllCounts(false, 'NotEqualCount');
        }
      } 
      else {
        if (isEthercanTextApprove) {
          console.log('ApproveInEtherscanNotInScript11::', txDetail.transactionHash);
        }
      }
    }

    

    if (isEthercanTextApprove) {
      console.log('ApproveInEtherscanNotInScript22::', txDetail.transactionHash);
    }

    return oThis.getAllCounts(false, 'Other');

  }

  checkIfEqual(highlightedEventText, formattedText) {
    const oThis = this;

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      return oThis.getAllCounts(true, 'MatchCount');
    }

    // console.log('NotEqual::')
    // console.log('highlightedEventText::', highlightedEventText);
    // console.log('formattedText::', formattedText);


    return oThis.getAllCounts(false, 'NotEqualCount');
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

    console.log('matched: ', matched);
    console.log('type: ', type);

    return {
      matched: matched,
      type: type
    }

  }

  checkIfHighlightedEventTextIsApprove(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(' ');

    return highlightedEventTextArr[0].toUpperCase() == 'APPROVED';
  }
}

module.exports = new FormatApproval();