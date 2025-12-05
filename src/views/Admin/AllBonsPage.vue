<script setup>
import { onMounted, ref, computed } from "vue";
import { useUserStore } from "../../stores/user";
import { useBonStore } from "../../stores/bon";
import { useCutiStore } from "../../stores/cuti";
import Swal from "sweetalert2";
import jsPDF from "jspdf";

const userStore = useUserStore();
const bonStore = useBonStore();
const cutiStore = useCutiStore();

const showAddUserModal = ref(false);
const showEditUserModal = ref(false);
const showAddCutiModal = ref(false);
const showEditCutiModal = ref(false);

const newUser = ref({
  username: "",
  password: "",
  role: "karyawan",
  namaLengkap: "",
  tanggalMasukKerja: "",
  gaji: 0,
});
const editedUser = ref(null);

const newCuti = ref({
  userId: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  jenisCuti: "",
  keperluan: "",
});
const editedCuti = ref(null);

const today = ref(new Date());

const searchQuery = ref("");

const roundToTwo = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

onMounted(async () => {
  try {
    await userStore.userActive();
    await bonStore.fetchBonActive({});
    await cutiStore.fetchCutiActive();
  } catch (error) {
    console.error("Error loading initial data:", error);
  }
});

const roles = ["karyawan", "admin"];
const jenisCutiOptions = ["Ijin Cuti"];

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "";
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
};

const getDaysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

const employeeSalarySummary = computed(() => {
  if (!userStore.users.length || bonStore.loading || cutiStore.loading) {
    return [];
  }

  const summaries = userStore.users.map((user) => {
    // ===== PERUBAHAN 1: Cek status karyawan =====
    // Hanya hitung untuk karyawan dengan status "active"
    if (user.status !== "active") {
      return {
        ...user,
        totalBon: 0,
        gajiPerHari: 0,
        daysWorked: 0,
        totalApprovedUnpaidLeaveDays: 0,
        effectiveDaysWorked: 0,
        gajiProRata: 0,
        sisaGaji: 0,
        isInactive: true,
      };
    }

    let totalBon = 0;
    bonStore.allBons.forEach((bon) => {
      if (bon.userId === user.id) {
        totalBon += parseFloat(bon.jumlahBon);
      }
    });
    totalBon = roundToTwo(totalBon);

    const gajiBulanan = parseFloat(user.gaji);
    const gajiPerHari = roundToTwo(gajiBulanan / 28);

    const tanggalMasuk = user.tanggalMasukKerja;
    let daysWorked = 0;

    if (tanggalMasuk) {
      const startDate = new Date(tanggalMasuk);
      startDate.setHours(0, 0, 0, 0);
      const todayNormalized = new Date(today.value);
      todayNormalized.setHours(0, 0, 0, 0);

      if (startDate <= todayNormalized) {
        daysWorked = getDaysBetween(startDate, todayNormalized);
      }
    }

    let totalApprovedUnpaidLeaveDays = 0;

    // PERBAIKAN: Hitung cuti akumulatif dari awal bekerja
    cutiStore.allCuti.forEach((cuti) => {
      if (cuti.userId === user.id && cuti.disetujui) {
        const cutiStart = new Date(cuti.tanggalMulai);
        const cutiEnd = new Date(cuti.tanggalSelesai);

        cutiStart.setHours(0, 0, 0, 0);
        cutiEnd.setHours(0, 0, 0, 0);

        // Menghitung dari tanggal masuk kerja hingga hari ini (BUKAN per bulan)
        const workStartDate = new Date(tanggalMasuk);
        workStartDate.setHours(0, 0, 0, 0);
        const todayNormalized = new Date(today.value);
        todayNormalized.setHours(0, 0, 0, 0);

        // Hitung overlap antara periode cuti dengan periode kerja
        const overlapStart = new Date(Math.max(cutiStart.getTime(), workStartDate.getTime()));
        const overlapEnd = new Date(Math.min(cutiEnd.getTime(), todayNormalized.getTime()));

        if (overlapStart <= overlapEnd) {
          const days = getDaysBetween(overlapStart, overlapEnd);
          totalApprovedUnpaidLeaveDays += days;
        }
      }
    });

    const effectiveDaysWorked = Math.max(0, daysWorked - totalApprovedUnpaidLeaveDays);
    const gajiProRata = roundToTwo(gajiPerHari * effectiveDaysWorked);
    const sisaGaji = roundToTwo(gajiProRata - totalBon);

    return {
      ...user,
      totalBon: roundToTwo(totalBon),
      gajiPerHari: roundToTwo(gajiPerHari),
      daysWorked,
      totalApprovedUnpaidLeaveDays,
      effectiveDaysWorked,
      gajiProRata: roundToTwo(gajiProRata),
      sisaGaji: roundToTwo(sisaGaji),
      isInactive: false,
    };
  });

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    return summaries.filter(
      (summary) =>
        summary.namaLengkap.toLowerCase().includes(query) ||
        summary.username.toLowerCase().includes(query)
    );
  }

  return summaries;
});
const totalSisaGaji = computed(() => {
  const total = employeeSalarySummary.value
    .filter((summary) => !summary.isInactive)
    .reduce((total, summary) => {
      return total + summary.sisaGaji;
    }, 0);
  return roundToTwo(total);
});

const totalGajiProRata = computed(() => {
  const total = employeeSalarySummary.value
    .filter((summary) => !summary.isInactive)
    .reduce((total, summary) => {
      return total + summary.gajiProRata;
    }, 0);
  return roundToTwo(total);
});
const totalBon = computed(() => {
  const total = employeeSalarySummary.value
    .filter((summary) => !summary.isInactive)
    .reduce((total, summary) => {
      return total + summary.totalBon;
    }, 0);
  return roundToTwo(total);
});
const employeesWithSurplus = computed(() => {
  return employeeSalarySummary.value
    .filter((summary) => !summary.isInactive && summary.sisaGaji >= 0).length;
});

