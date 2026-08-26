const postInterview = async (role: string) => {
	const response = await fetch("http://localhost:8000/interview", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ role }),
	});

	if (!response.ok) {
		throw new Error("Failed to post interview");
	}
	return response.json();
};

export { postInterview };
