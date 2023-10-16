class FormatApproval {
  /**
   * Constructor for FormatApproval.
   *
   * @param {object} params
   * @param {string} params.txHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.isEthercanTextApproved = false;
    oThis.isEthercanTextRevoked = false;
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
    if (oThis.checkIfHighlightedEventTextIsApprove(highlightedEventTexts) ) {
      oThis.isEthercanTextApproved = true;
    }

    if (oThis.checkIfHighlightedEventTextIsRevoked(highlightedEventTexts) ) {
      oThis.isEthercanTextRevoked = true;
    }

    if (txDetail.logsData["items"].length == 1) {
      const itemData = logsData.items[0];     
      const method = oThis.getMethodName(itemData);

      if (method == "Approval" || method == "ApprovalForAll") {

        if(data.decoded_input) {
          const spender = data.decoded_input.parameters[0].value;
          const contractAddress = data.to.hash;
          console.log("data.decoded_input.parameters[1].value: ", data.decoded_input.parameters[1].value);
          if (data.decoded_input.parameters[1].value == 0 || data.decoded_input.parameters[1].value == 'false') {
            formattedText = `Revoked ${contractAddress} From Trade On ${spender}`;
            return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedText, "Revoked");
          } else {
            formattedText = `Approved ${contractAddress} For Trade On ${spender}`;
            return oThis.checkIfEqual(txDetail.highlightedEventTexts, formattedText, "Approved");
          }

        }
      }
    }

    return oThis.returnResult();
  }

  returnResult() {
    const oThis = this;
    if (oThis.isEthercanTextApproved) {
      console.log("script_classification_failed_for_given_action: ", "Approved");
      return {
        did_not_match: true,
        kind: "Approved",
        type: "script_classification_failed_for_given_action"
      }
    }

    if (oThis.isEthercanTextRevoked) {
      console.log("script_classification_failed_for_given_action: ", "Revoked");
      return {
        did_not_match: true,
        kind: "Revoked",
        type: "script_classification_failed_for_given_action"
      }
    }

    return {
      did_not_match: true,
      kind: "Approved",
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

    if (kind == "Approved"){
      if (oThis.isEthercanTextApproved) {
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
    } else {
      if (oThis.isEthercanTextRevoked) {
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
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split('(')[0];
  
    return method || event.temp_function_name;
  }

  checkIfHighlightedEventTextIsApprove(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(' ');

    return highlightedEventTextArr[0].toUpperCase() == 'APPROVED';
  }

  checkIfHighlightedEventTextIsRevoked(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(' ');

    return highlightedEventTextArr[0].toUpperCase() == 'REVOKED';
  }
}

module.exports = FormatApproval;