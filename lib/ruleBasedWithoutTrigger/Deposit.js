const BigNumber = require("bignumber.js");

class FormatDeposit {
  /**
   * Constructor for Deposit event.
   *
   * @param {object} params
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

    try {
      const logsData = txDetail.logsData;
      const data = txDetail.data;

      let formattedText = "";

      const response = oThis.getValueAndAddress(data);

      if (response) {
        formattedText = oThis.constructDepositSummary(response);
      }

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        txDetail.transactionHash,
        "Deposit"
      );
    } catch (error) {
      console.log("Error in FormatDeposit: ", error);
      console.log("txDetail of Error : ", txDetail.transactionHash);
      return { kind: "Deposit", type: "unsuccessful_match" };
    }
  }

  getValueAndAddress(data) {
    const oThis = this;

    let address = null;

    let value = data.value,
      decimal = 18;
    if (data.method === "depositFor") {
      const tokenTransfer = data.token_transfers[0];
      address = tokenTransfer.token.address || null;
      const total = tokenTransfer.total;
      value = total.value;
      decimal = total.decimals;
    }

    value = oThis.convertToDecimal(value, decimal);
    return { value: value, address: address };
  }

  constructDepositSummary(response) {
    let formattedText;

    if (response.address) {
      formattedText = `Deposit ${response.value} ${response.address}`;
    } else {
      formattedText = `Deposit ${response.value} Ether`;
    }

    return formattedText;
  }

  convertToDecimal(value, decimal) {
    value = new BigNumber(value)
      .dividedBy(new BigNumber(10).pow(decimal))
      .toString();

    return value;
  }

  checkIfEqual(highlightedEventTexts, formattedText, transactionHash, kind) {
    const oThis = this;

    const highlightedEventText = oThis.getFormattedHighlightEventText(
      highlightedEventTexts[0]
    );

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("Deposit exact_match:  ", transactionHash);

      return {
        type: "exact_match",
        kind: kind,
      };
    } else {
      console.log("Deposit unsuccessful_match:  ", transactionHash);
      return { type: "unsuccessful_match", kind: kind };
    }
  }

  getFormattedHighlightEventText(highlightedEventText) {
    const oThis = this;

    highlightedEventText = highlightedEventText.toUpperCase();
    if (!highlightedEventText) {
      return null;
    }

    highlightedEventText = highlightedEventText.replace(",", "");

    if (highlightedEventText.includes(" INTO")) {
      return highlightedEventText.split(" INTO")[0].toUpperCase();
    } else {
      return highlightedEventText.split(" TO")[0].toUpperCase();
    }
  }
}

module.exports = FormatDeposit;