const handleAddUser = async () => {
  if (
    !newUser.value.username ||
    !newUser.value.password ||
    !newUser.value.namaLengkap ||
    !newUser.value.tanggalMasukKerja ||
    newUser.value.gaji === null ||
    newUser.value.gaji === undefined
  ) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Semua field harus diisi.",
    });
    return;
  }

  try {
    const success = await userStore.addUser(newUser.value);
    if (success) {
      showAddUserModal.value = false;
      newUser.value = {
        username: "",
        password: "",
        role: "karyawan",
        namaLengkap: "",
        tanggalMasukKerja: "",
        gaji: 0,
      };

      await Promise.all([bonStore.fetchAllBons({}), cutiStore.fetchAllCuti()]);
    }
  } catch (error) {
    console.error("Error adding user:", error);
  }
};

const handleUpdateUser = async () => {
  if (
    !editedUser.value.username ||
    !editedUser.value.namaLengkap ||
    !editedUser.value.tanggalMasukKerja ||
    editedUser.value.gaji === null ||
    editedUser.value.gaji === undefined
  ) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Username, Nama Lengkap, Tanggal Masuk Kerja, dan Gaji harus diisi.",
    });
    return;
  }

  try {
    const dataToUpdate = {
      username: editedUser.value.username,
      role: editedUser.value.role,
      namaLengkap: editedUser.value.namaLengkap,
      tanggalMasukKerja: editedUser.value.tanggalMasukKerja,
      gaji: editedUser.value.gaji,
    };

    if (editedUser.value.password) {
      dataToUpdate.password = editedUser.value.password;
    }

    const success = await userStore.updateExistingUser(editedUser.value.id, dataToUpdate);
    if (success) {
      showEditUserModal.value = false;
      editedUser.value = null;

      await Promise.all([bonStore.fetchAllBons({}), cutiStore.fetchCutiActive()]);
    }
  } catch (error) {
    console.error("Error updating user:", error);
  }
};

const handleAddCuti = async () => {
  if (
    !newCuti.value.userId ||
    !newCuti.value.tanggalMulai ||
    !newCuti.value.tanggalSelesai ||
    !newCuti.value.jenisCuti
  ) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "User, Tanggal Mulai, Tanggal Selesai, dan Jenis Cuti harus diisi.",
    });
    return;
  }

  const startDate = new Date(newCuti.value.tanggalMulai);
  const endDate = new Date(newCuti.value.tanggalSelesai);

  if (startDate > endDate) {
    Swal.fire({
      icon: "warning",
      title: "Tanggal Tidak Valid",
      text: "Tanggal mulai tidak boleh setelah tanggal selesai.",
    });
    return;
  }

  try {
    const success = await cutiStore.createCuti(newCuti.value);
    if (success) {
      showAddCutiModal.value = false;
      newCuti.value = {
        userId: "",
        tanggalMulai: "",
        tanggalSelesai: "",
        jenisCuti: "",
        keperluan: "",
      };
    }
  } catch (error) {
    console.error("Error adding cuti:", error);
  }
};

const openEditCutiModal = (cuti) => {
  editedCuti.value = { ...cuti };
  showEditCutiModal.value = true;
};

const handleUpdateCuti = async () => {
  if (
    !editedCuti.value.tanggalMulai ||
    !editedCuti.value.tanggalSelesai ||
    !editedCuti.value.jenisCuti
  ) {
    Swal.fire({
      icon: "warning",
      title: "Input Tidak Lengkap",
      text: "Tanggal Mulai, Tanggal Selesai, dan Jenis Cuti harus diisi.",
    });
    return;
  }

  const startDate = new Date(editedCuti.value.tanggalMulai);
  const endDate = new Date(editedCuti.value.tanggalSelesai);

  if (startDate > endDate) {
    Swal.fire({
      icon: "warning",
      title: "Tanggal Tidak Valid",
      text: "Tanggal mulai tidak boleh setelah tanggal selesai.",
    });
    return;
  }

  try {
    const dataToUpdate = {
      userId: editedCuti.value.userId,
      tanggalMulai: editedCuti.value.tanggalMulai,
      tanggalSelesai: editedCuti.value.tanggalSelesai,
      jenisCuti: editedCuti.value.jenisCuti,
      keperluan: editedCuti.value.keperluan || "",
      disetujui: editedCuti.value.disetujui,
    };

    const success = await cutiStore.updateCuti(editedCuti.value.id, dataToUpdate);
    if (success) {
      showEditCutiModal.value = false;
      editedCuti.value = null;
    }
  } catch (error) {
    console.error("Error updating cuti:", error);
  }
};

const handleDeleteCuti = async (id, namaKaryawan) => {
  try {
    await cutiStore.deleteCuti(id);
  } catch (error) {
    console.error("Error deleting cuti:", error);
  }
};

const handleApproveCuti = async (id, approved) => {
  try {
    const approvalData = {
      disetujui: approved,
    };

    await cutiStore.approveCuti(id, approvalData);
  } catch (error) {
    console.error("Error approving/rejecting cuti:", error);
  }
};

const openAddCutiModal = () => {
  newCuti.value = {
    userId: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    jenisCuti: "",
    keperluan: "",
  };
  showAddCutiModal.value = true;
};

const closeAddCutiModal = () => {
  showAddCutiModal.value = false;
  newCuti.value = {
    userId: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    jenisCuti: "",
    keperluan: "",
  };
};

