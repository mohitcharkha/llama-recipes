fs = require("fs");
a = require("../training_dataset_llama2_50k.json");
b = [];
c = {};
hashes = require("../hashes_string_2900-new.json");
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


function getMethodIdFromTopicsArray(topics) {
    return topics[0]?.split("0x")[1]?.substring(0, 8) ?? "NA";
}

function getMethodParameters(methodParameters) {
    let parameters = [];
    for (let index in methodParameters) {
        let parameter = methodParameters[index];
        if (parameter.type.includes("bytes")) {
            parameters.push("NA")
        } else if(parameter.type === "address") {
            parameters.push(getShortAddress(parameter.value))
        } else {
            if(Array.isArray(parameter.value)){
                let parametersArray = [];
                for(let pIndex in parameter.value){
                    if(String(parameter.value[pIndex]).startsWith("0x")){
                        if(parameter.value[pIndex].length === 42){
                            parametersArray.push(getShortAddress(parameter.value[pIndex]));
                        }else{
                            parametersArray.push("NA");
                        }
                    }
                    else{
                        parametersArray.push(parameter.value[pIndex]);
                    }
                }
                parameters.push(parametersArray)
            }else{
                parameters.push(parameter.value);
            }
        }
    }
    return parameters.length > 0 ? parameters.join(", ") : "NA";
}

function getShortAddress(address){
    if(address){
        let startAdd = address.substring(0,6);
        let endAdd = address.substring(address.length -4);
        return (startAdd + endAdd).toLowerCase();
    }else{
        return "NA";
    }
}


