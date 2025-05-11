import axios from "axios";
import { makeApiCall } from "./api";

const EXPO_PUBLIC_CLOUDINARY_URL = process.env.EXPO_PUBLIC_CLOUDINARY_URL;
const EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const EXPO_PUBLIC_CLOUDINARY_API_KEY =
  process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const API_URL = "https://police-cad-app-api-bc6d659b60b3.herokuapp.com";

export const uploadImageToCloudinary = async (imageUri) => {
  let timestamp;
  let signature;
  try {
    // Fetch the signature from the server
    const response = await makeApiCall(`${API_URL}/api/v1/generate-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      Body: JSON.stringify({}),
    });

    const data = await response.json();
    timestamp = data.timestamp;
    signature = data.signature;
  } catch (error) {
    console.error("Error fetching signature:", error);
    throw error;
  }

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "upload.jpg",
  });
  formData.append("api_key", EXPO_PUBLIC_CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("upload_preset", EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(EXPO_PUBLIC_CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  }
};
