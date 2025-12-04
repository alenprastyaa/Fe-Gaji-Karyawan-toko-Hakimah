<script setup>
import { onMounted, ref, computed } from "vue";
import { useBonStore } from "../../stores/bon";
import { useUserStore } from "../../stores/user";

const bonStore = useBonStore();
const userStore = useUserStore();

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

onMounted(async () => {
  await Promise.all([userStore.fetchAllUsers(), bonStore.fetchAllBons({})]);
});

const totalUsers = computed(() => userStore.users?.length || 0);
const totalAdmins = computed(
  () => userStore.users?.filter((user) => user.role === "admin")?.length || 0
);
const totalKaryawan = computed(
  () => userStore.users?.filter((user) => user.role === "karyawan")?.length || 0
);

const totalBons = computed(() => bonStore.allBons?.length || 0);
const totalNominalBon = computed(() => bonStore.totalAllBon || 0);

const bonsBulanIni = computed(() => {
  if (!bonStore.allBons || !Array.isArray(bonStore.allBons)) return [];

  return bonStore.allBons.filter((bon) => {
    if (!bon.tanggal) return false;
    const bonDate = new Date(bon.tanggal);
    return bonDate.getMonth() + 1 === currentMonth && bonDate.getFullYear() === currentYear;
  });
});

const totalBonsBulanIni = computed(() => bonsBulanIni.value?.length || 0);
const totalNominalBulanIni = computed(() => {
  if (!bonsBulanIni.value || !Array.isArray(bonsBulanIni.value)) return 0;
  return bonsBulanIni.value.reduce((total, bon) => {
    const jumlah = parseFloat(bon.jumlahBon) || 0;
    return total + jumlah;
  }, 0);
});

const bonTerbaru = computed(() => {
  if (!bonStore.allBons || !Array.isArray(bonStore.allBons)) return [];

  return bonStore.allBons
    .filter((bon) => bon && bon.tanggal)
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 5)
    .map((bon) => ({
      ...bon,
      formattedTanggal: new Date(bon.tanggal).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      formattedJumlahBon: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(parseFloat(bon.jumlahBon) || 0),
      karyawanNama: bon.karyawan?.namaLengkap || "N/A",
    }));
});

const chartData = computed(() => {
  if (!bonStore.allBons || !Array.isArray(bonStore.allBons)) return [];

  const days = [];
  const currentDate = new Date();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dayName = date.toLocaleDateString("id-ID", { day: "2-digit" });

    const bonsInDay = bonStore.allBons.filter((bon) => {
      if (!bon || !bon.tanggal) return false;
      const bonDate = new Date(bon.tanggal);
      return (
        bonDate.getDate() === date.getDate() &&
        bonDate.getMonth() === date.getMonth() &&
        bonDate.getFullYear() === date.getFullYear()
      );
    });

    const totalNominal = bonsInDay.reduce((total, bon) => {
      const jumlah = parseFloat(bon.jumlahBon) || 0;
      return total + jumlah;
    }, 0);

    days.push({
      day: dayName,
      jumlah: bonsInDay.length,
      nominal: totalNominal,
    });
  }

  return days.filter((day) => day.jumlah > 0);
});

const topKaryawan = computed(() => {
  if (!bonStore.allBons || !Array.isArray(bonStore.allBons)) return [];

  const karyawanStats = {};

  bonStore.allBons.forEach((bon) => {
    if (bon && bon.karyawan && bon.karyawan.id) {
      const key = bon.karyawan.id;
      if (!karyawanStats[key]) {
        karyawanStats[key] = {
          nama: bon.karyawan.namaLengkap || "Unknown",
          jumlahBon: 0,
          totalNominal: 0,
        };
      }
      karyawanStats[key].jumlahBon += 1;
      const jumlahBon = parseFloat(bon.jumlahBon) || 0;
      karyawanStats[key].totalNominal += jumlahBon;
    }
  });

  return Object.values(karyawanStats)
    .sort((a, b) => b.totalNominal - a.totalNominal)
    .slice(0, 5)
    .map((stat) => ({
      ...stat,
      formattedTotal: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
      }).format(stat.totalNominal || 0),
    }));
});

const formatCurrency = (amount) => {
  const numAmount = parseFloat(amount) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(numAmount);
};

const getMonthName = () => {
  return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
};

const getMaxChartValue = computed(() => {
  if (!chartData.value || chartData.value.length === 0) return 1;
  const maxValue = Math.max(...chartData.value.map((d) => d.jumlah));
  return maxValue || 1;
});
</script>

