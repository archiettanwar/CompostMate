import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Auth from "./screens/Auth";
import Chat from "./screens/Chat";
import Dashboard from "./screens/Dashboard";
import Logger from "./screens/Logger";
import Leaderboard from "./screens/Leaderboard";
import Badges from "./screens/Badges";
import Learn from "./screens/Learn";
import Tools from "./screens/Tools";
import MySociety from "./screens/MySociety";
import Analytics from "./screens/Analytics";
import Profile from "./screens/Profile";
import Tracker from "./screens/Tracker";
import JoinSociety from "./screens/JoinSociety";
import CreateSociety from "./screens/CreateSociety";
import AdminDashboard from "./screens/AdminDashboard";
import MyPerks from "./screens/MyPerks";
import './App.css'

import { NotificationProvider } from "./context/NotificationContext";

function App() {
  return (
    <Router>
      <NotificationProvider>
        <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/log" element={<Logger />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/badges" element={<Badges />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tracker" element={<Tracker />} />
        <Route path="/join-society" element={<JoinSociety />} />
        <Route path="/create-society" element={<CreateSociety />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/perks" element={<MyPerks />} />
        <Route path="/my-society" element={<MySociety />} />
      </Routes>
      </NotificationProvider>
    </Router>
  );
}

export default App;