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
      const data = txDetail.data;

      let formattedText = "";

      const response = oThis.checkForTokenMinting(data);

      if (response.mintedAddress) {
        formattedText = oThis.constructMintSummary(response);
      }

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        txDetail.transactionHash,
        "Mint"
      );
    } catch (error) {
      console.log("Error in FormatMint: ", error);
      console.log("txDetail of Error : ", txDetail.transactionHash);
      return { kind: "Mint", type: "unsuccessful_match" };
    }
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

  checkIfEqual(highlightedEventTexts, formattedText, transactionHash, kind) {
    const oThis = this;

    const highlightedEventText = highlightedEventTexts[0];

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("Mint exact_match:  ", transactionHash);

      return {
        type: "exact_match",
        kind: kind,
      };
    } else {
      console.log("Mint unsuccessful_match:  ", transactionHash);
      return { type: "unsuccessful_match", kind: kind };
    }
  }
}

module.exports = FormatMint;
