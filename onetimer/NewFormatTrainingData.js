fs = require("fs");
a = require("../training_dataset_llama2_50k.json");
b = [];
c = {};


function getTopicsArray(topics) {
    let topicsArray = []
    for (let index in topics) {
        let topic = topics[index];
        if (topic) {
            if (index == 0) {
                let hash = topic?.split("0x")[1].substring(0, 8);
                topicsArray.push(hash);
            } else {
                topicsArray.push(topic);
            }
        }
    }
    return topicsArray;
}

function getMethodParameters(methodParameters) {
    let parameters = [];
    for (let index in methodParameters) {
        let parameter = methodParameters[index];
        if (parameter.type.includes("bytes")) {
            parameters.push("NA")
        } else {
            parameters.push(parameter.value);
        }
    }
    return parameters;
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
    let skipCount = 0;
    const instruction = "You are an expert in Ethereum blockchain and can summarize the transaction into a one-liner. For the following transaction data, please provide a one line summary.";

    let llamaTokenizer = await import("../llama-tokenizer.js");

    for (i = 0; i < a.length; i++) {
        input = JSON.parse(a[i].input);
        let input_string = "Transaction details are as below:\n\n" +
            `from=${getShortAddress(input.transactions.from?.hash)}\n` +
            `from_name=${input.transactions.from?.name ?? "NA"}\n` +
            `to=${getShortAddress(input.transactions.to?.hash)}\n` +
            `to_name=${input.transactions.to?.name ?? "NA"}\n` +
            `value=${input.transactions.value || 0}\n` +
            `types=${input.transactions.tx_types.join(", ")}\n` +
            `input_method_name=${input.transactions.decoded_input?.method_call.split("(")?.[0] ?? "NA"}\n` +
            `input_method_id=${input.transactions.decoded_input?.method_id || "NA"}\n` +
            `input_method_parameters=${getMethodParameters(input.transactions.decoded_input?.parameters).join(", ")}.\n\n`;

        if (input.token_transfers.length > 0) {
            input_string += `There are ${input.token_transfers.length} token tranfers events mentioned below:\n\n`;
            for (j = 0; j < input.token_transfers.length; j++) {
                let token_transfer = input.token_transfers[j];
                input_string += `${j + 1})` +
                    `type=${token_transfer.type}\n` +
                    `from=${getShortAddress(token_transfer.from.hash)}\n` +
                    `from_name=${token_transfer.from?.name ?? "NA"}\n` +
                    `to=${getShortAddress(token_transfer.to?.hash)}\n` +
                    `to_name=${token_transfer.to?.name ?? "NA"}\n` +
                    `value=${token_transfer.total.value || 0}\n` +
                    `decimal=${token_transfer.total.decimal || 0}\n` +
                    `token_name=${token_transfer.token?.name ?? token_transfer.token?.symbol}\n` +
                    `token_type=${token_transfer.token?.type ?? "NA"}\n` +
                    `token_address=${getShortAddress(token_transfer.token?.address)}.\n\n`;
            }
        } else {
            input_string += "There are no token tranfer events.\n\n"
        }

        if (input.event_logs.length > 0) {
            input_string += `There are ${input.event_logs.length} event logs mentioned below:\n\n`;
            for (j = 0; j < input.event_logs.length; j++) {
                input_string += `${j + 1})` +
                    `address_hash=${getShortAddress(input.event_logs[j].address.hash)}\n` +
                    `topics=${getTopicsArray(input.event_logs[j].topics).join(", ")}\n` +
                    `event_data=${input.event_logs[j].data}\n\n`;
            };
        } else {
            input_string += "There are no event logs.\n\n"
        }



        let contentLength = llamaTokenizer.default.encode(
            instruction + input_string
        )?.length;
        console.log({contentLength});
        if (contentLength > 3900) {
            console.log("contentLength is greater ", contentLength);
            skipCount += 1;
            continue;
        }

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
    let typeCount = 300;
    let maxPerTypeCount = 75;
    let finalOutput = [];
    for (let type in c) {
        if (c[type].length < typeCount) {
            console.log("skip ", type, " ", c[type].length);
            continue;
        }
        console.log("add  ", type, " ", c[type].length);
        finalOutput = finalOutput.concat(c[type].slice(0, maxPerTypeCount === 0 ? c[type].length : maxPerTypeCount));
    }
    let transcationHashArray = [];
    for (let i in finalOutput) {
        transcationHashArray.push(finalOutput[i].transactionHash);
        delete finalOutput[i].transactionHash;
    }
    console.log({ skipCount, percent: skipCount / a.length * 100 })
    fs.writeFileSync("alpaca_data_string_6000.json", JSON.stringify(finalOutput));
    fs.writeFileSync("hashes_string_6000.json", JSON.stringify(transcationHashArray));
}
main().then(() => {
    console.log("done");
})
