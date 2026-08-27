import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { postInterview } from "../api/assistant.ts";
import { Slider } from "./ui/slider";

const GenerateQuestionsForm = () => {
	const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const fd = new FormData(event.currentTarget);
			const jobTitle = fd.get("jobTitle") as string;
			const data = await postInterview(jobTitle);
			const questions = JSON.parse(data.response);
			const questionsArray: string[] = Object.values(questions);
			// setInterviewQuestions(questionsArray);
		} catch (error) {
			console.error("Error submitting interview:", error);
		}
	};
	return (
		<form onSubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel>Job Title</FieldLabel>
					<Input name="jobTitle" required />
					<FieldDescription>
						Enter your job title to generate common interview questions.
					</FieldDescription>
				</Field>
				<Field>
					<FieldLabel>Temperature</FieldLabel>
					<Slider name="temperature" min={0} max={1} step={0.1} defaultValue={[0.5]} />
				</Field>
				<Field>
					<FieldLabel>Top p</FieldLabel>
					<Slider name="topP" min={0} max={1} step={0.1} defaultValue={[0.9]} />
				</Field>
				<Field>
					<FieldLabel>Frequency Penalty</FieldLabel>
					<Slider name="frequencyPenalty" min={0} max={1} step={0.1} defaultValue={[0.5]} />
				</Field>
				<Field>
					<FieldLabel>Presence Penalty</FieldLabel>
					<Slider name="presencePenalty" min={0} max={1} step={0.1} defaultValue={[0.5]} />
				</Field>
				<Field>
					<Button type="submit">Ask</Button>
				</Field>
			</FieldGroup>
		</form>
	);
};

export default GenerateQuestionsForm;
