pip install --extra-index-url https://download.pytorch.org/whl/test/cu118 llama-recipes

curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
apt-get install git-lfs
cd /workspace && git clone https://huggingface.co/codellama/CodeLlama-7b-Instruct-hf

apt update
apt install vim

cd /usr/local/lib/python3.10/dist-packages/llama_recipes
vim utils/dataset_utils.py
// change max_words count to 3000

cd /usr/local/lib/python3.10/dist-packages/llama_recipes
vim finetuning.py
// Replace `LLamaTokenizer` with `CodeLlamaTokenizer`

cd /workspace && git clone https://github.com/modal-labs/llama-recipes.git

Training dataset can be uploaded manually via jupiter notebook in the llma-recipes repo present at workspace in following location src/llama_recipes/datasets/alpaca_data.json

cd /workspace/llama_recipes

nohup python -m llama_recipes.finetuning --num_epochs 1 --use_peft --peft_method lora --quantization --dataset alpaca_dataset --model_name /workspace/CodeLlama-7b-Instruct-hf --output_dir /workspace/CodeLlama-7b-Instruct-hf-llama-trained &
