import Composer from "./components/Composer.tsx";
import MessageList from "./components/MessageList.tsx";
import BaseLayout from "./pages/BaseLayout.tsx";

/**
 * The chat shell: a scrolling transcript with the composer pinned beneath it.
 *
 * min-h-0 on the scrolling region is what makes that work. A flex child's
 * default min-height is auto, so without it the transcript grows to fit its
 * content, pushes the form down and takes the composer off screen.
 *
 * The request states live in the transcript rather than here - a pending call
 * is a placeholder message, an error is a message, and an unrecognised role is
 * a message. Replacing the whole pane would hide the history the user is
 * reading.
 */
function App() {
	return (
		<BaseLayout>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<MessageList />
			</div>
			<Composer />
		</BaseLayout>
	);
}

export default App;
