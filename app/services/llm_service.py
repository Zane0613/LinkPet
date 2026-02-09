from openai import OpenAI
from app.core.config import settings
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

FALLBACK_NARRATIVE = "今天出去玩了一圈，但是玩得太开心忘记发生什么了..."

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

    # @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=5, max=60), retry=retry_if_exception_type(Exception))
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
                max_tokens=1024,
                extra_body={"enable_thinking": True}
            )
            print("DEBUG: Chat Response Success")
            
            # Log reasoning content if available (for debugging R1 models)
            if hasattr(response.choices[0].message, 'reasoning_content'):
                 print(f"DEBUG: Reasoning: {response.choices[0].message.reasoning_content[:100]}...")
                 
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM Error: {e}")
            print(f"DEBUG: LLM Error: {e}")
            # Reraise for retry, unless it's the last attempt (handled by tenacity?)
            # Tenacity will catch the exception and retry. 
            # If all retries fail, it raises RetryError.
            # We need to wrap this in a way that returns fallback on final failure.
            raise e

    def get_chat_response_safe(self, system_prompt: str, user_message: str) -> str:
        """Wrapper for get_chat_response to handle final failure."""
        try:
            return self.get_chat_response(system_prompt, user_message)
        except Exception as e:
            print(f"DEBUG: Final LLM Error after retries: {e}")
            return "Meow... (I'm having trouble thinking right now)"

    # @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=5, max=60), retry=retry_if_exception_type(Exception))
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
                max_tokens=2048,
                extra_body={"enable_thinking": True}
            )
            print("DEBUG: Narrative Response Success")
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM Narrative Error: {e}")
            print(f"DEBUG: LLM Narrative Error: {e}")
            raise e

    def generate_narrative_safe(self, system_prompt: str, context: str) -> str:
        """Wrapper for generate_narrative to handle final failure."""
        try:
            return self.generate_narrative(system_prompt, context)
        except Exception as e:
            print(f"DEBUG: Final LLM Narrative Error after retries: {e}")
            return FALLBACK_NARRATIVE

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
