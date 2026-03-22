import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./screens/Auth";
import Chat from "./screens/Chat";
import Dashboard from "./screens/Dashboard";
import Logger from "./screens/Logger";
import Leaderboard from "./screens/Leaderboard";
import Badges from "./screens/Badges";
import Analytics from "./screens/Analytics";
import Profile from "./screens/Profile";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/log" element={<Logger />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/badges" element={<Badges />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
