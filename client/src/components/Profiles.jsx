import { useState } from "react";
import {
  azure,
  comphortine,
  aifoundry,
  melvins,
  sheldon,
} from "../assets/Pics";
import { Link } from "react-router-dom";
import { useGlobalState } from "../context/Globalcontext";
import { useTranslation } from 'react-i18next';

function Profiles() {
  const { state } = useGlobalState();
  const [darkmode, setDarkMode] = useState(false);
  const { t } = useTranslation();

  const team = [
    {
      image: comphortine,
      name: "Comphortine Siwende",
      roleKey: "team.comphortine.role",
      descriptionKey: "team.comphortine.desc",
      link: "https://github.com/COMFORTINE-SIWENDE",
    },
    {
      image: sheldon,
      name: "Sheldon Billy",
      roleKey: "team.sheldon.role",
      descriptionKey: "team.sheldon.desc",
      link: "https://github.com/Sheldon-Billy",
    },
    {
      image: melvins,
      name: "Melvins Simon",
      roleKey: "team.melvins.role",
      descriptionKey: "team.melvins.desc",
      link: "https://github.com/Melvins-Simon",
    },
  ];

  return (
    <div
      className={`transition-colors relative pb-32 flex flex-col items-center ${
        state.screenWidth <= 1026 ? "h-full" : "h-screen"
      } ${
        darkmode
          ? "bg-gradient-to-br from-[#50E6FF] to-[#0078D4]"
          : "bg-[#101820] text-white"
      }`}
    >
      <div className="flex justify-between w-full items-center">
        <Link
          to="/"
          className="text-[#107C10] hover:text-white hover:underline cursor-pointer mx-20"
        >
          {t('back_home')}
        </Link>

        <button
          className={`border-1 p-1 rounded-2xl my-2 mx-20 ${
            darkmode ? "bg-blue-400" : "bg-[#292929]"
          }`}
          onClick={() => setDarkMode(!darkmode)}
        >
          {t('theme')} {darkmode ? "🔵" : "⚫"}
        </button>
      </div>

      <h1
        className={`font-serif font-bold flex align-center justify-center text-4xl mb-10 ${
          darkmode
            ? "bg-gradient-to-r from-[#004E8C] via-[#107C10] to-[#004E8C] text-transparent bg-clip-text w-max"
            : "bg-gradient-to-r from-[#a3dcff] via-[#1c7ed3] to-[#005A9E] text-transparent bg-clip-text"
        }`}
      >
        {t('meet_our_team')}
      </h1>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-2">
        {team.map((member, index) => (
          <div
            key={index}
            className={`rounded-2xl p-6 ${
              darkmode
                ? "bg-[#c9d0d6] shadow-[0px_0px_10px_#333333]"
                : "bg-gray-800 shadow-[0px_0px_10px_#0078D7]"
            }`}
          >
            <div className="flex justify-center">
              <img
                src={member.image}
                alt={member.name}
                className="h-40 w-40 object-cover rounded-full mb-4 shadow-[0px_0px_10px_black]"
              />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-1 text-center">
                {member.name}
              </h2>
              <p className="font-serif text-indigo-400 mb-2 font-medium text-center">
                {t(member.roleKey)}
              </p>
              <p className="mb-4 text-sm text-center">{t(member.descriptionKey)}</p>
            </div>

            <div className="items-center justify-center flex">
              <a
                href={member.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-indigo-400 text-white text px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {t('connect')}
              </a>
            </div>
          </div>
        ))}
      </div>

      <footer className="text-center py-4 border-t text-sm text-[#ffffff] flex align-center justify-center items-center absolute bottom-0 w-full">
        <img
          src={azure}
          alt={t('azure_alt')}
          className={`${state.screenWidth <= 428 ? "h-5 w-6" : "h-9 w-10"}`}
        />
        <h1 className="text-center ml-3 mt-2">&</h1>
        <img
          src={aifoundry}
          alt={t('ai_foundry_alt')}
          className={`${state.screenWidth <= 428 ? "h-6 w-11" : "h-13 w-15"}`}
        />
        &copy; {new Date().getFullYear()} @NestLink.Org
        <span className="align-super text-xs">™</span>. {t('all_rights_reserved')}
      </footer>
    </div>
  );
}

export default Profiles;
