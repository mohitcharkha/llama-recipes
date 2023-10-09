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

      const data = txDetail.data;
      let formattedText = "";

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

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        "Transfer",
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
      console.log("Transfer exact match: ", transactionHash);
      return {
        kind: kind,
        type: "exact_match",
      };
    } else {
      console.log("Transfer unsuccessful match: ", transactionHash);
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
