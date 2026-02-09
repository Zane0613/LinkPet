import os
import base64
import mimetypes
import requests
import json
import time
import logging
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

class ImageGenerationService:
    def __init__(self):
        self.api_key = settings.MODELSCOPE_API_KEY
        self.base_url = settings.MODELSCOPE_API_BASE
        self.model = settings.MODELSCOPE_IMAGE_MODEL
        
        print(f"DEBUG: ImageGenerationService Init (ModelScope)", flush=True)
        print(f"DEBUG: API Key: {self.api_key[:10]}...", flush=True)
        print(f"DEBUG: Model: {self.model}", flush=True)

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
        Generates a travel photo by integrating the pet (and optionally a friend) into the scene using ModelScope Qwen-Image-Edit.
        """
        try:
            logger.info(f"Generating travel photo for {pet_description} at {scene_name}...")
            if friend_image_url:
                logger.info(f"Including friend: {friend_description}")
            
            # Convert images to Base64
            # ModelScope API accepts base64 data URIs in image_url list for local/uploaded files logic
            pet_base64 = self._get_image_base64(pet_image_url)
            scene_base64 = self._get_image_base64(scene_image_url)
            
            image_list = []
            
            # Construct prompt and image list
            # Logic: Pet is Image 1, Scene is Image 2 (or 3 if friend exists)
            
            prompt = ""
            story_instruction = "" 
            if diary_content:
                # Add story context to prompt, but emphasize visual translation only
                story_instruction = f"根据以下日记情节设计角色的动作和表情（不要在画面中生成文字）：{diary_content}。"

            if friend_image_url:
                friend_base64 = self._get_image_base64(friend_image_url)
                # Image 1: Pet, Image 2: Friend, Image 3: Scene
                image_list = [pet_base64, friend_base64, scene_base64]
                
                prompt = (
                    f"手绘风格，无文字，无对话框，无水印。将图一中的{pet_description}和图二中的{friend_description}，自然地融入到图三的{scene_name}场景中。"
                    f"保持图一和图二角色的外貌特征不变。{story_instruction}"
                    "两个角色在场景中互动，构图和谐，色彩风格与背景一致。警告：画面中绝对禁止出现任何文字、对话气泡或字母。"
                )
            else:
                # Image 1: Pet, Image 2: Scene
                image_list = [pet_base64, scene_base64]
                
                prompt = (
                    f"手绘风格，无文字，无对话框，无水印。将图一中的{pet_description}自然地融入到图二的{scene_name}场景中。"
                    f"严格保持图一角色的外貌特征、配饰不变。{story_instruction}"
                    "角色姿态生动，与背景透视关系正确，光影自然融合。警告：画面中绝对禁止出现任何文字、对话气泡或字母。"
                )
            
            print(f"DEBUG: Calling ModelScope API for {pet_description}...", flush=True)
            print(f"DEBUG: Prompt: {prompt}", flush=True)

            common_headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "X-ModelScope-Async-Mode": "true"
            }

            payload = {
                "model": self.model,
                "prompt": prompt,
                "image_url": image_list
            }

            # Retry logic for task submission
            # User requested to limit retries to save quota
            submission_retries = 1 
            response = None
            
            for attempt in range(submission_retries):
                try:
                    response = requests.post(
                        f"{self.base_url}v1/images/generations",
                        headers=common_headers,
                        data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
                        timeout=30
                    )
                    
                    if response.ok:
                        break
                        
                    error_text = response.text
                    print(f"DEBUG: API Error Response: {error_text}", flush=True)
                    
                    # No retries, just log and raise
                    response.raise_for_status()
                    
                except requests.RequestException as e:
                    print(f"DEBUG: Request failed: {str(e)}", flush=True)
                    raise

            if not response or not response.ok:
                if response:
                    response.raise_for_status()
                else:
                    raise Exception("Failed to submit image generation task")
            
            task_id = response.json()["task_id"]
            print(f"DEBUG: Task ID: {task_id}", flush=True)

            # Polling for result
            max_retries = 60 # 5 minutes max (5s * 60)
            for i in range(max_retries):
                time.sleep(5)
                
                result = requests.get(
                    f"{self.base_url}v1/tasks/{task_id}",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "X-ModelScope-Task-Type": "image_generation"
                    }
                )
                result.raise_for_status()
                data = result.json()
                task_status = data.get("task_status")
                
                if task_status == "SUCCEED":
                    output_images = data.get("output_images")
                    if output_images and len(output_images) > 0:
                        generated_url = output_images[0]
                        logger.info(f"Successfully generated image: {generated_url}")
                        print(f"DEBUG: Successfully generated image: {generated_url}", flush=True)
                        return generated_url
                    else:
                        raise ValueError("Task succeeded but no output images found.")
                
                elif task_status == "FAILED":
                    print(f"DEBUG: Full Failure Data: {json.dumps(data, ensure_ascii=False)}", flush=True)
                    error_msg = data.get("message", "Unknown error")
                    print(f"DEBUG: Image Generation Failed: {error_msg}", flush=True)
                    raise Exception(f"ModelScope Task Failed: {error_msg}")
                
                elif task_status in ["PENDING", "RUNNING", "PROCESSING"]:
                    if i % 2 == 0:
                        print(f"DEBUG: Task Status: {task_status}...", flush=True)
                    continue
                
                else:
                    print(f"DEBUG: Unknown Task Status: {task_status}", flush=True)

            raise TimeoutError("Image generation timed out.")

        except Exception as e:
            logger.error(f"Failed to generate travel photo: {str(e)}")
            print(f"DEBUG: Failed to generate travel photo: {str(e)}", flush=True)
            # Fallback: Return the scene image URL
            return scene_image_url

# Singleton instance
image_gen_service = ImageGenerationService()
