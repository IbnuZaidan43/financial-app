# 💳 Nexus Financial

Nexus Financial adalah aplikasi pencatat keuangan modern (Income, Expense, & Wallet Tracker) yang dibangun dengan pendekatan **Local-First Architecture**. Aplikasi ini dirancang agar secepat kilat dan dapat diakses sepenuhnya tanpa koneksi internet (*Offline-Ready*), sambil tetap memastikan data tersinkronisasi dengan aman ke Cloud (*Supabase*) ketika perangkat kembali *online*.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-1B222D?logo=prisma)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)

## ✨ Fitur Utama (Kriteria Penilaian)

Proyek ini tidak hanya sekadar aplikasi CRUD biasa, melainkan menerapkan berbagai *best practice* dalam *Software Engineering* modern:

1. **Local-First & Offline PWA 📱**
   - Aplikasi dapat diinstal di *smartphone* atau *desktop* sebagai aplikasi *native*.
   - **Offline Mode:** Pengguna dapat menambah, mengedit, atau menghapus transaksi bahkan saat tidak ada sinyal internet. Semua perubahan disimpan di *Local Storage* dan diantrekan untuk sinkronisasi.

2. **Optimistic UI Updates ⚡**
   - Menggunakan *React Context* dan *Functional Updates* untuk memberikan *feedback* instan kepada pengguna (0ms latency). Tampilan layar dan kalkulasi saldo langsung berubah sebelum menunggu respons dari *database server*.

3. **Background Cloud Synchronization ☁️**
   - Transisi mulus antara mode **Guest (Lokal)** dan **Authenticated (Cloud)**.
   - Sinkronisasi otomatis (*Cloud Pull* & *Cloud Push*) menggunakan Next.js Server Actions dan Prisma `upsert` saat aplikasi mendeteksi koneksi internet (`navigator.onLine`).
   - Transaksi yang dihapus akan otomatis mengkalkulasi ulang (*reversal logic*) saldo tabungan terkait di database secara terisolasi dan aman.

4. **Import & Export Laporan (Excel) 📊**
   - Dukungan penuh untuk *parsing* dan *generating* file `.xlsx` di sisi klien. Pengguna dapat mem-*backup* data secara manual atau memigrasikan data dari pencatatan lama.   (cooming soon)

5. **Responsive & Accessible UI 🎨**
   - Antarmuka yang sepenuhnya responsif, memastikan elemen kompleks seperti tabel transaksi dan dialog form tidak terpotong (*overflow*) di layar *mobile* terkecil sekalipun.

## 🛠️ Teknologi yang Digunakan

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL (di-host di Supabase)
- **ORM:** Prisma
- **Autentikasi:** NextAuth.js (Google OAuth)
- **Styling:** Tailwind CSS & shadcn/ui
- **State Management:** React Context API & Custom Hooks
- **Lainnya:** Lucide Icons, xlsx (Spreadsheet parser), Sonner (Toasts)

## 🚀 Pendekatan Teknis (Technical Approach)

Aplikasi ini mengatasi masalah klasik pada aplikasi web (ketergantungan pada *loading spinner* dan koneksi internet) dengan alur berikut:
1. **User Action:** Pengguna menyimpan transaksi baru.
2. **State Mutation:** `FinancialContext` memperbarui *state* React secara instan dan mengkalkulasi ulang total saldo.
3. **Local Persistance:** Data baru langsung ditulis ke `localStorage` (untuk persistensi jika tab ditutup mendadak).
4. **Cloud Background Sync:** Aplikasi memanggil Server Actions (`syncTransaksiToCloud`). Prisma menggunakan `upsert` untuk mencegah duplikasi ID.
5. **Revalidation:** Jika sinkronisasi berhasil, aplikasi memvalidasi ulang kebenaran data dengan database Cloud, memastikan integritas data 100% terjaga.

## 💻 Petunjuk Pengaturan (Setup Instructions)

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di mesin lokal Anda:

### Prasyarat
- Node.js (v18 atau lebih baru)
- Akun Supabase (untuk database PostgreSQL)
- Akun Google Cloud Console (untuk OAuth Client ID)

### Langkah Instalasi

1. **Clone Repositori**
   ```bash
   git clone [https://github.com/username-kamu/nexus-financial.git](https://github.com/username-kamu/nexus-financial.git)
   cd nexus-financial

2. **Instal Dependensi**
    ```bash
    npm install

3. **Konfigurasi Environment Variables**
    Buat file .env di root directory dan isi dengan kredensial berikut:
    # Koneksi Database Supabase
      DATABASE_URL="postgresql://postgres.[PROYEK_ID]:[PASSWORD]@[aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres](https://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres)"
      DIRECT_URL="postgresql://postgres.[PROYEK_ID]:[PASSWORD]@[aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres](https://aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres)"

    # Next Auth
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="buat_random_string_rahasia_disini"

    # Google OAuth
    GOOGLE_CLIENT_ID="client_id_google_anda.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET="secret_google_anda"

4. **Setup Database (Prisma)**
    Generate Prisma Client dan sinkronkan skema ke database Supabase Anda:
    ```bash
    npx prisma generate
    npx prisma db push

5. **Jalankan Development Server**
    ```bash
    npm run dev

    Buka http://localhost:3000 di browser Anda.

### 📄 Struktur Database (Schema Overview)

Terdiri dari 3 entitas utama:
- User: Dikelola oleh NextAuth untuk autentikasi.
- Tabungan: Merepresentasikan dompet/rekening (Bank, E-Wallet, Cash). Memiliki relasi One-to-Many dengan Transaksi.
- Transaksi: Mencatat arus kas (Pemasukan/Pengeluaran).