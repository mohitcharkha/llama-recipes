const BigNumber = require("bignumber.js");

class FormatTransfer {
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
    try {
      const oThis = this;

      const logsData = txDetail.tempLogsData;
      const data = txDetail.data;
      let formattedText = "";

      let formattedAmount = oThis.convertToDecimal(data.value, 18);
      const toAddress = data.to.hash;
      formattedText = `Transfer ${formattedAmount} Ether To ${toAddress}`;

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        "Basic Ether Transfer",
        txDetail.transactionHash
      );
    } catch (error) {
      console.log("Error in FormatTransfer: ", error);
      console.log("txDetail of Error : ", txDetail.transactionHash);
      return { kind: "Transfer", type: "unsuccessful_match" };
    }
  }

  checkIfEqual(highlightedEventTexts, formattedText, kind, transactionHash) {
    const oThis = this;

    const highlightedEventText = highlightedEventTexts[0];

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log(" Basic Transfer exact match: ", transactionHash);
      return {
        kind: kind,
        type: "exact_match",
      };
    } else {
      console.log("Basic Transfer unsuccessful match: ", transactionHash);
      return {
        kind: kind,
        type: "unsuccessful_match",
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
}

module.exports = FormatTransfer;
