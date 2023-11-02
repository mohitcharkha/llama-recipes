# Copyright (c) Meta Platforms, Inc. and affiliates.
# This software may be used and distributed according to the terms of the Llama 2 Community License Agreement.

# from accelerate import init_empty_weights, load_checkpoint_and_dispatch

import fire
import json
import time

import torch
from transformers import LlamaTokenizer
from llama_recipes.inference.model_utils import load_model, load_peft_model

PROMPT_DICT = {
    "prompt_input": (
        "Below is an instruction that describes a task, paired with an input that provides further context. "
        "Write a response that appropriately completes the request.\n\n"
        "### Instruction:\n{instruction}\n\n### Input:\n{input}\n\n### Response:"
    ),
    "prompt_no_input": (
        "Below is an instruction that describes a task. "
        "Write a response that appropriately completes the request.\n\n"
        "### Instruction:\n{instruction}\n\n### Response:"
    ),
}

def main(
    model_name,
    peft_model: str=None,
    quantization: bool=False,
    max_new_tokens =100, #The maximum numbers of tokens to generate
    prompt_file: str=None,
    seed: int=42, #seed value for reproducibility
    do_sample: bool=True, #Whether or not to use sampling ; use greedy decoding otherwise.
    min_length: int=None, #The minimum length of the sequence to be generated, input prompt + min_new_tokens
    use_cache: bool=True,  #[optional] Whether or not the model should use the past last key/values attentions Whether or not the model should use the past last key/values attentions (if applicable to the model) to speed up decoding.
    top_p: float=1.0, # [optional] If set to float < 1, only the smallest set of most probable tokens with probabilities that add up to top_p or higher are kept for generation.
    temperature: float=1.0, # [optional] The value used to modulate the next token probabilities.
    top_k: int=50, # [optional] The number of highest probability vocabulary tokens to keep for top-k-filtering.
    repetition_penalty: float=1.0, #The parameter for repetition penalty. 1.0 means no penalty.
    length_penalty: int=1, #[optional] Exponential penalty to the length that is used with beam-based generation. 
    max_padding_length: int=None, # the max padding length to be used with tokenizer padding the prompts.
    use_fast_kernels: bool = False, # Enable using SDPA from PyTroch Accelerated Transformers, make use Flash Attention and Xformer memory-efficient kernels
    **kwargs
):
    data_prompts = json.load(open(prompt_file))

    # Set the seeds for reproducibility
    torch.cuda.manual_seed(seed)
    torch.manual_seed(seed)
    
    model = load_model(model_name, quantization)
    if peft_model:
        model = load_peft_model(model, peft_model)

    model.eval()
    
    if use_fast_kernels:
        """
        Setting 'use_fast_kernels' will enable
        using of Flash Attention or Xformer memory-efficient kernels 
        based on the hardware being used. This would speed up inference when used for batched inputs.
        """
        try:
            from optimum.bettertransformer import BetterTransformer
            model = BetterTransformer.transform(model)    
        except ImportError:
            print("Module 'optimum' not found. Please install 'optimum' it before proceeding.")

    tokenizer = LlamaTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token
    
    results = []
    stat_result = {"match": {}, "not_match": {}}
    max,min,total = 0,100000,0
    for data_prompt in data_prompts:
        user_prompt=PROMPT_DICT["prompt_input"].format_map(data_prompt)
        batch = tokenizer(user_prompt, return_tensors="pt")
        batch = {k: v.to("cuda") for k, v in batch.items()}

        start = time.perf_counter()
        with torch.no_grad():
            outputs = model.generate(
                **batch,
                max_new_tokens=max_new_tokens,
                do_sample=do_sample,
                top_p=top_p,
                temperature=temperature,
                min_length=min_length,
                use_cache=use_cache,
                top_k=top_k,
                repetition_penalty=repetition_penalty,
                length_penalty=length_penalty,
                **kwargs 
            )
        e2e_inference_time = (time.perf_counter()-start)*1000
        output_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        transaction_hash = data_prompt["transactionHash"]
        expected_output = data_prompt["output"]
        model_classification_response = output_text.split("### Response:")[1].strip()
        results.append([transaction_hash,expected_output, model_classification_response])
        print(f"({e2e_inference_time} ms) {transaction_hash} expected_response:{expected_output} model_classification_response:{model_classification_response}")
        if e2e_inference_time > max:
            max = e2e_inference_time
        elif e2e_inference_time < min:
            min = e2e_inference_time
        total += e2e_inference_time
        if expected_output == model_classification_response:
            stat_result["match"][expected_output] = stat_result["match"].get(expected_output, 0) + 1
        else:
            print(f"==============Not Matched =======================")
            stat_result["not_match"][expected_output] = stat_result["not_match"].get(expected_output, 0) + 1    
        print(f"stat_result: {stat_result}\n\n")    
            
    print("========================Script Complete Result====================== \n\n")
    avg = total / len(data_prompts)
    print("max_time: ",{max},"s, min_time: ",{min},"s, avg_time:",{avg},"s, total_time: ",{total},"s")
    for result in results:    
        print(",".join(result)) 

    



if __name__ == "__main__":
    fire.Fire(main)