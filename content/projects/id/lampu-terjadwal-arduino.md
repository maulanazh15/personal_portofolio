---
translationKey: arduino-lighting
title: Lampu Terjadwal Otomatis dengan Arduino
subtitle: Otomasi penerangan halaman berbasis waktu
summary: Sistem kendali lampu terjadwal yang menyalakan dan mematikan dua lampu halaman secara otomatis menggunakan Arduino Uno dan modul RTC DS1302.
category: Internet of Things (IoT)
focus: Sistem Tertanam & Otomasi
status: Selesai diimplementasikan
order: 2
stack:
  - C++
  - Arduino Uno
  - RTC DS1302
  - Modul relay
  - PlatformIO
tags:
  - Arduino
  - IoT
  - Otomasi
  - PlatformIO
repo: https://github.com/maulanazh15/Lampu-Terjadwal-Arduino-Uno
overview: >-
  Sistem kendali penerangan yang dirancang untuk mengoperasikan dua lampu
  halaman secara otomatis menggunakan Arduino Uno dan modul RTC DS1302. Sistem
  memakai data waktu nyata untuk mengaktifkan dan menonaktifkan relay sesuai
  jadwal yang telah ditentukan.
background: >-
  Lampu halaman perlu dinyalakan dan dimatikan secara rutin. Pengoperasian
  manual merepotkan dan mudah terlewat. Proyek ini mengeksplorasi solusi
  otomasi sederhana agar kendali penerangan lebih konsisten.
objectives:
  - Merancang rangkaian penerangan otomatis.
  - Mengintegrasikan Arduino Uno dengan modul RTC DS1302.
  - Memprogram aktivasi relay berdasarkan jadwal.
  - Mengimplementasikan dan menguji sistem pada dua lampu halaman.
role: >-
  Bertanggung jawab atas pemrograman Arduino dan perakitan rangkaian perangkat
  keras.
process: >-
  Proyek dimulai dengan merancang program dan merakit komponen perangkat keras
  untuk pengujian awal. Setelah rangkaian dan program bekerja sesuai harapan,
  sistem dipasang untuk mengendalikan dua lampu halaman secara otomatis.
challenges: >-
  Salah satu tantangan utama adalah menyelaraskan modul RTC dengan waktu
  sebenarnya. Diperlukan pengujian tambahan dan penyesuaian program agar lampu
  menyala dan mati sesuai jadwal yang dimaksud.
results: >-
  Sistem otomasi penerangan berbasis waktu berhasil diimplementasikan.
outcomes: >-
  Proyek ini memperlihatkan bagaimana satu sensor waktu dan beberapa baris
  program dapat menggantikan rutinitas manual yang berulang.
---

Proyek ini dikerjakan sebagai latihan otomasi perangkat keras: dari merancang
alur program, merakit rangkaian, sampai memasang sistem pada dua lampu halaman
yang dipakai sehari-hari.
