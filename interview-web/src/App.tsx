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
			<button type="submit">Submit</button>
		</form>
	);
}

export default App;
