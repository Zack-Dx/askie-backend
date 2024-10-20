import { v2 as mediaUploader } from "cloudinary";
import { CONFIG } from "../env/index.js";

export function initMediaCloud() {
  mediaUploader.config({
    api_key: CONFIG.CLOUDINARY_API_KEY,
    cloud_name: CONFIG.CLOUDINARY_CLOUD_NAME,
    api_secret: CONFIG.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export default mediaUploader;
