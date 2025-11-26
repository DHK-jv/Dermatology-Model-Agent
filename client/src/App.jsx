import { useState, useEffect } from "react";
import './i18n';
import Header from "./components/Header";
import Chatbot from "./components/Chatbot";
import DiagnosisForm from "./components/DiagnosisForm";
import { v4 as uuidv4 } from "uuid";
import Up from "./components/Up.jsx";
import { Routes, Route } from "react-router-dom";
import DoctorDashboard from "./components/DoctorDashboard.jsx";
import { useGlobalState } from "./context/Globalcontext.jsx";

const Home = () => {
  const { state } = useGlobalState();
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    let storedSessionId = localStorage.getItem("session_id");
    if (!storedSessionId) {
      storedSessionId = uuidv4(); // Generate a new UUID
      localStorage.setItem("session_id", storedSessionId);
    }
    setSessionId(storedSessionId);
  }, []);

  return (
    <>
      <Header />
      <div
        className={`pt-20 bg-gradient-to-br from-blue-50 to-purple-100 min-h-screen ${
          state.screenWidth >= 1164 ? "grid grid-rows-[auto_1fr] gap-4" : "flex flex-col"
        }`}
      >
        {/* Phần giới thiệu - chỉ hiển thị một lần */}
        {state.screenWidth <= 1164 ? (
          <div className="w-full">
            <Up />
          </div>
        ) : (
          <div className="w-full px-4">
            <Up />
          </div>
        )}
        
        {/* Phần nội dung chính */}
        <div
          className={`mx-auto flex-1 grid gap-4 ${
            state.screenWidth <= 815 
              ? "grid-rows-2" 
              : "grid-cols-2"
          } ${state.screenWidth <= 1405 ? "w-[95%]" : "w-[80%]"} pb-4 overflow-hidden`}
        >
          <DiagnosisForm sessionId={sessionId} />
          <Chatbot sessionId={sessionId} />
        </div>
      </div>
    </>
  );
};

export default function App() {
  return (
    <Routes>
      <Route element={<Home />} path="/" exact />
      <Route element={<DoctorDashboard />} path="/DoctorDashboard" />
    </Routes>
  );
}
