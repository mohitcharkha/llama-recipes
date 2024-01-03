import json
import time
import asyncio
import argparse
import csv
from vllm import LLM, SamplingParams

class GetInference:
    def __init__(self, json_file_path, model_dir, temperature, top_p):
        self.json_data = None
        self.json_file_path = json_file_path
        self.model_dir = model_dir
        self.sampling_params = SamplingParams(temperature=temperature, top_p=top_p)

    async def perform(self):
        await self.read_json_file()
        await self.create_prompt_and_generate_inference()

    async def read_json_file(self):
        try:
            with open(self.json_file_path, 'r', encoding='utf-8') as file:
                data = file.read()
                self.json_data = json.loads(data)

        except Exception as error:
            print("Error:", error)

    async def create_prompt_and_generate_inference(self):
        results = []
        match_stats = {}
        not_match_stats = {}    
        llm = LLM(model=self.model_dir)
        inference_start = time.perf_counter()
        for json_row in self.json_data:
            start = time.perf_counter()
            prompt = self.create_prompt(json_row)
            output = llm.generate(prompt, self.sampling_params)
            generated_output = output[0].outputs[0].text
            e2e_inference_time = (time.perf_counter() - start) * 1000
            input_prompt = json_row["input"]
            actual_output = json_row["actionTypesInJsonSummary"]
            expected_output = json_row["output"]
            transaction_hash = json_row["transactionHash"]
            highlighted_event_text = json_row["highlightedEventText"]
            print(f"({e2e_inference_time} ms) {transaction_hash} expected_response:{expected_output} generated_output:{generated_output} {expected_output == generated_output}")
            results.append([transaction_hash, input_prompt, actual_output, expected_output, generated_output, highlighted_event_text])
            if expected_output == generated_output:
                match_stats[expected_output] = match_stats.get(expected_output, 0) + 1
            else:
                print("==============Not Matched =======================")
                not_match_stats[expected_output] = not_match_stats.get(expected_output, 0) + 1

            print(f"match_stats: {match_stats}\n\n")
            print(f"not_match_stats: {not_match_stats}\n\n")
        print("========================Script Complete Result====================== \n\n")
        await self.write_results_to_csv(results) 
        overall_match_total = sum(match_stats.values())
        overall_not_match_total = sum(not_match_stats.values())

        for expected_output, match_count in match_stats.items():
            not_match_count = not_match_stats.get(expected_output, 0)
            match_percent = (match_count / (match_count + not_match_count)) * 100
            print(f"Match Percentage for '{expected_output}': {match_percent:.2f}%")

        overall_match_percent = (overall_match_total / (overall_match_total + overall_not_match_total)) * 100

        print(f"Overall Match Percentage: {overall_match_percent:.2f}%")
        inference_time = (time.perf_counter() - inference_start)
        print(f"time required: {inference_time}s\n")
    
    async def write_results_to_csv(self, results):
        with open("evaluation_result.csv", "w", newline="") as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(["Transaction Hash", "Input Prompt", "Actual Output", "Expected Output", "Generated Output", "Highlighted Text"])

            for result in results:
                writer.writerow(result)

    def create_prompt(self, json_row):
        prompt = f"### Instruction:\n{json_row['instruction']}\n\n### Input:\n{json_row['input']}\n\n### Response:"
        return prompt

async def main(args):
    get_inference = GetInference(args.json_file, args.model_dir, args.temperature, args.top_p)
    await get_inference.perform()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inference from JSON data using a language model")
    parser.add_argument("--json_file", type=str, help="Path to the JSON file containing data")
    parser.add_argument("--model_dir", type=str, help="Path to the model directory")
    parser.add_argument("--temperature", type=float, default=0.8, help="Temperature parameter for text generation")
    parser.add_argument("--top_p", type=float, default=0.95, help="Top-p parameter for text generation")

    args = parser.parse_args()
    asyncio.run(main(args))