function formatOutput(arr, replaceEther){
    let outputArr = [];
    for (var index in arr) {
        arrChunks = arr[index].replaceAll(",", "").split(" ");
        arrCleanChunks = [];
        for (var chunkIndex in arrChunks) {
            /*if(/^\d+$/.test(arrChunks[chunkIndex])) {
                arrCleanChunks.push("[amount]");
                continue;
            }*/
            if(replaceEther && arrChunks[chunkIndex] === "Ether"){
                arrCleanChunks.push(getShortAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"));
                continue;
            }
            if(/^0x/.test(arrChunks[chunkIndex])) {
                arrCleanChunks.push(getShortAddress(arrChunks[chunkIndex]));
                continue;
            }
            arrCleanChunks.push(arrChunks[chunkIndex]);
        }
        outputArr.push(arrCleanChunks.join(" "));
    }
    return outputArr.join("\n");
}

function getTokenTransferValue(total){
    if(total.token_id){
        if(total.value){
            return `value=${convertToDecimal(total.value, total?.decimals)}\n` + `decimal=${total?.decimals || 0}\n`;
        }
        else{
            return "value=1\n" + `decimal=${total?.decimals || 0}\n`;
        }
    }
    else{
        return `value=${convertToDecimal(total.value, total.decimals)}\n` + `decimal=${total.decimals}\n`;
    }
}

function getMethodName(event_log){
    return event_log.decoded?.method_call.split("(")?.[0] ?? "NA";
}

async function main() {
    let count = 0;
    let max = 0;
    const instruction = "You are an expert in Ethereum blockchain. Summarize the transaction below into a one line summary.";

    let llamaTokenizer = await import("../llama-tokenizer.js");

    for (i = 0; i < a.length; i++) {
        input = JSON.parse(a[i].input);

        let output = JSON.parse(a[i].output);

        let firstWord = String(output.join(",")).split(" ")[0];

        let shouldSkip = false;
        let replaceEther = false;
        if(firstWord != "Swap"){
            continue;
        }
        if(!input.event_logs.length){
            console.log("no event logs");
            continue;
        }
        for (j = 0; j < input.token_transfers.length; j++) {
            let token_transfer = input.token_transfers[j];
            if(token_transfer.token?.type === "ERC-20" && !token_transfer.total.decimals){
                shouldSkip = true;
                console.log("no decimal in token transfer");
                continue;
            }
        }
       let shouldNotSkip = false;
        for (j = 0; j < input.event_logs.length; j++) {
           let event_log = input.event_logs[j];
           if(getMethodName(event_log) === "Swap"){
                shouldNotSkip = true;
                continue;
           }
        }
        if(shouldSkip || !shouldNotSkip){
            continue;
        }

        let input_string = "Transaction details are:\n" +
            // `from=${getShortAddress(input.transactions.from?.hash)} (${input.transactions.from?.name ?? "NA"})\n` +
            // `to=${getShortAddress(input.transactions.to?.hash)} (${input.transactions.to?.name ?? "NA"})\n` +
            `from=${getShortAddress(input.transactions.from?.hash)}\n` +
            `from_name=${input.transactions.from?.name ?? "NA"}\n` +
            `to=${getShortAddress(input.transactions.to?.hash)}\n` +
            `to_name=${input.transactions.to?.name ?? "NA"}\n` +
            `value=${convertToDecimal(input.transactions.value, 18)}\n` +
            `input_method=${input.transactions.method ?? "NA"}\n` +
            `input_method_params=${getMethodParameters(input.transactions.decoded_input?.parameters)}\n\n`;

        if (input.token_transfers.length > 0) {
            input_string += `${input.token_transfers.length} token tranfers:\n`;
            for (j = 0; j < input.token_transfers.length; j++) {
                let token_transfer = input.token_transfers[j];
                if(token_transfer.token?.name === "Wrapped Ether"){
                    replaceEther = true;
                }
                input_string += `${j + 1}) ` +
                    `type=${token_transfer.type}\n` +
                    // `from=${getShortAddress(token_transfer.from.hash)} (${token_transfer.from?.name ?? "NA"})\n` +
                    // `to=${getShortAddress(token_transfer.to?.hash)} (${token_transfer.to?.name ?? "NA"})\n` +
                    `from=${getShortAddress(token_transfer.from.hash)}\n` +
                    `from_name=${token_transfer.from?.name ?? "NA"}\n` +
                    `to=${getShortAddress(token_transfer.to?.hash)}\n` +
                    `to_name=${token_transfer.to?.name ?? "NA"}\n` +
                    getTokenTransferValue(token_transfer.total) +
                    `log_index=${token_transfer.log_index ?? "NA"}\n` +
                    `token_name=${token_transfer.token?.name ?? token_transfer.token?.symbol ?? "NA"}\n` +
                    `token_type=${token_transfer.token?.type ?? "NA"}\n` +
                    `token_address=${getShortAddress(token_transfer.token?.address)}\n\n`;
            }
        } else {
            input_string += "No token tranfers.\n\n"
        }

        if (input.event_logs.length > 0) {
            input_string += `${input.event_logs.length} event logs:\n`;
            for (j = 0; j < input.event_logs.length; j++) {
                input_string += `${j + 1}) ` +
                    // `from=${getShortAddress(input.event_logs[j].address?.hash ?? "NA")} (${input.event_logs[j].address?.name ?? "NA"})\n` +
                    `from=${getShortAddress(input.event_logs[j].address?.hash)}\n` +
                    `from_name=${input.event_logs[j].address?.name ?? "NA"}\n` +
                    `index=${input.event_logs[j].index}\n` +
                    `method_name=${getMethodName(input.event_logs[j])}\n` +
                    `method_id=${getMethodIdFromTopicsArray(input.event_logs[j].topics)}\n` +
                    `method_params=${getMethodParameters(input.event_logs[j].decoded?.parameters)}\n\n`;
            };
        } else {
            input_string += "No event logs.\n\n"
        }

       
        output = formatOutput(output, replaceEther);

        let contentLength = llamaTokenizer.default.encode(
            instruction + input_string + output
        )?.length;
        if (contentLength > 2900) {
            if(contentLength>max){
                max = contentLength;
            }
            console.log("contentLength is greater ", contentLength);
            continue;
        }

        //Uncomment to put lower limit to contentLength
        // if(contentLength < 3900){
        //     continue;
        // }

    if(hashes.includes(input.transactions.hash)){
        continue
    }
        // console.log({contentLength})

        if ((JSON.parse(a[i].output).length > 1)) {
            console.log("skipping multi line outputs")
            continue;
        }
        b[count] = {};

        b[count].instruction = instruction;

        b[count].input = input_string;
       
        b[count].output = output;

        b[count].transactionHash = input.transactions.hash;

        c[firstWord] ||= [];
        c[firstWord].push(b[count]);

        count++;
        // if (i == 1000) {
        //   break;
        // }
    }
    let typeCount = 0;
    let maxPerTypeCount = 75;
    let finalOutput = [];
    let supportedTypes = ["Swap"];
    for (let type in c) {

        // To add check on typeCount uncomment following line
        // if (c[type].length < typeCount) {
        if (!supportedTypes.includes(type)) {
            console.log("skip ", type, " ", c[type].length);
            continue;
        }
        console.log("add  ", type, " ", c[type].length);
        finalOutput = finalOutput.concat(c[type].slice(0, maxPerTypeCount === 0 ? c[type].length : maxPerTypeCount));
    }

    fs.writeFileSync("inference_data_string_2900_swap_decoded_events_75.json", JSON.stringify(finalOutput));
}
main().then(() => {
    console.log("done");
})
