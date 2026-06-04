<script setup>
import { onMounted, ref, computed } from "vue";
import { useBonStore } from "../../stores/bon";
import { useUserStore } from "../../stores/user";

import { useAuthStore } from "../../stores/auth";
import { useRouter } from "vue-router";

import Swal from "sweetalert2";

const authStore = useAuthStore();
const router = useRouter();

const currentUser = computed(() => authStore.getCurrentUser);
const isAdmin = computed(() => authStore.isUserAdmin);

const bonStore = useBonStore();
const userStore = useUserStore();

const showAddBonModal = ref(false);
const showEditBonModal = ref(false);
const showDetailModal = ref(false);
const selectedEmployeeName = ref(null);
const searchTerm = ref("");

const currentPage = ref(1);
const itemsPerPage = ref(10);

const newBon = ref({
  userId: "",
  tanggalBon: "",
  jumlahBon: 0,
  keterangan: "",
});

const editedBon = ref(null);

onMounted(async () => {
  await bonStore.fetchBonActive({});
  await userStore.userActive();
  console.log("Saat ini", currentUser?.role);
});

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const groupedBons = computed(() => {
  if (!bonStore.allBons.length || !userStore.users.length) {
    return [];
  }

  let filteredBons = bonStore.allBons.map((bon) => {
    const employee = userStore.users.find((user) => user.id === bon.userId);
    return {
      ...bon,
      karyawan: employee ? employee.namaLengkap : "N/A",
    };
  });

  // Apply search filter
  if (searchTerm.value) {
    filteredBons = filteredBons.filter(
      (bon) =>
        bon.karyawan.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        bon.keterangan?.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
  }

  // Group by employee
  const grouped = filteredBons.reduce((acc, bon) => {
    const employeeName = bon.karyawan;
    if (!acc[employeeName]) {
      acc[employeeName] = {
        employeeName,
        bons: [],
        totalAmount: 0,
        totalCount: 0,
      };
    }
    acc[employeeName].bons.push(bon);
    acc[employeeName].totalAmount += parseFloat(bon.jumlahBon || 0);
    acc[employeeName].totalCount += 1;
    return acc;
  }, {});

  // Convert to array and sort by employee name
  return Object.values(grouped).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
});
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numValue);
};

// Computed property to get bons with employee names and filtering
const bonsWithEmployeeNames = computed(() => {
  if (!bonStore.allBons.length || !userStore.users.length) {
    return [];
  }

  let filteredBons = bonStore.allBons.map((bon) => {
    const employee = userStore.users.find((user) => user.id === bon.userId);
    return {
      ...bon,
      karyawan: employee ? employee.namaLengkap : "N/A",
    };
  });

  // Apply search filter
  if (searchTerm.value) {
    filteredBons = filteredBons.filter(
      (bon) =>
        bon.karyawan.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
        bon.keterangan?.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
  }

  // Sort by date (newest first)
  return filteredBons.sort((a, b) => new Date(b.tanggalBon) - new Date(a.tanggalBon));
});

// Computed property for total pages
const totalPages = computed(() => {
  return Math.ceil(groupedBons.value.length / itemsPerPage.value);
});

// Functions to handle page navigation
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const totalBons = computed(() =>
  groupedBons.value.reduce((sum, group) => sum + group.totalCount, 0)
);
const totalAmount = computed(() =>
  groupedBons.value.reduce((sum, group) => sum + group.totalAmount, 0)
);

// --- Bon Management Handlers ---
const handleAddBon = async () => {
  if (!newBon.value.userId || !newBon.value.tanggalBon || newBon.value.jumlahBon <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Karyawan, Tanggal Bon, dan Jumlah Bon harus diisi dan Jumlah Bon harus lebih dari 0.",
      confirmButtonColor: "#3B82F6",
    });
    return;
  }

  const bonDataToSend = {
    userId: newBon.value.userId,
    tanggal: newBon.value.tanggalBon, // Mapped to 'tanggal' for backend
    jumlahBon: newBon.value.jumlahBon,
    keperluan: newBon.value.keterangan || "", // Mapped to 'keperluan' for backend
  };

  const success = await bonStore.addBon(bonDataToSend);
  if (success) {
    showAddBonModal.value = false;
    newBon.value = {
      userId: "",
      tanggalBon: "",
      jumlahBon: 0,
      keterangan: "",
    };
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "Bon berhasil ditambahkan.",
      confirmButtonColor: "#3B82F6",
      timer: 2000,
    });
  }
};

