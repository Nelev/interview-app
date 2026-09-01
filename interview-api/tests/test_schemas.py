"""Invariants the output schemas must satisfy to be usable at all.

These are the highest-value tests in the suite because the constraint is
invisible from reading the models. Strict structured outputs require every
property to appear in "required" and reject the "default" keyword; in pydantic,
giving a field a default is exactly what makes it optional. Re-adding one
produces a 400 from the provider at request time and nothing else catches it.
"""

import pytest

from schema.schemas import Answers, Questions


def objects(node, path):
    """Every object node in a JSON schema, with a readable path."""
    if "properties" in node:
        yield path, node
    for name, child in (node.get("properties") or {}).items():
        if isinstance(child, dict):
            yield from objects(child, f"{path}.{name}")
    for name, child in (node.get("$defs") or {}).items():
        if isinstance(child, dict):
            yield from objects(child, name)
    items = node.get("items")
    if isinstance(items, dict):
        yield from objects(items, f"{path}[]")


SCHEMAS = [pytest.param(Questions, id="Questions"), pytest.param(Answers, id="Answers")]


@pytest.mark.parametrize("model", SCHEMAS)
def test_every_property_is_required(model):
    for path, node in objects(model.model_json_schema(), model.__name__):
        optional = set(node["properties"]) - set(node.get("required", []))
        assert not optional, f"{path} has optional properties: {sorted(optional)}"


@pytest.mark.parametrize("model", SCHEMAS)
def test_additional_properties_are_forbidden(model):
    for path, node in objects(model.model_json_schema(), model.__name__):
        assert node.get("additionalProperties") is False, (
            f"{path} must set additionalProperties to false"
        )


@pytest.mark.parametrize("model", SCHEMAS)
def test_no_property_carries_a_default(model):
    for path, node in objects(model.model_json_schema(), model.__name__):
        for name, spec in node["properties"].items():
            assert "default" not in spec, (
                f"{path}.{name} has a default, which strict mode rejects"
            )


class TestAnswerBounds:
    def test_rating_is_one_to_five(self):
        rating = Answers.model_json_schema()["$defs"]["Answer"]["properties"]["rating"]
        # The prompt specifies a 1-5 scale; 0 was an unreachable sentinel.
        assert (rating["minimum"], rating["maximum"]) == (1, 5)

    @pytest.mark.parametrize("rating", [0, 6])
    def test_a_rating_outside_the_scale_is_rejected(self, rating):
        with pytest.raises(Exception):
            Answers.model_validate(
                {"answers": [{"id": 1, "rating": rating, "suggested_improvements": "x"}]}
            )

    def test_the_answer_text_is_not_echoed_back(self):
        # The client holds it keyed by id; returning it spends output tokens on
        # data the caller sent.
        properties = Answers.model_json_schema()["$defs"]["Answer"]["properties"]
        assert "answer" not in properties


class TestQuestionsAcceptsRejection:
    def test_an_empty_list_is_valid(self):
        # This is how the prompt reports input that is not a job role - the
        # schema has no field for an error message.
        assert Questions.model_validate({"questions": []}).questions == []
