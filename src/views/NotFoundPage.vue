<template>
  <div>
    <h1 class="mx-auto text-center mt-100">Not Found</h1>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

onMounted(() => {
  localStorage.removeItem("token");
  setTimeout(() => {
    router.push("/login");
  }, 2000);
});
</script>

<style scoped>
.mt-100 {
  margin-top: 100px;
}
</style>
