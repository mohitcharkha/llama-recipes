fs = require("fs");
a = require("../training_dataset_llama2_14k.json");
hashes = require("../hashes.json");
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

function wordCount(str) {
  return str.split(" ").filter((n) => {
    return n != "";
  }).length;
}

let count = 0;

for (i = 0; i < a.length; i++) {
  input = JSON.parse(a[i].input);
  let string_input = "";

  let token_transfers = [];
  for (j = 0; j < input.token_transfers.length; j++) {
    let token_transfer = input.token_transfers[j];

    const token_transfer_string = `${token_transfer.type} from ${
      token_transfer.from.name ?? "NA"
    } to ${token_transfer.to.name ?? "NA"} for value ${convertToDecimal(
      token_transfer.total.value,
      token_transfer.total.decimals
    )}`;
    token_transfers.push(token_transfer_string);
  }
  if (input.token_transfers.length > 0) {
    string_input += `token_transfers: "${token_transfers.join(",")}", `;
  }

  if (input.event_logs.length == 0) {
    console.log("event logs empty", input);
  }

  let event_logs = [];
  for (j = 0; j < input.event_logs.length; j++) {
    const event_log_string = `${input.event_logs[j].address.hash} emitted ${
      input.event_logs[j].topics[0]
    }`;
    event_logs.push(event_log_string);
  }
  if (input.event_logs.length > 0) {
    string_input += `event_logs: "${event_logs.join(",")}", `;
  }

  string_input += `from: ${input.transactions.from?.hash ?? "NA"} to: ${input
    .transactions.to?.hash ?? "NA"} value: ${input.transactions.value ||
    0} method: ${input.transactions.method ||
    "NA"} types: "${input.transactions.tx_types.join(
    ","
  )}" d_method_name: ${input.transactions.decoded_input?.method_call.split("(")?.[0] ||
    "NA"} d_method_id: ${input.transactions.decoded_input?.method_id || "NA"}`;

  a[i].input = input;
  if(!hashes.includes(input.transactions.hash)){
    continue
  }
//   if (wordCount(string_input) > 120) {
    // console.log(wordCount(string_input), `index ${i}`);

//     continue;
//   }
  // if (wordCount(string_input) > 142) {
  //   console.log(wordCount(string_input), `index ${i}`);

  //   continue;
  // }
  // if (wordCount(string_input) < 82) {
  //   console.log(wordCount(string_input), `index ${i}`);

  //   continue;
  // }
  if(JSON.parse(a[i].output).length > 1){
    console.log("skipping multi line outputs")
    continue;
  }
  b[count] = {};

  b[count].instruction =
    "You are an expert in Ethereum blockchain and can classify the transactions into their specific categories";

  b[count].input = string_input.trim();

  let output = JSON.parse(a[i].output);
  let firstWord = String(output.join(",")).split(" ")[0];
  b[count].output = `${firstWord}`;
  b[count].transactionHash = input.transactions.hash;

  c[firstWord] ||= [];
  c[firstWord].push(b[count]);

  count++;
  // if (i == 1000) {
  //   break;
  // }
}
let typesArray = ["Swap", "Transfer", "Approved", "Mint"];

let typeCount = 0;
let maxPerTypeCount = 5;
let finalOutput = [];
for (let type in c) {
    if(!typesArray.includes(type)){
        continue;
    }
  if (c[type].length < typeCount) {
    console.log("skip " ,type, " ", c[type].length );
    continue;
  }
  console.log("add  " ,type, " ", maxPerTypeCount === 0 ? c[type].length : maxPerTypeCount);
  finalOutput = finalOutput.concat(c[type].slice(0, maxPerTypeCount === 0 ? c[type].length : maxPerTypeCount));
}
let finalData = []
let hashToTypeMap = {};
for(let i in finalOutput){
    let inferenceRecord = [];
    let recordObject = {"role": "system"}
    recordObject["content"] = finalOutput[i].instruction;
    inferenceRecord.push(recordObject);
    recordObject = {"role": "user"}
    recordObject["content"] = finalOutput[i].input;
    inferenceRecord.push(recordObject);
    console.log({inferenceRecord})
    finalData.push(inferenceRecord);
    let firstWord = String(finalOutput[i].output).split(" ")[0];
    hashToTypeMap[finalOutput[i].transactionHash] = firstWord

}
fs.writeFileSync("inferenceDataFromTrained.json", JSON.stringify(finalData));
fs.writeFileSync("expectedOutputFromTrained.json", JSON.stringify(hashToTypeMap));