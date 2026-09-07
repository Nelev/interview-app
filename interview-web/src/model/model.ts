export type Question = {
	id: number;
	question: string;
};

export type InterviewApiResponse = {
	response: { questions: Question[] };
	/** null when the provider did not report a cost. Not the same as zero. */
	cost: number | null;
};

/** The generation dials, owned by the store so the sidebar and the composer
 *  can be in different parts of the tree. */
export type Settings = {
	model: string;
	difficulty: string;
	temperature: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
};

/** One turn in the transcript. A discriminated union rather than a string,
 *  because an assistant turn can carry questions that render as cards. */
export type ChatMessage =
	| { id: string; role: "user"; kind: "text"; text: string }
	| { id: string; role: "assistant"; kind: "text"; text: string }
	| { id: string; role: "assistant"; kind: "questions"; questions: Question[] };

export type InterviewParameters = {
	role: string;
	temperature: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
	difficulty: string;
	model: string;
};

/** One evaluation returned by /answers. The answer text is not echoed back:
 *  the client already holds it keyed by id, so returning it would spend
 *  output tokens on data the caller sent. */
export type AnswerResponse = {
	id: number;
	rating: number;
	suggestedImprovements: string;
};
export type AnswersApiResponse = {
	response: { answers: AnswerResponse[] };
	/** null when the provider did not report a cost. Not the same as zero. */
	cost: number | null;
};

/** One answered question sent to /answers for evaluation. */
export type SubmittedAnswer = {
	id: number;
	question: string;
	answer: string;
};
