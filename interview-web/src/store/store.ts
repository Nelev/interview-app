import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { AnswerResponse, Question } from "@/model/model";

/**
 * Holds the settled result of a question generation.
 *
 * Request status (pending / error) deliberately stays in react-query, which
 * owns the lifecycle of an in-flight call. This store owns only the data that
 * has to outlive it, so there is one source of truth for what is on screen.
 *
 * Living outside the React tree also means the questions survive the sidebar
 * unmounting - which happens for real below 768px, where the sidebar collapses
 * into a Sheet and takes the form with it.
 *
 * Draft answers are deliberately NOT here. They stay local to each card until
 * submitted, so typing never writes to a global store and one card's keystrokes
 * cannot re-render the others. This holds committed answers only.
 */
const useQuestionsStore = create(
	combine(
		{
			role: "",
			questions: [] as Question[],
			/** Committed answers, keyed by Question.id. */
			answers: {} as Record<number, string>,
			/** Evaluations returned by the API, keyed by Question.id. */
			evaluations: {} as Record<number, AnswerResponse>,
		},
		(set) => ({
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
			clear: () =>
				set({ role: "", questions: [], answers: {}, evaluations: {} }),
		}),
	),
);

/** Reset helper for tests - a module singleton persists between them. */
const resetQuestionsStore = () =>
	useQuestionsStore.setState({
		role: "",
		questions: [],
		answers: {},
		evaluations: {},
	});

export { resetQuestionsStore, useQuestionsStore };
