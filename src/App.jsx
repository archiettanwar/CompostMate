import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Chat from './screens/Chat.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
