import React from "react";
import BaseLayout from "./pages/BaseLayout.tsx";

function App() {
	const [interviewQuestions, setInterviewQuestions] = React.useState<string[]>(
		[],
	);
	return (
		<BaseLayout>
			{interviewQuestions.length > 0 && (
				<div>
					<h2>Interview Questions:</h2>
					<ul>
						{interviewQuestions.map((question, index) => (
							<li key={index}>{question}</li>
						))}
					</ul>
				</div>
			)}
		</BaseLayout>
	);
}

export default App;
