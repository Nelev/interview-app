import { create } from "zustand";
import { combine } from "zustand/middleware";
import type { Question } from "@/model/model";

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
 */
const useQuestionsStore = create(
	combine(
		{
			role: "",
			questions: [] as Question[],
		},
		(set) => ({
			setQuestions: (role: string, questions: Question[]) =>
				set({ role, questions }),
			clear: () => set({ role: "", questions: [] }),
		}),
	),
);

/** Reset helper for tests - a module singleton persists between them. */
const resetQuestionsStore = () =>
	useQuestionsStore.setState({ role: "", questions: [] });

export { resetQuestionsStore, useQuestionsStore };
