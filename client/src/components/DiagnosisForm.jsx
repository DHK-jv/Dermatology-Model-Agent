import React, { useState, useRef } from "react";
import axios from "axios";
import { Upload } from "../assets";
import { FiInfo } from "react-icons/fi";
import { useGlobalState } from "../context/Globalcontext";
import { useTranslation } from 'react-i18next';

const DiagnosisForm = () => {
  const { state, dispatch } = useGlobalState();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [userDetails, setUserDetails] = useState({
    username: "",
    age: "",
  });

  const handleFileChange = (file) => {
    if (!file) return;
    dispatch({ type: "SET_IMAGE", payload: file });
    const url = URL.createObjectURL(file);
    dispatch({ type: "SET_IMAGE_URL", payload: url });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!state.image || !state.symptoms.trim()) {
      setError(t('please_provide_image_and_symptom'));
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", state.image);
    formData.append("message", state.symptoms);
    formData.append("user_name", userDetails.username);
    formData.append("age", userDetails.age);
    if (state.activeSession) formData.append("session_id", state.activeSession);

    try {
      const isDevelopment = import.meta.env.MODE === "development";
      const baseUrl = isDevelopment
        ? "http://localhost:8081/api/medical-assistant/"
        : "https://aid-dermatilogy-cbfbbad0cdhscbf9.spaincentral-01.azurewebsites.net/api/medical-assistant/";

      const response = await axios.post(baseUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      const processedResponse = {
        ...response.data,
        user_info: {
          user_name: userDetails.username,
          age: userDetails.age,
        },
        confidence_score: Math.round(
          response.data.diagnosis?.confidence_score || 0
        ),
        predicted_disease:
          response.data.diagnosis?.predicted_disease || t('unknown'),
        chatbot_response:
          response.data.diagnosis?.chatbot_response || t('no_diagnosis_available'),
        suggested_actions: response.data.suggested_actions || [],
      };

      dispatch({ type: "SET_DIAGNOSIS", payload: processedResponse });
      dispatch({ type: "SET_USER", payload: userDetails });
    } catch (error) {
      console.error("Diagnosis error:", error);
      setError(
        error.response?.data?.message ||
          t('failed_get_diagnosis')
      );
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="h-full p-4 w-full flex flex-col items-center justify-center">
      {/* Container chính đã được sửa lại layout để bỏ grid 2 cột */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-auto max-h-full">
        

        <div className="p-6 flex flex-col flex-1 overflow-y-auto">
          {/* Khu vực upload ảnh */}
          <div className="relative h-48 mb-4 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center flex-shrink-0">
            {state.imageURL ? (
              <>
                <img
                  src={state.imageURL}
                  className="absolute inset-0 w-full h-full object-cover"
                  alt={t('uploaded_skin_alt')}
                />
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="z-10 absolute bottom-2 right-2 bg-[#7096ff] px-3 py-1 rounded-[5px] shadow-sm hover:bg-[blue] transition-colors text-white font-bold ring-2 ring-white"
                >
                  {t('change_image')}
                </button>
              </>
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer"
                onClick={triggerFileInput}
              >
                <img src={Upload} className="size-20" alt="Upload Icon" />
                <p className="text-gray-500 font-medium">
                  {t('click_to_upload')}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
              accept="image/*"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className="block text-sm font-bold text-black mb-1">
                {t('describe_symptoms')}
              </label>
              <textarea
                value={state.symptoms}
                onChange={(e) =>
                  dispatch({ type: "SET_SYMPTOMS", payload: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                placeholder={t('symptoms_placeholder')}
                required
              />
            </div>

            <div className="flex gap-4">
              <input
                onChange={(e) =>
                  setUserDetails({ ...userDetails, username: e.target.value })
                }
                name="username"
                value={userDetails.username}
                placeholder={t('enter_name')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />

              <input
                onChange={(e) => {
                  const ageValue =
                    e.target.value === ""
                      ? ""
                      : Math.max(0, parseInt(e.target.value) || "");
                  setUserDetails({ ...userDetails, age: ageValue });
                }}
                name="age"
                value={userDetails.age}
                placeholder={t('enter_age')}
                type="number"
                min="0"
                max="120"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div className="pt-2 mt-auto">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-br from-blue-200 ring-offset-1 ring-2 ring-blue-500 hover:from-blue-500 to-blue-800 transition-colors duration-300 w-full py-3 px-4 rounded-lg font-extrabold text-white flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t('analyzing', { progress: uploadProgress })}
                  </>
                ) : (
                  t('get_diagnosis')
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-black">
              <FiInfo className="mr-2 size-5 text-red-600" />
              <p>
                {t('for_better_results')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisForm;