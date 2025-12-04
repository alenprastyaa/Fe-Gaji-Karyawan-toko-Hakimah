<script setup>
import { ref } from "vue";
import { useAuthStore } from "../../stores/auth";
import { inject } from "vue";

const authStore = useAuthStore();
const username = ref("");
const password = ref("");
const isLoading = ref(false);
const showPassword = ref(false);

const $swal = inject("$swal");

const handleLogin = async () => {
  if (!username.value || !password.value) {
    $swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Username dan password harus diisi.",
    });
    return;
  }

  isLoading.value = true;
  await authStore.login({ username: username.value, password: password.value });
  isLoading.value = false;
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="w-full max-w-md">
      <div
        class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-4 transform transition-all duration-300 hover:shadow-3xl"
      >
        <div class="text-center mb-8">
          <div
            class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg"
          >
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1
            class="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2"
          >
            Toko Hakimah
          </h1>
          <p class="text-gray-500 text-sm">Masuk ke aplikasi Anda</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div class="space-y-2">
            <label for="username" class="block text-sm font-semibold text-gray-700">
              Username
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <input
                type="text"
                id="username"
                v-model="username"
                class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Masukkan username"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                :type="showPassword ? 'text' : 'password'"
                id="password"
                v-model="password"
                class="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                placeholder="Masukkan password"
                required
              />
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  v-if="showPassword"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
          >
            <div class="flex items-center justify-center space-x-2">
              <svg
                v-if="isLoading"
                class="animate-spin h-5 w-5 text-white"
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
              <span>{{ isLoading ? "Memproses..." : "Masuk" }}</span>
            </div>
          </button>
        </form>

        <div class="mt-8 text-center">
          <p class="text-xs text-gray-500">
            Dengan masuk, Anda menyetujui syarat dan ketentuan kami
          </p>
        </div>
      </div>
      <div class="text-center mt-6">
        <p class="text-sm text-gray-500">
          Butuh bantuan?
          <a href="#" class="text-blue-500 hover:text-blue-600 font-medium transition-colors">
            Hubungi Support
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<!-- <template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <a
      href="http://tokohakimah.my.id/"
      class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300"
    >
      Klik Untuk Melanjutkan
    </a>
  </div>
</template> -->
