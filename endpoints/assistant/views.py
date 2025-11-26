import logging
import os
import uuid
import json
import numpy as np
import tensorflow as tf
from PIL import Image
from datetime import datetime
from uuid import UUID

# Django & DRF
from django.conf import settings
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework_simplejwt.views import TokenObtainPairView
from django_rest_passwordreset.views import ResetPasswordRequestToken, ResetPasswordConfirm

# Azure & LangChain
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain_openai import AzureChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory, BaseChatMessageHistory

# Kafka
from confluent_kafka import Producer

# Local Imports
from .serializers import (
    UserSerializer, PasswordResetSerializer, PasswordResetConfirmSerializer,
    SkinDiseasePredictionSerializer, ChatHistorySerializer
)
from .models import (
    User, SkinDiseasePrediction, ChatHistory, Dermatologist, ConversationSession
)

# --- 1. GLOBAL SETUP (Run once on server start) ---

logger = logging.getLogger(__name__)

# Load Model
current_dir = os.path.dirname(os.path.abspath(__file__))
base_dir = os.path.dirname(current_dir)
model_path = os.path.join(base_dir, "model", "Skin_Disease_Classification.keras")

try:
    print(f"Loading model from: {model_path}")
    model = tf.keras.models.load_model(model_path)
    print("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    model = None

# Disease categories
DATA_CAT = [
    'acne', 'actinickeratosis', 'alopeciaareata', 'chickenpox', 'cold sores',
    'eczema', 'folliculitis', 'hives', 'impetigo', 'melanoma', 'psoriasis',
    'ringworm', 'rosacea', 'shingles', 'uticaria', 'vitiligo', 'warts'
]

# Initialize AI Clients Globally
llm = AzureChatOpenAI(
    openai_api_key=settings.AZURE_OPENAI_API_KEY,
    azure_endpoint=settings.AZURE_OPENAI_API_ENDPOINT,
    api_version="2024-12-01-preview",
    model_name="gpt-4o",
    temperature=0.7,
)

search_client = SearchClient(
    endpoint=settings.AZURE_AI_SEARCH_ENDPOINT,
    index_name="medical-knowledge",
    credential=AzureKeyCredential(settings.AZURE_AI_SEARCH_API),
)

# Initialize Kafka Producer Globally
kafka_conf = {
    "bootstrap.servers": settings.BOOTSTRAP_SERVER,
    "security.protocol": "SASL_SSL",
    "sasl.mechanisms": "PLAIN",
    "sasl.username": settings.SASL_USERNAME,
    "sasl.password": settings.SASL_PASSWORD
}
try:
    kafka_producer = Producer(kafka_conf)
except Exception as e:
    logger.error(f"Failed to initialize Kafka Producer: {e}")
    kafka_producer = None

# Session Store (Note: In production, use Redis instead of this dict)
session_store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in session_store:
        session_store[session_id] = InMemoryChatMessageHistory()
    return session_store[session_id]


# --- 2. STANDARD VIEWS ---

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class LoginView(TokenObtainPairView):
    pass

class PasswordResetView(ResetPasswordRequestToken):
    serializer_class = PasswordResetSerializer

class PasswordResetConfirmView(ResetPasswordConfirm):
    serializer_class = PasswordResetConfirmSerializer


# --- 3. MAIN LOGIC VIEW ---

class MedicalAssistantAPI(APIView):
    """
    Unified endpoint for image diagnosis and text chat.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser]

    SYSTEM_PROMPT = _("""
    You are DermatologyAI, an advanced medical assistant specialized ONLY in skin conditions. 
    You provide professional diagnosis support, treatment recommendations from verified sources, 
    and general skin care advice.
    
    Current User Context:
    - Name: {user_name}
    - Age: {age}
    
    Always be empathetic, precise, and professional. Clarify when uncertain.
    """)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # We setup the chain here using the global LLM, but we don't re-init the LLM
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        self.conversation_chain = self.prompt | llm
        self.conversation_handler = RunnableWithMessageHistory(
            runnable=self.conversation_chain,
            get_session_history=get_session_history,
            input_messages_key="input",
            history_messages_key="history"
        )

    # --- Session Management ---
    def _get_or_create_session(self, session_id, user_id, user_name, age):
        try:
            session_uuid = uuid.UUID(str(session_id))
        except ValueError:
            session_uuid = uuid.uuid4()
        
        session, created = ConversationSession.objects.get_or_create(
            session_id=session_uuid,
            defaults={
                'user_id': user_id if isinstance(user_id, int) else None,
                'user_name': user_name,
                'age': age
            }
        )
        # Update metadata if provided
        if not created and (user_name != 'Anonymous' or age is not None):
            session.user_name = user_name
            session.age = age
            session.save()
        return session

    # --- Core Processing Logic ---
    def _process_image(self, request, image, message, session, user_id, user_name, age):
        if not model:
            return {"error": "Model not loaded"}

        try:
            # 1. Preprocessing
            img_width, img_height = 180, 180
            pil_image = Image.open(image).convert("RGB")
            pil_image = pil_image.resize((img_width, img_height))
            image_arr = tf.keras.utils.array_to_img(pil_image)
            image_bat = tf.expand_dims(image_arr, axis=0)

            # 2. Prediction
            predict = model.predict(image_bat)
            score = tf.nn.softmax(predict)
            confidence_score = float(np.max(score) * 100)
            predicted_disease = DATA_CAT[np.argmax(score)]

            # 3. Handle Low Confidence
            if confidence_score < 65:
                msg = _("Possible {d} detected ({c:.1f}%). Please upload a clearer photo or consult a doctor.").format(
                    d=predicted_disease, c=confidence_score
                )
                return {
                    "status": "low_confidence",
                    "diagnosis": {
                        "condition": predicted_disease, 
                        "confidence": confidence_score
                    },
                    "message": msg,
                    "suggested_actions": ["upload_new_image", "find_specialist"]
                }

            # 4. Generate AI Analysis
            analysis_prompt = f"The user has been diagnosed with {predicted_disease} ({confidence_score:.1f}% confidence). Symptoms: {message}. Provide a professional medical summary, self-care tips, and when to see a doctor."
            
            # Invoke chain
            response = self.conversation_handler.invoke(
                {"input": analysis_prompt, "user_name": user_name, "age": age},
                config={"configurable": {"session_id": str(session.session_id)}},
            )
            analysis_text = response.content

            # 5. Save Record
            prediction = SkinDiseasePrediction.objects.create(
                user_id=user_id if isinstance(user_id, int) else None,
                image=image,
                symptoms=message,
                predicted_disease=predicted_disease,
                confidence_score=confidence_score,
                chatbot_response=analysis_text,
                session=session,
                user_name=user_name,
                age=age
            )

            # 6. Serialize & Return
            diagnosis_data = SkinDiseasePredictionSerializer(
                prediction, context={'request': request}
            ).data
            
            return {
                "diagnosis": diagnosis_data,
                "suggested_actions": ["explain_diagnosis", "treatment_options"],
                "status": "success",
                "message": analysis_text
            }

        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return {"error": str(e), "suggested_actions": ["retry_upload"]}

    def _process_text(self, request, message, session, user_id, user_name, age, has_image_context):
        try:
            # 1. Filter Non-Healthcare
            if not self._is_healthcare_question(message) and not has_image_context:
                return {"text": "I specialize only in skin health. Please ask a medical question."}

            # 2. Route Request
            processing_mode = self._determine_mode(message, has_image_context)
            response_text = ""
            sources = []
            suggested_actions = []

            if processing_mode == "medical_search":
                sources = self._retrieve_medical_info(message)
                context_str = "\n".join([s['content'] for s in sources]) if sources else "No specific database match."
                prompt = f"Question: {message}\nMedical Context: {context_str}\nAnswer based on context:"
                
                ai_resp = self.conversation_handler.invoke(
                    {"input": prompt, "user_name": user_name, "age": age},
                    config={"configurable": {"session_id": str(session.session_id)}}
                )
                response_text = ai_resp.content
                suggested_actions = ["more_details"]

            elif processing_mode == "dermatologist_query":
                doctors = self._query_dermatologists(message)
                if doctors:
                    doc_list = "\n".join([f"- {d.name} ({d.specialization})" for d in doctors])
                    response_text = f"Here are some specialists:\n{doc_list}"
                    suggested_actions = ["book_appointment"]
                else:
                    response_text = "I couldn't find any dermatologists matching your criteria."

            else: # General Chat
                ai_resp = self.conversation_handler.invoke(
                    {"input": message, "user_name": user_name, "age": age},
                    config={"configurable": {"session_id": str(session.session_id)}}
                )
                response_text = ai_resp.content
                suggested_actions = self._generate_followup_actions(message)

            # 3. Save Chat History
            chat = ChatHistory.objects.create(
                user_id=user_id if isinstance(user_id, int) else None,
                user_message=message,
                chatbot_response=response_text,
                session=session,
                user_name=user_name,
                age=age,
                metadata={'sources': sources, 'suggested_actions': suggested_actions}
            )
            
            # 4. Return Data
            chat_data = ChatHistorySerializer(chat, context={'request': request}).data
            self._send_to_kafka(chat_data)
            
            return {
                "chat_response": chat_data,
                "suggested_actions": suggested_actions
            }

        except Exception as e:
            logger.error(f"Text processing error: {e}")
            return {"error": f"Chat processing failed: {str(e)}"}

    # --- HTTP Methods ---
    def post(self, request, *args, **kwargs):
        try:
            data = request.data
            message = data.get('message', '')
            image = request.FILES.get('image')
            
            # Extract User Info
            user_id = request.user.id if request.user.is_authenticated else None
            user_name = data.get('user_name', 'Anonymous')
            age = data.get('age')
            session_id = data.get('session_id', str(uuid.uuid4()))

            response_data = {
                "session_id": session_id,
                "user_info": {"user_name": user_name, "age": age}
            }

            # Get Session
            session = self._get_or_create_session(session_id, user_id, user_name, age)
            response_data["session_id"] = str(session.session_id)

            # Flow Logic
            if image:
                # 1. Process Image
                img_res = self._process_image(request, image, message, session, user_id, user_name, age)
                if "error" in img_res: return Response(img_res, status=400)
                
                response_data.update(img_res)
                # If image analysis generated a message, use that as context for text processing? 
                # Usually image analysis IS the response, so we might stop here unless user sent specific text too.
                if img_res.get('status') == 'low_confidence':
                    self._send_to_kafka(response_data.get('diagnosis'))
                    return Response(response_data, status=200)

            elif message:
                # 2. Process Text (Only if no image, or if you want to support text+image simultaneously)
                txt_res = self._process_text(request, message, session, user_id, user_name, age, has_image_context=bool(image))
                if "error" in txt_res: return Response(txt_res, status=400)
                response_data.update(txt_res)

            return Response(response_data, status=200)

        except Exception as e:
            logger.error(f"Server Error: {e}")
            return Response({"error": f"Server error: {str(e)}"}, status=500)

    # --- Helpers ---
    def _is_healthcare_question(self, message):
        keywords = ['skin', 'rash', 'acne', 'doctor', 'pain', 'itch', 'bump', 'hello', 'hi']
        msg_lower = message.lower()
        if any(x in msg_lower for x in ['code', 'python', 'java']): return False
        return any(k in msg_lower for k in keywords)

    def _determine_mode(self, message, is_followup):
        msg_lower = message.lower()
        if is_followup: return "general_chat"
        if any(k in msg_lower for k in ["treatment", "remedy"]): return "medical_search"
        if any(k in msg_lower for k in ["dermatologist", "appointment"]): return "dermatologist_query"
        return "general_chat"

    def _retrieve_medical_info(self, query):
        try:
            results = search_client.search(search_text=query, top=3)
            return [{"content": hit["content"], "source": hit.get("source")} for hit in results]
        except Exception:
            return []

    def _query_dermatologists(self, query):
        # Implement your logic here
        return Dermatologist.objects.filter(specialization__icontains="dermatology")[:5]

    def _generate_followup_actions(self, message):
        actions = ["learn_more"]
        if "pain" in message.lower(): actions.append("emergency_contact")
        return actions

    def _send_to_kafka(self, data):
        if not kafka_producer: return
        
        class UUIDEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, UUID): return str(obj)
                return super().default(obj)

        topic = "es_4eac4ca9-c29c-4827-9fca-f3546d66bc98"
        try:
            kafka_producer.produce(
                topic,
                json.dumps(data, cls=UUIDEncoder),
                callback=lambda err, msg: logger.error(f"Kafka: {err}") if err else None
            )
            # Removed producer.flush() to prevent blocking the HTTP response
            kafka_producer.poll(0) 
        except Exception as e:
            logger.error(f"Kafka failed: {e}")