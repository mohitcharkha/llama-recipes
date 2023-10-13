# Install this dependency before running the script
# pip install aiohttp

import json
import aiohttp
import time
import asyncio

class GetInference:
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
        results = []
        async with aiohttp.ClientSession() as session:
            stat_result = {"match": {}, "not_match": {}}
            for json_row in self.json_data:
                prompt = self.create_prompt(json_row)
                start = time.perf_counter()
                output = await self.generate_inference(session, prompt)
                e2e_inference_time = (time.perf_counter()-start)*1000
                model_classification_response = output.split("### Response:")[1].strip()
                model_classification_response = model_classification_response.split("\"")[0]
                expected_output = json_row["output"]
                transaction_hash = json_row["transactionHash"]
                print(f"({e2e_inference_time} ms) {transaction_hash} expected_response:{expected_output} model_classification_response:{model_classification_response} {expected_output==model_classification_response}")
                results.append([transaction_hash,expected_output, model_classification_response])
                if expected_output == model_classification_response:
                  stat_result["match"][expected_output] = stat_result["match"].get(expected_output, 0) + 1
                else:
                  print(f"==============Not Matched =======================")
                  stat_result["not_match"][expected_output] = stat_result["not_match"].get(expected_output, 0) + 1    
                print(f"stat_result: {stat_result}\n\n")
            
        print("========================Script Complete Result====================== \n\n")
        for result in results:    
            print(",".join(result))     
    
    

    def create_prompt(self, json_row):
        prompt = f"Below is an instruction that describes a task, paired with an input that provides further context. \nWrite a response that appropriately completes the request.\n\n### Instruction:\n{json_row['instruction']}\n\n### Input:\n{json_row['input']}\n\n### Response:"
        return prompt

    async def generate_inference(self, session, prompt):
        # Todo Replace the URL with your actual inference service URL
        url = "https://swpw4vvyh6kw0m-8000.proxy.runpod.net/generate"
        data = {'prompt': prompt, 'n': 1, 'temperature': 0}
        data = json.dumps(data)
        # print("data", data)
        response_text = None

        async with session.post(url, data=data) as response:
            if response.status == 200:
                response_text = await response.text()
            else:
                print(f"Request failed with status code {response.status}")
        return response_text

async def main():
    get_inference = GetInference()
    await get_inference.perform()

if __name__ == "__main__":
    asyncio.run(main())
