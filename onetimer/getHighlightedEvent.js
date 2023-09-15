const axios = require('axios');

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  transactionDetailsConstants = require(rootPrefix +
    "/lib/globalConstant/transactionDetails"),
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');
  
const apiKey = coreConstants.etherscanApiKey;

class GetHighlightedEvent {
  async perform() {
    let oThis = this,
      page = 1;

    
    const transactionDetails = await oThis.getTransactionDetails();

    let count = 0;
    let EqualCount = 0;

    for (let index = 0; index < transactionDetails.length; index++) {

      const transactionDetail = transactionDetails[index];

      const logsData = transactionDetail.logsData;
      const data = transactionDetail.data;
      const highlightedEventText = transactionDetail.highlightedEventTexts[0];

      // get first word of highlightedEventText
      const firstWord = highlightedEventText.split(' ')[0];


      let formattedText = "";
      if (logsData.items.length == 1) {
        const itemData = logsData.items[0];
        const methodCall = itemData.decoded.method_call;        
        const method = methodCall.split('(')[0];
        const contractAddress = itemData.address.hash;

        if (method == "Approval") {
          const spender = itemData.decoded.parameters[1].value;

          if (data.decoded_input.parameters[1].value == 0) {
            formattedText = `Revoked ${contractAddress} From Trade On ${spender}`;
          } else {
            formattedText = `Approved ${contractAddress} For Trade On ${spender}`;
          }
        } else if (method == "Transfer") {
          count++;
          const toAddress = itemData.decoded.parameters[1].value;
          const amount = itemData.decoded.parameters[2].value;

          const decimal = data.token_transfers[0].total.decimals;
          const formattedAmount = oThis.formatNumber(amount, decimal);
          formattedText = `Transfer ${formattedAmount} ${contractAddress} To ${toAddress}`;

          console.log('Equal: ', highlightedEventText.toUpperCase() == formattedText.toUpperCase());
          if (highlightedEventText.toUpperCase() == formattedText.toUpperCase()) {
            EqualCount++;
          }
        } 
      } else {
        const lastItemData = logsData.items[logsData.items.length - 1];
        const methodCall = lastItemData.decoded.method_call;
        const method = methodCall.split('(')[0];

        if (method == "Withdrawal") {
          let transferEvent = null;
          let swapEvent = null;
          for (let index = 0; index < logsData.items.length; index++) {
            const itemData = logsData.items[index];
            const methodCall = itemData.decoded.method_call;
            const method = methodCall.split('(')[0];
            if (method == "Transfer") {
              transferEvent = itemData;
            }
            if (method == "Swap") {
              swapEvent = itemData;
            }
          }

          const amount = swapEvent.decoded.parameters[2].value;

          const tokenAddress = transferEvent.address.hash;

          const etherAmount = lastItemData.decoded.parameters[1].value;

          formattedText = `Swap ${amount} ${tokenAddress} For ${etherAmount} Ether`
          count++;

          console.log('transaction hash: ', transactionDetail.transactionHash);
          console.log('highlightedEventText: ', highlightedEventText);
          console.log('formattedText: ', formattedText);
          console.log('----------------------------------------');
        } else {
          // Do nothing
        }
      }

    }
    console.log('count: ', count);
    console.log('EqualCount: ', EqualCount);

  }

  // function to format number. divide by 10^decimal and format to 9 decimal places and remove trailing zeros. add commas to number
  formatNumber(num, decimal) {
    num = num / (10 ** decimal);
    num = num.toString()
    let splitNumber = num.split(".");
    if (splitNumber[1]) {
        splitNumber[1] = splitNumber[1].replace(/0+$/,'');
        num = splitNumber.join(".");
    }

    const formattedNum = Intl.NumberFormat('en-US').format(parseFloat(num));
    return formattedNum;
  }
  

  async getTransactionDetails() {
    const dbRows = await new TransactionDetailModel()
    .select('*')
    .where('highlighted_event_texts is not null')
    .where(["status = ?", 
    transactionDetailsConstants.successStatus])
    .where(["highlighted_event_status = ?", 
          transactionDetailsConstants.successHighlightedEventStatus])
    .where('total_events > 0')
    .where('total_decoded_events = total_events')
    .fire();

    const formattedDbRows = [];
    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = new TransactionDetailModel().formatDbData(dbRows[index]);
      formattedDbRows.push(formatDbRow);
    }

    return formattedDbRows;
  }
}

const populateAbis = new GetHighlightedEvent();

populateAbis
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });