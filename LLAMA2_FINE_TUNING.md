# Installing the LLAMA Recipes for Fine-Tuning LLAMA-2-7B Model (https://github.com/facebookresearch/llama-recipes#quick-start)

To begin using the LLAMA Recipes for fine-tuning the LLAMA-2-7B model, follow these steps:

pip install --extra-index-url https://download.pytorch.org/whl/test/cu118 llama-recipes

# Make sure you have git-lfs installed (https://git-lfs.com)

curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt-get install git-lfs

# To Clone Llama 2 chat model

cd workspace && git clone https://huggingface.co/meta-llama/Llama-2-7b-chat-hf

# To Clone model from huggingface

cd workspace && git clone https://huggingface.co/<your-username>/<your-model-name>

# To clone CodeLLama Instruct Model

cd workspace && git clone https://huggingface.co/codellama/CodeLlama-7b-Instruct-hf

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

nohup python -m llama_recipes.finetuning --num_epochs 30 --use_peft --peft_method lora --quantization --dataset alpaca_dataset --save_model --model_name /workspace/Llama-2-7b-chat-hf --output_dir /workspace/Llama-2-7b-chat-hf-string-trained &

# For Code Llama training

nohup python -m llama_recipes.finetuning --num_epochs 1 --use_peft --peft_method lora --quantization --dataset alpaca_dataset --save_model --model_name /workspace/CodeLlama-7b-Instruct-hf --output_dir /workspace/CodeLlama-7b-Instruct-hf-trained &

torchrun --nnodes 1 --nproc_per_node 2 examples/finetuning.py --num_epochs 1 --enable_fsdp --use_peft --peft_method lora --dataset alpaca_dataset --save_model --model_name /workspace/CodeLlama-7b-Instruct-hf --pure_bf16 --output_dir /workspace/CodeLlama-7b-Instruct-hf-trained --use_fast_kernels

## Running fine tuning for multi-gpu

nohup torchrun --nnodes 1 --nproc_per_node 2 examples/finetuning.py --use_peft --peft_method lora --model_name /workspace/Llama-2-7b-chat-hf --pure_bf16 --output_dir /workspace/Llama-2-7b-chat-hf-trained &

## Running the inference

python examples/chat_completion/chat_completion.py --model_name /workspace/Llama-2-7b-chat-hf --peft_model /workspace/Llama-2-7b-chat-hf-trained --prompt_file examples/chat_completion/inferenceData.json --quantization --max_new_tokens 50 --use_fast_kernels True

## Running inference directly with inference file

python examples/inference.py --model_name /workspace/Llama-2-7b-chat-hf --peft_model /workspace/Llama-2-7b-chat-hf-trained --prompt_file examples/chat_completion/inference_data_2640_nontrained_final.json --quantization --max_new_tokens 250

python examples/inference.py --model_name /workspace/Llama-2-7b-chat-hf --peft_model /workspace/Llama-2-7b-chat-hf-json-trained --prompt_file examples/chat_completion/chats.json --quantization --max_new_tokens 500 --do_sample False

python examples/inference.py --model_name /workspace/Llama-2-7b-chat-hf --prompt_file examples/chat_completion/alpaca_data_300.json --quantization --max_new_tokens 50

====
You can set this in your main training script as follows:

```bash
os.environ['PYTORCH_CUDA_ALLOC_CONF']='expandable_segments:True'
```

=====
We also added this enviroment variable in `setup_environ_flags` of the [train_utils.py](../utils/train_utils.py), feel free to uncomment it if required.

====

the environment variable `TORCH_DISTRIBUTED_DEBUG` can be used to trigger additional useful logging and collective synchronization checks to ensure all ranks are synchronized appropriately. `TORCH_DISTRIBUTED_DEBUG` can be set to either OFF (default), INFO, or DETAIL depending on the debugging level required. Please note that the most verbose option, DETAIL may impact the application performance and thus should only be used when debugging issues.

====
