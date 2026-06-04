import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Swal from "sweetalert2";
import BonManagementPage from "@/views/Admin/BonManagementPage.vue";
import { applySeo } from "@/utils/seo";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomePage.vue"),
    meta: {
      requiresAuth: false,
      seo: {
        title: "Toko Hakimah | Website Resmi dan Aplikasi Administrasi Karyawan",
        description:
          "Website resmi Toko Hakimah untuk informasi brand dan akses aplikasi administrasi, bon karyawan, dan operasional internal.",
        url: "https://tokohakimah.my.id/",
      },
    },
  },
  {
    path: "/login",
    component: () => import("../layouts/AuthLayout.vue"),
    children: [
      {
        path: "",
        name: "Login",
        component: () => import("../views/Auth/LoginPage.vue"),
        meta: {
          requiresAuth: false,
          robots: "noindex, nofollow",
          seo: {
            title: "Login Aplikasi Toko Hakimah",
            description: "Halaman login aplikasi internal Toko Hakimah untuk admin dan karyawan.",
            url: "https://tokohakimah.my.id/login",
            type: "website",
          },
        },
      },
    ],
  },

  {
    path: "/",
    component: () => import("../layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "bon-input",
        name: "BonInput",
        component: () => import("../views/Karyawan/BonInputPage.vue"),
        meta: { roles: ["karyawan", "admin"], robots: "noindex, nofollow" },
      },
      {
        path: "my-bons",
        name: "MyBons",
        component: () => import("../views/Karyawan/MyBonsPage.vue"),
        meta: { roles: ["karyawan", "admin"], robots: "noindex, nofollow" },
      },
    ],
  },

  {
    path: "/admin",
    component: () => import("../layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, roles: ["admin"], robots: "noindex, nofollow" },
    children: [
      {
        path: "",
        redirect: "dashboard",
      },
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: () => import("../views/Admin/AdminDashboard.vue"),
      },
      {
        path: "users",
        name: "UserManagement",
        component: () => import("../views/Admin/UserManagementPage.vue"),
      },
      {
        path: "users-non",
        name: "UserManagementNonActive",
        component: () => import("../views/Admin/UserNonActive.vue"),
      },
      {
        path: "all-bons",
        name: "AllBons",
        component: () => import("../views/Admin/AllBonsPage.vue"),
      },
      {
        path: "data-bons",
        name: "AdminDataBons",
        component: BonManagementPage,
      },
    ],
  },

  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFoundPage.vue"),
    meta: {
      requiresAuth: false,
      robots: "noindex, nofollow",
      seo: {
        title: "Halaman Tidak Ditemukan | Toko Hakimah",
        description: "Halaman yang Anda cari tidak tersedia di website resmi Toko Hakimah.",
        url: "https://tokohakimah.my.id/404",
      },
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  try {
    if (!authStore.isAuthenticated && localStorage.getItem("token")) {
      await authStore.initializeAuth();
    }

    const requiresAuth = to.meta.requiresAuth;
    const requiredRoles = to.meta.roles;

    if (requiresAuth && !authStore.isAuthenticated) {
      return next("/login");
    }

    if (requiresAuth && authStore.isAuthenticated) {
      if (requiredRoles && !requiredRoles.includes(authStore.getCurrentUser?.role)) {
        await Swal.fire({
          icon: "warning",
          title: "Akses Ditolak!",
          text: "Anda tidak memiliki izin untuk mengakses halaman ini.",
          confirmButtonText: "OK",
        });

        if (authStore.isUserAdmin) {
          return next("/admin/dashboard");
        } else {
          return next("/my-bons");
        }
      }
      return next();
    }

    if (!requiresAuth && authStore.isAuthenticated && (to.name === "Login" || to.name === "Home")) {
      if (authStore.isUserAdmin) {
        return next("/admin/dashboard");
      } else {
        return next("/my-bons");
      }
    }

    next();
  } catch (error) {
    console.error("Router navigation error:", error);

    authStore.logout?.();

    await Swal.fire({
      icon: "error",
      title: "Terjadi Kesalahan",
      text: "Silakan login kembali.",
      confirmButtonText: "OK",
    });

    next("/login");
  }
});

router.afterEach((to) => {
  applySeo(to);
});

export default router;
