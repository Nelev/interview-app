import { create } from "zustand";
import { combine } from "zustand/middleware";
import type {
	AnswerResponse,
	ChatMessage,
	Question,
	Settings,
} from "@/model/model";

/**
 * Holds the settled result of a question generation, the transcript, and the
 * generation settings.
 *
 * Request status (pending / error) deliberately stays in react-query, which
 * owns the lifecycle of an in-flight call. This store owns only the data that
 * has to outlive it, so there is one source of truth for what is on screen.
 *
 * Living outside the React tree also means the questions survive the sidebar
 * unmounting - which happens for real below 768px, where the sidebar collapses
 * into a Sheet and takes the settings with it.
 *
 * Draft text is deliberately NOT here. The composer's draft and each card's
 * draft answer stay local until sent, so typing never writes to a global store
 * and one keystroke cannot re-render the transcript.
 */
const initialSettings: Settings = {
	model: "openai/gpt-4o-mini",
	difficulty: "easy",
	temperature: 0.7,
	topP: 1,
	frequencyPenalty: 0.2,
	presencePenalty: 0.2,
};

const emptyState = {
	role: "",
	questions: [] as Question[],
	/** Committed answers, keyed by Question.id. */
	answers: {} as Record<number, string>,
	/** Evaluations returned by the API, keyed by Question.id. */
	evaluations: {} as Record<number, AnswerResponse>,
	cost: 0 as number,
	/** The conversation, oldest first. */
	messages: [] as ChatMessage[],
};

const useQuestionsStore = create(
	combine({ ...emptyState, settings: initialSettings }, (set) => ({
		// Answers are cleared alongside the questions: ids are only unique
		// within one generation, so keeping them would attach the previous
		// role's answers to entirely different questions.
		setQuestions: (role: string, questions: Question[]) =>
			set({ role, questions, answers: {}, evaluations: {} }),
		// Editing an answer invalidates its evaluation: a rating for text the
		// user has since changed is worse than no rating, because it looks
		// current.
		setAnswer: (id: number, answer: string) =>
			set((state) => {
				const { [id]: _stale, ...evaluations } = state.evaluations;
				return { answers: { ...state.answers, [id]: answer }, evaluations };
			}),
		setEvaluations: (results: AnswerResponse[]) =>
			set({
				evaluations: Object.fromEntries(
					results.map((result) => [result.id, result]),
				),
			}),
		// Accumulates rather than replaces: the sidebar reports the cost of
		// the whole session, not of the last call. An unreported cost is
		// skipped outright - the call still happened, so the total is a
		// lower bound rather than a wrong number.
		setCost: (callCost: number | null) =>
			set((state) =>
				callCost === null ? state : { cost: state.cost + callCost },
			),
		appendMessage: (message: ChatMessage) =>
			set((state) => ({ messages: [...state.messages, message] })),
		// One dial at a time, keyed and typed together, so a slider cannot
		// write a string into temperature.
		setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) =>
			set((state) => ({ settings: { ...state.settings, [key]: value } })),
		// Settings are not reset: they are the user's preferences, not part of
		// the conversation.
		clear: () => set({ ...emptyState }),
	})),
);

/** Reset helper for tests - a module singleton persists between them. */
const resetQuestionsStore = () =>
	useQuestionsStore.setState({ ...emptyState, settings: initialSettings });

export { resetQuestionsStore, useQuestionsStore };
