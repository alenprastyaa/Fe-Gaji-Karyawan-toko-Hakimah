<script setup>
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import { computed, ref } from "vue";

const authStore = useAuthStore();
const router = useRouter();
const isMobileMenuOpen = ref(false);

const currentUser = computed(() => authStore.getCurrentUser);

const handleLogout = () => {
  authStore.logout();
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white">
    <nav class="bg-white backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-purple-500/10">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <router-link to="/admin/dashboard" class="flex items-center space-x-3 group">
            <div
              class="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">
                </path>
              </svg>
            </div>
            <span
              class="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Admin Panel
            </span>
          </router-link>

          <div class="hidden md:flex items-center space-x-8">
            <div class="flex items-center space-x-6">
              <router-link to="/admin/dashboard"
                class="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200 relative group">
                Dashboard
                <span
                  class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
              </router-link>
              <router-link to="/admin/users"
                class="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200 relative group">
                Manajemen User
                <span
                  class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
              </router-link>
              <router-link to="/admin/users-non"
                class="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200 relative group">
                User Non Active
                <span
                  class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
              </router-link>
              <router-link to="/admin/all-bons"
                class="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200 relative group">
                Manajemen Gaji
                <span
                  class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
              </router-link>
              <router-link to="/admin/data-bons"
                class="text-gray-700 hover:text-purple-600 font-medium transition-colors duration-200 relative group">
                Data Kasbon
                <span
                  class="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
              </router-link>
            </div>

            <div class="flex items-center space-x-4 pl-6 border-l border-gray-200">
              <div class="flex items-center space-x-3">
                <div
                  class="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                  <span class="text-white text-sm font-semibold">
                    {{ (currentUser?.namaLengkap || "Admin").charAt(0).toUpperCase() }}
                  </span>
                </div>
                <span class="text-gray-700 font-medium">
                  {{ currentUser?.namaLengkap || "Admin" }}
                </span>
              </div>
              <button @click="handleLogout"
                class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105">
                Logout
              </button>
            </div>
          </div>

          <button @click="toggleMobileMenu"
            class="md:hidden w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center hover:shadow-lg transition-all duration-200">
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>
        </div>

        <div v-if="isMobileMenuOpen"
          class="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-xl">
          <div class="px-4 py-6 space-y-4">
            <div class="flex items-center space-x-3 pb-4 border-b border-gray-100">
              <div
                class="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span class="text-white font-semibold">
                  {{ (currentUser?.namaLengkap || "Admin").charAt(0).toUpperCase() }}
                </span>
              </div>
              <span class="text-gray-700 font-medium">
                Halo, {{ currentUser?.namaLengkap || "Admin" }}
              </span>
            </div>

            <router-link to="/admin/dashboard" @click="isMobileMenuOpen = false"
              class="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl font-medium transition-all duration-200">
              Dashboard
            </router-link>
            <router-link to="/admin/users" @click="isMobileMenuOpen = false"
              class="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl font-medium transition-all duration-200">
              Manajemen User
            </router-link>
            <router-link to="/admin/all-bons" @click="isMobileMenuOpen = false"
              class="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl font-medium transition-all duration-200">
              Manajemen Gaji
            </router-link>
            <router-link to="/admin/data-bons" @click="isMobileMenuOpen = false"
              class="block px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl font-medium transition-all duration-200">
              Data Bon
            </router-link>

            <button @click="handleLogout"
              class="w-full mt-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all duration-300">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <main class="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        class="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-purple-500/5 border border-white/50 overflow-hidden">
        <router-view />
      </div>
    </main>

    <footer class="bg-white/50 backdrop-blur-sm border-t border-white/20 text-gray-600 text-center py-6">
      <div class="container mx-auto px-4">
        <p class="text-sm font-medium">
          &copy; 2025
          <span class="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
            Aplikasi Bon Karyawan
          </span>
          (by Alen Prastya)
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #8b5cf6, #6366f1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #7c3aed, #4f46e5);
}
</style>
