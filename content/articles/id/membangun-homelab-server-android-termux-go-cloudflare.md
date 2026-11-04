---
translationKey: android-homelab-article
title: Membangun Homelab Server Berbasis Android dengan Termux, Go, dan Cloudflare Tunnel
description: Eksperimen membangun server self-hosted hemat resource menggunakan Samsung Galaxy J2 Prime, Termux, Go, SQLite, Nginx, dan Cloudflare Tunnel.
category: Infrastructure & Self-Hosting
tags:
  - Homelab
  - Android
  - Termux
  - Linux
  - Go
  - SQLite
  - Nginx
  - Cloudflare Tunnel
  - SSH
  - Monitoring
publishedAt: 2026-11-04
draft: false
relatedProject: android-homelab
---

## Pendahuluan

Apakah smartphone Android lama masih bisa dimanfaatkan menjadi sebuah server yang berguna?

Pertanyaan tersebut menjadi awal eksperimen membangun homelab menggunakan Samsung Galaxy J2 Prime. Perangkat dengan keterbatasan hardware ini dimanfaatkan sebagai server self-hosted untuk menjalankan web server, monitoring sistem, dan layanan yang dapat diakses melalui internet.

Alih-alih menggunakan server Linux konvensional atau VPS tambahan, proyek ini mengeksplorasi pemanfaatan Android sebagai lingkungan server menggunakan Termux.

Tujuannya bukan sekadar membuat layanan berjalan, tetapi membangun infrastruktur yang ringan, terukur, dapat dipelihara, dan memiliki akses remote yang aman.

## 1. Hardware dan lingkungan sistem

Perangkat yang digunakan:

| Komponen | Spesifikasi |
|---|---|
| Device | Samsung Galaxy J2 Prime SM-J250F |
| Operating System | Android 7.1.1 |
| Processor | Qualcomm Snapdragon 425 |
| CPU | 4-core ARM Cortex-A53 |
| Architecture | ARMv7, 32-bit |
| RAM | Sekitar 1,3 GiB |
| Environment | Termux |
| Kernel | Linux 3.18.31 |

Keterbatasan perangkat menjadi pertimbangan utama dalam pemilihan teknologi.

Penggunaan service yang berlebihan, runtime yang berat, dan proses background yang tidak diperlukan harus dihindari.

## 2. Arsitektur homelab

Infrastruktur dibangun menggunakan beberapa komponen yang memiliki tanggung jawab berbeda.

### Komponen utama

- **Termux:** menyediakan lingkungan Linux-like pada Android.
- **Nginx:** menangani HTTP request dan menyajikan website statis.
- **Go:** menjalankan monitoring API.
- **SQLite:** menyimpan histori penggunaan resource.
- **runit:** mengelola lifecycle service.
- **Cloudflare Tunnel:** menyediakan akses publik tanpa membuka port inbound router.
- **OpenSSH:** menyediakan akses administrasi jarak jauh.

### Gambaran arsitektur

```text
                  INTERNET
                     |
                     v
             CLOUDFLARE EDGE
                     |
                     v
              CLOUDFLARE TUNNEL
                     |
                     v
          SAMSUNG GALAXY J2 PRIME
                     |
              TERMUX ENVIRONMENT
                     |
          +----------+----------+
          |          |          |
          v          v          v
        Nginx       Go       OpenSSH
        :8080     Monitor      :8022
                     |
                     v
                  SQLite
                     |
                     v
             monitor_history
```

Cloudflare Tunnel digunakan untuk menghubungkan layanan internal ke jaringan Cloudflare melalui koneksi outbound. Dengan pendekatan ini, tidak diperlukan port forwarding router untuk akses publik.

## 3. Menggunakan Go untuk monitoring sistem

Salah satu tantangan utama adalah membangun monitoring system yang cukup ringan untuk perangkat dengan RAM terbatas.

Implementasi awal menggunakan Python standard library. Setelah evaluasi penggunaan resource dan kebutuhan jangka panjang, monitoring kemudian dimigrasikan ke Go.

Go dipilih karena:
- Menghasilkan binary mandiri.
- Tidak memerlukan runtime interpreter saat dijalankan.
- Memiliki dukungan concurrency.
- Cocok untuk membuat HTTP API ringan.
- Dapat dikompilasi untuk ARMv7 Android.

Monitoring API menyediakan beberapa endpoint:

| Endpoint | Fungsi |
|---|---|
| `/health` | Pemeriksaan kesehatan service |
| `/api/status` | Informasi kondisi sistem |
| `/api/history` | Histori penggunaan resource |
| `/api/version` | Informasi versi aplikasi |

Data yang dikumpulkan meliputi:
- CPU usage.
- Memory usage.
- Swap usage.
- Disk usage.
- Load average.
- System uptime.
- Status service.

API menggunakan JSON agar mudah dikonsumsi oleh dashboard web atau aplikasi monitoring lainnya.

## 4. SQLite sebagai penyimpanan histori

Untuk menghindari ketergantungan pada database server yang lebih berat, proyek ini menggunakan SQLite.

Histori monitoring disimpan dalam tabel `monitor_history` dengan struktur:

```sql
CREATE TABLE monitor_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    cpu REAL,
    ram REAL,
    swap REAL,
    disk REAL
);
```

Pengumpulan histori dilakukan secara berkala setiap 60 detik.

Data lama dibersihkan secara otomatis setelah melewati masa retensi tujuh hari.

Pendekatan ini memberikan histori yang cukup untuk memantau tren penggunaan resource tanpa menambah beban penyimpanan secara berlebihan.

## 5. Migrasi monitoring dari Python ke Go

Migrasi dilakukan secara bertahap untuk mengurangi risiko downtime.

