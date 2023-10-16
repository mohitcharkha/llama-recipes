import json
import aiohttp
import asyncio
import time

class GetInference:
    def __init__(self):
        self.json_data = None

    async def perform(self):
        await self.read_json_file()
        await self.create_prompts_and_generate_inferences()

    async def read_json_file(self):
        try:
            # Todo: Replace the path with your actual JSON file path
            json_file_path = "/Users/amanbarbaria/Downloads/inference_eval_oslo_model.json"

            with open(json_file_path, 'r', encoding='utf-8') as file:
                data = file.read()
                self.json_data = json.loads(data)
                self.json_data = self.json_data[:50]

        except Exception as error:
            print("Error:", error)

    async def create_prompts_and_generate_inferences(self):
        async with aiohttp.ClientSession() as session:
            stat_result = {"match": {}, "not_match": {}}
            tasks = []
            index = 0           
            start = time.perf_counter()
            for json_row in self.json_data:
                json_row=temp_row
                prompt = self.create_prompt(json_row)
                tasks.append(self.generate_inference(session, prompt, json_row))
                index += 1

            inference_responses = await asyncio.gather(*tasks)
            index = 0
            e2e_inference_time = (time.perf_counter()-start)*1000
            for actual_output in inference_responses:
                actual_output = actual_output.split("### Response:")[1].strip()
                actual_output = actual_output.split("\"")[0]
                json_row = self.json_data[index]
                index += 1
                expected_output = json_row["output"]
                if expected_output == actual_output:
                    stat_result["match"][expected_output] = stat_result["match"].get(expected_output, 0) + 1
                else:
                    # print("==============Not Matched =======================")
                    stat_result["not_match"][expected_output] = stat_result["not_match"].get(expected_output, 0) + 1
                # print(f"stat_result: {stat_result}\n\n")
            print(f"({e2e_inference_time} ms) FINAL stat_result: {stat_result}\n\n")


    def create_prompt(self, json_row):
        prompt = f"Instruction:\n{json_row['instruction']}\n\n### Input:\n{json_row['input']}\n\n### Response:"
        return prompt

    async def generate_inference(self, session, prompt, json_row):        
        # Todo: Replace the URL with your actual inference service URL
        url = "https://swpw4vvyh6kw0m-8000.proxy.runpod.net/generate"
        data = {'prompt': prompt, 'n': 1, 'temperature': 0}
        response_text = None
        data = json.dumps(data)

        async with session.post(url, data=data) as response:
            if response.status == 200:
                response_text = await response.text()
                # print("response_text",response_text)
            else:
                print(f"Request failed with status code {response.status}")

        return response_text

async def main():
    get_inference = GetInference()
    await get_inference.perform()

if __name__ == "__main__":
    asyncio.run(main())
