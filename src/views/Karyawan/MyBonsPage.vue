<script setup>
import { onMounted, computed, ref, reactive } from "vue";
import { useBonStore } from "../../stores/bon";
import { useCutiStore } from "../../stores/cuti";

const bonStore = useBonStore();
const cutiStore = useCutiStore();

const showCutiModal = ref(false);
const showBonModal = ref(false);

const cutiForm = reactive({
  jenisCuti: "Cuti Tahunan",
  tanggalMulai: "",
  tanggalSelesai: "",
  keperluan: "",
  alamatSelama: "",
});

const bonForm = reactive({
  tanggal: "",
  jumlahBon: "",
  keperluan: "",
});

const isSubmittingCuti = ref(false);
const isSubmittingBon = ref(false);

onMounted(() => {
  bonStore.fetchMyBons();
  cutiStore.fetchMyCuti();
});

const formattedBons = computed(() => {
  if (!bonStore.myBons) return [];
  return bonStore.myBons.map((bon, index) => ({
    ...bon,
    no: index + 1,
    formattedTanggal: new Date(bon.tanggal).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    formattedJumlahBon: new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(bon.jumlahBon),
  }));
});

const formattedCuti = computed(() => {
  if (!cutiStore.myCuti) return [];
  return cutiStore.myCuti.map((cuti, index) => ({
    ...cuti,
    no: index + 1,
    formattedTanggalMulai: new Date(cuti.tanggalMulai).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    formattedTanggalSelesai: new Date(cuti.tanggalSelesai).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    statusBadgeClass: getStatusBadgeClass(cuti.status),
    durasi: calculateDuration(cuti.tanggalMulai, cuti.tanggalSelesai),
  }));
});

const formattedTotalBon = computed(() => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(bonStore.totalMyBon);
});

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "disetujui":
      return "bg-emerald-100 text-blue-800 border border-emerald-200";
    case "pending":
    case "menunggu":
      return "bg-amber-100 text-green-800 border border-amber-200";
    case "rejected":
    case "ditolak":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-slate-100 text-slate-800 border border-slate-200";
  }
};

const calculateDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return "0 hari";
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Termasuk hari mulai
  return `${diffDays} hari`;
};

// Modal functions
const openCutiModal = () => {
  showCutiModal.value = true;
  // Reset form
  Object.keys(cutiForm).forEach((key) => {
    cutiForm[key] = key === "jenisCuti" ? "Cuti Tahunan" : "";
  });
};

const openBonModal = () => {
  showBonModal.value = true;
  // Reset form
  Object.keys(bonForm).forEach((key) => {
    bonForm[key] = "";
  });
};

const closeCutiModal = () => {
  showCutiModal.value = false;
};

const closeBonModal = () => {
  showBonModal.value = false;
};

const submitCuti = async () => {
  if (!cutiForm.tanggalMulai || !cutiForm.tanggalSelesai || !cutiForm.keperluan) {
    alert("Tanggal mulai, selesai, dan keterangan harus diisi");
    return;
  }

  isSubmittingCuti.value = true;
  try {
    const success = await cutiStore.createCutiRequest({
      jenisCuti: cutiForm.jenisCuti,
      tanggalMulai: cutiForm.tanggalMulai,
      tanggalSelesai: cutiForm.tanggalSelesai,
      keperluan: cutiForm.keperluan,
      alamatSelama: cutiForm.alamatSelama,
    });

    if (success) {
      closeCutiModal();
      cutiStore.fetchMyCuti();
    }
  } catch (error) {
    console.error("Error submitting cuti:", error);
    alert("Gagal mengajukan cuti. Silakan coba lagi.");
  } finally {
    isSubmittingCuti.value = false;
  }
};

const submitBon = async () => {
  if (!bonForm.tanggal || !bonForm.jumlahBon || !bonForm.keperluan) {
    alert("Semua field harus diisi");
    return;
  }

  isSubmittingBon.value = true;
  try {
    const success = await bonStore.createBon({
      tanggal: bonForm.tanggal,
      jumlahBon: parseFloat(bonForm.jumlahBon),
      keperluan: bonForm.keperluan,
    });

    if (success) {
      closeBonModal();
      bonStore.fetchMyBons(); // Refresh data
    }
  } catch (error) {
    console.error("Error submitting bon:", error);
    alert("Gagal menambah bon. Silakan coba lagi.");
  } finally {
    isSubmittingBon.value = false;
  }
};

