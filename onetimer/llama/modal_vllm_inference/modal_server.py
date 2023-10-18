from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from modal import Image, Secret, Stub, web_endpoint, method

import os

# Inference code

MODEL_DIR = "/model"


# ## Define a container image
def download_model_to_folder():
    from huggingface_hub import snapshot_download

    os.makedirs(MODEL_DIR, exist_ok=True)

    snapshot_download(
        "shraddha18/denver_model",
        local_dir=MODEL_DIR,
        token=os.environ["HUGGINGFACE_TOKEN"],
    )

# ### Image definition
image = (
    Image.from_registry("nvcr.io/nvidia/pytorch:22.12-py3")
    .pip_install(
        "torch==2.0.1+cu118", index_url="https://download.pytorch.org/whl/cu118"
    )
    # Pinned to 10/10/2023.
    .pip_install(
        # TODO: Point back upstream once
        # https://github.com/vllm-project/vllm/pull/1239 is merged. We need it
        # when installing from a SHA directly. We also need to install from a
        # SHA directly to pick up https://github.com/vllm-project/vllm/pull/1290,
        # which locks torch==2.0.1 (torch==2.1.0 is built using CUDA 12.1).
        "vllm @ git+https://github.com/modal-labs/vllm.git@eed12117603bcece41d7ac0f10bcf7ece0fde2fc",
        "typing-extensions==4.5.0",  # >=4.6 causes typing issues
    )
    # Use the barebones hf-transfer package for maximum download speeds. No progress bar, but expect 700MB/s.
    .pip_install("hf-transfer~=0.1")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
    .run_function(
        download_model_to_folder,
        secret=Secret.from_name("my-huggingface-secret"),
        timeout=60 * 20,
    )
)

stub = Stub("model-denver-vllm-inference", image=image)

# ## The model class
@stub.cls(gpu="A100", secret=Secret.from_name("my-huggingface-secret"))
class Model:
    def __enter__(self):
        from vllm import LLM

        # Load the model. Tip: MPT models may require `trust_remote_code=true`.
        self.llm = LLM(MODEL_DIR)

    @method()
    def generate(self, user_questions):
        from vllm import SamplingParams

        systemPrompt = "You are an expert in Ethereum blockchain. Summarize the transaction below into a one line summary."
        prompts = []

        for q in user_questions:
            prompt = f"### Instruction:\n{systemPrompt}\n\n### Input:\n{q}\n\n### Response:"
            prompts.append(prompt)

        
        sampling_params = SamplingParams(
            temperature=0.75,
            top_p=1,
            max_tokens=800,
            presence_penalty=1.15,
            n=1,
        )
        
        result = self.llm.generate(prompts, sampling_params)
        num_tokens = 0
        for output in result:
            num_tokens += len(output.outputs[0].token_ids)
            print(output.prompt, output.outputs[0].text, "\n\n", sep="")
        print(f"Generated {num_tokens} tokens")

        return output.outputs[0].text

 # API code

auth_scheme = HTTPBearer()

class Request(BaseModel):
    prompt: str
    temperature: int = 0



# ### Inference function
@stub.function()
async def infer(request: Request):
    model = Model()
    questions = [
    request.prompt
]
    return model.generate.remote(questions)




@stub.function(secret=Secret.from_name("my-web-auth-token"))
@web_endpoint(method="POST")
async def f(request: Request, token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    
    # Authenticate
    import os

    if token.credentials != os.environ["AUTH_TOKEN"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Function body
    return infer.remote(request)