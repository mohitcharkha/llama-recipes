# Installing the dependencies

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

# Install wanDB

pip install wandb

## clone the llama-recipes repo in workspace directory

cd /workspace && git clone https://github.com/facebookresearch/llama-recipes.git

## Navigate to the llma_recipes repo

cd /usr/local/lib/python3.10/dist-packages/llama_recipes

## Replace the the following files to integrate wanDB in above package path

```
src/llama_recipes/finetuning.py with wanDb/finetuning.py
```

```
src/llama_recipes/utils/train_utils.py with wanDb/train_utils.py
```

For more details, see wanDB usage in [wanDb](wanDb) folder

## Finetuning the model

please refer [LLAMA2_FINE_TUNING.md](LLAMA2_FINE_TUNING.md) for details and enter WanDB Api secret key after running the finetuning command
