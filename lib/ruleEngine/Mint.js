const BigNumber = require("bignumber.js");

class FormatMint {
  /**
   * Constructor for Mint event.
   *
   * @param {object} params
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.isEthercanTextMint = false;
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
      return oThis.returnResult("Mint");
    }
    const highlightedEventTexts =
      txDetail.highlightedEventTexts &&
      txDetail.highlightedEventTexts.length > 0
        ? txDetail.highlightedEventTexts[0]
        : null;

    if (oThis.checkIfHighlightedEventTextIsMint(highlightedEventTexts)) {
      oThis.isEthercanTextMint = true;
    }

    const response = oThis.checkForTokenMinting(data);

    if (response.mintedAddress) {
      formattedText = oThis.constructMintSummary(response);
      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        txDetail.transactionHash,
        "Mint"
      );
    }

    return oThis.returnResult("Mint");
  }

  constructMintSummary(response) {
    let formattedText;

    formattedText = `Mint ${response.mintCount} of ${response.mintedAddress}`;

    return formattedText;
  }

  checkForTokenMinting(data) {
    const oThis = this;

    let mintedAddress,
      mintCount = 0;

    for (const tokenTransfer of data.token_transfers) {
      const type = tokenTransfer.type;
      const fromAddress = tokenTransfer.from.hash;
      const token = tokenTransfer.token;
      const total = tokenTransfer.total;
      if (
        type === "token_minting" &&
        fromAddress === "0x0000000000000000000000000000000000000000" &&
        token.type === "ERC-1155"
      ) {
        if (!mintedAddress) mintedAddress = token.address;
        mintCount = Number(mintCount) + Number(total.value);
      } else if (
        type === "token_minting" &&
        fromAddress === "0x0000000000000000000000000000000000000000" &&
        token.type === "ERC-721"
      ) {
        if (!mintedAddress) mintedAddress = token.address;
        mintCount = Number(mintCount) + 1;
      }
    }

    return {
      mintedAddress: mintedAddress,
      mintCount: mintCount,
    };
  }

  returnResult(kind) {
    const oThis = this;
    if (oThis.isEthercanTextMint) {
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
      console.log("Mint  etherscan_does_not_have_any_text:  ", transactionHash);
      console.log("Mint formattedText: ", formattedText);
      console.log("Mint highlightedEventTexts: ", highlightedEventTexts);
      return {
        type: "etherscan_does_not_have_any_text",
        kind: kind,
      };
    }

    const highlightedEventText = highlightedEventTexts[0];

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("Mint exact_match:  ", transactionHash);
      console.log("Mint formattedText: ", formattedText);
      console.log("Mint highlightedEventTexts: ", highlightedEventTexts);

      return {
        type: "exact_match",
        kind: kind,
      };
    }

    if (oThis.isEthercanTextMint) {
      console.log("Mint same_action_different_language:  ", transactionHash);
      console.log("Mint formattedText: ", formattedText);
      console.log("Mint highlightedEventTexts: ", highlightedEventTexts);

      return {
        type: "same_action_different_language",
        kind: kind,
      };
    } else {
      console.log(
        "Mint etherscan_does_not_classify_as_given_action:  ",
        transactionHash
      );
      console.log(" Mint formattedText: ", formattedText);
      console.log("Mint highlightedEventTexts: ", highlightedEventTexts);
      return {
        type: "etherscan_does_not_classify_as_given_action",
        kind: kind,
      };
    }
  }

  checkIfHighlightedEventTextIsMint(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(" ");

    return highlightedEventTextArr[0].toUpperCase() == "MINT";
  }
}

module.exports = FormatMint;
