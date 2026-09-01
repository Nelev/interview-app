from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class InterviewRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )

    role: str
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    temperature: float = Field(default=1.0, ge=0.0, le=2.0)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    question: str


class Questions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    questions: list[Question]

class AnswerRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )
    role: str
    answers: list[dict]

class Answer(BaseModel):
    # Strict structured outputs require every property to be listed in
    # "required" and reject the "default" keyword outright. In pydantic, giving
    # a field a default is what makes it optional in the generated schema, so
    # the defaults are omitted here rather than the constraints.
    #
    # The candidate's answer text is deliberately not echoed back: the client
    # already holds it keyed by id, and returning it would spend output tokens
    # on data the caller sent.
    model_config = ConfigDict(
            alias_generator=to_camel,
            populate_by_name=True,
            extra="forbid",
        )
    id: int
    rating: int = Field(ge=1, le=5)
    suggested_improvements: str

class Answers(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: list[Answer]