// Get today's date for min attribute
const today = new Date().toISOString().split("T")[0];
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8"
  >
    <div class="max-w-7xl mx-auto">
      <div class="mb-8 text-center sm:text-left">
        <h1
          class="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3"
        >
          Dashboard Saya
        </h1>
        <p class="text-slate-600 text-lg">
          Kelola dan pantau catatan cuti dan bon Anda dengan mudah
        </p>
      </div>

      <div
        v-if="bonStore.loading || cutiStore.loading"
        class="flex flex-col items-center justify-center py-20"
      >
        <div class="relative">
          <div
            class="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
          ></div>
          <div
            class="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-purple-600 rounded-full animate-spin animation-delay-150"
          ></div>
        </div>
        <p class="mt-6 text-slate-600 font-medium text-lg">Memuat data...</p>
      </div>

      <div
        v-else-if="bonStore.error || cutiStore.error"
        class="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-2xl shadow-lg mb-8"
        role="alert"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-red-800 font-semibold text-lg">Terjadi Kesalahan</h3>
            <p class="text-red-700">{{ bonStore.error || cutiStore.error }}</p>
          </div>
        </div>
      </div>

      <div v-else class="space-y-10">
        <div class="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
          <button
            @click="openCutiModal"
            class="group bg-green-500 hover:from-emerald-600 hover:to-teal-700 px-6 py-3.5 text-white rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <svg
              class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span class="font-semibold">Ajukan Cuti</span>
          </button>
          <router-link
            class="group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 px-6 py-3.5 text-white rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            to="bon-input"
          >
            <button>
              <svg
                class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <span class="font-semibold">Tambah Bon</span>
          </router-link>
        </div>
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 class="text-xl font-bold text-slate-800">Riwayat Bon Saya</h2>
            <div class="flex items-center gap-2">
              <div
                class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold"
              >
                {{ formattedBons.length }} catatan bon
              </div>
            </div>
          </div>

          <div
            class="bg-white/80 backdrop-blur-lg border border-white/60 rounded-3xl p-8 shadow-sm border border-gray-400"
          >
            <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div class="text-center sm:text-left">
                <h3 class="text-lg font-bold text-slate-700 mb-2">Total Bon Keseluruhan</h3>
                <p
                  class="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
                >
                  {{ formattedTotalBon }}
                </p>
              </div>
              <!-- <div
                class="bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 p-6 rounded-3xl shadow-xl"
              >
                <svg
                  class="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div> -->
            </div>
          </div>
          <div
            v-if="formattedBons.length > 0"
            class="bg-white/80 backdrop-blur-lg border border-white/60 rounded-3xl border border-gray-400 overflow-hidden"
          >
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr
                    class="bg-gradient-to-r from-slate-50 to-purple-50 text-slate-700 text-sm font-bold"
                  >
                    <th class="py-5 px-6 text-left">No</th>
                    <th class="py-5 px-6 text-left">Tanggal</th>
                    <th class="py-5 px-6 text-left">Jumlah Bon</th>
                    <th class="py-5 px-6 text-left">Keperluan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="bon in formattedBons"
                    :key="bon.id"
                    class="border-b border-slate-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200"
                  >
                    <td class="py-5 px-6 text-slate-600 font-semibold">{{ bon.no }}</td>
                    <td class="py-5 px-6 text-slate-700">{{ bon.formattedTanggal }}</td>
                    <td class="py-5 px-6">
                      <span class="font-bold text-blue-600">{{ bon.formattedJumlahBon }}</span>
                    </td>
                    <td class="py-5 px-6 text-slate-700">
                      <span class="max-w-xs truncate block" :title="bon.keperluan">{{
                        bon.keperluan
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="md:hidden divide-y divide-slate-100">
              <div
                v-for="bon in formattedBons"
                :key="bon.id"
                class="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center space-x-3">
                    <span
                      class="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full"
                    >
                      #{{ bon.no }}
                    </span>
                    <span class="text-sm text-slate-500">{{ bon.formattedTanggal }}</span>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-slate-600">Jumlah:</span>
                    <span class="font-bold text-blue-600 text-lg">{{
                      bon.formattedJumlahBon
                    }}</span>
                  </div>
                  <div>
                    <span class="text-sm font-semibold text-slate-600">Keperluan:</span>
                    <p class="text-slate-700 mt-1 text-sm">{{ bon.keperluan }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="bg-white/80 backdrop-blur-lg border border-white/60 rounded-3xl p-16 text-center shadow-2xl"
          >
            <div
              class="mx-auto w-20 h-20 bg-gradient-to-br from-slate-100 to-blue-100 rounded-full flex items-center justify-center mb-6"
            >
              <svg
                class="w-10 h-10 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-slate-700 mb-3">Belum Ada Bon</h3>
            <p class="text-slate-500 text-lg mb-6">
              Mulai catat bon pertama Anda untuk memantau pengeluaran
            </p>
            <button
              @click="openBonModal"
              class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              Tambah Bon Sekarang
            </button>
          </div>
        </div>
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 class="text-xl font-bold text-slate-800">Riwayat Cuti Saya</h2>
            <div class="flex items-center gap-2">
              <div class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {{ formattedCuti.length }} pengajuan cuti
              </div>
            </div>
          </div>

          <div
            v-if="formattedCuti.length > 0"
            class="bg-white/80 backdrop-blur-lg border border-white/60 rounded-3xl border border-gray-400 overflow-hidden"
          >
            <div class="hidden lg:block overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr
                    class="bg-gradient-to-r from-slate-50 to-blue-50 text-slate-700 text-sm font-bold"
                  >
                    <th class="py-5 px-6 text-left">No</th>
                    <th class="py-5 px-6 text-left">Jenis Cuti</th>
                    <th class="py-5 px-6 text-left">Tanggal Mulai</th>
                    <th class="py-5 px-6 text-left">Tanggal Selesai</th>
                    <th class="py-5 px-6 text-left">Durasi</th>

                    <th class="py-5 px-6 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="cuti in formattedCuti"
                    :key="cuti.id"
                    class="border-b border-slate-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                  >
                    <td class="py-5 px-6 text-slate-600 font-semibold">{{ cuti.no }}</td>
                    <td class="py-5 px-6 text-slate-700 font-semibold">
                      {{ cuti.jenisCuti || "Cuti Tahunan" }}
                    </td>
                    <td class="py-5 px-6 text-slate-700">{{ cuti.formattedTanggalMulai }}</td>
                    <td class="py-5 px-6 text-slate-700">{{ cuti.formattedTanggalSelesai }}</td>
                    <td class="py-5 px-6 text-blue-600 font-semibold">{{ cuti.durasi }}</td>

                    <td class="py-5 px-6 text-slate-700">
                      <span class="max-w-xs truncate block" :title="cuti.keperluan">{{
                        cuti.keperluan || "-"
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="lg:hidden divide-y divide-slate-100">
              <div
                v-for="cuti in formattedCuti"
                :key="cuti.id"
                class="p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center space-x-3">
                    <span
                      class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full"
                    >
                      #{{ cuti.no }}
                    </span>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-slate-600">Jenis Cuti:</span>
                    <span class="font-semibold text-slate-800">{{
                      cuti.jenisCuti || "Cuti Tahunan"
                    }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-slate-600">Periode:</span>
                    <span class="text-slate-700 text-sm"
                      >{{ cuti.formattedTanggalMulai }} - {{ cuti.formattedTanggalSelesai }}</span
                    >
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold text-slate-600">Durasi:</span>
                    <span class="font-bold text-blue-600">{{ cuti.durasi }}</span>
                  </div>
                  <div v-if="cuti.keperluan">
                    <span class="text-sm font-semibold text-slate-600">Keterangan:</span>
                    <p class="text-slate-700 mt-1 text-sm">{{ cuti.keperluan }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="bg-white/80 backdrop-blur-lg border border-white/60 rounded-3xl p-16 text-center shadow-2xl"
          >
            <div
              class="mx-auto w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mb-6"
            >
              <svg
                class="w-10 h-10 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2M8 7h8"
                />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-slate-700 mb-3">Belum Ada Pengajuan Cuti</h3>
            <p class="text-slate-500 text-lg mb-6">
              Ajukan cuti pertama Anda untuk mengelola jadwal kerja
            </p>
            <button
              @click="openCutiModal"
              class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              Ajukan Cuti Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showCutiModal"
      class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closeCutiModal"
    >
      <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div
          class="sticky top-0 bg-white/80 backdrop-blur-sm rounded-t-3xl border-b border-slate-200 p-6 z-10"
        >
          <div class="flex justify-between items-center">
            <h3 class="text-2xl font-bold text-slate-800">Ajukan Cuti Baru</h3>
            <button
              @click="closeCutiModal"
              class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
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

        <form @submit.prevent="submitCuti" class="p-6 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Jenis Cuti</label>
              <select
                v-model="cutiForm.jenisCuti"
                class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="Cuti Tahunan">Cuti Tahunan</option>
                <option value="Cuti Sakit">Cuti Sakit</option>
                <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                <option value="Cuti Darurat">Cuti Darurat</option>
                <option value="Cuti Lainnya">Cuti Lainnya</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2"
                >Alamat Selama Cuti <span class="text-slate-400">(Opsional)</span></label
              >
              <input
                v-model="cutiForm.alamatSelama"
                type="text"
                placeholder="e.g. Jl. Kenangan No. 10"
                class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Tanggal Mulai</label>
              <input
                v-model="cutiForm.tanggalMulai"
                type="date"
                :min="today"
                class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Tanggal Selesai</label>
              <input
                v-model="cutiForm.tanggalSelesai"
                type="date"
                :min="cutiForm.tanggalMulai || today"
                class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2"
              >Keterangan / Alasan Cuti</label
            >
            <textarea
              v-model="cutiForm.keperluan"
              rows="4"
              placeholder="Jelaskan alasan pengajuan cuti Anda di sini..."
              class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            ></textarea>
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="submit"
              :disabled="isSubmittingCuti"
              class="w-full sm:w-auto bg-blue-500 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg
                v-if="isSubmittingCuti"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{{ isSubmittingCuti ? "Mengirim..." : "Ajukan Cuti" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div
      v-if="showBonModal"
      class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closeBonModal"
    >
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div
          class="sticky top-0 bg-white/80 backdrop-blur-sm rounded-t-3xl border-b border-slate-200 p-6 z-10"
        >
          <div class="flex justify-between items-center">
            <h3 class="text-2xl font-bold text-slate-800">Tambah Bon Baru</h3>
            <button
              @click="closeBonModal"
              class="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
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

        <form @submit.prevent="submitBon" class="p-6 space-y-6">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Tanggal Pengajuan</label>
            <input
              v-model="bonForm.tanggal"
              type="date"
              :max="today"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Jumlah Bon (Rp)</label>
            <input
              v-model="bonForm.jumlahBon"
              type="number"
              step="1000"
              min="0"
              placeholder="e.g. 500000"
              class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Keperluan</label>
            <textarea
              v-model="bonForm.keperluan"
              rows="4"
              placeholder="Jelaskan keperluan bon Anda di sini..."
              class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              required
            ></textarea>
          </div>

          <div class="flex justify-end pt-4">
            <button
              type="submit"
              :disabled="isSubmittingBon"
              class="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-3.5 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg
                v-if="isSubmittingBon"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{{ isSubmittingBon ? "Menyimpan..." : "Simpan Bon" }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="date"]:required:invalid::-webkit-datetime-edit {
  color: transparent;
}
input[type="date"]:focus::-webkit-datetime-edit {
  color: black !important;
}
.animation-delay-150 {
  animation-delay: -0.15s;
}
</style>
