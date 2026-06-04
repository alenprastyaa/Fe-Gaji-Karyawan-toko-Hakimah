<script setup>
import { onMounted, ref } from "vue";
import { useUserStore } from "../../stores/user";
import Swal from "sweetalert2";

const userStore = useUserStore();
const showAddModal = ref(false);
const showEditModal = ref(false);
const showInactiveModal = ref(false);
const inactiveUsers = ref([]);

const newUser = ref({
  username: "",
  password: "",
  role: "karyawan",
  namaLengkap: "",
  tanggalMasukKerja: "",
  gaji: 0,
  // ✨ ADDED: Default status for new users
  status: "active",
});
const editedUser = ref(null);

const bonData = ref([]);
const bonLoading = ref(true);
const bonError = ref(null);

onMounted(async () => {
  await userStore.userActive();
  await fetchInactiveUsers();
  fetchBonData();
});

const roles = ["karyawan", "admin"];

const formatDateInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
};

const toDisplayDate = (dateString) => {
  if (!dateString) return "";

  const value = String(dateString);
  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) return value;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const toApiDate = (dateString) => {
  if (!dateString) return null;

  const value = String(dateString);
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const displayMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!displayMatch) return null;

  const [, day, month, year] = displayMatch;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  const isValidDate =
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day);

  if (!isValidDate) return null;
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString) => {
  return toDisplayDate(dateString);
};

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

const fetchBonData = async () => {
  bonLoading.value = true;
  bonError.value = null;
  try {
    const response = await fetch("http://localhost:8080/api/bon");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    bonData.value = data.bons;
  } catch (error) {
    console.error("Error fetching bon data:", error);
    bonError.value = "Gagal memuat data bon.";
  } finally {
    bonLoading.value = false;
  }
};

const fetchInactiveUsers = async () => {
  try {
    await userStore.userNotActive();
    inactiveUsers.value = userStore.inactiveUsers || [];
  } catch (error) {
    console.error("Error fetching inactive users:", error);
  }
};

const handleAddUser = async () => {
  const tanggalMasukKerja = toApiDate(newUser.value.tanggalMasukKerja);

  if (
    !newUser.value.username ||
    !newUser.value.password ||
    !newUser.value.namaLengkap ||
    !tanggalMasukKerja ||
    newUser.value.gaji === null ||
    newUser.value.gaji === undefined
  ) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Semua field harus diisi. Tanggal wajib menggunakan format dd/mm/yyyy.",
    });
    return;
  }
  const success = await userStore.addUser({
    ...newUser.value,
    tanggalMasukKerja,
  });
  if (success) {
    showAddModal.value = false;
    newUser.value = {
      username: "",
      password: "",
      role: "karyawan",
      namaLengkap: "",
      tanggalMasukKerja: "",
      gaji: 0,
      // ✨ Ensure reset includes status
      status: "active",
    };
    fetchBonData();
  }
};

const openEditModal = (user) => {
  editedUser.value = {
    ...user,
    password: "",
    tanggalMasukKerja: toDisplayDate(user.tanggalMasukKerja),
    gaji: parseFloat(user.gaji),
  };
  showEditModal.value = true;
};

const openEditInactiveModal = (user) => {
  editedUser.value = {
    ...user,
    password: "",
    tanggalMasukKerja: toDisplayDate(user.tanggalMasukKerja),
    gaji: parseFloat(user.gaji),
    isFromInactive: true,
  };
  showEditModal.value = true;
};

const handleUpdateUser = async () => {
  const tanggalMasukKerja = toApiDate(editedUser.value.tanggalMasukKerja);

  if (
    !editedUser.value.username ||
    !editedUser.value.namaLengkap ||
    !tanggalMasukKerja ||
    editedUser.value.gaji === null ||
    editedUser.value.gaji === undefined
  ) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Username, Nama Lengkap, Tanggal Masuk Kerja, dan Gaji harus diisi. Tanggal wajib menggunakan format dd/mm/yyyy.",
    });
    return;
  }
  const dataToUpdate = {
    username: editedUser.value.username,
    role: editedUser.value.role,
    namaLengkap: editedUser.value.namaLengkap,
    tanggalMasukKerja,
    gaji: editedUser.value.gaji,
    status: editedUser.value.status
  };
  if (editedUser.value.password) {
    dataToUpdate.password = editedUser.value.password;
  }
  const success = await userStore.updateExistingUser(editedUser.value.id, dataToUpdate);
  if (success) {
    showEditModal.value = false;
    editedUser.value = null;
    await userStore.userActive();
    await fetchInactiveUsers();
    fetchBonData();
  }
};

