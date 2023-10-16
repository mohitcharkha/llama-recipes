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
\   *
   * @return {Promise<*>}
   */
  perform(txDetail) {
    const oThis = this;

    const logsData = txDetail.tempLogsData;
    const data = txDetail.data;
    let formattedText = "";

    try {
      const spender = data.decoded_input.parameters[0].value;
      const contractAddress = data.to.hash;
      console.log(
        "data.decoded_input.parameters[1].value: ",
        data.decoded_input.parameters[1].value
      );

      formattedText = `Approved ${contractAddress} For Trade On ${spender}`;

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        "Approved",
        txDetail.transactionHash
      );
    } catch (error) {
      console.log("Error in FormatApproval: ", error);
      console.log("txDetail of Error : ", txDetail.transactionHash);
      return { kind: "Approved", type: "unsuccessful_match" };
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
}

module.exports = FormatApproval;
