import { defineStore } from "pinia";
import userService from "../services/userService";
import Swal from "sweetalert2";

export const useUserStore = defineStore("user", {
  state: () => ({
    users: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchAllUsers() {
      this.loading = true;
      this.error = null;
      try {
        const response = await userService.getAllUsers();
        this.users = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal mengambil data user.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
      } finally {
        this.loading = false;
      }
    },
    async userActive() {
      this.loading = true;
      this.error = null;
      try {
        const response = await userService.getUserActive();
        this.users = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal mengambil data user.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchInactiveUsers() {
      this.loading = true;
      this.error = null;
      try {
        const response = await userService.getUserInActive();
        this.users = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal mengambil data user.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
      } finally {
        this.loading = false;
      }
    },
    async addUser(userData) {
      this.loading = true;
      this.error = null;
      try {
        const newUser = await userService.createUser(userData);
        this.users.push(newUser.data.user);
        Swal.fire({
          icon: "success",
          title: "User Berhasil Ditambahkan!",
          showConfirmButton: false,
          timer: 1500,
        });
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal menambahkan user.";
        if (err.response && err.response.status === 409) {
          this.error = "Username sudah ada, silakan gunakan username lain.";
        }
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
        return false;
      } finally {
        this.loading = false;
      }
    },
    async updateExistingUser(id, userData) {
      this.loading = true;
      this.error = null;
      try {
        const updatedUser = await userService.updateUser(id, userData);
        const index = this.users.findIndex((user) => user.id === id);
        if (index !== -1) {
          this.users[index] = updatedUser.data.user;
        }
        Swal.fire({
          icon: "success",
          title: "User Berhasil Diperbarui!",
          showConfirmButton: false,
          timer: 1500,
        });
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal memperbarui user.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
        return false;
      } finally {
        this.loading = false;
      }
    },
    async removeUser(id) {
      this.loading = true;
      this.error = null;
      try {
        await userService.deleteUser(id);
        this.users = this.users.filter((user) => user.id !== id);
        Swal.fire({
          icon: "success",
          title: "User Berhasil Dihapus!",
          showConfirmButton: false,
          timer: 1500,
        });
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal menghapus user.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
