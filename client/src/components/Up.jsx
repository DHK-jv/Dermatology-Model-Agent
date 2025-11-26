import React, { useState, useEffect } from "react";
import { FiHeart, FiMessageSquare, FiShield } from "react-icons/fi";
import { useGlobalState } from "../context/Globalcontext";
import { useTranslation } from 'react-i18next';

const TypingEffect = ({ text, speed = 100, delay = 1000, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex(index + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      setTimeout(() => {
        setDisplayedText(text[0]);
        setIndex(1);
      }, delay);
    }
  }, [index, text, speed, delay, onComplete]);

  return (
    <span className={`lg:text-[.8em] max-sm:text-[.7em]`}>{displayedText}</span>
  );
};

const Up = () => {
  const { state } = useGlobalState();
  const [typingComplete, setTypingComplete] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="py-6 px-8 flex flex-col text-white mostleft rounded-lg mx-4 mb-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold font-serif mb-3 bg-gradient-to-r from-green-400 to-white text-transparent bg-clip-text">
          <TypingEffect
            text={t('ai_dermatology_assistant')}
            onComplete={() => setTypingComplete(true)}
          />
        </h1>
        {typingComplete && (
          <p className="text-white font-semibold text-lg max-w-2xl mx-auto">
            {t('get_instant_analysis')}
          </p>
        )}
      </div>

      <div className={`grid gap-4 mb-8 ${
        state.screenWidth <= 815 
          ? "grid-cols-1" 
          : state.screenWidth <= 1200 
            ? "grid-cols-2" 
            : "grid-cols-3"
      }`}>
        <div className="flex items-start space-x-4 text-white bg-white/10 p-4 backdrop-blur-sm rounded-xl border border-white/20">
          <FiShield className="mt-1 flex-shrink-0 text-green-300" size={24} />
          <div>
            <h3 className="font-bold text-lg mb-2">{t('privacy_first')}</h3>
            <p className="text-sm text-gray-100">{t('privacy_desc')}</p>
          </div>
        </div>

        <div className="flex items-start space-x-4 text-white bg-white/10 p-4 backdrop-blur-sm rounded-xl border border-white/20">
          <FiHeart className="mt-1 flex-shrink-0 text-red-300" size={24} />
          <div>
            <h3 className="font-bold text-lg mb-2">{t('expert_insights')}</h3>
            <p className="text-sm text-gray-100">{t('expert_desc')}</p>
          </div>
        </div>

        <div className={`flex items-start space-x-4 text-white bg-white/10 p-4 backdrop-blur-sm rounded-xl border border-white/20 ${
          state.screenWidth <= 1200 && state.screenWidth > 815 ? "col-span-2" : ""
        }`}>
          <FiMessageSquare className="mt-1 flex-shrink-0 text-blue-300" size={24} />
          <div>
            <h3 className="font-bold text-lg mb-2">{t('interactive_chat')}</h3>
            <p className="text-sm text-gray-100">{t('interactive_desc')}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-semibold shadow-lg">
          {t('powered_by_ai')}
        </div>
      </div>
    </div>
  );
};

export default Up;
