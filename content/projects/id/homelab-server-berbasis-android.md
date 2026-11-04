---
translationKey: android-homelab
title: Homelab Server Berbasis Android
subtitle: Memanfaatkan smartphone Android sebagai server self-hosted yang ringan
summary: Membangun infrastruktur self-hosted ringan menggunakan smartphone Android lama, Termux, Go, SQLite, Nginx, dan Cloudflare Tunnel.
category: Rekayasa Infrastruktur
focus: Infrastruktur & Self-Hosting
status: Sedang Berjalan
order: 3
stack:
  - Android
  - Termux
  - Go
  - SQLite
  - Nginx
  - runit
  - Cloudflare Tunnel
  - OpenSSH
  - Linux ARMv7
tags:
  - Homelab
  - Self-Hosting
  - Android
  - Termux
  - Go
  - Infrastruktur
docsPending: false
overview: Proyek infrastruktur self-hosted eksperimental yang mengubah Samsung Galaxy J2 Prime menjadi server ringan menggunakan Termux. Sistem menyediakan web server, monitoring resource, penyimpanan metrik persisten, pengawasan service, dan arsitektur akses remote yang aman.
areas:
  - Android 7.1.1 yang menjalankan Termux.
  - Go Monitoring API yang mendengarkan di localhost.
  - SQLite untuk histori metrik sistem.
  - Nginx sebagai web server dan reverse proxy.
  - runit untuk pengawasan service.
  - Cloudflare Tunnel untuk akses eksternal.
  - OpenSSH untuk administrasi server.
objectives:
  - Memanfaatkan kembali perangkat Android lama sebagai server self-hosted.
  - Membangun monitoring API yang ringan menggunakan Go.
  - Menyimpan metrik sistem menggunakan SQLite.
  - Menyajikan aplikasi web melalui Nginx.
  - Mengawasi service background menggunakan runit.
  - Menyediakan akses publik melalui Cloudflare Tunnel.
  - Mengembangkan akses SSH remote yang aman tanpa membuka port SSH inbound.
process: Memigrasikan implementasi monitoring dari Python ke Go, melakukan cross-compile binary Go untuk Android ARMv7, mempertahankan histori monitoring SQLite yang sudah ada selama migrasi, mengimplementasikan pengumpulan dan retensi metrik berkala, mengonfigurasi Nginx sebagai reverse proxy untuk monitoring API, mengintegrasikan startup service dengan Termux Services dan Termux:Boot, serta merancang akses SSH remote menggunakan Cloudflare Access dan Tunnel.
results: Service monitoring Go berhasil berjalan pada perangkat Android ARMv7, Nginx menyajikan dan meneruskan request, dan SQLite mempertahankan data histori monitoring.
outcomes: Infrastruktur ini menyediakan fondasi praktis untuk pengembangan deployment aplikasi self-hosted berikutnya.
---

## Rencana Pengembangan

- Menyelesaikan verifikasi akses SSH eksternal.
- Menambahkan backup database otomatis.
- Meningkatkan visualisasi dashboard.
- Menambahkan notifikasi ambang batas resource.
- Mengintegrasikan alur deployment otomatis.

## Artikel Terkait

Baca implementasi teknisnya: [Membangun Homelab Server Berbasis Android dengan Termux, Go, dan Cloudflare Tunnel](/id/blog/membangun-homelab-server-android-termux-go-cloudflare/)