const handleDeleteUser = async (id, namaLengkap) => {
  const result = await Swal.fire({
    title: "Anda yakin?",
    html: `User <strong>${namaLengkap}</strong> dan semua bonnya akan dihapus!`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Ya, hapus!",
    cancelButtonText: "Batal",
  });

  if (result.isConfirmed) {
    await userStore.removeUser(id);
    await userStore.userActive();
    await userStore.fetchInactiveUsers();
    fetchBonData();
  }
};

const openInactiveModal = async () => {
  await userStore.fetchInactiveUsers();
  showInactiveModal.value = true;
};

</script>

<template>

  <div class="p-4 bg-white rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Manajemen Pengguna</h1>

    <div class="mb-4 flex justify-end gap-2">
      <button @click="showAddModal = true"
        class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl">
        Tambah User Baru
      </button>

    </div>

    <div v-if="userStore.loading" class="text-center py-8">
      <p>Memuat data user...</p>
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mt-4"></div>
    </div>

    <div v-else-if="userStore.error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
      role="alert">
      <strong class="font-bold">Error!</strong>
      <span class="block sm:inline">{{ userStore.error }}</span>
    </div>

    <div v-else>
      <div v-if="userStore.users.length > 0">

        <div class="hidden lg:block overflow-x-auto">
          <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <table class="min-w-full">
              <thead>
                <tr class="bg-gray-800 text-white">
                  <th class="py-4 px-6 text-left text-sm font-semibold tracking-wider">No</th>
                  <th class="py-4 px-6 text-left text-sm font-semibold tracking-wider">Username</th>
                  <th class="py-4 px-6 text-left text-sm font-semibold tracking-wider">
                    Nama Lengkap
                  </th>
                  <th class="py-4 px-6 text-left text-sm font-semibold tracking-wider">Role</th>
                  <th class="py-4 px-6 text-left text-sm font-semibold tracking-wider">
                    Tanggal Masuk
                  </th>
                  <th class="py-4 px-6 text-left text-sm font-semibold tracking-wider">Gaji</th>
                  <th class="py-4 px-6 text-center text-sm font-semibold tracking-wider">Status</th>
                  <th class="py-4 px-6 text-center text-sm font-semibold tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(user, index) in userStore.users" :key="user.id"
                  class="hover:bg-blue-200 transition-colors duration-200 group">
                  <td class="py-4 px-6 text-sm text-gray-900 font-medium">
                    <div class="flex items-center">
                      <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {{ index + 1 }}
                      </span>
                    </div>
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-900 font-medium">
                    <div class="flex items-center">
                      <div
                        class="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <span class="text-indigo-600 font-semibold text-xs">
                          {{ user.username.charAt(0).toUpperCase() }}
                        </span>
                      </div>
                      {{ user.username }}
                    </div>
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-900">{{ user.namaLengkap }}</td>
                  <td class="py-4 px-6 text-sm">
                    <span :class="user.role === 'admin'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
                      " class="px-3 py-1 rounded-full text-xs font-semibold capitalize">
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-600">
                    <div class="flex items-center">
                      <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                        </path>
                      </svg>
                      {{ formatDate(user.tanggalMasukKerja) }}
                    </div>
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-900 font-semibold">
                    <div class="flex items-center">
                      <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                        </path>
                      </svg>
                      {{ formatCurrency(user.gaji) }}
                    </div>
                  </td>
                  <td class="py-4 px-6 text-sm text-gray-900 font-semibold">
                    <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                      Aktif
                    </span>
                  </td>
                  <td class="py-4 px-6 text-center">
                    <div class="flex items-center justify-center space-x-2">
                      <button @click="openEditModal(user)"
                        class="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center shadow-sm hover:shadow-md">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                          </path>
                        </svg>
                        Edit
                      </button>
                      <button @click="handleDeleteUser(user.id, user.namaLengkap)"
                        class="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center shadow-sm hover:shadow-md">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                          </path>
                        </svg>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="lg:hidden space-y-4">
          <div v-for="(user, index) in userStore.users" :key="user.id"
            class="bg-white rounded-xl shadow-lg border border-gray-100 p-4 hover:shadow-xl transition-shadow duration-200">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span class="text-indigo-600 font-semibold text-lg">
                    {{ user.username.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 text-lg">{{ user.namaLengkap }}</h3>
                  <p class="text-sm text-gray-500">@{{ user.username }}</p>
                </div>
              </div>
              <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                #{{ index + 1 }}
              </span>
            </div>

            <div class="grid grid-cols-1 gap-3 mb-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600">Role:</span>
                <span :class="user.role === 'admin'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : 'bg-green-100 text-green-800 border border-green-200'
                  " class="px-3 py-1 rounded-full text-xs font-semibold capitalize">
                  {{ user.role }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600">Tanggal Masuk:</span>
                <div class="flex items-center text-sm text-gray-900">
                  <svg class="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z">
                    </path>
                  </svg>
                  {{ formatDate(user.tanggalMasukKerja) }}
                </div>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600">Gaji:</span>
                <div class="flex items-center text-sm text-gray-900 font-semibold">
                  <svg class="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                    </path>
                  </svg>
                  {{ formatCurrency(user.gaji) }}
                </div>
              </div>
            </div>
            <div class="flex space-x-2 pt-3 border-t border-gray-100">
              <button @click="openEditModal(user)"
                class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z">
                  </path>
                </svg>
                Edit
              </button>
              <button @click="handleDeleteUser(user.id, user.namaLengkap)"
                class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                  </path>
                </svg>
                Hapus
              </button>
            </div>
          </div>
        </div>

        <div class="hidden md:block lg:hidden overflow-x-auto">
          <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <table class="min-w-full">
              <thead>
                <tr class="bg-gray-800 text-white">
                  <th class="py-3 px-4 text-left text-xs font-semibold tracking-wider">No</th>
                  <th class="py-3 px-4 text-left text-xs font-semibold tracking-wider">User</th>
                  <th class="py-3 px-4 text-left text-xs font-semibold tracking-wider">Role</th>
                  <th class="py-3 px-4 text-left text-xs font-semibold tracking-wider">Tanggal</th>
                  <th class="py-3 px-4 text-left text-xs font-semibold tracking-wider">Gaji</th>
                  <th class="py-3 px-4 text-center text-xs font-semibold tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(user, index) in userStore.users" :key="user.id"
                  class="hover:bg-blue-200 transition-colors duration-200">
                  <td class="py-3 px-4 text-xs text-gray-900 font-medium">
                    <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {{ index + 1 }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-xs text-gray-900">
                    <div class="flex items-center">
                      <div
                        class="flex-shrink-0 h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                        <span class="text-indigo-600 font-semibold text-xs">
                          {{ user.username.charAt(0).toUpperCase() }}
                        </span>
                      </div>
                      <div>
                        <div class="font-medium">{{ user.namaLengkap }}</div>
                        <div class="text-gray-400">@{{ user.username }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-xs">
                    <span :class="user.role === 'admin'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : 'bg-green-100 text-green-800 border border-green-200'
                      " class="px-2 py-1 rounded-full text-xs font-semibold capitalize">
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-xs text-gray-600">
                    {{ formatDate(user.tanggalMasukKerja) }}
                  </td>
                  <td class="py-3 px-4 text-xs text-gray-900 font-semibold">
                    {{ formatCurrency(user.gaji) }}
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center space-x-1">
                      <button @click="openEditModal(user)"
                        class="bg-yellow-500 hover:bg-yellow-600 text-white py-1.5 px-2 rounded text-xs font-medium transition-all duration-200">
                        Edit
                      </button>
                      <button @click="handleDeleteUser(user.id, user.namaLengkap)"
                        class="bg-red-500 hover:bg-red-600 text-white py-1.5 px-2 rounded text-xs font-medium transition-all duration-200">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-12">
        <div class="mx-auto h-24 w-24 text-gray-300 mb-4">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z">
            </path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Belum ada user</h3>
        <p class="text-gray-500 mb-4">Mulai dengan menambahkan user pertama Anda</p>
        <button @click="showAddModal = true"
          class="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
          Tambah User Pertama
        </button>
      </div>
    </div>
  </div>

  <div v-if="showAddModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
      <h2 class="text-xl font-bold mb-4">Tambah User Baru</h2>
      <form @submit.prevent="handleAddUser">
        <div class="mb-4">
          <label for="newUsername" class="block text-gray-700 text-sm font-bold mb-2">Username:</label>
          <input type="text" id="newUsername" v-model="newUser.username"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <div class="mb-4">
          <label for="newPassword" class="block text-gray-700 text-sm font-bold mb-2">Password:</label>
          <input type="password" id="newPassword" v-model="newUser.password"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <div class="mb-4">
          <label for="newNamaLengkap" class="block text-gray-700 text-sm font-bold mb-2">Nama Lengkap:</label>
          <input type="text" id="newNamaLengkap" v-model="newUser.namaLengkap"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <div class="mb-4">
          <label for="newTanggalMasukKerja" class="block text-gray-700 text-sm font-bold mb-2">Tanggal Masuk
            Kerja:</label>
          <input type="text" id="newTanggalMasukKerja" v-model="newUser.tanggalMasukKerja"
            @input="newUser.tanggalMasukKerja = formatDateInput($event.target.value)" inputmode="numeric"
            maxlength="10" placeholder="dd/mm/yyyy" class="shadow border rounded w-full py-2 px-3 text-gray-700"
            required />
        </div>
        <div class="mb-4">
          <label for="newGaji" class="block text-gray-700 text-sm font-bold mb-2">Gaji (IDR):</label>
          <input type="number" id="newGaji" v-model.number="newUser.gaji"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required min="0" />
        </div>
        <div class="mb-6">
          <label for="newRole" class="block text-gray-700 text-sm font-bold mb-2">Role:</label>
          <select id="newRole" v-model="newUser.role" class="shadow border rounded w-full py-2 px-3 text-gray-700"
            required>
            <option v-for="role in roles" :key="role" :value="role">{{ role.charAt(0).toUpperCase() + role.slice(1)
              }}
            </option>
          </select>
        </div>
        <div class="flex justify-end">
          <button type="button" @click="showAddModal = false"
            class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
            Batal
          </button>
          <button type="submit" class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
            Tambah
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showEditModal && editedUser"
    class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
      <h2 class="text-xl font-bold mb-4">Edit User: {{ editedUser.namaLengkap }}</h2>
      <form @submit.prevent="handleUpdateUser">
        <div class="mb-4">
          <label for="editUsername" class="block text-gray-700 text-sm font-bold mb-2">Username:</label>
          <input type="text" id="editUsername" v-model="editedUser.username"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <div class="mb-4">
          <label for="editPassword" class="block text-gray-700 text-sm font-bold mb-2">Password (Kosongkan
            jika tidak diubah):</label>
          <input type="password" id="editPassword" v-model="editedUser.password"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" />
        </div>
        <div class="mb-4">
          <label for="editNamaLengkap" class="block text-gray-700 text-sm font-bold mb-2">Nama Lengkap:</label>
          <input type="text" id="editNamaLengkap" v-model="editedUser.namaLengkap"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
        </div>
        <div class="mb-4">
          <label for="editTanggalMasukKerja" class="block text-gray-700 text-sm font-bold mb-2">Tanggal Masuk
            Kerja:</label>
          <input type="text" id="editTanggalMasukKerja" v-model="editedUser.tanggalMasukKerja"
            @input="editedUser.tanggalMasukKerja = formatDateInput($event.target.value)" inputmode="numeric"
            maxlength="10" placeholder="dd/mm/yyyy" class="shadow border rounded w-full py-2 px-3 text-gray-700"
            required />
        </div>
        <div class="mb-4">
          <label for="editGaji" class="block text-gray-700 text-sm font-bold mb-2">Gaji (IDR):</label>
          <input type="number" id="editGaji" v-model.number="editedUser.gaji"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required min="0" />
        </div>
        <div class="mb-6">
          <label for="editStatus" class="block text-gray-700 text-sm font-bold mb-2">Status</label>
          <select id="editStatus" v-model="editedUser.status"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required>
            <option value="active">Active</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
        </div>

        <div class="mb-4">
          <label for="editRole" class="block text-gray-700 text-sm font-bold mb-2">Role:</label>
          <select id="editRole" v-model="editedUser.role" class="shadow border rounded w-full py-2 px-3 text-gray-700"
            required>
            <option v-for="role in roles" :key="role" :value="role">{{ role.charAt(0).toUpperCase() + role.slice(1)
              }}
            </option>
          </select>
        </div>
        <div class="mb-6" v-if="editedUser.isFromInactive">
          <label for="editStatus" class="block text-gray-700 text-sm font-bold mb-2">Status:</label>
          <select id="editStatus" v-model="editedUser.status"
            class="shadow border rounded w-full py-2 px-3 text-gray-700" required>
            <option value="active">Aktif</option>
            <option value="inactive">Non-Aktif</option>
          </select>
        </div>
        <div class="flex justify-end">
          <button type="button" @click="showEditModal = false; editedUser = null"
            class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
            Batal
          </button>
          <button type="submit" class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  </div>

</template>
