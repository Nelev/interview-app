import { useMutationState } from "@tanstack/react-query";
import { INTERVIEW_MUTATION_KEY } from "./components/GenerateQuestionsForm.tsx";
import BaseLayout from "./pages/BaseLayout.tsx";

function App() {
	// The form lives inside the sidebar, so read its result straight from the
	// mutation cache instead of threading a callback down through BaseLayout.
	const results = useMutationState<string[]>({
		filters: { mutationKey: INTERVIEW_MUTATION_KEY, status: "success" },
		select: (mutation) => mutation.state.data as string[],
	});
	const interviewQuestions = results.at(-1) ?? [];

	return (
		<BaseLayout>
			{interviewQuestions.length > 0 && (
				<div>
					<h2>Interview Questions:</h2>
					<ul>
						{interviewQuestions.map((question) => (
							<li key={question}>{question}</li>
						))}
					</ul>
				</div>
			)}
		</BaseLayout>
	);
}

export default App;
