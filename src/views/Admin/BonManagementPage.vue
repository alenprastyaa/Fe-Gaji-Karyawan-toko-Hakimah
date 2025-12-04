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
  await bonStore.fetchAllBons({});
  await userStore.fetchAllUsers();
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
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div class="max-w-full mx-auto">
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-gray-900 mb-2">Manajemen Bon Karyawan</h1>
            <p class="text-gray-600 text-lg">Kelola dan pantau data bon karyawan dengan mudah</p>
          </div>
          <div class="hidden md:flex items-center space-x-4">
            <div class="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div class="text-sm text-gray-500 font-medium">Total Bon</div>
              <div class="text-2xl font-bold text-gray-900">{{ totalBons }}</div>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
              <div class="text-sm text-gray-500 font-medium">Total Nilai</div>
              <div class="text-2xl font-bold text-blue-600">{{ formatCurrency(totalAmount) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div class="px-6 py-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center space-x-4">
              <div class="relative">
                <svg
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  v-model="searchTerm"
                  type="text"
                  placeholder="Cari karyawan atau keterangan..."
                  class="shadow-lg pl-10 pr-4 py-2.5 w-64 rounded-lg border border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                />
              </div>
            </div>

            <!-- <button
              @click="showAddBonModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                ></path>
              </svg>
              <span>Tambah Bon</span>
            </button> -->
          </div>
        </div>

        <div
          v-if="bonStore.loading || userStore.loading"
          class="flex items-center justify-center py-16"
        >
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"
            ></div>
            <p class="text-gray-600 font-medium">Memuat data bon...</p>
          </div>
        </div>

        <div
          v-else-if="bonStore.error || userStore.error"
          class="mx-6 my-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl"
        >
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <strong class="font-semibold">Terjadi Kesalahan!</strong>
              <p class="mt-1">{{ bonStore.error || userStore.error }}</p>
            </div>
          </div>
        </div>
        <div v-if="paginatedGroups.length > 0" class="">
          <div class="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <!-- Header Table -->
            <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 class="text-xl font-bold text-white">Data Bon Karyawan</h2>
            </div>

            <!-- Desktop/Tablet Table View -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full">
                <!-- Table Header -->
                <thead class="bg-gray-200 border-b border-gray-200">
                  <tr>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Karyawan
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Tanggal
                    </th>
                    <th
                      class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Keperluan
                    </th>
                    <th
                      class="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Jumlah
                    </th>
                    <th
                      class="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      Aksi
                    </th>
                  </tr>
                </thead>

                <!-- Table Body -->
                <tbody class="bg-white">
                  <template v-for="group in paginatedGroups" :key="group.employeeName">
                    <!-- Employee Group Header Row -->
                    <tr
                      class="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 border-t-2 border-t-gray-300"
                    >
                      <td class="px-6 py-4" colspan="5">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center space-x-3">
                            <!-- Avatar -->
                            <div
                              class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md"
                            >
                              <span class="text-white font-bold text-sm">
                                {{ group.employeeName.charAt(0).toUpperCase() }}
                              </span>
                            </div>
                            <div>
                              <h3 class="font-bold text-gray-900 text-lg">
                                {{ group.employeeName }}
                              </h3>
                              <span
                                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"
                              >
                                {{ group.totalCount }} bon
                              </span>
                            </div>
                          </div>
                          <div class="text-right">
                            <div class="text-xl font-bold text-gray-900">
                              {{ formatCurrency(group.totalAmount) }}
                            </div>
                            <div class="text-gray-500 text-sm">Total</div>
                          </div>
                        </div>
                      </td>
                    </tr>

                    <!-- Employee's Bon Records -->
                    <tr
                      v-for="bon in group.bons.sort(
                        (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
                      )"
                      :key="bon.id"
                      class="hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100"
                    >
                      <!-- Employee Name (Empty for grouped records) -->
                      <td class="px-6 py-4">
                        <div class="w-8 h-0.5 bg-gray-300 ml-4"></div>
                      </td>

                      <!-- Date -->
                      <td class="px-6 py-4">
                        <div class="flex items-center space-x-2">
                          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span class="text-sm font-medium text-gray-700">
                            {{ formatDate(bon.tanggal) }}
                          </span>
                        </div>
                      </td>

                      <!-- Purpose -->
                      <td class="px-6 py-4">
                        <div class="max-w-xs">
                          <div v-if="bon.keperluan" class="text-sm text-gray-800">
                            {{ bon.keperluan }}
                          </div>
                          <div v-else class="text-sm text-gray-400 italic">
                            Tidak ada keterangan
                          </div>
                        </div>
                      </td>

                      <!-- Amount -->
                      <td class="px-6 py-4 text-right">
                        <span
                          class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-green-100 text-green-800"
                        >
                          {{ formatCurrency(bon.jumlahBon) }}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td class="px-6 py-4">
                        <div class="flex items-center justify-center space-x-2">
                          <button
                            @click="handleDeleteBon(bon.id, group.employeeName, bon.jumlahBon)"
                            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shadow hover:shadow-md transform hover:scale-105 transition-all duration-200 flex items-center space-x-1"
                          >
                            <svg
                              class="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    <!-- Spacer row between employees -->
                    <tr class="bg-gray-100 h-2">
                      <td colspan="5" class="border-t-2 border-gray-300"></td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>

            <!-- Mobile Card View -->
            <div class="md:hidden">
              <div class="space-y-6 p-4">
                <template v-for="group in paginatedGroups" :key="group.employeeName">
                  <!-- Employee Group Header Card -->
                  <div
                    class="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center space-x-3">
                        <!-- Avatar -->
                        <div
                          class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md"
                        >
                          <span class="text-white font-bold text-lg">
                            {{ group.employeeName.charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <div>
                          <h3 class="font-bold text-gray-900 text-lg">
                            {{ group.employeeName }}
                          </h3>
                          <span
                            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"
                          >
                            {{ group.totalCount }} bon
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Total Amount -->
                    <div class="bg-white rounded-lg p-3 border border-blue-200">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-600">Total Bon:</span>
                        <div class="text-right">
                          <div class="text-xl font-bold text-gray-900">
                            {{ formatCurrency(group.totalAmount) }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Employee's Bon Records Cards -->
                  <div class="space-y-3 ml-4">
                    <div
                      v-for="bon in group.bons.sort(
                        (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
                      )"
                      :key="bon.id"
                      class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <!-- Bon Item Header -->
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center space-x-2">
                          <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span class="text-sm font-medium text-gray-700">
                            {{ formatDate(bon.tanggal) }}
                          </span>
                        </div>
                        <span
                          class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-green-100 text-green-800"
                        >
                          {{ formatCurrency(bon.jumlahBon) }}
                        </span>
                      </div>

                      <!-- Keperluan -->
                      <div class="mb-4">
                        <div class="text-xs font-medium text-gray-500 mb-1">Keperluan:</div>
                        <div
                          v-if="bon.keperluan"
                          class="text-sm text-gray-800 bg-gray-50 p-2 rounded"
                        >
                          {{ bon.keperluan }}
                        </div>
                        <div v-else class="text-sm text-gray-400 italic bg-gray-50 p-2 rounded">
                          Tidak ada keterangan
                        </div>
                      </div>

                      <!-- Action Button -->
                      <div class="flex justify-end">
                        <button
                          @click="handleDeleteBon(bon.id, group.employeeName, bon.jumlahBon)"
                          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow hover:shadow-md transition-all duration-200 flex items-center space-x-2"
                        >
                          <svg
                            class="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Divider between employees -->
                  <div
                    class="h-4 bg-gradient-to-r from-transparent via-gray-300 to-transparent"
                  ></div>
                </template>
              </div>
            </div>

            <!-- Table Footer -->
            <div class="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div class="flex items-center justify-between text-sm text-gray-600">
                <div>Menampilkan data bon karyawan</div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Data terbaru</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showAddBonModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200"
      >
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Tambah Bon Baru</h2>
            <button
              @click="closeModal"
              class="text-white hover:text-gray-200 transition-colors duration-150"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleAddBon" class="p-6 space-y-5">
          <div>
            <label for="bonUser" class="block text-sm font-semibold text-gray-700 mb-2">
              Karyawan *
            </label>
            <select
              id="bonUser"
              v-model="newBon.userId"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              required
            >
              <option value="" disabled>Pilih Karyawan</option>
              <option v-for="user in userStore.users" :key="user.id" :value="user.id">
                {{ user.namaLengkap }} ({{ user.username }})
              </option>
            </select>
          </div>

          <div>
            <label for="newBonTanggal" class="block text-sm font-semibold text-gray-700 mb-2">
              Tanggal Bon *
            </label>
            <input
              type="date"
              id="newBonTanggal"
              v-model="newBon.tanggalBon"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              required
            />
          </div>

          <div>
            <label for="newBonJumlah" class="block text-sm font-semibold text-gray-700 mb-2">
              Jumlah Bon (IDR) *
            </label>
            <input
              type="number"
              id="newBonJumlah"
              v-model.number="newBon.jumlahBon"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              required
              min="1"
              placeholder="0"
            />
          </div>

          <div>
            <label for="newBonKeterangan" class="block text-sm font-semibold text-gray-700 mb-2">
              Keterangan
            </label>
            <textarea
              id="newBonKeterangan"
              v-model="newBon.keterangan"
              rows="3"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none"
              placeholder="Keterangan tambahan (opsional)"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors duration-200"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="bonStore.loading"
              class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg
                v-if="bonStore.loading"
                class="animate-spin w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span v-if="bonStore.loading">Menyimpan...</span>
              <span v-else>Tambah Bon</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showEditBonModal && editedBon"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-200"
      >
        <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Edit Bon</h2>
            <button
              @click="closeModal"
              class="text-white hover:text-gray-200 transition-colors duration-150"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleUpdateBon" class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Karyawan</label>
            <div class="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p class="text-gray-800 font-medium">{{ editedBon.karyawan || "N/A" }}</p>
            </div>
          </div>

          <div>
            <label for="editBonTanggal" class="block text-sm font-semibold text-gray-700 mb-2">
              Tanggal Bon *
            </label>
            <input
              type="date"
              id="editBonTanggal"
              v-model="editedBon.tanggalBon"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200"
              required
            />
          </div>

          <div>
            <label for="editBonJumlah" class="block text-sm font-semibold text-gray-700 mb-2">
              Jumlah Bon (IDR) *
            </label>
            <input
              type="number"
              id="editBonJumlah"
              v-model.number="editedBon.jumlahBon"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200"
              required
              min="1"
            />
          </div>

          <div>
            <label for="editBonKeterangan" class="block text-sm font-semibold text-gray-700 mb-2">
              Keterangan
            </label>
            <textarea
              id="editBonKeterangan"
              v-model="editedBon.keterangan"
              rows="3"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all duration-200 resize-none"
              placeholder="Keterangan tambahan (opsional)"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-2.5 text-gray-700 bg-gray-300 hover:bg-gray-200 font-medium rounded-lg transition-colors duration-200"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="bonStore.loading"
              class="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg
                v-if="bonStore.loading"
                class="animate-spin w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span v-if="bonStore.loading">Memperbarui...</span>
              <span v-else>Update Bon</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div v-if="totalPages > 1" class="flex justify-center items-center space-x-2 mt-8 pb-8">
    <button
      @click="goToPage(currentPage - 1)"
      :disabled="currentPage === 1"
      class="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
    >
      Previous
    </button>

    <div class="flex space-x-1">
      <button
        v-for="page in Math.min(totalPages, 5)"
        :key="page"
        @click="goToPage(page)"
        :class="[
          'px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200',
          currentPage === page
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
        ]"
      >
        {{ page }}
      </button>
    </div>

    <button
      @click="goToPage(currentPage + 1)"
      :disabled="currentPage === totalPages"
      class="px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
    >
      Next
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
