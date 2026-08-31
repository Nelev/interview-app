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

/** Mirrors InterviewRequest on the API: camelCase here, snake_case there, with
 *  the server's alias generator translating at the boundary. The numeric fields
 *  are numbers because the DTO declares them float - sending strings worked only
 *  because pydantic coerces them. */
export type InterviewParameters = {
	role: string;
	temperature: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
};

const postInterview = async (
	parameters: InterviewParameters,
): Promise<string[]> => {
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
