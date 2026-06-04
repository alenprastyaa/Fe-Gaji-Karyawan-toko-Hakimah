<script setup>
import logoUrl from "@/assets/logos.png";
</script>

<template>
  <div class="landing-page">
    <section class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">Website Resmi Toko Hakimah</p>
        <h1>Toko Hakimah</h1>
        <p class="hero-lead">
          Toko Hakimah adalah pusat informasi dan akses aplikasi internal untuk operasional toko,
          pengelolaan bon karyawan, dan administrasi yang rapi, cepat, dan mudah digunakan.
        </p>

        <div class="hero-actions">
          <router-link to="/login" class="primary-action">Masuk ke Aplikasi</router-link>
          <a href="https://tokohakimah.my.id" class="secondary-action">tokohakimah.my.id</a>
        </div>

        <ul class="search-points">
          <li>Toko Hakimah</li>
          <li>Website resmi Toko Hakimah</li>
          <li>Aplikasi bon dan administrasi karyawan Toko Hakimah</li>
        </ul>
      </div>

      <div class="hero-card">
        <img :src="logoUrl" alt="Logo Toko Hakimah" class="hero-logo" />
        <div class="hero-card-copy">
          <p class="card-label">Profil Singkat</p>
          <p>
            Halaman ini dibuat agar pencarian seperti <strong>toko hakimah</strong> dan
            <strong>website toko hakimah</strong> lebih mudah dikenali mesin pencari.
          </p>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <article class="content-card">
        <h2>Tentang Toko Hakimah</h2>
        <p>
          Toko Hakimah menggunakan website ini sebagai identitas digital resmi dan akses menuju
          sistem kerja internal. Dengan adanya halaman publik ini, Google dapat menemukan nama
          brand Toko Hakimah dengan lebih jelas.
        </p>
      </article>

      <article class="content-card">
        <h2>Akses Cepat</h2>
        <p>
          Karyawan dan admin dapat masuk ke aplikasi untuk mengelola data bon, melihat riwayat,
          dan menjalankan proses administrasi harian dengan lebih efisien.
        </p>
      </article>

      <article class="content-card">
        <h2>Domain Resmi</h2>
        <p>
          Domain utama website ini adalah <strong>tokohakimah.my.id</strong>. Pastikan domain ini
          yang dibagikan agar sinyal brand konsisten di mesin pencari.
        </p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.landing-page {
  min-height: 100vh;
  padding: 48px 20px 72px;
  color: #122117;
  background:
    radial-gradient(circle at top left, rgba(235, 196, 111, 0.28), transparent 28%),
    radial-gradient(circle at bottom right, rgba(24, 119, 87, 0.2), transparent 30%),
    linear-gradient(180deg, #fcf8ef 0%, #f5f1e6 100%);
}

.hero-section,
.content-grid {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 28px;
  align-items: stretch;
}

.hero-copy,
.hero-card,
.content-card {
  border: 1px solid rgba(18, 33, 23, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 24px 60px rgba(50, 62, 39, 0.08);
  backdrop-filter: blur(14px);
}

.hero-copy {
  padding: 36px;
}

.eyebrow,
.card-label {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #52734d;
}

h1 {
  margin: 14px 0 18px;
  font-size: clamp(2.8rem, 5vw, 4.8rem);
  line-height: 0.95;
  font-weight: 800;
  color: #17311c;
}

.hero-lead,
.hero-card-copy p,
.content-card p {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.8;
  color: #314235;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 28px 0 24px;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  border-radius: 999px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;
}

.primary-action {
  color: #fffdf6;
  background: linear-gradient(135deg, #1b6b4a 0%, #0f4c36 100%);
  box-shadow: 0 18px 28px rgba(15, 76, 54, 0.22);
}

.secondary-action {
  color: #17311c;
  background: rgba(244, 237, 218, 0.95);
}

.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-2px);
}

.search-points {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.search-points li {
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(240, 233, 214, 0.72);
  font-weight: 600;
  color: #29452d;
}

.hero-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 32px;
}

.hero-logo {
  width: min(220px, 100%);
  height: auto;
  margin: 0 auto;
  object-fit: contain;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.content-card {
  padding: 28px;
}

.content-card h2 {
  margin: 0 0 14px;
  font-size: 1.28rem;
  color: #17311c;
}

@media (max-width: 900px) {
  .hero-section,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy,
  .hero-card,
  .content-card {
    padding: 24px;
  }
}
</style>
