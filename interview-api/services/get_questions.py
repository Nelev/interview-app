import os

from const import OPENAI_BASE_URL
from dotenv import load_dotenv
from openai import OpenAI
from prompts.questions_system_prompt import QUESTIONS_SYSTEM_PROMPT
from schema.schemas import Questions
from services.utils import set_open_params

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url=OPENAI_BASE_URL,
    api_key=OPENROUTER_API_KEY,
)

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
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "questions_response",
                "strict": True,
                "schema": Questions.model_json_schema(),
            },
        },
    )
    return response


def get_questions(
    job_description: str,
    model: str,
    difficulty: str,
    temperature: float,
    top_p: float,
    frequency_penalty: float,
    presence_penalty: float,
) -> tuple[Questions, float | None]:

    params = set_open_params(
        model=model,
        temperature=temperature,
        top_p=top_p,
        frequency_penalty=frequency_penalty,
        presence_penalty=presence_penalty
    )

    # The description goes last and is fenced. Instructions before untrusted
    # data is the ordering that holds up best against text in the description
    # trying to redirect the model, and the markers give the prompt something
    # to point at when it says which part is data.
    user_message = (
        f"difficulty: {difficulty}\n"
        f"---\n"
        f"{job_description}\n"
        f"---"
    )

    messages = [
        {"role": "system", "content": QUESTIONS_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    response = get_completion(params, messages)
    # cost is an OpenRouter addition rather than an SDK field - it survives
    # only because the SDK allows extra keys - so a provider that omits it
    # would raise AttributeError on a call that already succeeded and was
    # billed. None means unmeasured, which is not the same as zero.
    call_cost = getattr(response.usage, "cost", None)
    questions = Questions.model_validate_json(
        response.choices[0].message.content
    )
    return questions, call_cost
