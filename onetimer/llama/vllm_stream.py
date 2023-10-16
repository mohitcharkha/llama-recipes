import json
from typing import Iterable, List
import json
import time
import asyncio

import requests

class GetInferenceStream:
    def __init__(self):
        self.json_data = None

    async def perform(self):
        await self.read_json_file()
        await self.create_prompt_and_generate_inference()

    async def read_json_file(self):
        try:
            # Todo:: Replace the path with your actual json file path
            # json_file_path = "/workspace/onetimer-vllm/inference_eval_oslo_model.json"
            json_file_path = "/Users/amanbarbaria/Downloads/inference_eval_oslo_model.json"

            with open(json_file_path, 'r', encoding='utf-8') as file:
                data = file.read()
                self.json_data = json.loads(data)

        except Exception as error:
            print("Error:", error)

    async def create_prompt_and_generate_inference(self):
        temp_row =  {
            "instruction": "You are an expert in Ethereum blockchain and can summarize the transaction into a one-liner. For the following transaction data, please provide a one line summary.",
            "input": "Transaction details are as below: \nfrom=0x0cAEc860D19000A5EA8DE443b7ceE8f11f2c0008.from_name=NA.to=0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD.to_name=UniversalRouter.value=720000000000000000.types=coin_transfer, contract_call, token_transfer.input_method_name=execute.input_method_id=24856bc3.input_method_parameters=NA, NA.\nThere are 4 token tranfers events mentioned below: \n1)type=token_minting.from=0x0000000000000000000000000000000000000000.from_name=NA.to=0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD.to_name=UniversalRouter.value=720000000000000000.decimal=0.token_name=Wrapped Ether.token_type=ERC-20.token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.\n2)type=token_transfer.from=0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD.from_name=UniversalRouter.to=0x7B6AbC75cf6c8ABE52E047e11240d1aa9ED784e3.to_name=JamUniswapV2Pair.value=720000000000000000.decimal=0.token_name=Wrapped Ether.token_type=ERC-20.token_address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.\n3)type=token_transfer.from=0x7B6AbC75cf6c8ABE52E047e11240d1aa9ED784e3.from_name=JamUniswapV2Pair.to=0xFde00bD1Da57349b0DF85F134b18124266F3bC5b.to_name=DIA.value=659560720023255772246.decimal=0.token_name=Decentralized Intelligence Agency.token_type=ERC-20.token_address=0xFde00bD1Da57349b0DF85F134b18124266F3bC5b.\n4)type=token_transfer.from=0x7B6AbC75cf6c8ABE52E047e11240d1aa9ED784e3.from_name=JamUniswapV2Pair.to=0x0cAEc860D19000A5EA8DE443b7ceE8f11f2c0008.to_name=NA.value=12531653680441859672687.decimal=0.token_name=Decentralized Intelligence Agency.token_type=ERC-20.token_address=0xFde00bD1Da57349b0DF85F134b18124266F3bC5b.\nThere are 6 event logs mentioned below: \n1)address_hash=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.topics=e1fffcc4, 0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad.event_data=0x00000000000000000000000000000000000000000000000009fdf42f6e480000.2)address_hash=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2.topics=ddf252ad, 0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad, 0x0000000000000000000000007b6abc75cf6c8abe52e047e11240d1aa9ed784e3.event_data=0x00000000000000000000000000000000000000000000000009fdf42f6e480000.3)address_hash=0xFde00bD1Da57349b0DF85F134b18124266F3bC5b.topics=ddf252ad, 0x0000000000000000000000007b6abc75cf6c8abe52e047e11240d1aa9ed784e3, 0x000000000000000000000000fde00bd1da57349b0df85f134b18124266f3bc5b.event_data=0x000000000000000000000000000000000000000000000023c13e645bd307ec56.4)address_hash=0xFde00bD1Da57349b0DF85F134b18124266F3bC5b.topics=ddf252ad, 0x0000000000000000000000007b6abc75cf6c8abe52e047e11240d1aa9ed784e3, 0x0000000000000000000000000caec860d19000a5ea8de443b7cee8f11f2c0008.event_data=0x0000000000000000000000000000000000000000000002a757a172d0a9968a6f.5)address_hash=0x7B6AbC75cf6c8ABE52E047e11240d1aa9ED784e3.topics=1c411e9a.event_data=0x0000000000000000000000000000000000000000000000006d047fa873e255ba000000000000000000000000000000000000000000001bc44787eac882e1354e.6)address_hash=0x7B6AbC75cf6c8ABE52E047e11240d1aa9ED784e3.topics=d78ad95f, 0x0000000000000000000000003fc91a3afd70395cd496c647d5a6cc9d4b2b7fad, 0x0000000000000000000000000caec860d19000a5ea8de443b7cee8f11f2c0008.event_data=0x00000000000000000000000000000000000000000000000009fdf42f6e480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002cb18dfd72c7c9e76c5.",
            "output": "Swap 0.72 Ether For 13,191.214400465115444933 0xfde00bd1da57349b0df85f134b18124266f3bc5b On Uniswap V2"
        }
        json_row = temp_row
        prompt = self.create_prompt(json_row)
        start = time.perf_counter()
        # print(f"Prompt: {prompt!r}\n", flush=True)
        response = post_http_request(prompt)
        num_printed_lines = 0
        for h in get_streaming_response(response):
            print("\n\n\n1111111111111========")
            # clear_line(num_printed_lines)
            num_printed_lines = 0
            for i, line in enumerate(h):
                num_printed_lines += 1
                print(f"Beam candidate {i}: {line!r}", flush=True)        
        # model_classification_response
        e2e_inference_time = (time.perf_counter()-start)*1000
        print(f"Total time ({e2e_inference_time} ms)") 

    def create_prompt(self, json_row):
        prompt = f"Instruction:\n{json_row['instruction']}\n\n### Input:\n{json_row['input']}\n\n### Response:"
        return prompt

def clear_line(n: int = 1) -> None:
    LINE_UP = '\033[1A'
    LINE_CLEAR = '\x1b[2K'
    for _ in range(n):
        print(LINE_UP, end=LINE_CLEAR, flush=True)


def post_http_request(prompt: str) -> requests.Response:
    headers = {"User-Agent": "Test Client"}
    # api_url = "https://0.0.0.0:8000/generate"
    api_url = "https://swpw4vvyh6kw0m-8000.proxy.runpod.net/generate"    
    pload = {
        "prompt": prompt,
        "n": 1,
        "temperature": 0,
        "max_tokens": 50,
        "stream": True,
    }
    # pload = json.dumps(pload) 
    response = requests.post(api_url, headers=headers, json=pload, stream=True)
    return response


def get_streaming_response(response: requests.Response) -> Iterable[List[str]]:
    for chunk in response.iter_lines(chunk_size=8192,
                                     decode_unicode=False,
                                     delimiter=b"\0"):
        if chunk:
            data = json.loads(chunk.decode("utf-8"))
            output = data["text"]
            yield output


def get_response(response: requests.Response) -> List[str]:
    data = json.loads(response.content)
    output = data["text"]
    return output

async def main():
    get_inference = GetInferenceStream()
    await get_inference.perform()

if __name__ == "__main__":
    asyncio.run(main())            
