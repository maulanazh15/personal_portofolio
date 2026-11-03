---
translationKey: arduino-lighting-article
title: Memasang Sistem Lampu Terjadwal Otomatis dengan Arduino
description: Catatan praktik membangun sistem penerangan otomatis memakai Arduino Uno, modul RTC DS1302, dan modul relay—mulai dari masalah awal, persiapan perangkat keras, pemrograman, hingga tantangan yang muncul.
category: Teknologi / IoT
tags:
  - Arduino
  - IoT
  - Otomasi
  - PlatformIO
publishedAt: 2026-11-01
relatedProject: arduino-lighting
---

Lampu halaman biasanya dinyalakan dan dimatikan secara manual setiap hari.
Rutinitas seperti ini mudah terlewat, apalagi ketika aktivitas lain lebih
mendesak. Dari situ muncul pertanyaan sederhana: bisakah kendali penerangan
diserahkan ke sebuah jadwal?

Catatan ini merangkum proses membangun sistem penerangan terjadwal berbasis
Arduino Uno dan modul RTC DS1302, dari persiapan sampai pengujian.

## Masalah yang ingin diselesaikan

Penerangan halaman perlu dikendalikan secara rutin. Selama masih manual,
konsistensinya bergantung pada ingatan dan waktu luang pemiliknya. Tujuannya
bukan sistem yang rumit, melainkan otomasi yang cukup untuk membuat jadwal
menyala dan mati berjalan lebih teratur.

## Perangkat yang digunakan

Sistem ini dibangun dari komponen yang relatif mudah didapat:

- Arduino Uno sebagai pengendali utama.
- Modul RTC DS1302 sebagai sumber waktu nyata.
- Modul relay untuk menghubungkan dan memutus arus ke lampu.
- Dua lampu halaman sebagai beban yang dikendalikan.

Pengembangan program dilakukan dengan C++ melalui PlatformIO.

## Cara kerja sistem

Modul RTC menyimpan informasi waktu. Program membaca waktu tersebut, lalu
membandingkannya dengan jadwal yang sudah ditentukan. Ketika waktu memasuki
rentang yang dijadwalkan, relay diaktifkan sehingga lampu menyala. Di luar
rentang itu, relay dimatikan kembali.

Dengan pola ini, keputusan menyalakan dan mematikan lampu tidak lagi
bergantung pada tindakan manual, tetapi pada data waktu yang dibaca secara
berkala oleh program.

## Proses pengembangan

Pengerjaan dimulai dari merancang alur program dan merakit komponen perangkat
keras untuk pengujian awal. Rangkaian dan program diuji dalam skala kecil
sebelum dipasang pada beban sebenarnya.

Setelah rangkaian dan program bekerja sesuai harapan, sistem diterapkan untuk
mengendalikan dua lampu halaman secara otomatis.

## Tantangan: menyelaraskan waktu

Bagian yang paling menuntut perhatian bukanlah pemasangan relay, melainkan
penyelarasan modul RTC dengan waktu sebenarnya. Selisih waktu membuat lampu
tidak menyala dan mati tepat pada jadwal yang dimaksud.

Penyelesaiannya menuntut pengujian tambahan dan penyesuaian pada program.
Iterasi ini yang akhirnya membuat jadwal berjalan sesuai rencana.

## Hasil

Sistem otomasi penerangan berbasis waktu berhasil diimplementasikan dan
digunakan untuk mengendalikan dua lampu halaman. Kode dan catatan proyeknya
tersedia di repositori publik.

## Pelajaran yang dibawa

Proyek kecil ini memperlihatkan bahwa otomasi tidak selalu menuntut sistem
besar. Satu modul waktu, beberapa relay, dan program yang jelas sudah cukup
untuk menggantikan rutinitas harian yang berulang—selama bagian tersulitnya,
yaitu akurasi waktu, benar-benar diuji.
