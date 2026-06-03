import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import HomePage     from "./pages/HomePage";
import DetectPage   from "./pages/DetectPage";
import TrainPage    from "./pages/TrainPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import HistoryPage  from "./pages/HistoryPage";
import UploadPage   from "./pages/UploadPage";
import LiveNewsPage from "./pages/LiveNewsPage";
import { ThemeProvider } from "./ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex min-h-screen bg-slate-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/"           element={<HomePage />}      />
              <Route path="/detect"     element={<DetectPage />}    />
              <Route path="/train"      element={<TrainPage />}     />
              <Route path="/analytics"  element={<AnalyticsPage />} />
              <Route path="/history"    element={<HistoryPage />}   />
              <Route path="/upload"     element={<UploadPage />}    />
              <Route path="/live-news"  element={<LiveNewsPage />}  />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}