const closeEditCutiModal = () => {
  showEditCutiModal.value = false;
  editedCuti.value = null;
};

// Refresh all data
const refreshAllData = async () => {
  try {
    await Promise.all([
      userStore.fetchAllUsers(),
      bonStore.fetchAllBons({}),
      cutiStore.fetchAllCuti(),
    ]);
  } catch (error) {
    console.error("Error refreshing data:", error);
    Swal.fire({
      icon: "error",
      title: "Gagal Memuat Data",
      text: "Terjadi kesalahan saat memuat ulang data.",
    });
  }
};

const downloadSalaryPdf = (summary) => {
  const doc = new jsPDF();

  const margin = 20;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const drawTable = (data, startY, options = {}) => {
    const {
      headerBg = [70, 130, 180],
      headerText = [255, 255, 255],
      rowBg = [248, 249, 250],
      alternateRowBg = [255, 255, 255],
      borderColor = [200, 200, 200],
      fontSize = 10,
      rowHeight = 12,
      colWidths = [],
    } = options;

    let currentY = startY;
    const tableStartX = margin;

    const defaultColWidths =
      colWidths.length > 0 ? colWidths : data[0].map(() => contentWidth / data[0].length);

    if (options.hasHeader) {
      doc.setFillColor(...headerBg);
      doc.rect(tableStartX, currentY, contentWidth, rowHeight + 4, "F");

      // Header border
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.5);
      doc.rect(tableStartX, currentY, contentWidth, rowHeight + 4);

      // Header text
      doc.setTextColor(...headerText);
      doc.setFontSize(fontSize + 1);
      doc.setFont("helvetica", "bold");

      let currentX = tableStartX;
      data[0].forEach((cell, index) => {
        // Vertical lines
        if (index > 0) {
          doc.line(currentX, currentY, currentX, currentY + rowHeight + 4);
        }

        // Text
        doc.text(cell, currentX + 3, currentY + (rowHeight + 4) / 2 + 2, {
          baseline: "middle",
        });
        currentX += defaultColWidths[index];
      });

      // Right border
      doc.line(currentX, currentY, currentX, currentY + rowHeight + 4);

      currentY += rowHeight + 4;

      // Skip header row for data
      data = data.slice(1);
    }

    // Draw data rows
    data.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(...rowBg);
      } else {
        doc.setFillColor(...alternateRowBg);
      }

      doc.rect(tableStartX, currentY, contentWidth, rowHeight, "F");

      // Row border
      doc.setDrawColor(...borderColor);
      doc.rect(tableStartX, currentY, contentWidth, rowHeight);

      // Row text
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(fontSize);

      let currentX = tableStartX;
      row.forEach((cell, colIndex) => {
        // Vertical lines
        if (colIndex > 0) {
          doc.line(currentX, currentY, currentX, currentY + rowHeight);
        }

        // Set font style for first column (labels)
        if (colIndex === 0) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
        }

        // Text alignment
        const textAlign = colIndex === 1 ? "left" : "left";
        doc.text(String(cell), currentX + 3, currentY + rowHeight / 2 + 1, {
          baseline: "middle",
          align: textAlign,
        });

        currentX += defaultColWidths[colIndex];
      });

      // Right border
      doc.line(currentX, currentY, currentX, currentY + rowHeight);

      currentY += rowHeight;
    });

    return currentY;
  };

  // Company Header with better styling
  doc.setFillColor(41, 128, 185); // Professional blue
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN GAJI KARYAWAN", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Laporan Penggajian Karyawan", pageWidth / 2, 28, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  y = 50;

  // Employee Information Section with Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMASI KARYAWAN", margin, y);
  y += 5;

  const employeeData = [
    ["Nama Lengkap", summary.namaLengkap],
    ["Username", summary.username],
    ["Role", summary.role.toUpperCase()],
    ["Tanggal Masuk Kerja", formatDate(summary.tanggalMasukKerja)],
  ];

  y = drawTable(employeeData, y, {
    colWidths: [contentWidth * 0.35, contentWidth * 0.65],
    fontSize: 11,
    rowHeight: 10,
    headerBg: [52, 152, 219],
    rowBg: [236, 240, 245],
    alternateRowBg: [255, 255, 255],
  });

  y += 20;

  // Salary Details Section with Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RINCIAN GAJI", margin, y);
  y += 5;

  const salaryData = [
    ["Gaji Bulanan", formatCurrency(summary.gaji)],
    ["Gaji per Hari (28 hari/bulan)", formatCurrency(summary.gajiPerHari)],
    ["Total Hari Kerja (s/d hari ini)", `${summary.daysWorked} hari`],
    ["Hari Cuti Tidak Dibayar", `${summary.totalApprovedUnpaidLeaveDays} hari`],
    ["Hari Kerja Efektif", `${summary.effectiveDaysWorked} hari`],
  ];

  y = drawTable(salaryData, y, {
    colWidths: [contentWidth * 0.45, contentWidth * 0.55],
    fontSize: 11,
    rowHeight: 10,
    headerBg: [46, 204, 113],
    rowBg: [232, 245, 233],
    alternateRowBg: [255, 255, 255],
  });

  y += 20;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RINGKASAN PERHITUNGAN", margin, y);
  y += 5;
  const summaryData = [
    ["Gaji Pro-Rata (s/d hari ini)", formatCurrency(summary.gajiProRata)],
    ["Total Bon", formatCurrency(summary.totalBon)],
  ];

  y = drawTable(summaryData, y, {
    colWidths: [contentWidth * 0.5, contentWidth * 0.5],
    fontSize: 11,
    rowHeight: 10,
    headerBg: [155, 89, 182],
    rowBg: [244, 236, 247],
    alternateRowBg: [255, 255, 255],
  });

  y += 5;

  // Net Salary - Special highlighted row
  const netSalaryBg = summary.sisaGaji >= 0 ? [40, 167, 69] : [220, 53, 69];
  const netSalaryText = summary.sisaGaji >= 0 ? [255, 255, 255] : [255, 255, 255];

  doc.setFillColor(...netSalaryBg);
  doc.rect(margin, y, contentWidth, 18, "F");

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.rect(margin, y, contentWidth, 18);

  // Divider line in the middle
  doc.line(margin + contentWidth * 0.5, y, margin + contentWidth * 0.5, y + 18);

  doc.setTextColor(...netSalaryText);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SISA GAJI (BERSIH)", margin + 5, y + 11);
  doc.text(formatCurrency(summary.sisaGaji), margin + contentWidth * 0.5 + 5, y + 11);

  y += 25;

  // Status indicator
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  const statusText =
    summary.sisaGaji >= 0 ? "✅ Status: Gaji masih tersisa" : " Status: Bon melebihi gaji & ANDA HARUS MEBAYAR SEBESAR MINUS DIATAS";
  doc.text(statusText, margin, y);

  y += 20;

  // Footer Section with professional styling
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Two-column footer
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const currentDate = new Date();

  // Left side - Generation info
  doc.setTextColor(100, 100, 100);
  const generatedText = `Dibuat: ${formatDate(currentDate)} ${currentDate.toLocaleTimeString(
    "id-ID"
  )}`;
  doc.text(generatedText, margin, y);

  // Right side - Page info
  doc.text("Halaman 1 dari 1", pageWidth - margin - 25, y);

  y += 8;
  doc.setFont("helvetica", "italic");
  doc.text("* Perhitungan berdasarkan asumsi 28 hari kerja per bulan", margin, y);

  // Digital signature area
  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - margin - 80, y, pageWidth - margin, y);
  y += 8;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Tanda Tangan Digital", pageWidth - margin - 40, y, { align: "center" });

  // Save the PDF with enhanced filename
  const fileName = `Salary_Report_${summary.namaLengkap.replace(
    /\s+/g,
    "_"
  )}_${currentDate.getFullYear()}${(currentDate.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${currentDate.getDate().toString().padStart(2, "0")}.pdf`;

  doc.save(fileName);
};
</script>

