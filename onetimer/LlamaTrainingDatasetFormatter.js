fs = require("fs");
trainingDataset = require("../training_dataset_llama2_50k.json");
formattedDataset = [];
outputDatasetMap = {};
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


async function main() {
    let count = 0;
    let skipCount = 0;
    let multilineSkipCount = 0;
    let supportedDataTypes = ["Transfer",
        "Swap",
        "Approved",
        "Mint",
        "Sale",
        "Unwrap",
        "Wrap",
        "Revoked",
        "Deposit",
        "Burn",
        "Withdraw"
        // "Collect",
        // "Bridge",
        // "Register"
    ];
    for (i = 0; i < trainingDataset.length; i++) {
        input = JSON.parse(trainingDataset[i].input);
        let string_input = "";
        const instruction = "You are an expert in Ethereum blockchain and can classify the transactions into their specific categories." // + "In case you don't know the answer or can't find the proper classification say 'I don't know'"
        let llamaTokenizer = await import("../llama-tokenizer.js");

        let token_transfers = [];
        for (j = 0; j < input.token_transfers.length; j++) {
            let token_transfer = input.token_transfers[j];

            const token_transfer_string = `${token_transfer.type} from ${token_transfer.from.name ?? "NA"
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
            const event_log_string = `${input.event_logs[j].address.hash} emitted ${input.event_logs[j].topics[0]
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


        let contentLength = llamaTokenizer.default.encode(
            instruction + string_input
        )?.length;
        // console.log({ contentLength });
        if (contentLength > 2800) {
            console.log("contentLength is greater ", contentLength);
            skipCount += 1;
            continue;
        }


        // if (JSON.parse(trainingDataset[i].output).length > 1) {
        //     // console.log("skipping multi line outputs")
        //     multilineSkipCount += 1;
        //     continue;
        // }
        formattedDataset[count] = {};

        formattedDataset[count].instruction = instruction;

        formattedDataset[count].input = string_input.trim();
        let output = JSON.parse(trainingDataset[i].output);
        let outputArray = []
        for (let outputIndex in output) {
            let firstWord = String(output[outputIndex]).split(" ")[0].replace(":", "").trim();
            if (supportedDataTypes.includes(firstWord)) {
                outputArray.push(firstWord);
            }
        }
        formattedDataset[count].output = outputArray.join(",");
        formattedDataset[count].transactionHash = input.transactions.hash;

        outputDatasetMap[formattedDataset[count].output] ||= [];
        outputDatasetMap[formattedDataset[count].output].push(formattedDataset[count]);

        count++;
        // if (i == 1000) {
        //   break;
        // }
    }
    let typeCount = 40;
    let maxPerTypeCount = 100;
    let finalOutput = [];
    for (let type in outputDatasetMap) {
        if (outputDatasetMap[type].length < typeCount) {
            // console.log("skip ", type, " ", outputDatasetMap[type].length);
            continue;
        }
        console.log("add  ", type, " ", outputDatasetMap[type].length);
        finalOutput = finalOutput.concat(outputDatasetMap[type].slice(0, maxPerTypeCount === 0 ? outputDatasetMap[type].length : maxPerTypeCount));
    }
    let transcationHashArray = [];
    for (let i in finalOutput) {
        transcationHashArray.push(finalOutput[i].transactionHash);
        delete finalOutput[i].transactionHash;
    }
    console.log({ skipCount, percent: skipCount / trainingDataset.length * 100 })
    console.log({ multilineSkipCount, percent: multilineSkipCount / trainingDataset.length * 100 })
    fs.writeFileSync("Datafiles/training_dataset_alpaca_data_2800_supportedTypes_multiline.json", JSON.stringify(finalOutput));
    fs.writeFileSync("Datafiles/training_dataset_hashes_2800_supportedTypes_multiline.json", JSON.stringify(transcationHashArray));
}
main().then(() => {
    console.log("done");
})
