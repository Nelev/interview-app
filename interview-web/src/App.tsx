import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postInterview } from "./api/assistant.ts";
import BaseLayout from "./pages/BaseLayout.tsx";

function App() {
	const [jobTitle, setJobTitle] = React.useState<string>("");

	const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const data = await postInterview(jobTitle);
			console.log(data);
		} catch (error) {
			console.error("Error submitting interview:", error);
		}
	};
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
		</BaseLayout>
	);
}

export default App;
