# Installing the LLAMA Recipes for Fine-Tuning LLAMA-2-7B Model (https://github.com/facebookresearch/llama-recipes#quick-start)

To begin using the LLAMA Recipes for fine-tuning the LLAMA-2-7B model, follow these steps:

pip install --extra-index-url https://download.pytorch.org/whl/test/cu118 llama-recipes

# Make sure you have git-lfs installed (https://git-lfs.com)
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

## Navigate to the llma_recipes repo
cd /usr/local/lib/python3.10/dist-packages/llama_recipes
## change the max_words count
// change max_words count to 1800 
vim utils/dataset_utils.py 

## clone the llama-recipes repo in workspace directory
cd /workspace && git clone https://github.com/facebookresearch/llama-recipes.git

## Upload Training dataset
Training dataset can be uploaded manually via jupiter notebook in the llma-recipes repo present at workspace in following location src/llama_recipes/datasets/alpaca_data.json

cd workspace/llama_recipes 

## Running the Fine Tunning Modal
python -m llama_recipes.finetuning --lr 1e-6 --use_peft --peft_method lora --quantization  --dataset alpaca_dataset --save_model --model_name /workspace/Llama-2-7b-chat-hf --output_dir /workspace/Llama-2-7b-chat-hf-trained

## Running the inference
python examples/chat_completion/chat_completion.py --model_name /workspace/Llama-2-7b-chat-hf --prompt_file examples/chat_completion/inference_data.json  --quantization 



