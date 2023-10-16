huggingface-cli login

huggingface-cli repo create your-model-name

git clone https://huggingface.co/<your-username>/<your-model-name>
cd <your-model-name>

git lfs install
huggingface-cli lfs-enable-largefiles .

# Create any files you like! Then...

git config --global user.email "you@example.com"

git config --global user.name "Your Name"

git add .

git commit -m "First model version" # You can choose any descriptive message

git push
