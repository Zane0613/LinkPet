from openai import OpenAI
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        print(f"DEBUG: LLMService Init")
        print(f"DEBUG: API Key: {settings.OPENAI_API_KEY[:10]}..." if settings.OPENAI_API_KEY else "DEBUG: No API Key")
        print(f"DEBUG: Base URL: {settings.OPENAI_API_BASE}")
        print(f"DEBUG: Model: {settings.OPENAI_MODEL}")
        
        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE
        )
        self.model = settings.OPENAI_MODEL

    def get_chat_response(self, system_prompt: str, user_message: str) -> str:
        try:
            print(f"DEBUG: Sending Chat Request to {self.model}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=150
            )
            print("DEBUG: Chat Response Success")
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM Error: {e}")
            print(f"DEBUG: LLM Error: {e}")
            return "Meow... (I'm having trouble thinking right now)"

    def generate_narrative(self, system_prompt: str, context: str) -> str:
        try:
            print(f"DEBUG: Sending Narrative Request to {self.model}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                temperature=0.8,
                max_tokens=300
            )
            print("DEBUG: Narrative Response Success")
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM Narrative Error: {e}")
            print(f"DEBUG: LLM Narrative Error: {e}")
            return "I went on a trip, but I forgot what happened..."

    def get_embedding(self, text: str) -> list[float]:
        """
        Generates an embedding vector for the given text.
        """
        try:
            # clean text
            text = text.replace("\n", " ")
            
            # Use a compatible embedding model from settings
            embedding_model = settings.OPENAI_EMBEDDING_MODEL
            
            print(f"DEBUG: Generating Embedding with {embedding_model}")
            response = self.client.embeddings.create(
                input=[text],
                model=embedding_model
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding Error: {e}")
            print(f"DEBUG: Embedding Error: {e}")
            # Return a zero vector or raise? 
            # Raising allows caller to handle (e.g. skip retrieval)
            # But to keep it robust, maybe return None?
            return []


llm_service = LLMService()