Tahapan yang dilakukan:

1. Mengimplementasikan monitoring API menggunakan Go.
2. Mempertahankan struktur database SQLite yang sudah ada.
3. Memindahkan proses penulisan histori ke Go.
4. Menghentikan service monitoring Python.
5. Memperbarui konfigurasi Nginx agar meneruskan API ke port Go.
6. Memeriksa kembali seluruh service yang berjalan.

Hasil verifikasi setelah migrasi menunjukkan:
- Go Monitoring API merespons health check.
- Nginx berhasil meneruskan request ke backend.
- Histori SQLite tetap tersedia.
- Empat service utama tetap berjalan.
- Tidak ditemukan referensi aktif ke service Python lama dalam audit konfigurasi yang dilakukan.

Migrasi ini menjadi bagian penting dari proses penyederhanaan infrastruktur.

## 6. Service supervision menggunakan runit

Android memiliki karakteristik berbeda dari server Linux konvensional, khususnya dalam pengelolaan proses background.

Untuk menjaga service tetap berjalan, digunakan Termux Services berbasis runit.

Service yang dikelola meliputi:
- Nginx.
- SSHD.
- Cloudflared.
- Go Monitoring API.

Integrasi Termux:Boot digunakan untuk membantu menjalankan service ketika perangkat melakukan startup.

Pendekatan ini mengurangi kebutuhan menjalankan setiap aplikasi secara manual.

## 7. Remote access menggunakan Cloudflare Tunnel dan SSH

Administrasi server tidak selalu dilakukan dari jaringan lokal yang sama.

Untuk kebutuhan remote access, dirancang integrasi OpenSSH dengan Cloudflare Tunnel dan Cloudflare Access.

Arsitektur yang dituju:

```text
REMOTE WINDOWS / LINUX
        |
        v
 OpenSSH Client
        |
        v
   cloudflared
        |
        v
 Cloudflare Access
        |
        v
 Existing Tunnel
        |
        v
 Termux SSHD :8022
```

Keunggulan pendekatan ini:
- Tidak perlu membuka port SSH pada router.
- Tidak membutuhkan IP publik khusus.
- Akses dapat dibatasi melalui identitas pengguna.
- Autentikasi SSH tetap menggunakan public key.
- Infrastruktur tunnel yang sudah tersedia dapat digunakan kembali.

Konfigurasi remote SSH ini diperlakukan sebagai bagian dari pengembangan keamanan akses dan perlu diuji dari jaringan eksternal sebelum dinyatakan selesai.

## 8. Tantangan teknis

Beberapa tantangan yang ditemukan selama pengembangan:

### Keterbatasan ARM 32-bit

Tidak semua binary Linux dapat langsung digunakan di lingkungan Android ARMv7.

Solusinya adalah melakukan cross-compilation menggunakan target Android ARM:

```bash
GOOS=android \
GOARCH=arm \
GOARM=7 \
CGO_ENABLED=1 \
CC=clang \
go build -o monitor .
```

### Pengelolaan proses

Mengganti binary yang sedang berjalan dapat menimbulkan masalah seperti `Text file busy`.

Solusinya adalah menghentikan service terlebih dahulu, menyiapkan binary pengganti, kemudian mengganti binary secara aman.

### Integrasi reverse proxy

Nginx harus meneruskan request ke backend yang tepat. Kesalahan pemilihan virtual host atau port upstream dapat menghasilkan HTTP 502.

Validasi dilakukan melalui pengujian langsung ke backend dan melalui Nginx.

### Efisiensi resource

Dengan RAM dan storage yang terbatas, pemilihan teknologi dan frekuensi pengumpulan data harus disesuaikan dengan kemampuan perangkat.

## 9. Hasil dan pembelajaran

Proyek ini menunjukkan bahwa perangkat Android lama dapat dimanfaatkan sebagai platform self-hosted untuk kebutuhan tertentu.

Beberapa hasil yang telah diverifikasi:
- Nginx berjalan sebagai web server.
- Go Monitoring API berjalan pada ARMv7.
- SQLite menyimpan histori monitoring.
- runit mengelola service utama.
- Cloudflare Tunnel menyediakan jalur akses publik.
- Monitoring Python berhasil dimigrasikan ke Go tanpa menghilangkan histori database.

Hal terpenting bukan sekadar keberhasilan menjalankan server pada perangkat lama, tetapi proses memahami keterbatasan sistem, mengoptimalkan resource, mengelola service, dan membangun arsitektur yang dapat dipelihara.

## 10. Pengembangan berikutnya

Beberapa rencana pengembangan:

- Menyempurnakan dashboard monitoring.
- Mengembangkan notifikasi kondisi resource.
- Menyempurnakan remote SSH dengan Cloudflare Access.
- Menambahkan backup database otomatis.
- Mengintegrasikan CI/CD untuk aplikasi web.
- Mengembangkan dokumentasi dan observability.
- Mengoptimalkan konsumsi RAM dan storage.

## Penutup

Homelab ini merupakan eksperimen nyata dalam menggabungkan software engineering dan infrastructure engineering.

Dengan memanfaatkan perangkat yang sudah tersedia, proyek ini menjadi sarana belajar mengenai Linux environment, backend development, networking, database, service management, security, dan deployment.

Proyek ini juga memperlihatkan bahwa solusi engineering yang baik tidak selalu membutuhkan hardware mahal. Pemilihan arsitektur yang tepat dan pemahaman terhadap keterbatasan sistem sering kali jauh lebih penting.

---

**Technologies:** Android · Termux · Go · SQLite · Nginx · runit · Cloudflare Tunnel · OpenSSH · Linux ARMv7
