fs = require("fs");
a = require("../training_dataset_llama2_50k.json");
b = [];
c = {};
hashes = require("../hashes_string_2900.json");


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
    return startAdd + endAdd;
    }else{
        return "NA";
    }
}


function formatOutput(arr){
    let outputArr = [];
    for (var index in arr) {
        arrChunks = arr[index].replaceAll(",", "").replaceAll(".", "").split(" ");
        arrCleanChunks = [];
        for (var chunkIndex in arrChunks) {
            /*if(/^\d+$/.test(arrChunks[chunkIndex])) {
                arrCleanChunks.push("[amount]");
                continue;
            }*/
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



async function main() {
    let count = 0;
    let max = 0;
    const instruction = "You are an expert in Ethereum blockchain. Summarize the transaction below into a one line summary.";

    let llamaTokenizer = await import("../llama-tokenizer.js");

    for (i = 0; i < a.length; i++) {
        input = JSON.parse(a[i].input);
        let input_string = "Transaction details are:\n" +
            // `from=${getShortAddress(input.transactions.from?.hash)} (${input.transactions.from?.name ?? "NA"})\n` +
            // `to=${getShortAddress(input.transactions.to?.hash)} (${input.transactions.to?.name ?? "NA"})\n` +
            `from=${getShortAddress(input.transactions.from?.hash)}\n` +
            `from_name=${input.transactions.from?.name ?? "NA"}\n` +
            `to=${getShortAddress(input.transactions.to?.hash)}\n` +
            `to_name=${input.transactions.to?.name ?? "NA"}\n` +
            `value=${input.transactions.value || 0}\n` +
            `input_method=${input.transactions.method ?? "NA"}\n` +
            `input_method_params=${getMethodParameters(input.transactions.decoded_input?.parameters)}\n\n`;

        if (input.token_transfers.length > 0) {
            input_string += `${input.token_transfers.length} token tranfers:\n`;
            for (j = 0; j < input.token_transfers.length; j++) {
                let token_transfer = input.token_transfers[j];
                input_string += `${j + 1}) ` +
                    `type=${token_transfer.type}\n` +
                    // `from=${getShortAddress(token_transfer.from.hash)} (${token_transfer.from?.name ?? "NA"})\n` +
                    // `to=${getShortAddress(token_transfer.to?.hash)} (${token_transfer.to?.name ?? "NA"})\n` +
                    `from=${getShortAddress(token_transfer.from.hash)}\n` +
                    `from_name=${token_transfer.from?.name ?? "NA"}\n` +
                    `to=${getShortAddress(token_transfer.to?.hash)}\n` +
                    `to_name=${token_transfer.to?.name ?? "NA"}\n` +
                    `value=${token_transfer.total.value || 0}\n` +
                    `decimal=${token_transfer.total.decimal || 0}\n` +
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
                    `method_name=${input.event_logs[j].decoded?.method_call.split("(")?.[0] ?? "NA"}\n` +
                    `method_id=${getMethodIdFromTopicsArray(input.event_logs[j].topics)}\n` +
                    `method_params=${getMethodParameters(input.event_logs[j].decoded?.parameters)}\n\n`;
            };
        } else {
            input_string += "No event logs.\n\n"
        }



        let contentLength = llamaTokenizer.default.encode(
            instruction + input_string
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

        // if (JSON.parse(a[i].output).length > 1) {
        //     console.log("skipping multi line outputs")
        //     continue;
        // }
        b[count] = {};

        b[count].instruction = instruction;

        b[count].input = input_string;
        let output = JSON.parse(a[i].output);

        let firstWord = String(output.join(",")).split(" ")[0];
        b[count].output = formatOutput(output);
        b[count].transactionHash = input.transactions.hash;

        c[firstWord] ||= [];
        c[firstWord].push(b[count]);

        count++;
        // if (i == 1000) {
        //   break;
        // }
    }
    let typeCount = 0;
    let maxPerTypeCount = 10;
    let finalOutput = [];
    let supportedTypes = ["Swap", "Approved", "Transfer", "Mint"]
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

    fs.writeFileSync("inference_data_string_2900_nontrained_40.json", JSON.stringify(finalOutput));
}
main().then(() => {
    console.log("done");
})
