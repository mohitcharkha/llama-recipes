const BigNumber = require("bignumber.js");

class FormatSales {
  /**
   * Constructor for Sale transaction.
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

      let nftsCount = 0;
      let etherValue = 0;

      nftsCount = oThis.getNFTCount(logsData);

      etherValue = oThis.calculateEtherValue(data);

      if (etherValue == 0) {
        nftsCount = 0;

        // Recalculate NFTS count as well from ERC721 transfer events

        let address;

        if (data && data.token_transfers) {
          for (const tokenTransfer of data.token_transfers) {
            const token = tokenTransfer.token;
            if (token.type == "ERC-721") {
              if (!address) {
                address = tokenTransfer.to.hash;
              }
              nftsCount++;
            }
          }

          console.log("address: ", address);

          let value = 0;
          for (const tokenTransfer of data.token_transfers) {
            const token = tokenTransfer.token,
              from = tokenTransfer.from,
              total = tokenTransfer.total;

            if (token.type == "ERC-20" && from.hash == address) {
              console.log("total.value: ", total.value);
              value = Number(value) + Number(total.value);
            }
          }

          console.log("value inside another logic: ", value);

          etherValue = oThis.convertToDecimal(value, 18);

          console.log("etherValue inside another logic: ", etherValue);
        }
      }

      formattedText = oThis.constructSaleSummary(nftsCount, etherValue);

      return oThis.checkIfEqual(
        txDetail.highlightedEventTexts,
        formattedText,
        txDetail.transactionHash,
        "Sale"
      );
    } catch (error) {
      console.log("Error in FormatSale: ", error);
      console.log("txDetail of Error : ", txDetail.transactionHash);
      return { kind: "Sale", type: "unsuccessful_match" };
    }
  }

  checkIfEqual(highlightedEventTexts, formattedText, transactionHash, kind) {
    const oThis = this;

    const highlightedEventText = oThis.getFormattedHighlightEventText(
      highlightedEventTexts[0]
    );

    if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
      console.log("exact_match:  ", transactionHash);
      console.log("formattedText: ", formattedText);
      console.log("highlightedEventTexts: ", highlightedEventTexts);

      return {
        type: "exact_match",
        kind: kind,
      };
    } else {
      console.log("unsuccessful language generation:  ", transactionHash);
      return {
        type: "unsucessful_match",
        kind: kind,
      };
    }
  }

  constructSaleSummary(nftsCount, etherValue) {
    let language = "";
    if (nftsCount == 1) {
      language = `Sale: ${nftsCount} NFT For ${etherValue} Ether`;
    } else {
      language = `Sale: ${nftsCount} NFTs For ${etherValue} Ether`;
    }

    return language;
  }

  calculateEtherValue(data) {
    const oThis = this;

    let formattedAmount = oThis.convertToDecimal(data.value, 18);
    return formattedAmount;
  }

  getNFTCount(logsData) {
    const oThis = this;
    let nftsCount = 0;
    for (let i = 0; i < logsData.items.length; i++) {
      const eventLog = logsData.items[i];
      const methodName = oThis.getMethodName(eventLog);
      if (methodName == "OrderFulfilled") {
        nftsCount++;
      }
    }

    return nftsCount;
  }

  convertToDecimal(value, decimal) {
    value = new BigNumber(value)
      .dividedBy(new BigNumber(10).pow(decimal))
      .toString();

    return value;
  }

  convertToNumberWithCommas(value) {
    let parts = value.split(".");
    parts[0] = Number(parts[0]).toLocaleString("en-US");
    return parts.join(".");
  }

  getMethodName(event) {
    const methodCall = event && event.decoded && event.decoded.method_call;
    // check if method call is OrderFulfilled event by splitting the method call
    const method = methodCall && methodCall.split("(")[0];

    return method;
  }

  getAllCounts(matched, type) {
    const oThis = this;

    return {
      matched: matched,
      type: type,
    };
  }

  checkIfHighlightedEventTextIsSale(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return false;
    }

    const highlightedEventTextArr = highlightedEventText.split(":");

    return highlightedEventTextArr[0].toUpperCase() == "SALE";
  }

  getFormattedHighlightEventText(highlightedEventText) {
    const oThis = this;

    if (!highlightedEventText) {
      return null;
    }

    highlightedEventText = highlightedEventText.replace(
      "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      "Ether"
    );

    if (highlightedEventText.includes(" On")) {
      return highlightedEventText.split(" On")[0].toUpperCase();
    } else {
      return highlightedEventText.split(" via")[0].toUpperCase();
    }
  }
}

module.exports = FormatSales;
