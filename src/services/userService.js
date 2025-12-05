import apiClient from "./axios";

export default {
  getAllUsers() {
    return apiClient.get("/users");
  },
  getUserActive() {
    return apiClient.get("/users?status=active");
  },
  getUserInActive() {
    return apiClient.get("/users?status=inactive");
  },
  getUserById(id) {
    return apiClient.get(`/users/${id}`);
  },
  createUser(userData) {
    return apiClient.post("/users", userData);
  },
  updateUser(id, userData) {
    return apiClient.put(`/users/${id}`, userData);
  },
  deleteUser(id) {
    return apiClient.delete(`/users/${id}`);
  },
};
