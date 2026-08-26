import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postInterview } from "./api/assistant.ts";
import BaseLayout from "./pages/BaseLayout.tsx";

function App() {
	const [jobTitle, setJobTitle] = React.useState<string>("");
	const [interviewQuestions, setInterviewQuestions] = React.useState<string[]>(
		[],
	);

	const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const data = await postInterview(jobTitle);
			const questions = JSON.parse(data.response);
			const questionsArray: string[] = Object.values(questions);
			setInterviewQuestions(questionsArray);
		} catch (error) {
			console.error("Error submitting interview:", error);
		}
	};
	console.log("interviewQuestions", interviewQuestions);
	return (
		<BaseLayout>
			<form onSubmit={handleSubmit}>
				<Input
					placeholder="Enter your job title"
					value={jobTitle}
					onChange={(e) => setJobTitle(e.target.value)}
				/>
				<Button type="submit">Submit</Button>
			</form>
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
