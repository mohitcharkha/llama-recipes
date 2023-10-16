## Installing the LLAMA Recipes for merging LLAMA-2-7B Model (https://github.com/facebookresearch/llama-recipes#quick-start)

To begin using the LLAMA Recipes for merging the LLAMA-2-7B model, follow these steps:

pip install --extra-index-url https://download.pytorch.org/whl/test/cu118 llama-recipes

## Make sure you have git-lfs installed (https://git-lfs.com)

curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt-get install git-lfs
git clone https://huggingface.co/meta-llama/Llama-2-7b-chat-hf

# HuggingFace credentials

Enter your username and credentials of hugging face
username: xyz
password: xyz

# Install Vim for editing the files

apt update
apt install vim

## clone the llama-recipes repo in workspace directory

cd /workspace && git clone https://github.com/facebookresearch/llama-recipes.git

## Upload the LORA model

LORA can be uploaded manually via jupiter notebook at workspace in following location /workspace/oslo

## Command to merge the LORA model to the base model

cd /workspace/llama-recipes
python examples/hf_text_generation_inference/merge_lora_weights.py --base_model /workspace/Llama-2-7b-chat-hf --peft_model /workspace/oslo --output_dir /workspace/merged_model_output

## Running inference with merged model

python examples/inference.py --model_name /workspace/merged_model_output --prompt_file examples/llma_inference_data.json --quantization --max_new_tokens 50 --do_sample False
