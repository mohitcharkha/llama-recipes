import json
import aiohttp
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
            json_file_path = "/Users/shraddha/Downloads/alpaca_data_inference_50k_final.json"

            with open(json_file_path, 'r', encoding='utf-8') as file:
                data = file.read()
                self.json_data = json.loads(data)

            # Now you can work with the JSON data
            print(self.json_data)

        except Exception as error:
            print("Error:", error)

    async def create_prompt_and_generate_inference(self):
        async with aiohttp.ClientSession() as session:
            stat_result = {"match": {}, "not_match": {}}
            for json_row in self.json_data:
                prompt = self.create_prompt(json_row)
                output = await self.generate_inference(session, prompt)
                actual_output = output.split("### Response:")[1].strip()
                expected_output = json_row["output"]
                if expected_output == actual_output:
                  stat_result["match"][expected_output] = stat_result["match"].get(expected_output, 0) + 1
                else:
                  print(f"==============Not Matched =======================")
                  stat_result["not_match"][expected_output] = stat_result["not_match"].get(expected_output, 0) + 1    
                print(f"stat_result: {stat_result}\n\n")    
            
    print("========================Script Complete Result====================== \n\n")
    
    

    def create_prompt(self, json_row):
        prompt = f"{json_row['input']}\n\n### Response:"
        print(prompt)
        return prompt

    async def generate_inference(self, session, prompt):
        # Todo Replace the URL with your actual inference service URL
        url = "https://example.com/generate"
        data = {'prompt': prompt, 'n': 1, 'temperature': 0}
        response_text = None

        async with session.post(url, data=data) as response:
            if response.status == 200:
                response_text = await response.text()
                print(response_text)
            else:
                print(f"Request failed with status code {response.status}")
        return response_text

async def main():
    get_inference = GetInference()
    await get_inference.perform()

if __name__ == "__main__":
    asyncio.run(main())
