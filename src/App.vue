<script setup>
import { RouterView } from "vue-router";
// Impor Pinia store jika perlu inisialisasi di root
import { useAuthStore } from "./stores/auth";
import { onMounted } from "vue";

const authStore = useAuthStore();

onMounted(() => {
  authStore.initializeAuth(); // Panggil ini untuk me-load state auth dari localStorage
});
</script>

<template>
  <RouterView />
</template>

<style scoped>
/* Global styles atau overrides jika diperlukan */
</style>

VITE_API_BASE_URL=https://bon.tokohakimah.my.id/api
# VITE_API_BASE_URL=https://kimah-api.api-v3.sipki.sipki.my.id/api
# VITE_API_BASE_URL=http://localhost:8080/api