<template>
  <div class="p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
    <div class="mb-8">
      <h1
        class="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2"
      >
        Dashboard Admin
      </h1>
      <p class="text-gray-600 text-lg">Ringkasan data bon karyawan dan manajemen pengguna</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div
        class="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Pengguna</p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ totalUsers }}</p>
            <div class="flex items-center mt-2 text-sm">
              <span class="text-blue-600 font-medium">{{ totalAdmins }} Admin</span>
              <span class="mx-2 text-gray-400">•</span>
              <span class="text-green-600 font-medium">{{ totalKaryawan }} Karyawan</span>
            </div>
          </div>
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Total Transaksi
            </p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ totalBons }}</p>
            <p class="text-sm text-purple-600 font-medium mt-2">Semua waktu</p>
          </div>
          <div class="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-2xl">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Nominal</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">
              {{ formatCurrency(totalNominalBon) }}
            </p>
            <p class="text-sm text-green-600 font-medium mt-2">Semua waktu</p>
          </div>
          <div class="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-2xl">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <div
        class="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {{ getMonthName() }}
            </p>
            <p class="text-3xl font-bold text-gray-900 mt-2">{{ totalBonsBulanIni }}</p>
            <p class="text-lg font-semibold text-orange-600 mt-1">
              {{ formatCurrency(totalNominalBulanIni) }}
            </p>
          </div>
          <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-2xl">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div class="p-6 border-b border-gray-100">
        <h3 class="text-xl font-bold text-gray-900 flex items-center">
          <svg
            class="w-6 h-6 mr-3 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          5 Transaksi Terbaru
        </h3>
      </div>

      <div v-if="bonTerbaru.length > 0">
        <!-- Desktop/Tablet Table View -->
        <div class="hidden md:block overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <tr>
                <th class="py-4 px-6 text-left text-sm font-semibold uppercase tracking-wider">
                  Tanggal
                </th>
                <th class="py-4 px-6 text-left text-sm font-semibold uppercase tracking-wider">
                  Karyawan
                </th>
                <th class="py-4 px-6 text-left text-sm font-semibold uppercase tracking-wider">
                  Jumlah
                </th>
                <th class="py-4 px-6 text-left text-sm font-semibold uppercase tracking-wider">
                  Keperluan
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="bon in bonTerbaru"
                :key="bon.id"
                class="hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 transition-all duration-200"
              >
                <td class="py-4 px-6 text-sm text-gray-700 font-medium">
                  {{ bon.formattedTanggal }}
                </td>
                <td class="py-4 px-6 text-sm font-semibold text-gray-900">
                  {{ bon.karyawanNama }}
                </td>
                <td class="py-4 px-6 text-sm font-bold text-green-600">
                  {{ bon.formattedJumlahBon }}
                </td>
                <td
                  class="py-4 px-6 text-sm text-gray-700 max-w-xs truncate"
                  :title="bon.keperluan"
                >
                  {{ bon.keperluan }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="md:hidden space-y-4">
          <div
            v-for="bon in bonTerbaru"
            :key="bon.id"
            class="bg-white rounded-xl shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-all duration-200 hover:border-purple-300"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-3">
                <div
                  class="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md"
                >
                  <span class="text-white font-bold text-sm">
                    {{ bon.karyawanNama.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 text-base">{{ bon.karyawanNama }}</h3>
                  <p class="text-sm text-gray-500">{{ bon.formattedTanggal }}</p>
                </div>
              </div>

              <div class="text-right">
                <span
                  class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-bold bg-green-100 text-green-800 shadow-sm"
                >
                  {{ bon.formattedJumlahBon }}
                </span>
              </div>
            </div>

            <div
              class="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-100"
            >
              <div class="text-xs font-medium text-purple-600 mb-1 uppercase tracking-wider">
                Keperluan:
              </div>
              <div
                v-if="bon.keperluan && bon.keperluan.trim()"
                class="text-sm text-gray-800 leading-relaxed"
              >
                {{ bon.keperluan }}
              </div>
              <div v-else class="text-sm text-gray-400 italic">Tidak ada keterangan</div>
            </div>

            <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span class="text-xs text-gray-500">Bon terbaru</span>
              </div>
              <div class="text-xs text-gray-400">
                {{ bon.formattedTanggal }}
              </div>
            </div>
          </div>
        </div>

        <div class="hidden xs:block sm:hidden space-y-3">
          <div
            v-for="bon in bonTerbaru"
            :key="bon.id"
            class="bg-white rounded-lg shadow border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <div
                  class="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center"
                >
                  <span class="text-white font-bold text-xs">
                    {{ bon.karyawanNama.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <div class="font-medium text-gray-900 text-sm">{{ bon.karyawanNama }}</div>
                  <div class="text-xs text-gray-500">{{ bon.formattedTanggal }}</div>
                </div>
              </div>
              <span class="text-sm font-bold text-green-600">
                {{ bon.formattedJumlahBon }}
              </span>
            </div>

            <div
              v-if="bon.keperluan && bon.keperluan.trim()"
              class="text-xs text-gray-600 bg-gray-50 p-2 rounded line-clamp-2"
            >
              {{ bon.keperluan }}
            </div>
          </div>
        </div>
      </div>
      <div v-else class="p-12 text-center text-gray-500">
        <svg
          class="w-16 h-16 mx-auto mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
        <p class="text-lg font-medium">Belum ada transaksi</p>
        <p class="text-sm text-gray-400 mt-1">Transaksi bon akan muncul di sini</p>
      </div>
    </div>

    <div
      v-if="bonStore.loading || userStore.loading"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-2xl p-8 shadow-2xl text-center">
        <div
          class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"
        ></div>
        <p class="text-gray-700 font-semibold">Memuat data dashboard...</p>
      </div>
    </div>
  </div>
</template>
