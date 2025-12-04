import apiClient from "./axios";

export default {
  createBon(bonData) {
    return apiClient.post("/bon", bonData);
  },
  getMyBons(userId) {
    return apiClient.get(`/bon/my-bons?userId=${userId}`);
  },
  getAllBons(filters = {}) {
    return apiClient.get("/bon", { params: filters });
  },
  updateBon(id, bonData) {
    return apiClient.put(`/bon/${id}`, bonData);
  },
  deleteBon(id) {
    return apiClient.delete(`/bon/${id}`);
  },
};
