fs = require("fs");
trainingDataset = require("../training_dataset_llama2_50k.json");
formattedDataset = [];
outputDatasetMap = {};
const BigNumber = require("bignumber.js");
hashes = require("../DataFiles/training_dataset_hashes_2800_supportedTypes.json");

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

function getTokenTransferValue(total) {
    if (total.token_id) {
        if (total.value) {
            return `${convertToDecimal(total.value, total?.decimals)}`;
        }
        else {
            return "1";
        }
    }
    else {
        return `${convertToDecimal(total.value, total.decimals)}`;
    }
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
        } else if (parameter.type === "address") {
            parameters.push(getShortAddress(parameter.value))
        } else {
            if (Array.isArray(parameter.value)) {
                let parametersArray = [];
                for (let pIndex in parameter.value) {
                    if (String(parameter.value[pIndex]).startsWith("0x")) {
                        if (parameter.value[pIndex].length === 42) {
                            parametersArray.push(getShortAddress(parameter.value[pIndex]));
                        } else {
                            parametersArray.push("NA");
                        }
                    }
                    else {
                        parametersArray.push(parameter.value[pIndex]);
                    }
                }
                parameters.push(parametersArray)
            } else {
                parameters.push(parameter.value);
            }
        }
    }
    return parameters.length > 0 ? parameters.join(", ") : "NA";
}

function getShortAddress(address) {
    if (address) {
        let startAdd = address.substring(0, 6);
        let endAdd = address.substring(address.length - 4);
        return (startAdd + endAdd).toLowerCase();
    } else {
        return "NA";
    }
}


async function main() {
    let count = 0;
    let skipCount = 0;
    let multilineSkipCount = 0;
    let supportedDataTypes = [
        "Transfer",
        "Swap",
        "Approved",
        "Mint",
        "Sale",
        "Unwrap",
        "Wrap",
        "Revoked",
        "Deposit",
        "Burn",
        "Withdraw",
        "Register"
        // "Collect",
        // "Bridge",
    ];
    for (i = 0; i < trainingDataset.length; i++) {
        input = JSON.parse(trainingDataset[i].input);
        let string_input = "";
        const instruction = "You are an expert in Ethereum blockchain and can classify the transactions into their specific categories.";
        let llamaTokenizer = await import("../llama-tokenizer.js");

        let token_transfers = [];
        for (j = 0; j < input.token_transfers.length; j++) {
            let token_transfer = input.token_transfers[j];

            const token_transfer_string = `${token_transfer.type} from ${token_transfer.from.name ?? "NA"
                } to ${token_transfer.to.name ?? "NA"} for value ${getTokenTransferValue(token_transfer.total)} of type ${token_transfer.token?.type ?? "NA"}`;
            token_transfers.push(token_transfer_string);
        }
        if (input.token_transfers.length > 0) {
            string_input += `token_transfers: "${token_transfers.join(",")}", `;
        }

        let event_logs = [];
        for (j = 0; j < input.event_logs.length; j++) {
            const event_log_string = `${getShortAddress(input.event_logs[j].address.hash)} emitted ${getMethodIdFromTopicsArray(input.event_logs[j].topics)} with parameters: ${getMethodParameters(input.event_logs[j].decoded?.parameters)}`;
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
            "NA"} d_method_id: ${input.transactions.decoded_input?.method_id || "NA"} d_method_params: ${getMethodParameters(input.transactions.decoded_input?.parameters)}`;


        let contentLength = llamaTokenizer.default.encode(
            instruction + string_input
        )?.length;
        // console.log({ contentLength });
        if (contentLength > 2800) {
            console.log("contentLength is greater ", contentLength);
            skipCount += 1;
            continue;
        }

        if (hashes.includes(input.transactions.hash)) {
            continue
        }


        let output = JSON.parse(trainingDataset[i].output);
        let outputArray = []
        for (let outputIndex in output) {
            let firstWord = String(output[outputIndex]).split(" ")[0].replace(":", "").trim();
            if (supportedDataTypes.includes(firstWord)) {
                outputArray.push(firstWord);
            }
        }
        if (outputArray.length > 1) {
            // console.log("skipping multi line outputs")
            multilineSkipCount += 1;
            continue;
        }
        formattedDataset[count] = {};

        formattedDataset[count].instruction = instruction;

        formattedDataset[count].input = string_input.trim();
        formattedDataset[count].transactionHash = input.transactions.hash;
        formattedDataset[count].output = outputArray.join(",");

        outputDatasetMap[formattedDataset[count].output] ||= [];
        outputDatasetMap[formattedDataset[count].output].push(formattedDataset[count]);

        count++;
        // if (i == 1000) {
        //   break;
        // }
    }
    let typeCount = 0;
    let maxPerTypeCount = 1000;
    let finalOutput = [];
    for (let type in outputDatasetMap) {
        if (outputDatasetMap[type].length < typeCount) {
            console.log("skip ", type, " ", outputDatasetMap[type].length);
            continue;
        }
        console.log("add  ", type, " ", outputDatasetMap[type].length);
        finalOutput = finalOutput.concat(outputDatasetMap[type].slice(0, maxPerTypeCount === 0 ? outputDatasetMap[type].length : maxPerTypeCount));
    }
    console.log({ skipCount, percent: skipCount / trainingDataset.length * 100 })
    console.log({ multilineSkipCount, percent: multilineSkipCount / trainingDataset.length * 100 })
    fs.writeFileSync("Datafiles/llama_inference_data_2800_supportedTypes_nontrained.json", JSON.stringify(finalOutput));
}
main().then(() => {
    console.log("done");
})
