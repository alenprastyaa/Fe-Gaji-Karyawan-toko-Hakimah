// stores/bon.js
import { defineStore } from "pinia";
import bonService from "../services/bonService";
import Swal from "sweetalert2";
import router from "../router";
import { useAuthStore } from "./auth";

export const useBonStore = defineStore("bon", {
  state: () => ({
    myBons: [],
    totalMyBon: 0,
    allBons: [],
    totalAllBon: 0,
    loading: false,
    error: null,
  }),
  actions: {
    async fetchMyBons() {
      this.loading = true;
      this.error = null;
      try {
        const authStore = useAuthStore();
        const userId = authStore.getCurrentUser?.id;

        if (!userId) {
          this.error = "User ID tidak ditemukan. Mohon login kembali.";
          Swal.fire({
            icon: "warning",
            title: "Sesi Habis",
            text: this.error,
          });

          router.push("/login");
          return;
        }

        const response = await bonService.getMyBons(userId);
        this.myBons = response.data.bons;
        this.totalMyBon = response.data.totalBon;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal mengambil data bon saya.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchAllBons(filters) {
      this.loading = true;
      this.error = null;
      try {
        const response = await bonService.getAllBons(filters);
        this.allBons = response.data.bons;
        this.totalAllBon = response.data.totalBonKeseluruhan;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal mengambil semua data bon.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
      } finally {
        this.loading = false;
      }
    },
    async fetchBonActive(filters) {
      this.loading = true;
      this.error = null;
      try {
        const response = await bonService.getBonActive(filters);
        this.allBons = response.data.bons;
        this.totalAllBon = response.data.totalBonKeseluruhan;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal mengambil semua data bon.";
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: this.error,
        });
      } finally {
        this.loading = false;
      }
    },
    async addBon(bonData) {
      this.loading = true;
      this.error = null;
      try {
        const newBon = await bonService.createBon(bonData);
        this.myBons.push(newBon.data);
        this.totalMyBon += parseFloat(newBon.data.jumlahBon);
        Swal.fire({
          icon: "success",
          title: "Bon Berhasil Ditambahkan!",
          showConfirmButton: false,
          timer: 1500,
        });
        router.push("/my-bons");
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal menambahkan bon.";
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
    async updateExistingBon(id, bonData) {
      this.loading = true;
      this.error = null;
      try {
        const updatedBon = await bonService.updateBon(id, bonData);
        const indexMy = this.myBons.findIndex((bon) => bon.id === id);
        if (indexMy !== -1) {
          this.myBons[indexMy] = updatedBon.data;
          this.totalMyBon = this.myBons.reduce((sum, bon) => sum + parseFloat(bon.jumlahBon), 0);
        }
        const indexAll = this.allBons.findIndex((bon) => bon.id === id);
        if (indexAll !== -1) {
          this.allBons[indexAll] = updatedBon.data;
          this.totalAllBon = this.allBons.reduce((sum, bon) => sum + parseFloat(bon.jumlahBon), 0);
        }
        Swal.fire({
          icon: "success",
          title: "Bon Berhasil Diperbarui!",
          showConfirmButton: false,
          timer: 1500,
        });
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal memperbarui bon.";
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
    async removeBon(id) {
      this.loading = true;
      this.error = null;
      try {
        await bonService.deleteBon(id);
        this.myBons = this.myBons.filter((bon) => bon.id !== id);
        this.totalMyBon = this.myBons.reduce((sum, bon) => sum + parseFloat(bon.jumlahBon), 0);
        this.allBons = this.allBons.filter((bon) => bon.id !== id);
        this.totalAllBon = this.allBons.reduce((sum, bon) => sum + parseFloat(bon.jumlahBon), 0);
        Swal.fire({
          icon: "success",
          title: "Bon Berhasil Dihapus!",
          showConfirmButton: false,
          timer: 1500,
        });
        return true;
      } catch (err) {
        this.error = err.response?.data?.message || "Gagal menghapus bon.";
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
