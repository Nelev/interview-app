"""Shared fixtures.

Three problems have to be solved before either endpoint can be exercised:

1. Both service modules construct the OpenAI client at import time, so importing
   main without credentials raises OpenAIError. The key is set here, before any
   test module imports main, because pytest loads conftest first. The real fix is
   constructing the client lazily; until then this is what makes the app
   importable.

2. Both routes are rate limited to 10/minute and TestClient presents a single
   client IP, so the eleventh request of the whole session would 429 - landing on
   whichever test happened to run then. The limiter is disabled for the suite and
   re-enabled only by the test that covers it.

3. Nothing may reach the paid API. get_questions and get_answers are replaced on
   the main module, not on the service modules, because that is where the
   handlers resolve the names from.
"""

import os

os.environ.setdefault("OPENROUTER_API_KEY", "test-key-never-used")

import pytest
from fastapi.testclient import TestClient

import main
from schema.schemas import Answers, Questions

VALID_ROLE = "Software Engineer"


def make_questions(count: int = 10) -> Questions:
    return Questions.model_validate(
        {
            "questions": [
                {"id": i, "question": f"Question {i}?"} for i in range(1, count + 1)
            ]
        }
    )


def make_answers(ids: list[int]) -> Answers:
    return Answers.model_validate(
        {
            "answers": [
                {
                    "id": i,
                    "rating": 4,
                    "suggested_improvements": f"Be specific about {i}.",
                }
                for i in ids
            ]
        }
    )


class ServiceSpy:
    """Records calls so tests can assert both what reached the service and, for
    every rejection path, that nothing did."""

    def __init__(self, result):
        self.calls: list[dict] = []
        self._result = result

    def __call__(self, *args, **kwargs):
        self.calls.append({"args": args, "kwargs": kwargs})
        return self._result

    @property
    def call_count(self) -> int:
        return len(self.calls)


@pytest.fixture(autouse=True)
def no_rate_limit():
    """The limiter is global state; restore it so the test that covers it is not
    affected by ordering."""
    previous = main.limiter.enabled
    main.limiter.enabled = False
    yield
    main.limiter.enabled = previous
    main.limiter.reset()


@pytest.fixture
def questions_spy(monkeypatch):
    spy = ServiceSpy(make_questions())
    monkeypatch.setattr(main, "get_questions", spy)
    return spy


@pytest.fixture
def answers_spy(monkeypatch):
    spy = ServiceSpy(make_answers([1]))
    monkeypatch.setattr(main, "get_answers", spy)
    return spy


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client


def answer(id: int = 1, text: str = "I profiled it with py-spy first.") -> dict:
    return {"id": id, "question": f"Question {id}?", "answer": text}
