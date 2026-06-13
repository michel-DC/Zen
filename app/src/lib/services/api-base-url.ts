export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://zen-2mh5.onrender.com/api/v1"
    : "http://localhost:8000/api/v1");
