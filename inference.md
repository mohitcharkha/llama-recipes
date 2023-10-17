# Installing the LLAMA Recipes for Fine-Tuning LLAMA-2-7B Model (https://github.com/facebookresearch/llama-recipes#quick-start)

To begin using the LLAMA Recipes for fine-tuning the LLAMA-2-7B model, follow these steps:

pip install --extra-index-url https://download.pytorch.org/whl/test/cu118 llama-recipes

# Make sure you have git-lfs installed (https://git-lfs.com)

curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt-get install git-lfs
cd /workspace && git clone https://huggingface.co/meta-llama/Llama-2-7b-chat-hf

# HuggingFace credentials

Enter your username and credentials of hugging face
username: xyz
password: xyz

# Install Vim for editing the files

apt update
apt install vim

## clone the llama-recipes repo in workspace directory

cd /workspace && git clone https://github.com/facebookresearch/llama-recipes.git

# Upload peft model patch and inference dataset

// Upload the fine tuned peft model patch at root level
// Upload the inference data set file inside the examples/chat_completion folder

# Update inference.py file.

Update the code in llama-recipes/examples/inference.py with the inference.py file in this folder

## Running inference

cd /workspace/llama_recipes

nohup python examples/inference.py --model_name /workspace/Llama-2-7b-chat-hf --peft_model /workspace/Llama-2-7b-chaf-hf-string-trained --prompt_file examples/chat_completion/inference_data_string_2900_new_nontrained_300_final.json --quantization --max_new_tokens 250 --do_sample False &

Without quantization:
python examples/inference.py --model_name /workspace/Llama-2-7b-chat-hf --peft_model /workspace/Llama-2-7b-chaf-hf-string-trained --prompt_file examples/chat_completion/inference_data_string_2900_new_trained_16.json --max_new_tokens 250 --do_sample False

For Multiline:
python examples/inference.py --model_name /workspace/Llama-2-7b-chat-hf --peft_model /workspace/Llama-2-7b-chaf-hf-string-trained --prompt_file examples/chat_completion/inference_data_string_multiline_new_nontrained_20.json --quantization --max_new_tokens 250 --do_sample False

// TODO: Remove the following lines before uploading this file
Tasks:
Start 24GB Gpu spot machine
To check command, Inference on inference_data_string_2900_trained_16.json file
Then Inference on inference_data_string_2900_nontrained_300.json file.
Download csv and update to outputs to remove amounts then compare.

For more, try inference on different models and other datasets.
