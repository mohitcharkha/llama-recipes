## vLLm Inference Steps

# POD configurations

24GB single GPU.
100 GB capacity.
Community Spot Instance.

When starting a pod, enable `8000` and `80` ports.

# Installing the dependencies

pip install --extra-index-url https://download.pytorch.org/whl/test/cu118 llama-recipes

# Installing vLLm package

pip install vllm

# Login to HuggingFace

huggingface-cli login

// enter login token

# Make sure you have git-lfs installed (https://git-lfs.com) for downloading the model

curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt-get install git-lfs
cd /workspace && git clone https://huggingface.co/shraddha18/Lama2-7b-chat-hf-oslo-merged-model

# Starting API server

python -m vllm.entrypoints.api_server --host 0.0.0.0 --port 8000 --model /workspace/Lama2-7b-chat-hf-oslo-merged-model

# Run the following command to get inference output

```
curl https://{runpod-id}-8000.proxy.runpod.net/generate \
-d '{
"prompt": "token_transfers: \"token_transfer from NA to NA for value 1369943.2\", event_logs: \"0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE emitted 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\", from: 0x764735E89a15EE53aA9C353f042e1CB637Aa4AC6 to: 0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE value: 0 method: transfer types: \"contract_call,token_transfer\" d_method_name: transfer d_method_id: a9059cbb\n\n### Response:",
"n": 1,
"temperature": 0
}'
```
