import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # Load environment variables from .env file

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

def set_open_params(
    model="gpt-3.5-turbo",
    temperature=1,
    max_tokens=256,
    top_p=1,
    frequency_penalty=0,
    presence_penalty=0,
):
    """set openai parameters"""

    openai_params = {}

    openai_params["model"] = model
    openai_params["temperature"] = temperature
    openai_params["max_tokens"] = max_tokens
    openai_params["top_p"] = top_p
    openai_params["frequency_penalty"] = frequency_penalty
    openai_params["presence_penalty"] = presence_penalty
    return openai_params

def get_completion(params, messages):
    """GET completion from openai api"""
    response = client.chat.completions.create(
        model=params["model"],
        messages=messages,
        temperature=params["temperature"],
        max_tokens=params["max_tokens"],
        top_p=params["top_p"],
        frequency_penalty=params["frequency_penalty"],
        presence_penalty=params["presence_penalty"],
    )
    return response


def get_answers(question: str) -> str:

    params = set_open_params(temperature=0.7)
    prompt = """Answer the question based on the context below. Keep the answer short and concise. Respond "Unsure about answer" if not sure about the answer.
            Context: Teplizumab traces its roots to a New Jersey drug company called Ortho Pharmaceutical. There, scientists generated an early version of the antibody, dubbed OKT3. Originally sourced from mice, the molecule was able to bind to the surface of T cells and limit their cell-killing potential. In 1986, it was approved to help prevent organ rejection after kidney transplants, making it the first therapeutic antibody allowed for human use.
            Question: What was OKT3 originally sourced from?
            Answer:"""

    messages = [{"role": "user", "content": prompt}]

    response = get_completion(params, messages)
    return response.choices[0].message.content.strip()