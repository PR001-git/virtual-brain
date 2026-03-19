import "./App.css";
import TranscriptContainer from "./components/containers/TranscriptContainer";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>VirtualBrain</h1>
        <p>Real-time cognitive layer for live conversations</p>
      </header>

      <main className="app-main">
        <TranscriptContainer />
      </main>
    </div>
  );
}

export default App;
