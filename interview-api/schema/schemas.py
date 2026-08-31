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
