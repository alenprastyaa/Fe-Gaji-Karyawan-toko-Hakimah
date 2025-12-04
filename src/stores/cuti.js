// stores/cuti.js
import { defineStore } from "pinia";
import cutiService from "../services/cutiService";
import Swal from "sweetalert2";
import { useAuthStore } from "./auth";
import router from "../router";

export const useCutiStore = defineStore("cuti", {
  state: () => ({
    myCuti: [], // State for current user's leaves
    allCuti: [], // State for all leaves (admin view)
    cutiStatistics: null, // Statistics for user's cuti
    selectedCuti: null, // For storing single cuti detail
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      itemsPerPage: 10,
      hasNextPage: false,
      hasPrevPage: false,
    },
    loading: false,
    error: null,
  }),

  getters: {
    // Get current user role from auth store
    currentUserRole: () => {
      const authStore = useAuthStore();
      return authStore.getCurrentUser?.role || "karyawan";
    },

    // Filter cuti by status
    pendingCuti: (state) => {
      const cutis = state.currentUserRole === "admin" ? state.allCuti : state.myCuti;
      return cutis.filter((cuti) => cuti.disetujui === false);
    },

    approvedCuti: (state) => {
      const cutis = state.currentUserRole === "admin" ? state.allCuti : state.myCuti;
      return cutis.filter((cuti) => cuti.disetujui === true);
    },
  },

  actions: {
    // ===== ACTIONS UNTUK USER/KARYAWAN =====

    // Fetch cuti milik user yang sedang login
    async fetchMyCuti(filters = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.getMyCuti(filters);
        this.myCuti = response.data.data.cutis;
        this.cutiStatistics = response.data.data.statistics;
        this.pagination = response.data.data.pagination;
      } catch (err) {
        this.handleError(err, "Gagal mengambil data cuti Anda.");
      } finally {
        this.loading = false;
      }
    },

    // Fetch detail cuti milik user
    async fetchMyCutiById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.getMyCutiById(id);
        this.selectedCuti = response.data.data.cuti;
        return response.data.data.cuti;
      } catch (err) {
        this.handleError(err, "Gagal mengambil detail cuti.");
        return null;
      } finally {
        this.loading = false;
      }
    },

    // User mengajukan cuti baru
    async submitMyCuti(cutiData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.createMyCuti(cutiData);
        // Add to myCuti array
        this.myCuti.unshift(response.data.data.cuti);

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Pengajuan cuti berhasil disubmit dan menunggu persetujuan!",
        });

        // Redirect to my cuti list
        router.push("/my-bons");
        return true;
      } catch (err) {
        this.handleError(err, "Gagal mengajukan cuti.");
        return false;
      } finally {
        this.loading = false;
      }
    },

    // ===== ACTIONS UNTUK ADMIN =====

    // Fetch semua cuti (admin only)
    async fetchAllCuti(filters = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.getAllCuti(filters);
        this.allCuti = response.data.data.cutis;
        this.pagination = response.data.data.pagination;
      } catch (err) {
        this.handleError(err, "Gagal memuat semua data cuti.");
      } finally {
        this.loading = false;
      }
    },

    // Fetch detail cuti berdasarkan ID (admin only)
    async fetchCutiById(id) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.getCutiById(id);
        this.selectedCuti = response.data.data.cuti;
        return response.data.data.cuti;
      } catch (err) {
        this.handleError(err, "Gagal mengambil detail cuti.");
        return null;
      } finally {
        this.loading = false;
      }
    },

    // Admin membuat cuti untuk user lain
    async createCuti(cutiData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.createCuti(cutiData);
        this.allCuti.unshift(response.data.data.cuti);

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Cuti berhasil ditambahkan!",
        });
        return true;
      } catch (err) {
        this.handleError(err, "Gagal menambahkan cuti.");
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Admin update cuti
    async updateCuti(id, cutiData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.updateCuti(id, cutiData);

        // Update in allCuti
        const indexAll = this.allCuti.findIndex((cuti) => cuti.id === id);
        if (indexAll !== -1) {
          this.allCuti[indexAll] = response.data.data.cuti;
        }

        // Update selectedCuti if it's the same
        if (this.selectedCuti?.id === id) {
          this.selectedCuti = response.data.data.cuti;
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Cuti berhasil diperbarui!",
        });
        return true;
      } catch (err) {
        this.handleError(err, "Gagal memperbarui cuti.");
        return false;
      } finally {
        this.loading = false;
      }
    },

    async approveCuti(id, approvalData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await cutiService.approveCuti(id, approvalData);

        const indexAll = this.allCuti.findIndex((cuti) => cuti.id === id);
        if (indexAll !== -1) {
          this.allCuti[indexAll] = response.data.data.cuti;
        }

        if (this.selectedCuti?.id === id) {
          this.selectedCuti = response.data.data.cuti;
        }

        const statusText = approvalData.disetujui ? "disetujui" : "ditolak";
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: `Cuti berhasil ${statusText}!`,
        });
        return true;
      } catch (err) {
        this.handleError(err, "Gagal memproses persetujuan cuti.");
        return false;
      } finally {
        this.loading = false;
      }
    },

    async deleteCuti(id) {
      const result = await Swal.fire({
        title: "Apakah Anda yakin?",
        text: "Data cuti yang dihapus tidak dapat dikembalikan!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, Hapus!",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return false;

      this.loading = true;
      this.error = null;
      try {
        await cutiService.deleteCuti(id);

        this.allCuti = this.allCuti.filter((cuti) => cuti.id !== id);
        if (this.selectedCuti?.id === id) {
          this.selectedCuti = null;
        }

        Swal.fire({
          icon: "success",
          title: "Berhasil Dihapus!",
          text: "Data cuti telah berhasil dihapus.",
        });
        return true;
      } catch (err) {
        this.handleError(err, "Gagal menghapus cuti.");
        return false;
      } finally {
        this.loading = false;
      }
    },
    async fetchCutiList(filters = {}) {
      const authStore = useAuthStore();
      const userRole = authStore.getCurrentUser?.role;

      if (userRole === "admin") {
        await this.fetchAllCuti(filters);
      } else {
        await this.fetchMyCuti(filters);
      }
    },

    async fetchCutiDetail(id) {
      const authStore = useAuthStore();
      const userRole = authStore.getCurrentUser?.role;

      if (userRole === "admin") {
        return await this.fetchCutiById(id);
      } else {
        return await this.fetchMyCutiById(id);
      }
    },

    async createCutiRequest(cutiData) {
      const authStore = useAuthStore();
      const userRole = authStore.getCurrentUser?.role;

      if (userRole === "admin") {
        return await this.createCuti(cutiData);
      } else {
        return await this.submitMyCuti(cutiData);
      }
    },

    clearSelectedCuti() {
      this.selectedCuti = null;
    },

    clearState() {
      this.myCuti = [];
      this.allCuti = [];
      this.cutiStatistics = null;
      this.selectedCuti = null;
      this.error = null;
    },

    handleError(err, defaultMessage) {
      this.error = err.response?.data?.message || err.message || defaultMessage;

      if (err.response?.status === 401) {
        Swal.fire({
          icon: "warning",
          title: "Sesi Habis",
          text: "Mohon login kembali.",
        });
        router.push("/login");
        return;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: this.error,
      });
    },
  },
});
