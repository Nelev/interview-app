import { Button } from "@/components/ui/button";
import { postInterview } from "./api/assistant.ts";

function App() {
	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const data = await postInterview("softaware engineer");
			console.log(data);
		} catch (error) {
			console.error("Error submitting interview:", error);
		}
	};
	return (
		<form onSubmit={handleSubmit}>
			<Button type="submit">Submit</Button>
		</form>
	);
}

export default App;
