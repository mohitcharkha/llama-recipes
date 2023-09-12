const { ethers } = require('ethers');


const rootPrefix = '..',
    TransactionLogModel = require(rootPrefix + '/app/models/mysql/main/TransactionLog'),
    ContractAbiModel = require(rootPrefix + '/app/models/mysql/main/ContractAbis'),
    responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for HTTP request.
 *
 * @class HttpRequest
 */
class DecodeLogs {
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

    oThis.txHash = params.txHash;
    oThis.contractAbiMapBySignature = {};
    oThis.transactionLog = null;
  }


  async perform(){
    const oThis = this;
    
    oThis.transactionLog = await new TransactionLogModel().fetchByTxHash(oThis.txHash);
    try{
        const resp = await oThis._start();
        await new TransactionLogModel().updateById(
            oThis.transactionLog.id, 
            {decode_status: "SUCCESS", decoded_events: JSON.stringify(resp)}
            );            
    } catch(err){
        console.error(err);
        await new TransactionLogModel().updateById(
            oThis.transactionLog.id, 
            {decode_status: "ERROR"}
            );  
        return new Promise.reject(err);    
    }   
  }


  async _start(){
    const oThis = this;
    await oThis._fetchAbis();

    let decodedEvents = [];
    for (let index in oThis.transactionLog.data.items){
        let log = oThis.transactionLog.data.items[index];
        let decodedLog = await oThis._decodeLog(log);
        decodedEvents.push(decodedLog);
    }
    return decodedEvents;
  }

  async _fetchAbis(){
    const oThis = this;
    const signatures = [];
    for (let index in oThis.transactionLog.data.items){
        let log = oThis.transactionLog.data.items[index];
        signatures.push(log.topics[0]);
    }

    if (signatures.length == 0){
        return;
    }

    oThis.contractAbiMapBySignature = await new ContractAbiModel().fetchBySignatures(signatures);
  }

  async _decodeLog(log){
    const oThis = this;
    const topics = [];
    for (let index in log.topics){
        const topic = log.topics[index];
        if (topic != null) {
            topics.push(topic);
        }
    }

    const eventLog = {
        data: log.data,
        topics: topics
    };

    const contractAbiRow = oThis.contractAbiMapBySignature[eventLog.topics[0]];
    if (!contractAbiRow || !contractAbiRow.id) {
        const msg = `No ABI found for topic ${eventLog.topics[0]} , address: ${log.address.hash}`;
        console.warn(msg);
        return {decode_status: "ABI_NOT_FOUND", message: msg};
    }

    // console.log("contractAbiRow", contractAbiRow);
    // console.log("eventLog", eventLog);

    const iface = new ethers.Interface([contractAbiRow.data]);
    const resp =  iface.parseLog(eventLog);
    const formattedLog = oThis._formatParsedLog(resp);
    return {decode_status: "SUCCESS", decoded_log: formattedLog};
  }


  _formatParsedLog(parsedLog) {
    // console.log("parsedLog", parsedLog);
    const methodCall = `${parsedLog.signature}`;
    const methodId = parsedLog.topic.substring(2, 10); // This extracts the first 4 bytes (8 characters) of the topic, which represents the method id

    const parameters = parsedLog.fragment.inputs.map((input, index) => {
        let value = parsedLog.args[index];

        // Convert BigInt (n) to a regular string representation
        if (typeof value === 'bigint') {
            value = value.toString();
        }

        return {
            indexed: input.indexed,
            name: input.name,
            type: input.type,
            value: value
        };
    });

    return {
        method_call: methodCall,
        method_id: methodId,
        parameters: parameters
    };
  }  

}

module.exports = DecodeLogs;
