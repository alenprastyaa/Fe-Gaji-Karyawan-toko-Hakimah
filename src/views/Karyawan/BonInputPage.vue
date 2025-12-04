<script setup>
import { ref, computed, watch } from "vue";
import { useBonStore } from "../../stores/bon";
import { useAuthStore } from "../../stores/auth";

const bonStore = useBonStore();
const authStore = useAuthStore();

const bonData = ref({
  tanggal: new Date().toISOString().split("T")[0], // Tanggal default hari ini
  jumlahBon: null,
  keperluan: "",
});

// A local ref to hold the formatted input string for jumlahBon
const formattedJumlahBonInput = ref("");

const currentUser = computed(() => authStore.getCurrentUser);
watch(
  () => bonData.value.jumlahBon,
  (newValue) => {
    if (newValue !== null) {
      formattedJumlahBonInput.value = formatCurrency(newValue);
    } else {
      formattedJumlahBonInput.value = "";
    }
  },
  { immediate: true }
); // Run immediately on component mount

// Function to format a number into Rupiah currency string
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }
  // Use Intl.NumberFormat for robust currency formatting
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0, // No decimals for whole Rupiah
    maximumFractionDigits: 0, // No decimals for whole Rupiah
  }).format(value);
};

// Handle input for the jumlahBon field, parsing and re-formatting
const handleInputJumlahBon = (event) => {
  let value = event.target.value;

  // Remove all non-digit characters except for a leading minus sign
  // Also remove 'Rp', '.' and ',' for clean parsing
  const cleanedValue = value.replace(/[^0-9]/g, "");

  // Convert to number
  const parsedValue = parseInt(cleanedValue, 10);

  if (!isNaN(parsedValue)) {
    bonData.value.jumlahBon = parsedValue;
    // Update the input field's value with the formatted string
    // This provides immediate visual feedback to the user
    event.target.value = formatCurrency(parsedValue);
  } else {
    // If the input is empty or invalid, clear the numeric value and the input field
    bonData.value.jumlahBon = null;
    event.target.value = "";
  }
};

const handleSubmitBon = async () => {
  if (
    !bonData.value.tanggal ||
    bonData.value.jumlahBon === null ||
    bonData.value.jumlahBon === undefined ||
    bonData.value.keperluan === ""
  ) {
    bonStore.$swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Semua field harus diisi.",
    });
    return;
  }
  if (bonData.value.jumlahBon <= 0) {
    bonStore.$swal.fire({
      icon: "warning",
      title: "Jumlah Bon Tidak Valid",
      text: "Jumlah bon harus lebih dari nol.",
    });
    return;
  }

  const success = await bonStore.addBon(bonData.value);
  if (success) {
    // Reset form setelah sukses
    bonData.value.jumlahBon = null;
    bonData.value.keperluan = "";
    formattedJumlahBonInput.value = ""; // Also reset the formatted input
    // Opsional: Langsung arahkan ke halaman 'MyBons'
    // router.push('/my-bons');
  }
};
</script>

<template>
  <div class="p-4 bg-white rounded-lg shadow-md">
    <div class="mt-2 mb-5 flex items-center">
      <router-link to="/my-bons" class="flex items-center text-gray-600 hover:text-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 -ml-2 text-blue-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span style="font-size: 20px !important" class="text-blue-500"> Kembali</span>
      </router-link>
    </div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Input Bon Karyawan</h1>
    <p class="text-gray-600 mb-4">
      Selamat datang, <span class="font-semibold">{{ currentUser?.namaLengkap }}</span
      >. Silakan masukkan detail bon Anda.
    </p>

    <form @submit.prevent="handleSubmitBon">
      <div class="mb-4">
        <label for="tanggal" class="block text-gray-700 text-sm font-bold mb-2">Tanggal:</label>
        <input
          type="date"
          id="tanggal"
          v-model="bonData.tanggal"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>
      <div class="mb-4">
        <label for="jumlahBon" class="block text-gray-700 text-sm font-bold mb-2"
          >Jumlah Bon (Rp.):</label
        >
        <input
          type="text"
          id="jumlahBon"
          :value="formattedJumlahBonInput"
          @input="handleInputJumlahBon"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Contoh: Rp150.000"
          required
        />
      </div>
      <div class="mb-6">
        <label for="keperluan" class="block text-gray-700 text-sm font-bold mb-2">Keperluan:</label>
        <textarea
          id="keperluan"
          v-model="bonData.keperluan"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
          placeholder="Misalnya: Pembelian ATK, Biaya transportasi, dll."
          required
        ></textarea>
      </div>
      <div class="flex items-center justify-center">
        <button
          type="submit"
          :disabled="bonStore.loading"
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
        >
          <span v-if="bonStore.loading">Menyimpan...</span>
          <span v-else>Simpan Bon</span>
        </button>
      </div>
    </form>
  </div>
</template>
