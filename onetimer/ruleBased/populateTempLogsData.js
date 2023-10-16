const rootPrefix = '../..',
  ContractAbiModel = require(rootPrefix + '/app/models/mysql/main/ContractAbis'),
  TransactionDetailModel = require(rootPrefix + '/app/models/mysql/main/TransactionsDetails');


class PopulateTempLogsData {

  async perform() {
    let oThis = this,
      page = 1;

    const allAbisMap = await oThis.fetchContractAbis();    

    while (true) {
      const transactionDetails = await oThis.getTransactionDetails(page);
      console.log('transactionDetails: ', transactionDetails.length);

      if (!transactionDetails || transactionDetails.length === 0) {
        break;
      }

      let txToupdatelogsDataMap = {};

      for (let index = 0; index < transactionDetails.length; index++) {

        const transactionDetail = transactionDetails[index];
        const txHash = transactionDetail.transactionHash;

        const logsData = transactionDetail.logsData;
        const items = logsData.items;

        for (let index = 0; index < items.length; index++) {
          const itemData = items[index];
          const decodedEvent = itemData.decoded;
          const topics = itemData.topics;

          const contractAbiRow = allAbisMap[topics[0]];
          if (!contractAbiRow) {
            console.log('Not found', txHash);
          } else {
            itemData.temp_function_name = contractAbiRow.data.name;;
          }     
          
          items[index] = itemData;
        }

        logsData.items = items;
        txToupdatelogsDataMap[transactionDetail.transactionHash] = logsData;
      }
      
      for (let txHash in txToupdatelogsDataMap) {
        const logsData = txToupdatelogsDataMap[txHash];
        await new TransactionDetailModel().updateByTxHash(
          txHash,
          {
            temp_logs_data: JSON.stringify(logsData)
          }
        );
      }
      page++;
    }
  }

  async getTransactionDetails(pageNo) {
    const offset = (pageNo - 1) * 1000;

    const dbRows = await new TransactionDetailModel()
    .select('*')
    .where('logs_data is not null')
    .offset(offset)
    .limit(1000)
    .fire();

    const formattedDbRows = [];
    for (let index = 0; index < dbRows.length; index++) {
      const formatDbRow = new TransactionDetailModel().formatDbData(dbRows[index]);
      formattedDbRows.push(formatDbRow);
    }

    return formattedDbRows;
  }

  async fetchContractAbis() {
    const oThis = this;

    const response = {};

    const dbRows = await new ContractAbiModel()
      .select("*")
      .fire();

      for (let index = 0; index < dbRows.length; index++) {
        const formatDbRow = new ContractAbiModel().formatDbData(dbRows[index]);
        response[formatDbRow.signature] = formatDbRow;
      }

    return response;
  }

}

module.exports = PopulateTempLogsData;

new PopulateTempLogsData()
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });