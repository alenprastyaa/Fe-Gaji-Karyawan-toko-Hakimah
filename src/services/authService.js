import apiClient from "./axios";

export default {
  login(credentials) {
    return apiClient.post("/auth/login", credentials);
  },
  register(userData) {
    return apiClient.post("/auth/register", userData); // Biasanya hanya untuk admin
  },
};