<template>
  <div class="p-4  rounded-lg shadow-md">
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Manajemen Bon & Cuti</h1>
    <div class="mt-6 relative overflow-hidden">
      <div class="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <!-- Header with Gradient Background -->
        <div class="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-6 sm:p-8 text-white relative">
          <!-- Decorative Elements -->
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

          <div class="relative z-10">
            <!-- Icon and Title -->
            <div class="flex items-center mb-6">
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mr-4">
                <svg class="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1">
                  </path>
                </svg>
              </div>
              <div>
                <h3 class="text-xl sm:text-2xl font-bold mb-1">Total Keseluruhan</h3>
                <p class="text-blue-100 text-sm sm:text-base opacity-90">
                  Ringkasan gaji seluruh karyawan
                </p>
              </div>
            </div>

            <!-- Main Amount Display -->
            <div class="text-center sm:text-left">
              <div class="text-sm font-medium text-blue-100 mb-2 uppercase tracking-wider">
                Total Sisa Gaji Yang harus dibayarkan
              </div>
              <div class="flex items-center justify-center sm:justify-start">
                <div :class="[
                  'text-3xl sm:text-4xl font-bold mr-3',
                  totalSisaGaji >= 0 ? 'text-white' : 'text-red-200',
                ]">
                  {{ formatCurrency(totalSisaGaji) }}
                </div>
                <div class="px-3 py-1 rounded-full text-xs font-semibold"
                  :class="totalSisaGaji >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
                  {{ totalSisaGaji >= 0 ? "Surplus" : "Defisit" }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="mt-5">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <!-- Total Karyawan -->
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-5 border border-blue-200">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z">
                    </path>
                  </svg>
                </div>
              </div>
              <div class="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">
                {{ employeeSalarySummary.length }}
              </div>
              <div class="text-sm text-blue-600 font-medium">Total Karyawan</div>
            </div>

            <!-- Total Gaji Pro-Rata -->
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 sm:p-5 border border-green-200">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z">
                    </path>
                  </svg>
                </div>
              </div>
              <div class="text-lg sm:text-xl font-bold text-green-700 mb-1 break-words">
                {{ formatCurrency(totalGajiProRata) }}
              </div>
              <div class="text-sm text-green-600 font-medium">Gaji Tanpa Potongan</div>
            </div>

            <!-- Total Bon -->
            <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 sm:p-5 border border-red-200">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z">
                    </path>
                  </svg>
                </div>
              </div>
              <div class="text-lg sm:text-xl font-bold text-red-700 mb-1 break-words">
                {{ formatCurrency(totalBon) }}
              </div>
              <div class="text-sm text-red-600 font-medium">Total Bon</div>
            </div>

            <!-- Karyawan Surplus -->
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-5 border border-purple-200">
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <div class="text-2xl sm:text-3xl font-bold text-purple-700 mb-1">
                {{ employeesWithSurplus }}
              </div>
              <div class="text-sm text-purple-600 font-medium">Karyawan Surplus</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-4 sm:mt-8 mb-4 sm:mb-8 p-3 sm:p-4 bg-gray-50 rounded-lg shadow-md">
      <h2 class="text-lg sm:text-xl font-semibold text-gray-700 mb-3 sm:mb-4">
        Manajemen Pengajuan Cuti
      </h2>

      <div class="mb-3 sm:mb-4 flex justify-center sm:justify-end">
        <button @click="showAddCutiModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 sm:px-4 rounded-xl text-sm sm:text-base w-full sm:w-auto">
          Tambah Cuti Karyawan
        </button>
      </div>

      <div v-if="cutiStore.loading" class="text-center py-6 sm:py-8">
        <p class="text-sm sm:text-base">Memuat data cuti...</p>
        <div class="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-green-500 mx-auto mt-4"></div>
      </div>

      <div v-else-if="cutiStore.error"
        class="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-3 rounded relative text-sm sm:text-base"
        role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">{{ cutiStore.error }}</span>
      </div>

      <div v-else>
        <div v-if="cutiStore.allCuti.length > 0">
          <!-- Desktop Table View -->
          <div class="hidden lg:block overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200">
              <thead>
                <tr class="bg-gray-800 text-white uppercase text-sm leading-normal">
                  <th class="py-3 px-6 text-left">No</th>
                  <th class="py-3 px-6 text-left">Karyawan</th>
                  <th class="py-3 px-6 text-left">Jenis Cuti</th>
                  <th class="py-3 px-6 text-left">Tanggal Mulai</th>
                  <th class="py-3 px-6 text-left">Tanggal Selesai</th>
                  <th class="py-3 px-6 text-left">Keperluan</th>
                  <th class="py-3 px-6 text-center">Disetujui</th>
                  <th class="py-3 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="text-gray-600 text-sm font-light">
                <tr v-for="(cuti, index) in cutiStore.allCuti" :key="cuti.id"
                  class="border-b border-gray-200 hover:bg-gray-100">
                  <td class="py-3 px-6 text-left whitespace-nowrap">{{ index + 1 }}</td>
                  <td class="py-3 px-6 text-left">{{ cuti.pemohon.username || "N/A" }}</td>
                  <td class="py-3 px-6 text-left">{{ cuti.jenisCuti }}</td>
                  <td class="py-3 px-6 text-left">{{ formatDate(cuti.tanggalMulai) }}</td>
                  <td class="py-3 px-6 text-left">{{ formatDate(cuti.tanggalSelesai) }}</td>
                  <td class="py-3 px-6 text-left">{{ cuti.keperluan || "-" }}</td>
                  <td class="py-3 px-6 text-center">
                    <span :class="[
                      'px-2 py-1 text-xs font-semibold rounded-full',
                      cuti.disetujui ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800',
                    ]">
                      {{ cuti.disetujui ? "Ya" : "Tidak" }}
                    </span>
                  </td>
                  <td class="py-3 px-6 text-center">
                    <div class="flex item-center justify-center space-x-2">
                      <button @click="openEditCutiModal(cuti)"
                        class="bg-yellow-500 hover:bg-yellow-700 text-white py-1 px-2 rounded text-xs">
                        Edit
                      </button>
                      <button @click="handleDeleteCuti(cuti.id, cuti.karyawan?.namaLengkap || 'Cuti ini')"
                        class="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-xs">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Card View -->
          <div class="lg:hidden space-y-3">
            <div v-for="(cuti, index) in cutiStore.allCuti" :key="cuti.id"
              class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-800 text-sm">
                    #{{ index + 1 }} - {{ cuti.karyawan?.namaLengkap || "N/A" }}
                  </h3>
                  <p class="text-xs text-gray-600 mt-1">{{ cuti.jenisCuti }}</p>
                </div>
                <span :class="[
                  'px-2 py-1 text-xs font-semibold rounded-full ml-2',
                  cuti.disetujui ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800',
                ]">
                  {{ cuti.disetujui ? "Disetujui" : "Belum Disetujui" }}
                </span>
              </div>

              <div class="space-y-2 text-sm">
                <div class="flex flex-col sm:flex-row sm:justify-between">
                  <span class="text-gray-600 font-medium">Tanggal:</span>
                  <span class="text-gray-800">
                    {{ formatDate(cuti.tanggalMulai) }} - {{ formatDate(cuti.tanggalSelesai) }}
                  </span>
                </div>

                <div class="flex flex-col sm:flex-row sm:justify-between">
                  <span class="text-gray-600 font-medium">Keperluan:</span>
                  <span class="text-gray-800 sm:text-right sm:max-w-xs">{{
                    cuti.keperluan || "-"
                  }}</span>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-2 mt-4">
                <button @click="openEditCutiModal(cuti)"
                  class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors">
                  Edit
                </button>
                <button @click="handleDeleteCuti(cuti.id, cuti.karyawan?.namaLengkap || 'Cuti ini')"
                  class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm font-medium transition-colors">
                  Hapus
                </button>
              </div>
            </div>
          </div>

          <!-- Tablet Horizontal Scroll Table -->
          <div class="hidden md:block lg:hidden overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200">
              <thead>
                <tr class="bg-gray-800 text-white uppercase text-xs leading-normal">
                  <th class="py-2 px-3 text-left">No</th>
                  <th class="py-2 px-3 text-left">Karyawan</th>
                  <th class="py-2 px-3 text-left">Jenis</th>
                  <th class="py-2 px-3 text-left">Mulai</th>
                  <th class="py-2 px-3 text-left">Selesai</th>
                  <th class="py-2 px-3 text-left">Status</th>
                  <th class="py-2 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="text-gray-600 text-xs font-light">
                <tr v-for="(cuti, index) in cutiStore.allCuti" :key="cuti.id"
                  class="border-b border-gray-200 hover:bg-gray-100">
                  <td class="py-2 px-3 text-left whitespace-nowrap">{{ index + 1 }}</td>
                  <td class="py-2 px-3 text-left">{{ cuti.karyawan?.namaLengkap || "N/A" }}</td>
                  <td class="py-2 px-3 text-left">{{ cuti.jenisCuti }}</td>
                  <td class="py-2 px-3 text-left">{{ formatDate(cuti.tanggalMulai) }}</td>
                  <td class="py-2 px-3 text-left">{{ formatDate(cuti.tanggalSelesai) }}</td>
                  <td class="py-2 px-3 text-center">
                    <span :class="[
                      'px-2 py-1 text-xs font-semibold rounded-full',
                      cuti.disetujui ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800',
                    ]">
                      {{ cuti.disetujui ? "Ya" : "Tidak" }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-center">
                    <div class="flex item-center justify-center space-x-1">
                      <button @click="openEditCutiModal(cuti)"
                        class="bg-yellow-500 hover:bg-yellow-700 text-white py-1 px-2 rounded text-xs">
                        Edit
                      </button>
                      <button @click="handleDeleteCuti(cuti.id, cuti.karyawan?.namaLengkap || 'Cuti ini')"
                        class="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-xs">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-else class="text-center text-gray-500 py-6 sm:py-8 text-sm sm:text-base">
          Belum ada pengajuan cuti.
        </p>
      </div>
    </div>
    <div class="mt-8 bg-blue-50 rounded-lg shadow-md">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        Ringkasan Gaji Karyawan (Hingga Hari Ini)
      </h2>

      <div class="mb-4 flex justify-end">
        <input type="text" v-model="searchQuery" placeholder="Cari karyawan..."
          class="shadow border rounded w-full md:w-1/3 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
      </div>

      <div v-if="userStore.loading || bonStore.loading || cutiStore.loading" class="text-center py-4">
        <p>Memuat data gaji, bon, dan cuti...</p>
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mt-2"></div>
      </div>
      <div v-else-if="userStore.error || bonStore.error || cutiStore.error"
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Error!</strong>
        <span class="block sm:inline">{{
          userStore.error || bonStore.error || cutiStore.error
        }}</span>
      </div>
      <div v-else-if="employeeSalarySummary.length > 0">
        <!-- Mobile Card View (hidden on desktop) -->
        <div class="block lg:hidden space-y-4 px-2">
          <div v-for="(summary, index) in employeeSalarySummary" :key="summary.id"
            class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <!-- Employee Header -->
            <div class="flex items-center mb-4 pb-3 border-b border-gray-100">
              <div class="flex-shrink-0 h-10 w-10">
                <div
                  class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {{
                    summary.namaLengkap
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                  }}
                </div>
              </div>
              <div class="ml-3 flex-1">
                <div class="text-sm font-semibold text-gray-900">{{ summary.namaLengkap }}</div>
                <div class="text-xs text-gray-500">{{ summary.username }}</div>
              </div>
              <button @click="downloadSalaryPdf(summary)"
                class="ml-2 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500 transition-all duration-200 shadow-sm">
                <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clip-rule="evenodd" />
                </svg>
                PDF
              </button>
            </div>

            <!-- Employee Details Grid -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <!-- Gaji Bulanan -->
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center text-gray-500 mb-1">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  Gaji Bulanan
                </div>
                <div class="font-semibold text-gray-900 text-sm">
                  {{ formatCurrency(summary.gaji) }}
                </div>
                <div class="text-gray-500 text-xs">
                  {{ formatCurrency(summary.gajiPerHari) }}/hari
                </div>
              </div>

              <!-- Hari Kerja -->
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center text-gray-500 mb-1">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clip-rule="evenodd" />
                  </svg>
                  Hari Kerja
                </div>
                <div class="font-semibold text-green-700 text-sm">
                  {{ summary.effectiveDaysWorked }} hari
                </div>
                <div class="text-gray-500 text-xs">dari {{ summary.daysWorked }}</div>
              </div>

              <!-- Hari Cuti -->
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center text-gray-500 mb-1">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clip-rule="evenodd" />
                  </svg>
                  Hari Cuti
                </div>
                <div class="font-semibold text-orange-700 text-sm">
                  {{ summary.totalApprovedUnpaidLeaveDays }} hari
                </div>
              </div>

              <!-- Gaji Pro-Rata -->
              <div class="bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center text-gray-500 mb-1">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                      clip-rule="evenodd" />
                  </svg>
                  Gaji Pro-Rata
                </div>
                <div class="font-semibold text-gray-900 text-sm">
                  {{ formatCurrency(summary.gajiProRata) }}
                </div>
              </div>
            </div>

            <!-- Bottom Row - Bon and Sisa Gaji -->
            <div class="grid grid-cols-2 gap-3 mt-3">
              <div class="bg-red-50 p-3 rounded-lg border border-red-100">
                <div class="flex items-center text-red-600 mb-1">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z"
                      clip-rule="evenodd" />
                  </svg>
                  <span class="text-xs">Total Bon</span>
                </div>
                <div class="font-semibold text-red-600 text-sm">
                  {{ formatCurrency(summary.totalBon) }}
                </div>
              </div>

              <div :class="[
                'p-3 rounded-lg border',
                summary.sisaGaji >= 0
                  ? 'bg-green-50 border-green-100'
                  : 'bg-red-50 border-red-100',
              ]">
                <div :class="[
                  'flex items-center mb-1',
                  summary.sisaGaji >= 0 ? 'text-green-600' : 'text-red-600',
                ]">
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                      d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                      clip-rule="evenodd" />
                  </svg>
                  <span class="text-xs">Sisa Gaji</span>
                </div>
                <div :class="[
                  'font-bold text-sm',
                  summary.sisaGaji >= 0 ? 'text-green-600' : 'text-red-600',
                ]">
                  {{ formatCurrency(summary.sisaGaji) }}
                </div>
                <div :class="['text-xs', summary.sisaGaji >= 0 ? 'text-green-500' : 'text-red-500']">
                  {{ summary.sisaGaji >= 0 ? "Surplus" : "Defisit" }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table View (hidden on mobile) -->
        <div class="hidden lg:block overflow-x-auto shadow-lg rounded-lg">
          <table class="min-w-full bg-white border-collapse">
            <thead>
              <tr class="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <th
                  class="py-4 px-4 text-left font-semibold text-sm uppercase tracking-wider border-r border-blue-500 last:border-r-0">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clip-rule="evenodd" />
                    </svg>
                    Nama Karyawan
                  </div>
                </th>
                <th
                  class="py-4 px-4 text-right font-semibold text-sm uppercase tracking-wider border-r border-blue-500">
                  <div class="flex items-center justify-end">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                    Gaji Bulanan
                  </div>
                </th>
                <th
                  class="py-4 px-4 text-center font-semibold text-sm uppercase tracking-wider border-r border-blue-500">
                  <div class="flex items-center justify-center">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clip-rule="evenodd" />
                    </svg>
                    Hari Kerja
                  </div>
                </th>
                <th
                  class="py-4 px-4 text-center font-semibold text-sm uppercase tracking-wider border-r border-blue-500">
                  <div class="flex items-center justify-center">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                        clip-rule="evenodd" />
                    </svg>
                    Hari Cuti
                  </div>
                </th>
                <th
                  class="py-4 px-4 text-right font-semibold text-sm uppercase tracking-wider border-r border-blue-500">
                  <div class="flex items-center justify-end">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clip-rule="evenodd" />
                    </svg>
                    Gaji Pro-Rata
                  </div>
                </th>
                <th
                  class="py-4 px-4 text-right font-semibold text-sm uppercase tracking-wider border-r border-blue-500">
                  <div class="flex items-center justify-end">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z"
                        clip-rule="evenodd" />
                    </svg>
                    Total Bon
                  </div>
                </th>
                <th
                  class="py-4 px-4 text-right font-semibold text-sm uppercase tracking-wider border-r border-blue-500">
                  <div class="flex items-center justify-end">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z"
                        clip-rule="evenodd" />
                    </svg>
                    Sisa Gaji
                  </div>
                </th>
                <th class="py-4 px-4 text-center font-semibold text-sm uppercase tracking-wider">
                  <div class="flex items-center justify-center">
                    <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clip-rule="evenodd" />
                    </svg>
                    Aksi
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="(summary, index) in employeeSalarySummary" :key="summary.id" :class="[
                'hover:bg-blue-50 transition-colors duration-200',
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50',
              ]">
                <td class="py-4 px-4 border-r border-gray-200">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div
                        class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {{
                          summary.namaLengkap
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                        }}
                      </div>
                    </div>
                    <div class="ml-3">
                      <div class="text-sm font-semibold text-gray-900">
                        {{ summary.namaLengkap }}
                      </div>
                      <div class="text-xs text-gray-500">{{ summary.username }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4 text-right border-r border-gray-200">
                  <div class="text-sm font-semibold text-gray-900">
                    {{ formatCurrency(summary.gaji) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ formatCurrency(summary.gajiPerHari) }}/hari
                  </div>
                </td>
                <td class="py-4 px-4 text-center border-r border-gray-200">
                  <div class="inline-flex flex-col items-center">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {{ summary.effectiveDaysWorked }} hari
                    </span>
                    <span class="text-xs text-gray-500 mt-1">dari {{ summary.daysWorked }}</span>
                  </div>
                </td>
                <td class="py-4 px-4 text-center border-r border-gray-200">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {{ summary.totalApprovedUnpaidLeaveDays }} hari
                  </span>
                </td>
                <td class="py-4 px-4 text-right border-r border-gray-200">
                  <div class="text-sm font-semibold text-gray-900">
                    {{ formatCurrency(summary.gajiProRata) }}
                  </div>
                </td>
                <td class="py-4 px-4 text-right border-r border-gray-200">
                  <div class="text-sm font-semibold text-red-600">
                    {{ formatCurrency(summary.totalBon) }}
                  </div>
                </td>
                <td class="py-4 px-4 text-right border-r border-gray-200">
                  <div :class="[
                    'text-sm font-bold',
                    summary.sisaGaji >= 0 ? 'text-green-600' : 'text-red-600',
                  ]">
                    {{ formatCurrency(summary.sisaGaji) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ summary.sisaGaji >= 0 ? "Surplus" : "Defisit" }}
                  </div>
                </td>
                <td class="py-4 px-4 text-center">
                  <button @click="downloadSalaryPdf(summary)"
                    class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                    <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clip-rule="evenodd" />
                    </svg>
                    PDF
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Total Summary Section -->
      </div>
      <p v-else class="text-center text-gray-500 py-4">
        Tidak ada data gaji yang tersedia atau tidak ada bon/cuti.
      </p>
    </div>

    <div v-if="showAddUserModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
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
            <input type="date" id="newTanggalMasukKerja" v-model="newUser.tanggalMasukKerja"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
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
              <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showAddUserModal = false"
              class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Batal
            </button>
            <button type="submit" :disabled="userStore.loading"
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              <span v-if="userStore.loading">Menyimpan...</span>
              <span v-else>Tambah User</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditUserModal && editedUser"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 class="text-xl font-bold mb-4">Edit User</h2>
        <form @submit.prevent="handleUpdateUser">
          <div class="mb-4">
            <label for="editUsername" class="block text-gray-700 text-sm font-bold mb-2">Username:</label>
            <input type="text" id="editUsername" v-model="editedUser.username"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div class="mb-4">
            <label for="editPassword" class="block text-gray-700 text-sm font-bold mb-2">Password (isi jika ingin
              mengubah):</label>
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
            <input type="date" id="editTanggalMasukKerja" v-model="editedUser.tanggalMasukKerja"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div class="mb-4">
            <label for="editGaji" class="block text-gray-700 text-sm font-bold mb-2">Gaji (IDR):</label>
            <input type="number" id="editGaji" v-model.number="editedUser.gaji"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required min="0" />
          </div>
          <div class="mb-6">
            <label for="editRole" class="block text-gray-700 text-sm font-bold mb-2">Role:</label>
            <select id="editRole" v-model="editedUser.role" class="shadow border rounded w-full py-2 px-3 text-gray-700"
              required>
              <option v-for="role in roles" :key="role" :value="role">{{ role }}</option>
            </select>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showEditUserModal = false"
              class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Batal
            </button>
            <button type="submit" :disabled="userStore.loading"
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              <span v-if="userStore.loading">Menyimpan...</span>
              <span v-else>Update User</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showAddCutiModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 class="text-xl font-bold mb-4">Tambahkan Cuti Baru</h2>
        <form @submit.prevent="handleAddCuti">
          <div class="mb-4">
            <label for="cutiUser" class="block text-gray-700 text-sm font-bold mb-2">Karyawan:</label>
            <select id="cutiUser" v-model="newCuti.userId" class="shadow border rounded w-full py-2 px-3 text-gray-700"
              required>
              <option value="" disabled>Pilih Karyawan</option>
              <option v-for="user in userStore.users" :key="user.id" :value="user.id">
                {{ user.namaLengkap }} ({{ user.username }})
              </option>
            </select>
          </div>
          <div class="mb-4">
            <label for="newCutiTanggalMulai" class="block text-gray-700 text-sm font-bold mb-2">Tanggal Mulai
              Cuti:</label>
            <input type="date" id="newCutiTanggalMulai" v-model="newCuti.tanggalMulai"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div class="mb-4">
            <label for="newCutiTanggalSelesai" class="block text-gray-700 text-sm font-bold mb-2">Tanggal Selesai
              Cuti:</label>
            <input type="date" id="newCutiTanggalSelesai" v-model="newCuti.tanggalSelesai"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div class="mb-4">
            <label for="newCutiJenisCuti" class="block text-gray-700 text-sm font-bold mb-2">Jenis Cuti:</label>
            <select id="newCutiJenisCuti" v-model="newCuti.jenisCuti"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required>
              <option value="" disabled>Pilih Jenis Cuti</option>
              <option v-for="jenis in jenisCutiOptions" :key="jenis" :value="jenis">
                {{ jenis }}
              </option>
            </select>
          </div>
          <div class="mb-6">
            <label for="newCutiKeperluan" class="block text-gray-700 text-sm font-bold mb-2">Keperluan
              (Opsional):</label>
            <textarea id="newCutiKeperluan" v-model="newCuti.keperluan" rows="3"
              class="shadow border rounded w-full py-2 px-3 text-gray-700"></textarea>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showAddCutiModal = false"
              class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Batal
            </button>
            <button type="submit" :disabled="cutiStore.loading"
              class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
              <span v-if="cutiStore.loading">Mengajukan...</span>
              <span v-else>Tambah Cuti</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showEditCutiModal && editedCuti"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 class="text-xl font-bold mb-4">Edit Cuti</h2>
        <form @submit.prevent="handleUpdateCuti">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Karyawan:</label>
            <p class="text-gray-800 font-medium">
              {{ editedCuti.karyawan?.namaLengkap || "N/A" }}
            </p>
          </div>
          <div class="mb-4">
            <label for="editCutiTanggalMulai" class="block text-gray-700 text-sm font-bold mb-2">Tanggal Mulai
              Cuti:</label>
            <input type="date" id="editCutiTanggalMulai" v-model="editedCuti.tanggalMulai"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div class="mb-4">
            <label for="editCutiTanggalSelesai" class="block text-gray-700 text-sm font-bold mb-2">Tanggal Selesai
              Cuti:</label>
            <input type="date" id="editCutiTanggalSelesai" v-model="editedCuti.tanggalSelesai"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div class="mb-4">
            <label for="editCutiJenisCuti" class="block text-gray-700 text-sm font-bold mb-2">Jenis Cuti:</label>
            <select id="editCutiJenisCuti" v-model="editedCuti.jenisCuti"
              class="shadow border rounded w-full py-2 px-3 text-gray-700" required>
              <option v-for="jenis in jenisCutiOptions" :key="jenis" :value="jenis">
                {{ jenis }}
              </option>
            </select>
          </div>
          <div class="mb-4">
            <label for="editCutiKeperluan" class="block text-gray-700 text-sm font-bold mb-2">Keperluan
              (Opsional):</label>
            <textarea id="editCutiKeperluan" v-model="editedCuti.keperluan" rows="3"
              class="shadow border rounded w-full py-2 px-3 text-gray-700"></textarea>
          </div>
          <div class="mb-6">
            <label for="editCutiDisetujui" class="block text-gray-700 text-sm font-bold mb-2">Disetujui:</label>
            <input type="checkbox" id="editCutiDisetujui" v-model="editedCuti.disetujui" class="mr-2 leading-tight" />
            <span class="text-sm">Centang jika disetujui</span>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showEditCutiModal = false"
              class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Batal
            </button>
            <button type="submit" :disabled="cutiStore.loading"
              class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              <span v-if="cutiStore.loading">Memperbarui...</span>
              <span v-else>Update Cuti</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
