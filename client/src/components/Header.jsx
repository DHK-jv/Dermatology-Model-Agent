import React from "react";
import { Link } from "react-router-dom";
import { useGlobalState } from "../context/Globalcontext";
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { state } = useGlobalState();
  const { screenWidth } = state;
  const { t } = useTranslation();

  return (
    <nav className="w-full h-20 shadow-lg z-20 fixed top-0 bg-gradient-to-r from-blue-600 to-purple-600">
      <div
        className={`h-full flex items-center justify-between px-6 ${
          screenWidth <= 660 ? "w-full" : "w-[80%] mx-auto"
        }`}
      >
        <div className="flex items-center">
          <Link to="/" className="cursor-pointer">
            <span
              className={`font-semibold text-white transition-colors hover:text-blue-100 ${
                screenWidth <= 800 ? "text-lg" : "text-xl"
              }`}
            >
              {t('dermatology_assistant_title')}
            </span>
          </Link>
        </div>

        <div className="flex items-center">
          <Link
            to="/DoctorDashboard"
            className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors duration-200"
          >
            {t('doctor_dashboard')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
