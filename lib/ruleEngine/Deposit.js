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

    oThis.isEtherscanTextDeposit = false;
  }

  /**
   * Perform
   * @param {object} txDetail
   *
   * @return {Promise<*>}
   */
  perform(txDetail) {
    const oThis = this;

    const logsData = txDetail.logsData;
    const data = txDetail.data;

    let formattedText = "";

    if (
      txDetail.highlightedEventTexts &&
      txDetail.highlightedEventTexts.length > 1
    ) {
      return oThis.returnResult("Deposit", txDetail.transactionHash);
    }
    const highlightedEventTexts =
      txDetail.highlightedEventTexts &&
      txDetail.highlightedEventTexts.length > 0
        ? txDetail.highlightedEventTexts[0]
        : null;

    if (oThis.checkIfHighlightedEventTextIsDeposit(highlightedEventTexts)) {
      oThis.isEtherscanTextDeposit = true;
    }

    const response = oThis.checkIfEventIsTypeDeposit(data);

    if (response) {
      formattedText = oThis.constructDepositSummary(response);
      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        txDetail.transactionHash,
        "Deposit"
      );
    }

    return oThis.returnResult("Deposit", txDetail.transactionHash);
  }

  checkIfEventIsTypeDeposit(data) {
    const oThis = this;

    let address = null;

    const allowedInputMethods = [
      "depositETH",
      "depositFor",
      "depositEth",
      "depositEtherFor",
    ];

    if (!allowedInputMethods.includes(data.method)) {
      return;
    }

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

  returnResult(kind, transactionHash) {
    const oThis = this;
    if (oThis.isEtherscanTextDeposit) {
      console.log(
        "Deposit script_classification_failed_for_given_action: ",
        transactionHash
      );
      return {
        type: "script_classification_failed_for_given_action",
        kind: kind,
      };
    }

    return {
      type: null,
      kind: kind,
    };
  }

  checkIfEqual(highlightedEventTexts, formattedText, transactionHash, kind) {
    const oThis = this;

    if (highlightedEventTexts == null || highlightedEventTexts.length == 0) {
      console.log(
        "Deposit  etherscan_does_not_have_any_text:  ",
        transactionHash
      );
      console.log("Deposit formattedText: ", formattedText);
      console.log("Deposit highlightedEventTexts: ", highlightedEventTexts);
      return {
        type: "etherscan_does_not_have_any_text",
        kind: kind,
      };
    }

    const highlightedEventText = oThis.getFormattedHighlightEventText(
      highlightedEventTexts[0]
    );

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("Deposit exact_match:  ", transactionHash);
      console.log("Deposit formattedText: ", formattedText);
      console.log("Deposit highlightedEventTexts: ", highlightedEventTexts);

      return {
        type: "exact_match",
        kind: kind,
      };
    }

    if (oThis.isEtherscanTextDeposit) {
      console.log("Deposit same_action_different_language:  ", transactionHash);
      console.log("Deposit formattedText: ", formattedText);
      console.log("Deposit highlightedEventTexts: ", highlightedEventTexts);

      return {
        type: "same_action_different_language",
        kind: kind,
      };
    } else {
      console.log(
        "Deposit etherscan_does_not_classify_as_given_action:  ",
        transactionHash
      );
      console.log(" Deposit formattedText: ", formattedText);
      console.log("Deposit highlightedEventTexts: ", highlightedEventTexts);
      return {
        type: "etherscan_does_not_classify_as_given_action",
        kind: kind,
      };
    }
  }

  checkIfHighlightedEventTextIsDeposit(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(" ");

    return highlightedEventTextArr[0].toUpperCase() == "DEPOSIT";
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
