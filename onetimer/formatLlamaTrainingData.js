fs = require("fs");
a = require("../training_dataset_llama2_50k.json");
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

    // delete token_transfer.to.is_contract;
    // delete token_transfer.to.is_verified;
    // delete token_transfer.to.public_tags;
    // delete token_transfer.to.private_tags;
    // delete token_transfer.to.watchlist_names;
    // delete token_transfer.to.implementation_name;

    // delete token_transfer.from.is_contract;
    // delete token_transfer.from.is_verified;
    // delete token_transfer.from.public_tags;
    // delete token_transfer.from.private_tags;
    // delete token_transfer.from.watchlist_names;
    // delete token_transfer.from.implementation_name;

    // delete token_transfer.token.holders;
    // delete token_transfer.token.icon_url;
    // delete token_transfer.token.exchange_rate;
    // delete token_transfer.token.circulating_market_cap;
    // delete token_transfer.token.total_supply;

    // delete token_transfer.tx_hash;
    // delete token_transfer.timestamp;
    // delete token_transfer.block_hash;
    // delete token_transfer.method;
    // input.token_transfers[j] = token_transfer;

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

  // if (input.event_logs.length == 0) {
  //   console.log("event logs empty", input);
  // }

  let event_logs = [];
  for (j = 0; j < input.event_logs.length; j++) {
    // delete input.event_logs[j].data;
    // input.event_logs[j].address_name = "dummy";
    // input.event_logs[j].address = input.event_logs[j].address.hash;
    // input.event_logs[j].topics = input.event_logs[j].topics[0];
    const event_log_string = `${input.event_logs[j].address.hash} emitted ${
      input.event_logs[j].topics[0]
    }`;
    event_logs.push(event_log_string);
  }
  if (input.event_logs.length > 0) {
    string_input += `event_logs: "${event_logs.join(",")}", `;
  }

  // delete input.transactions.from.is_verified;
  // delete input.transactions.from.public_tags;
  // delete input.transactions.from.private_tags;
  // delete input.transactions.from.watchlist_names;
  // delete input.transactions.from.implementation_name;
  // delete input.transactions.from.is_contract;

  // delete input.transactions.to.is_verified;
  // delete input.transactions.to.public_tags;
  // delete input.transactions.to.private_tags;
  // delete input.transactions.to.watchlist_names;
  // delete input.transactions.to.implementation_name;
  // delete input.transactions.to.is_contract;

  // delete input.transactions.hash;
  // delete input.transactions.status;
  // delete input.transactions.tx_tag;
  // delete input.transactions.created_contract;
  // delete input.transactions.has_error_in_internal_txs;
  // delete input.transactions.actions;

  string_input += `from: ${input.transactions.from?.hash ?? "NA"} to: ${input
    .transactions.to?.hash ?? "NA"} value: ${input.transactions.value ||
    0} method: ${input.transactions.method ||
    "NA"} types: "${input.transactions.tx_types.join(
    ","
  )}" d_method_name: ${input.transactions.decoded_input?.method_call.split("(")?.[0] ||
    "NA"} d_method_id: ${input.transactions.decoded_input?.method_id || "NA"}`;

  a[i].input = input;
  if (wordCount(string_input) > 109) {
    console.log(wordCount(string_input), `index ${i}`);

    continue;
  }
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
let typeCount = 0;
let maxPerTypeCount = 0;
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
fs.writeFileSync("alpaca_data_50k_training.json", JSON.stringify(finalOutput));
fs.writeFileSync("hashes_50k_training.json", JSON.stringify(transcationHashArray));
