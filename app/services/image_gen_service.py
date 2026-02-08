import os
import base64
import mimetypes
import requests
from openai import OpenAI
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Constants
ARK_API_KEY = "7197ca35-597d-424d-b316-0f6538944936"
ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"
MODEL_ID = "doubao-seedream-4-5-251128"

class ImageGenerationService:
    def __init__(self):
        self.client = OpenAI(
            base_url=ARK_BASE_URL,
            api_key=ARK_API_KEY
        )

    def _get_image_base64(self, image_source: str) -> str:
        """
        Convert image (local path or URL) to Base64 format required by API.
        Format: data:image/<format>;base64,<content>
        """
        try:
            # Check if it's a URL
            if image_source.startswith("http://") or image_source.startswith("https://"):
                response = requests.get(image_source, timeout=10)
                response.raise_for_status()
                image_content = response.content
                # Try to guess mime type from URL or headers, default to png
                content_type = response.headers.get("content-type")
                if not content_type or not content_type.startswith("image/"):
                    content_type = "image/png"
            # Otherwise treat as local file path
            else:
                if not os.path.exists(image_source):
                    raise FileNotFoundError(f"File not found: {image_source}")
                
                content_type, _ = mimetypes.guess_type(image_source)
                if not content_type or not content_type.startswith("image"):
                    content_type = "image/png"
                
                with open(image_source, "rb") as f:
                    image_content = f.read()

            encoded_string = base64.b64encode(image_content).decode("utf-8")
            return f"data:{content_type};base64,{encoded_string}"

        except Exception as e:
            logger.error(f"Error converting image to base64: {e}")
            raise

    def generate_travel_photo(self, pet_image_url: str, scene_image_url: str, pet_description: str, scene_name: str, friend_image_url: str = None, friend_description: str = None, diary_content: str = None) -> str:
        """
        Generates a travel photo by integrating the pet (and optionally a friend) into the scene.
        
        Args:
            pet_image_url: URL or Path to the pet's image.
            scene_image_url: URL or Path to the scene background.
            pet_description: Description of the pet (species, color, etc.).
            scene_name: Name of the scene (e.g., "Park", "Volcano").
            friend_image_url: (Optional) URL or Path to the friend's image.
            friend_description: (Optional) Description of the friend.
            diary_content: (Optional) The diary content describing the event/story.
            
        Returns:
            str: URL of the generated image.
        """
        try:
            logger.info(f"Generating travel photo for {pet_description} at {scene_name}...")
            if friend_image_url:
                logger.info(f"Including friend: {friend_description}")
            
            # Convert images to Base64
            pet_base64 = self._get_image_base64(pet_image_url)
            scene_base64 = self._get_image_base64(scene_image_url)
            
            image_list = [pet_base64, scene_base64]
            
            # Add friend image if present
            if friend_image_url:
                friend_base64 = self._get_image_base64(friend_image_url)
                # Note: We insert friend image before scene image to prioritize characters in reference
                image_list = [pet_base64, friend_base64, scene_base64]

            # Construct prompt
            story_instruction = ""
            if diary_content:
                story_instruction = f"6. STORY: The image MUST reflect the following diary entry strictly: '{diary_content}'. Ensure the pets' actions and emotions match this story."

            if friend_image_url:
                prompt = (
                    f"Generate a travel photo of {pet_description} meeting {friend_description} in the {scene_name} scene. "
                    "1. IDENTITY: Strictly keep the exact appearance of BOTH pets from the reference images. "
                    "2. INTERACTION: Show them interacting nicely (e.g., talking, playing, waving). "
                    "3. STYLE: Match the hand-drawn style of the background scene perfectly. "
                    "4. COMPOSITION: Place both pets in the foreground/mid-ground, clearly separated from background."
                    f"{story_instruction}"
                )
            else:
                prompt = (
                    f"Generate a travel photo of the provided {pet_description} in the {scene_name} scene. "
                    "1. IDENTITY: Strictly keep the exact appearance, accessories, and equipment of the pet from the reference image. Do not modify the character design. "
                    "2. POSE & EXPRESSION: Change the pet's pose to be dynamic to fit the scene. "
                    "3. SCALE: Ensure the pet is scaled realistically relative to the surroundings (e.g., small compared to large landmarks, appropriate for furniture). "
                    "4. STYLE: Match the hand-drawn style of the background scene perfectly. "
                    "5. COMPOSITION: Place the pet in the foreground/mid-ground, clearly separated from the background objects."
                    f"{story_instruction}"
                )
            
            response = self.client.images.generate(
                model=MODEL_ID,
                prompt=prompt,
                size="2K",
                response_format="url",
                extra_body={
                    "image": image_list,
                    "watermark": False,
                    "sequential_image_generation": "disabled",
                }
            )
            
            if response.data and len(response.data) > 0:
                generated_url = response.data[0].url
                logger.info(f"Successfully generated image: {generated_url}")
                return generated_url
            else:
                logger.error("No image data in response")
                return None
                
        except Exception as e:
            logger.error(f"Failed to generate travel photo: {str(e)}")
            # Fallback: Return the scene image URL so the user at least sees the destination
            logger.info("Using scene image as fallback.")
            return scene_image_url

# Singleton instance
image_gen_service = ImageGenerationService()
