import apiClient from "./axios";

export default {
  getMyCuti(filters = {}) {
    return apiClient.get("/cuti/my", { params: filters });
  },

  getMyCutiById(id) {
    return apiClient.get(`/cuti/my/${id}`);
  },
  createMyCuti(cutiData) {
    return apiClient.post("/cuti/my", cutiData);
  },
  getAllCuti(filters = {}) {
    return apiClient.get("/cuti", { params: filters });
  },
  getCutiById(id) {
    return apiClient.get(`/cuti/${id}`);
  },
  createCuti(cutiData) {
    return apiClient.post("/cuti", cutiData);
  },
  updateCuti(id, cutiData) {
    return apiClient.put(`/cuti/${id}`, cutiData);
  },
  approveCuti(id, approvalData) {
    return apiClient.patch(`/cuti/${id}/approve`, approvalData);
  },
  deleteCuti(id) {
    return apiClient.delete(`/cuti/${id}`);
  },
  getCutiList(userRole, filters = {}) {
    if (userRole === "admin") {
      return this.getAllCuti(filters);
    } else {
      return this.getMyCuti(filters);
    }
  },
  getCutiDetail(userRole, id) {
    if (userRole === "admin") {
      return this.getCutiById(id);
    } else {
      return this.getMyCutiById(id);
    }
  },
  createCutiRequest(userRole, cutiData) {
    if (userRole === "admin") {
      return this.createCuti(cutiData);
    } else {
      return this.createMyCuti(cutiData);
    }
  },
};
