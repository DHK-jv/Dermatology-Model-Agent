import React, { useState, useEffect } from "react";
import { FiHeart, FiMessageSquare, FiShield } from "react-icons/fi";
import { azure, aifoundry } from "../assets";
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
    <div className="my-8 p-8 flex flex-col text-white mostleft">
      <div className="mt-0">
        <h1 className="text-[2.5em] font-extrabold font-[Times] mb-2 bg-gradient-to-r from-green-500 to-white w-max text-transparent bg-clip-text">
          <TypingEffect
            text={t('ai_dermatology_assistant')}
            onComplete={() => setTypingComplete(true)}
          />
        </h1>
        {typingComplete && (
          <p className="text-white font-extrabold text-[15px]">
            {t('get_instant_analysis')}
          </p>
        )}
      </div>

      <div className={`flex gap-3 ${state.screenWidth <= 815 && "flex-col"}`}>
        <div className="flex items-start space-x-4 text-white border-1 p-2 backdrop-blur-sm rounded-2xl">
          <FiShield className="mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-bold font-serif text-2xl">{t('privacy_first')}</h3>
            <p className="text-sm">{t('privacy_desc')}</p>
          </div>
        </div>

        <div className="flex items-start space-x-4 text-indigo-50 border-1 p-2 backdrop-blur-sm rounded-2xl">
          <FiHeart className="mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-bold font-serif text-2xl">{t('expert_insights')}</h3>
            <p className="text-sm">{t('expert_desc')}</p>
          </div>
        </div>

        <div className="flex space-x-4 text-gray-700 border-1 p-2 backdrop-blur-sm rounded-2xl">
          <FiMessageSquare className="mt-1 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-bold font-serif text-2xl">{t('interactive_chat')}</h3>
            <p className="text-sm">{t('interactive_desc')}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center items-center space-x-6 opacity-75">
        <img src={azure} alt={t('azure_alt')} className="size-30" />
        <h1 className="font-bold text-4xl">&</h1>
        <img src={aifoundry} alt={t('ai_foundry_alt')} className="size-30" />
      </div>
    </div>
  );
};

export default Up;