const openEditBonModal = (bon) => {
  editedBon.value = { ...bon, jumlahBon: parseFloat(bon.jumlahBon) };
  showEditBonModal.value = true;
};

const handleUpdateBon = async () => {
  if (!editedBon.value.tanggalBon || editedBon.value.jumlahBon <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Tanggal Bon dan Jumlah Bon harus diisi dan Jumlah Bon harus lebih dari 0.",
      confirmButtonColor: "#3B82F6",
    });
    return;
  }

  // Ensure userId is passed correctly for the update
  const dataToUpdate = {
    userId: editedBon.value.userId, // Keep the original userId of the bon being edited
    tanggal: editedBon.value.tanggalBon, // Mapped to 'tanggal' for backend
    jumlahBon: editedBon.value.jumlahBon,
    keperluan: editedBon.value.keterangan || "", // Mapped to 'keperluan' for backend
  };

  const success = await bonStore.updateExistingBon(editedBon.value.id, dataToUpdate);
  if (success) {
    showEditBonModal.value = false;
    editedBon.value = null;
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "Bon berhasil diperbarui.",
      confirmButtonColor: "#3B82F6",
      timer: 2000,
    });
  }
};

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return groupedBons.value.slice(start, end);
});

// 3. Update total pages untuk grup

const handleDeleteBon = async (id, namaKaryawan, jumlahBon) => {
  const result = await Swal.fire({
    title: "Konfirmasi Hapus",
    html: `Apakah Anda yakin ingin menghapus bon sejumlah <strong>${formatCurrency(
      jumlahBon
    )}</strong> untuk <strong>${namaKaryawan}</strong>?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#EF4444",
    cancelButtonColor: "#6B7280",
    confirmButtonText: "Ya, Hapus",
    cancelButtonText: "Batal",
    reverseButtons: true,
  });

  if (result.isConfirmed) {
    const success = await bonStore.removeBon(id);
    if (success) {
      Swal.fire({
        icon: "success",
        title: "Terhapus!",
        text: "Bon berhasil dihapus.",
        confirmButtonColor: "#3B82F6",
        timer: 2000,
      });
      // Close detail modal if the employee no longer has any bon left
      if (showDetailModal.value && !selectedGroup.value) {
        closeDetailModal();
      }
      // After deleting, re-evaluate total pages and adjust current page if needed
      if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = totalPages.value;
      } else if (totalPages.value === 0) {
        currentPage.value = 1;
      }
      // await bonStore.fetchAllBons({}); // Uncomment if your backend has pagination
    }
  }
};
const closeModal = () => {
  showAddBonModal.value = false;
  showEditBonModal.value = false;
  editedBon.value = null;
  newBon.value = {
    userId: "",
    tanggalBon: "",
    jumlahBon: 0,
    keterangan: "",
  };
};

// --- Detail Modal (per karyawan) ---
const selectedGroup = computed(
  () =>
    groupedBons.value.find((group) => group.employeeName === selectedEmployeeName.value) || null
);

const openDetailModal = (employeeName) => {
  selectedEmployeeName.value = employeeName;
  showDetailModal.value = true;
};

const closeDetailModal = () => {
  showDetailModal.value = false;
  selectedEmployeeName.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <!-- Page header -->
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Administrasi
          </p>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Manajemen Bon Karyawan
          </h1>
          <p class="text-slate-500 mt-1 text-sm sm:text-base">
            Pantau, kelola, dan rekapitulasi pinjaman karyawan secara real-time.
          </p>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" stroke-width="1.8"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Bon</div>
            <div class="text-2xl font-bold text-slate-900 leading-tight">{{ totalBons }}</div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"
              viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Nilai</div>
            <div class="text-2xl font-bold text-emerald-600 leading-tight">{{ formatCurrency(totalAmount) }}</div>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div class="w-11 h-11 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4 0m4 0a4 4 0 014 4M7 9a4 4 0 118 0 4 4 0 01-8 0z" />
            </svg>
          </div>
          <div>
            <div class="text-xs font-medium text-slate-500 uppercase tracking-wide">Karyawan</div>
            <div class="text-2xl font-bold text-slate-900 leading-tight">{{ groupedBons.length }}</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm px-4 sm:px-5 py-4 mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative w-full sm:max-w-sm">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" fill="none"
              stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input v-model="searchTerm" type="text" placeholder="Cari karyawan atau keperluan..."
              class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition" />
          </div>
          <div class="text-sm text-slate-500 sm:text-right">
            <span class="font-semibold text-slate-700">{{ totalBons }}</span> bon dari
            <span class="font-semibold text-slate-700">{{ groupedBons.length }}</span> karyawan
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="bonStore.loading || userStore.loading"
        class="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-11 w-11 border-4 border-indigo-600 border-t-transparent mx-auto mb-4">
          </div>
          <p class="text-slate-500 font-medium text-sm">Memuat data bon...</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="bonStore.error || userStore.error"
        class="bg-rose-50 border border-rose-200 text-rose-700 px-5 py-4 rounded-xl flex items-start gap-3">
        <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong class="font-semibold">Terjadi Kesalahan</strong>
          <p class="mt-0.5 text-sm">{{ bonStore.error || userStore.error }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="paginatedGroups.length === 0"
        class="bg-white rounded-xl border border-dashed border-slate-300 shadow-sm py-16 px-6 text-center">
        <div class="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-slate-800">Tidak ada data bon</h3>
        <p class="text-sm text-slate-500 mt-1">
          {{ searchTerm ? 'Tidak ada hasil untuk pencarian Anda.' : 'Belum ada bon karyawan yang tercatat.' }}
        </p>
      </div>

      <!-- Data: employee summary list -->
      <div v-else
        class="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        <button v-for="group in paginatedGroups" :key="group.employeeName" type="button"
          @click="openDetailModal(group.employeeName)"
          class="w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-slate-50 transition-colors group">
          <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <span class="text-white font-semibold text-sm">
              {{ group.employeeName.charAt(0).toUpperCase() }}
            </span>
          </div>

          <div class="min-w-0 flex-1">
            <h3 class="font-semibold text-slate-900 truncate">{{ group.employeeName }}</h3>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {{ group.totalCount }} bon
            </span>
          </div>

          <div class="text-right flex-shrink-0">
            <div class="text-xs text-slate-400 uppercase tracking-wide">Total Bon</div>
            <div class="text-base sm:text-lg font-bold text-slate-900">{{ formatCurrency(group.totalAmount) }}</div>
          </div>

          <svg class="w-5 h-5 text-slate-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" fill="none"
            stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Detail Modal: bon per karyawan -->
    <Teleport to="body">
      <div v-if="showDetailModal && selectedGroup"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
        @click.self="closeDetailModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[75vh] my-auto overflow-y-auto">
          <!-- Modal header -->
          <div class="bg-indigo-600 px-5 sm:px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span class="text-white font-semibold">
                  {{ selectedGroup.employeeName.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-semibold text-white truncate">{{ selectedGroup.employeeName }}</h2>
                <p class="text-indigo-100 text-xs">{{ selectedGroup.totalCount }} bon tercatat</p>
              </div>
            </div>
            <button @click="closeDetailModal" class="text-white hover:text-white transition-colors flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Total summary -->
          <div class="px-5 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span class="text-sm font-medium text-slate-500">Total Bon</span>
            <span class="text-xl font-bold text-emerald-600">{{ formatCurrency(selectedGroup.totalAmount) }}</span>
          </div>

          <!-- Bon list -->
          <div class="divide-y divide-slate-100">
            <div v-for="bon in selectedGroup.bons.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))"
              :key="bon.id" class="px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2"
                      viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="text-sm font-medium text-slate-700">{{ formatDate(bon.tanggal) }}</span>
                  </div>
                  <p v-if="bon.keperluan" class="text-sm text-slate-600">{{ bon.keperluan }}</p>
                  <p v-else class="text-sm text-slate-400 italic">Tidak ada keterangan</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-sm font-bold text-slate-900 mb-2 whitespace-nowrap">
                    {{ formatCurrency(bon.jumlahBon) }}
                  </div>
                  <button @click="handleDeleteBon(bon.id, selectedGroup.employeeName, bon.jumlahBon)"
                    class="inline-flex items-center gap-1.5 text-rose-600 hover:text-white hover:bg-red-600 border border-rose-200 hover:border-rose-600 px-3 py-1.5 rounded-md text-xs font-medium transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="px-5 sm:px-6 py-3 border-t border-slate-100 flex justify-end">
            <button @click="closeDetailModal"
              class="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="showAddBonModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="closeModal">
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] my-auto overflow-y-auto transform transition-all duration-200">
        <div class="bg-indigo-600 px-6 py-4 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Tambah Bon Baru</h2>
            <button @click="closeModal" class="text-white hover:text-gray-200 transition-colors duration-150">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleAddBon" class="p-6 space-y-5">
          <div>
            <label for="bonUser" class="block text-sm font-semibold text-slate-700 mb-2">
              Karyawan *
            </label>
            <select id="bonUser" v-model="newBon.userId"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              required>
              <option value="" disabled>Pilih Karyawan</option>
              <option v-for="user in userStore.users" :key="user.id" :value="user.id">
                {{ user.namaLengkap }} ({{ user.username }})
              </option>
            </select>
          </div>

          <div>
            <label for="newBonTanggal" class="block text-sm font-semibold text-slate-700 mb-2">
              Tanggal Bon *
            </label>
            <input type="date" id="newBonTanggal" v-model="newBon.tanggalBon"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              required />
          </div>

          <div>
            <label for="newBonJumlah" class="block text-sm font-semibold text-slate-700 mb-2">
              Jumlah Bon (IDR) *
            </label>
            <input type="number" id="newBonJumlah" v-model.number="newBon.jumlahBon"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              required min="1" placeholder="0" />
          </div>

          <div>
            <label for="newBonKeterangan" class="block text-sm font-semibold text-slate-700 mb-2">
              Keterangan
            </label>
            <textarea id="newBonKeterangan" v-model="newBon.keterangan" rows="3"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 resize-none"
              placeholder="Keterangan tambahan (opsional)"></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="closeModal"
              class="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors duration-200">
              Batal
            </button>
            <button type="submit" :disabled="bonStore.loading"
              class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
              <svg v-if="bonStore.loading" class="animate-spin w-4 h-4" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span v-if="bonStore.loading">Menyimpan...</span>
              <span v-else>Tambah Bon</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditBonModal && editedBon"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      @click.self="closeModal">
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] my-auto overflow-y-auto transform transition-all duration-200">
        <div class="bg-indigo-600 px-6 py-4 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Edit Bon</h2>
            <button @click="closeModal" class="text-white hover:text-gray-200 transition-colors duration-150">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleUpdateBon" class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Karyawan</label>
            <div class="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p class="text-slate-800 font-medium">{{ editedBon.karyawan || "N/A" }}</p>
            </div>
          </div>

          <div>
            <label for="editBonTanggal" class="block text-sm font-semibold text-slate-700 mb-2">
              Tanggal Bon *
            </label>
            <input type="date" id="editBonTanggal" v-model="editedBon.tanggalBon"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              required />
          </div>

          <div>
            <label for="editBonJumlah" class="block text-sm font-semibold text-slate-700 mb-2">
              Jumlah Bon (IDR) *
            </label>
            <input type="number" id="editBonJumlah" v-model.number="editedBon.jumlahBon"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200"
              required min="1" />
          </div>

          <div>
            <label for="editBonKeterangan" class="block text-sm font-semibold text-slate-700 mb-2">
              Keterangan
            </label>
            <textarea id="editBonKeterangan" v-model="editedBon.keterangan" rows="3"
              class="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all duration-200 resize-none"
              placeholder="Keterangan tambahan (opsional)"></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" @click="closeModal"
              class="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors duration-200">
              Batal
            </button>
            <button type="submit" :disabled="bonStore.loading"
              class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
              <svg v-if="bonStore.loading" class="animate-spin w-4 h-4" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span v-if="bonStore.loading">Memperbarui...</span>
              <span v-else>Update Bon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div v-if="totalPages > 1" class="flex justify-center items-center gap-1.5 mt-2 pb-10">
    <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
      class="px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      Sebelumnya
    </button>

    <div class="flex gap-1">
      <button v-for="page in Math.min(totalPages, 5)" :key="page" @click="goToPage(page)" :class="[
        'w-9 h-9 text-sm font-medium rounded-lg transition-colors',
        currentPage === page
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50',
      ]">
        {{ page }}
      </button>
    </div>

    <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
      class="px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      Berikutnya
    </button>
  </div>
</template>

<style scoped>
/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

* {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke,
    opacity, box-shadow, transform, filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
