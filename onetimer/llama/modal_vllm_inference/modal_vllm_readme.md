## modal vLLm Inference Steps

# Steps

Signup on Modal.com
## Install Modal on your local computer

```
pip install modal
```

## Command to Run the code 

```
modal serve onetimer/llama/modal_vllm_inference/modal_server.py
```

## Command to Deploy

```
modal deploy onetimer/llama/modal_vllm_inference/modal_server.py
```

## Command to run inference script

```
python onetimer/llama/modal_vllm_inference/inference_script.py
```

# CURL request for to get inference output

Note: Please replace the <token> with secretes from Modal.com

```
curl --location 'https://adityarajsingh--model-vllm-inference-f.modal.run' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data '{
    "prompt": "token_transfers: \"token_transfer from NA to NA for value 321.949997044499021824\", event_logs: \"0x4d224452801ACEd8B2F0aebE155379bb5D594381 emitted 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\", from: 0x787B8840100d9BaAdD7463f4a73b5BA73B00C6cA to: 0x4d224452801ACEd8B2F0aebE155379bb5D594381 value: 0 method: transfer types: \"contract_call,token_transfer\" d_method_name: transfer d_method_id: a9059cbb"
}'
```
