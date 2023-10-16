fs = require("fs");
a = require("../training_dataset_llama2_14k.json");
b = [];
c = {};
const BigNumber = require("bignumber.js");

function convertToDecimal(value, decimal) {
  if (!value) {
    return 0;
  }

  if (!decimal) {
    return value;
  }

  return new BigNumber(value)
    .dividedBy(new BigNumber(10).pow(decimal))
    .toString();
}

function getTopicsArray(topics){
  let topicsArray = []
  for(let index in topics){
    let topic = topics[index];
    if(topic){
      if(index == 0){
      let hash = topic?.split("0x")[1].substring(0,8);
      topicsArray.push(hash);
      }else{
      topicsArray.push(topic);
      }
    }
  }
  return topicsArray;
}

function getMethodParameters(methodParameters){
  let parameters = [];
  for(let index in methodParameters){
    let parameter = methodParameters[index];
    if(parameter.type.includes("bytes")){
      parameters.push("NA")
    } else {
      parameters.push(parameter.value);
    }
  }
  return parameters;
}


async function main(){
  let count = 0;
  let skipCount = 0;
  const instruction = "You are an expert in Ethereum blockchain and can summarize the transaction into a one-liner. Based on the following provided transaction data, please provide a one line summary.";
  let llamaTokenizer = await import("../llama-tokenizer.js");
  for (i = 0; i < a.length; i++) {
    input = JSON.parse(a[i].input);
    let input_json = {};

    let token_transfers = [];
    for (j = 0; j < input.token_transfers.length; j++) {
      let token_transfer = input.token_transfers[j];

      const token_transfer_map = {
        "type": token_transfer.type, 
        "from_name": token_transfer.from.name ?? "NA",
        "from": token_transfer.from.hash ?? "NA", 
        "to_name": token_transfer.to.name ?? "NA",
        "to": token_transfer.to.hash ?? "NA", 
        "value": token_transfer.total.value ? convertToDecimal(token_transfer.total.value, token_transfer.total.decimals) : token_transfer.total.token_id ?? "NA",
        "token_name": token_transfer.token?.name ?? token_transfer.token?.symbol ?? "NA",
        "token_type": token_transfer.token?.type ?? "NA",
        "token_address": token_transfer.token?.address,
      };

      token_transfers.push(token_transfer_map);
    }
    if (input.token_transfers.length > 0) {
      input_json["token_transfers"] = token_transfers;
    }

    let event_logs = [];
    for (j = 0; j < input.event_logs.length; j++) {

      const event_log = {
        "address_hash" : input.event_logs[j].address.hash,
        "topics": getTopicsArray(input.event_logs[j].topics),
        "event_data": input.event_logs[j].data,
      };
      event_logs.push(event_log);
    }
    if (input.event_logs.length > 0) {
      input_json["event_logs"] =  event_logs;
    }

    input_json["transaction_data"] = {
      "from": input.transactions.from?.hash ?? "NA",
      "from_name": input.transactions.from?.name ?? "NA",
      "to": input.transactions.to?.hash ?? "NA",
      "to_name": input.transactions.to?.name ?? "NA",
      "value": input.transactions.value || 0,
      "types": input.transactions.tx_types,
      "input_method_name": input.transactions.decoded_input?.method_call.split("(")?.[0],
      "input_method_id": input.transactions.decoded_input?.method_id || "NA",
      "input_method_parameters": getMethodParameters(input.transactions.decoded_input?.parameters),
    };

    let contentLength = llamaTokenizer.default.encode(
      instruction + JSON.stringify(input_json)
      )?.length;
    if(contentLength > 2640){
      console.log("contentLength is greater ", contentLength);
      skipCount += 1;
      continue;
    }

    // if(contentLength < 1000){
    //   continue;
    // }

    if(JSON.parse(a[i].output).length > 1){
      console.log("skipping multi line outputs")
      continue;
    }
    b[count] = {};

    b[count].instruction = instruction;

    b[count].input = JSON.stringify(input_json);
    let output = JSON.parse(a[i].output);

    let firstWord = String(output.join(",")).split(" ")[0];
    b[count].output = output.join(",");
    b[count].transactionHash = input.transactions.hash;

    c[firstWord] ||= [];
    c[firstWord].push(b[count]);

    count++;
    // if (i == 1000) {
    //   break;
    // }
  }
  let typeCount = 300;
  let maxPerTypeCount = 75;
  let finalOutput = [];
  for (let type in c) {
    if (c[type].length < typeCount) {
      console.log("skip " ,type, " ", c[type].length );
      continue;
    }
    console.log("add  " ,type, " ", c[type].length );
    finalOutput = finalOutput.concat(c[type].slice(0, maxPerTypeCount === 0 ? c[type].length : maxPerTypeCount));
  }
  let transcationHashArray = [];
  for(let i in finalOutput){
    transcationHashArray.push(finalOutput[i].transactionHash);
    delete finalOutput[i].transactionHash;
  }
  console.log({skipCount, percent: skipCount/a.length * 100})
  fs.writeFileSync("alpaca_data_contentLength_2640.json", JSON.stringify(finalOutput));
  fs.writeFileSync("hashes_contentLength_2640.json", JSON.stringify(transcationHashArray));
}
main().then(()=>{
  console.log("done");
})
