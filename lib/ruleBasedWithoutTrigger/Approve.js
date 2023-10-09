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
  }

  /**
   * Perform
   * @param {object} txDetail
   * @param {string} category
   *
   * @return {Promise<*>}
   */
  perform(txDetail, category) {
    const oThis = this;

    const logsData = txDetail.tempLogsData;
    const data = txDetail.data;
    let formattedText = "";

    try {
      if (txDetail.logsData["items"].length == 1) {
        const itemData = logsData.items[0];
        const method = oThis.getMethodName(itemData);

        if (method == "Approval" || method == "ApprovalForAll") {
          if (data.decoded_input) {
            const spender = data.decoded_input.parameters[0].value;
            const contractAddress = data.to.hash;
            console.log(
              "data.decoded_input.parameters[1].value: ",
              data.decoded_input.parameters[1].value
            );
            if (
              data.decoded_input.parameters[1].value == 0 ||
              data.decoded_input.parameters[1].value == "false"
            ) {
              formattedText = `Revoked ${contractAddress} From Trade On ${spender}`;
              return oThis.checkIfEqual(
                txDetail.highlightedEventTexts,
                formattedText,
                "Revoked"
              );
            } else {
              formattedText = `Approved ${contractAddress} For Trade On ${spender}`;
            }
          }
        }
      }

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        category,
        txDetail.transactionHash
      );
    } catch (error) {
      console.log("Error in FormatApproval: ", error);
      console.log("txDetail of Error : ", txDetail.transactionHash);
      return { kind: category, type: "unsuccessful_match" };
    }
  }

  checkIfEqual(highlightedEventTexts, formattedText, kind, transactionHash) {
    const oThis = this;

    const highlightedEventText = highlightedEventTexts[0];

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log(" exact_match: ", transactionHash);
      return {
        kind: kind,
        type: "exact_match",
      };
    } else {
      console.log(" unsuccessful match: ", transactionHash);
      return { kind: kind, type: "unsuccessful_match" };
    }
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is swap event by splitting the method call
    const method = methodCall && methodCall.split("(")[0];

    return method || event.temp_function_name;
  }

  checkIfHighlightedEventTextIsApprove(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(" ");

    return highlightedEventTextArr[0].toUpperCase() == "APPROVED";
  }

  checkIfHighlightedEventTextIsRevoked(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(" ");

    return highlightedEventTextArr[0].toUpperCase() == "REVOKED";
  }
}

module.exports = FormatApproval;
