import axios from "axios";
import { auth } from "./firebase";

const BACKEND = process.env.NEXT_PUBLIC_API_URL as string;

const api = axios.create({
  baseURL: BACKEND,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically inject the Firebase ID token
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Retrieve fresh ID token from Firebase user
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Fallback check: if there is a session token saved in local storage or memory
        // during development or transition state.
        if (typeof window !== "undefined") {
          const fallbackToken = sessionStorage.getItem("mock_id_token");
          if (fallbackToken) {
            config.headers.Authorization = `Bearer ${fallbackToken}`;
          }
        }
      }
    } catch (error) {
      console.error("Axios request interceptor failed to get Firebase ID token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
