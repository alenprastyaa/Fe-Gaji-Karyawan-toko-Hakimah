<script setup>
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";
import { computed, ref } from "vue"; // Import ref for dropdown state

const authStore = useAuthStore();
const router = useRouter();

const isMenuOpen = ref(false); // State for the dropdown menu

const currentUser = computed(() => authStore.getCurrentUser);
const isAdmin = computed(() => authStore.isUserAdmin);

const handleLogout = () => {
  authStore.logout();
  router.push("/login");
};

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

// Close menu when navigating
router.afterEach(() => {
  isMenuOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white font-sans antialiased">
    <header class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
      <div class="container mx-auto flex justify-between items-center">
        <router-link to="/bon-input" class="text-xl font-extrabold tracking-tight">
          Hai, {{ currentUser?.namaLengkap || "User" }}
        </router-link>

        <nav class="hidden sm:flex items-center space-x-6">
          <span class="text-sm font-medium"
            >Halo, {{ currentUser?.namaLengkap || "User" }} ({{ currentUser?.role }})</span
          >

          <router-link
            v-if="!isAdmin"
            to="/bon-input"
            class="text-white hover:text-blue-200 transition duration-300 ease-in-out"
          >
            Input Bon
          </router-link>

          <router-link
            v-if="!isAdmin"
            to="/my-bons"
            class="text-white hover:text-blue-200 transition duration-300 ease-in-out"
          >
            Bon Saya
          </router-link>

          <router-link
            v-if="isAdmin"
            to="/admin/dashboard"
            class="text-white hover:text-blue-200 transition duration-300 ease-in-out"
          >
            Admin Dashboard
          </router-link>

          <button
            @click="handleLogout"
            class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            aria-label="Logout"
          >
            Logout
          </button>
        </nav>

        <div class="sm:hidden relative">
          <button
            @click="toggleMenu"
            class="focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-md p-2"
          >
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                v-if="!isMenuOpen"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>

          <transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="isMenuOpen"
              class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 origin-top-right"
              @click.stop
            >
              <div class="px-4 py-2 text-gray-700 font-semibold border-b border-gray-100">
                Halo, {{ currentUser?.namaLengkap || "User" }}
              </div>
              <div class="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
                ({{ currentUser?.role }})
              </div>

              <router-link
                v-if="!isAdmin"
                to="/bon-input"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Input Bon
              </router-link>

              <router-link
                v-if="!isAdmin"
                to="/my-bons"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Bon Saya
              </router-link>

              <router-link
                v-if="isAdmin"
                to="/admin/dashboard"
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Admin Dashboard
              </router-link>

              <button
                @click="handleLogout"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </transition>
        </div>
      </div>
    </header>

    <main class="flex-grow container mx-auto bg-white">
      <router-view />
    </main>

    <footer class="bg-white text-gray-300 text-center p-4 text-sm mt-8">
      <div class="container mx-auto max-w-md">
        &copy; {{ new Date().getFullYear() }} Aplikasi Bon Karyawan. All rights reserved by Alen
        Prastya.
      </div>
    </footer>
  </div>
</template>
