fs = require("fs");
a = require("./training_dataset_llama.json");
b = [];

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

    const token_transfer_string = `${token_transfer.type} from ${token_transfer.from.hash} to ${token_transfer.to.hash} for value ${token_transfer.total.value} with decimal ${token_transfer.total.decimals}`;
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
    // delete input.event_logs[j].data;
    // input.event_logs[j].address_name = "dummy";
    // input.event_logs[j].address = input.event_logs[j].address.hash;
    // input.event_logs[j].topics = input.event_logs[j].topics[0];
    const event_log_string = `${input.event_logs[j].address.hash} emitted ${input.event_logs[j].topics[0]} on position ${input.event_logs[j].index}`;
    event_logs.push(event_log_string);
  }
  if (input.event_logs.length > 0) {
    string_input += `event_logs: "${event_logs.join(",")}", `;
  }

  delete input.transactions.from.is_verified;
  delete input.transactions.from.public_tags;
  delete input.transactions.from.private_tags;
  delete input.transactions.from.watchlist_names;
  delete input.transactions.from.implementation_name;
  delete input.transactions.from.is_contract;

  delete input.transactions.to.is_verified;
  delete input.transactions.to.public_tags;
  delete input.transactions.to.private_tags;
  delete input.transactions.to.watchlist_names;
  delete input.transactions.to.implementation_name;
  delete input.transactions.to.is_contract;

  delete input.transactions.hash;
  delete input.transactions.status;
  delete input.transactions.tx_tag;
  delete input.transactions.created_contract;
  delete input.transactions.has_error_in_internal_txs;
  delete input.transactions.actions;

  string_input += `from: ${input.transactions.from.hash} to: ${
    input.transactions.to.hash
  } value: ${input.transactions.value} method: ${
    input.transactions.method
  } types: "${input.transactions.tx_types.join(",")}" d_method_call: ${
    input.transactions.decoded_input?.method_call || "NA"
  } d_method_id: ${input.transactions.decoded_input?.method_id || "NA"}`;

  a[i].input = input;
  b[i] = {};

  b[i].instruction =
    "You are an expert in Ethereum blockchain and can explain transaction in one line. Here is my transaction: \n" +
    string_input;
  b[i].input = "";
  let output = JSON.parse(a[i].output);
  b[i].output = output.join(",");
  if (i == 300) {
    break;
  }
}
fs.writeFileSync("alpaca_data_set5.json", JSON.stringify(b));
