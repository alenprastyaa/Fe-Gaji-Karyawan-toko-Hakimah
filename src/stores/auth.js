import { defineStore } from "pinia";
import router from "../router";
import authService from "../services/authService";
import Swal from "sweetalert2";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("user")) || null,
    token: localStorage.getItem("token") || null,
    isAuthenticated: !!localStorage.getItem("token"),
  }),
  getters: {
    isUserAuthenticated: (state) => state.isAuthenticated,
    isUserAdmin: (state) => state.user?.role === "admin",
    getCurrentUser: (state) => state.user,
  },
  actions: {
    async login(credentials) {
      try {
        const response = await authService.login(credentials);
        this.user = response.data.user;
        this.token = response.data.token;
        this.isAuthenticated = true;

        localStorage.setItem("user", JSON.stringify(this.user));
        localStorage.setItem("token", this.token);

        Swal.fire({
          icon: "success",
          title: "Login Berhasil!",
          text: `Selamat datang, ${this.user.namaLengkap}!`,
          showConfirmButton: false,
          timer: 1500,
        });

        if (this.isUserAdmin) {
          router.push("/admin/dashboard");
        } else {
          router.push("/my-bons");
        }
        return true;
      } catch (error) {
        console.error("Login failed:", error);
        const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat login.";
        Swal.fire({
          icon: "error",
          title: "Login Gagal!",
          text: errorMessage,
        });
        return false;
      }
    },
    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      Swal.fire({
        icon: "info",
        title: "Berhasil Logout!",
        showConfirmButton: false,
        timer: 1500,
      });
      router.push("/login");
    },
    initializeAuth() {
      if (this.token && this.user) {
      }
    },
  },
});
