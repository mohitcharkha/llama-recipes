const axios = require('axios');

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TransactionLogsModel = require(rootPrefix + '/app/models/mysql/main/TransactionLog'),
  ContractAbisModel = require(rootPrefix + '/app/models/mysql/main/ContractAbis');
  
const apiKey = coreConstants.etherscanApiKey;

class PopulateAbis {
  async perform() {
    let oThis = this,
      page = 1;

    while (true) {
      let transactionLogsObj = new TransactionLogsModel();
      const transactions = await transactionLogsObj.fetchTransactionLogsByPageFromDb(page);

      if (!transactions || Object.keys(transactions).length === 0) {
        break;
      }

      for (let index = 0; index < transactions.length; index++) {
        let transaction = transactions[index];

        const items = transaction.data && transaction.data.items;

        if (!items || items.length === 0) {
          continue;
        }

        for (let i = 0; i < items.length; i++) {
          let item = items[i];
          
          if (item.topics && item.topics[0]) {
            let topic = item.topics[0];


            const checkIfAbiExists = await oThis.checkIfAbiExistsInDb(topic);

            if (checkIfAbiExists) {
              continue;
            }

            const contractAddress = item.address.hash;
            let contractAbi = await oThis.getABI(contractAddress);
            await new Promise(r => setTimeout(r, 200));
            if (!contractAbi) {
              console.log('contractAbi not found for: ', contractAddress);
              continue;
            }

            contractAbi = JSON.parse(contractAbi);
            
            await oThis.upsertAbisInDb(contractAbi);
          }
        }
      }
      console.log('page: ', page);
      page++;
    }

  }

  async getABI(contractAddress) {
    try {
      const apiUrl = `https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;

      const response = await axios.get(apiUrl);
      if (response.data.status === '1') {
        const abi = JSON.parse(response.data.result);

        return JSON.stringify(abi);
      }

      console.log('response.data: ', response.data);
      // throw new Error('Error in fetching abi');
    } catch (error) {
      console.error('Error:', error);

      throw error;
    }
  }

  async checkIfAbiExistsInDb(topic) {
    const dbRows = await new ContractAbisModel()
    .select('*')
    .where(['signature = ?', topic])
    .fire();

    if (dbRows.length > 0) {
      return true;
    }

    return false;
  }


  async upsertAbisInDb(abi) {
    const oThis = this,
      abiArray = [],
      signatureToAbiMap = {},
      topics = [];

    for(let i = 0; i < abi.length; i++) {
      const abiObj = abi[i];
      
      if (abiObj.type === 'event') {
        const topic = oThis.calculateTopic(abiObj);
        topics.push(topic);
        signatureToAbiMap[topic] = JSON.stringify(abiObj);
      }
    }

    if (topics.length === 0) {
      return;
    }

    const existingAbis = await new ContractAbisModel()
      .select('id, signature, data')
      .where({ signature: topics })
      .fire();

    const existingDbRecordsByMediaIdMap = {};
    for (const existingAbi of existingAbis) {
      const formattedDbRow = new ContractAbisModel().formatDbData(existingAbi);
      existingDbRecordsByMediaIdMap[formattedDbRow.signature] = formattedDbRow;
    }

    for (const topic of topics) {
      if (existingDbRecordsByMediaIdMap[topic]) {
        continue;
      }

      abiArray.push([topic, signatureToAbiMap[topic]]);
    }

    if (abiArray.length === 0) {
      return;
    }

    let contractsAbisModel = new ContractAbisModel();
    await contractsAbisModel.insertRecords(['signature', 'data'], abiArray);
  }

  calculateTopic(abiObj) {
    const oThis = this;
    const signature = oThis.getSignature(abiObj);

    let sha3 = require('js-sha3').keccak_256;

    return '0x' + sha3(signature);
  }

  getSignature(abiObj) {
    let signature = abiObj.name + '(';

    for (let i = 0; i < abiObj.inputs.length; i++) {
      const input = abiObj.inputs[i];

      signature += input.type + ',';
    }

    return signature.slice(0, -1) + ')';
  }
}

const populateAbis = new PopulateAbis();

populateAbis
  .perform()
  .then(function(rsp) {
    process.exit(0); 
  })
  .catch(function(err) {
    console.log('Error in script: ', err);
    process.exit(1); 
  });