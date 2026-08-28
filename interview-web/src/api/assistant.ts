const API_URL = "http://localhost:8000/interview";

type InterviewApiResponse = { response: string };

/**
 * The API hands back the model's raw text. It is meant to be JSON, but models
 * routinely wrap it in a markdown fence and may return either a keyed object
 * or a bare array, so normalise both here rather than in the component.
 */
const parseQuestions = (raw: string): string[] => {
	const cleaned = raw
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/, "");

	const parsed: unknown = JSON.parse(cleaned);
	const values = Array.isArray(parsed)
		? parsed
		: Object.values(parsed as Record<string, unknown>);

	return values.filter((value): value is string => typeof value === "string");
};

const postInterview = async (parameters: {
	role: string;
	temperature: string;
	topP: string;
	frequencyPenalty: string;
	presencePenalty: string;
}): Promise<string[]> => {
	const response = await fetch(API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ ...parameters }),
	});

	if (!response.ok) {
		throw new Error(`Failed to post interview (${response.status})`);
	}

	const data = (await response.json()) as InterviewApiResponse;
	return parseQuestions(data.response);
};

export { postInterview };
