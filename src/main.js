import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import Swal from "sweetalert2"; // Import SweetAlert2

const app = createApp(App);
const pinia = createPinia();

// Global properties untuk SweetAlert2
app.config.globalProperties.$swal = Swal;

app.use(pinia);
app.use(router);

app.mount("#app");
