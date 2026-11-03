import type { Locale } from './config';

export interface HomeMessages {
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    description: string;
    meta: string[];
  };
  architecture: {
    label: string;
    title: string;
    note: string;
    badge: string;
    rows: { step: string; label: string; detail: string; tag: string }[];
    footer: string;
  };
  approach: {
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
  };
  focus: {
    eyebrow: string;
    title: string;
    description: string;
  };
  projects: {
    eyebrow: string;
    title: string;
    description: string;
    archiveLabel: string;
  };
  expertise: {
    eyebrow: string;
    title: string;
    description: string;
  };
  articles: {
    eyebrow: string;
    title: string;
    description: string;
    journalLabel: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    footerNote: string;
  };
}

/**
 * Homepage framing copy. The skill groups themselves live in `expertise.ts`
 * so the homepage cards and the Expertise page never drift apart.
 */
export const home: Record<Locale, HomeMessages> = {
  id: {
    hero: {
      eyebrow: 'Informatika · Akuntansi · Otomasi',
      titleLead: 'Membangun solusi praktis,',
      titleAccent: 'antara teknologi dan bisnis.',
      description:
        'Lulusan Informatika yang bekerja di bidang administrasi dan akuntansi. Saya menghubungkan pemahaman teknis dengan proses bisnis nyata: aplikasi web, sistem enterprise, dan pengelolaan data keuangan.',
      meta: ['Informatika 2025', 'ERPNext', 'Akuntansi', 'Arduino'],
    },
    architecture: {
      label: 'Arsitektur situs ini',
      title: 'Dari commit ke produksi',
      note: 'Rancangan acuan situs ini: halaman statis, API lokal, dan operasi yang terpantau.',
      badge: 'Acuan',
      rows: [
        { step: '01', label: 'Build', detail: 'Astro · Preact · Tailwind', tag: 'Statis' },
        { step: '02', label: 'Edge', detail: 'Cloudflare Tunnel', tag: 'TLS' },
        { step: '03', label: 'Origin', detail: 'Nginx · Go · SQLite', tag: 'Localhost' },
        { step: '04', label: 'Operasional', detail: 'runit · Pemantauan · Cadangan', tag: 'Terpantau' },
      ],
      footer: 'Tanpa Node.js yang berjalan di produksi.',
    },
    approach: {
      eyebrow: 'Pendekatan',
      title: 'Informatika memberi cara berpikir; akuntansi memberi konteks.',
      body: 'Saya terbiasa bekerja dengan data dan proses: mencatat transaksi, menilai persediaan, menyusun laporan, sekaligus menulis program untuk merapikan pekerjaan itu. Dua sisi ini saling melengkapi.',
      points: [
        'Belajar dengan membangun',
        'Proses yang dapat diaudit',
        'Otomasi untuk pekerjaan berulang',
      ],
    },
    focus: {
      eyebrow: 'Fokus',
      title: 'Empat area yang saling terhubung.',
      description:
        'Teknologi, sistem enterprise, akuntansi, dan data dipakai bersama, bukan terpisah.',
    },
    projects: {
      eyebrow: 'Proyek pilihan',
      title: 'Pekerjaan yang bisa ditelusuri, bukan sekadar daftar teknologi.',
      description: 'Setiap proyek menjelaskan masalah, proses, dan pelajaran yang didapat.',
      archiveLabel: 'Arsip',
    },
    expertise: {
      eyebrow: 'Keahlian teknis',
      title: 'Alat dan disiplin untuk pekerjaan yang nyata.',
      description: 'Empat area kerja, tanpa skor atau tingkat kemahiran yang dibuat-buat.',
    },
    articles: {
      eyebrow: 'Catatan teknis',
      title: 'Dokumentasi dari hal yang sedang dipelajari dan dibangun.',
      description: 'Tulisan seputar Arduino, ERPNext, akuntansi, dan otomasi pekerjaan.',
      journalLabel: 'Jurnal',
    },
    contact: {
      eyebrow: 'Kontak',
      title: 'Punya proses yang ingin dirapikan atau diotomasi?',
      description:
        'Terbuka untuk diskusi seputar teknologi, sistem bisnis, dan proses akuntansi. Sertakan konteks singkat agar percakapan lebih produktif.',
      footerNote: 'Teknologi, akuntansi, dan solusi bisnis.',
    },
  },
  en: {
    hero: {
      eyebrow: 'Informatics · Accounting · Automation',
      titleLead: 'Building practical solutions,',
      titleAccent: 'between technology and business.',
      description:
        'An Informatics graduate working in administration and accounting. I connect technical understanding with real business processes: web applications, enterprise systems, and financial data management.',
      meta: ['Informatics, 2025', 'ERPNext', 'Accounting', 'Arduino'],
    },
    architecture: {
      label: 'How this site is built',
      title: 'From commit to production',
      note: 'The reference setup for this site: static pages, a local API, and observable operations.',
      badge: 'REF',
      rows: [
        { step: '01', label: 'Build', detail: 'Astro · Preact · Tailwind', tag: 'Static' },
        { step: '02', label: 'Edge', detail: 'Cloudflare Tunnel', tag: 'TLS' },
        { step: '03', label: 'Origin', detail: 'Nginx · Go · SQLite', tag: 'Localhost' },
        { step: '04', label: 'Operate', detail: 'runit · Monitoring · Backup', tag: 'Observed' },
      ],
      footer: 'No Node.js process running in production.',
    },
    approach: {
      eyebrow: 'Approach',
      title: 'Informatics gives me a way of thinking; accounting gives me context.',
      body: 'I am used to working with data and processes: recording transactions, valuing inventory, preparing reports, and writing the programs that make that work tidier. The two sides complement each other.',
      points: [
        'Learning by building',
        'Auditable processes',
        'Automation for repetitive work',
      ],
    },
    focus: {
      eyebrow: 'Focus',
      title: 'Four connected areas.',
      description:
        'Technology, enterprise systems, accounting, and data are used together, not in isolation.',
    },
    projects: {
      eyebrow: 'Selected projects',
      title: 'Work that can be traced, not just a list of technologies.',
      description: 'Each project explains the problem, the process, and the lessons that came with it.',
      archiveLabel: 'Archive',
    },
    expertise: {
      eyebrow: 'Technical expertise',
      title: 'Tools and disciplines for real work.',
      description: 'Four areas of work, with no invented scores or proficiency levels.',
    },
    articles: {
      eyebrow: 'Technical notes',
      title: 'Documentation from what I am learning and building.',
      description: 'Writing on Arduino, ERPNext, accounting, and automating work.',
      journalLabel: 'Journal',
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Have a process to tidy up or automate?',
      description:
        'Open to conversations about technology, business systems, and accounting processes. A little context goes a long way.',
      footerNote: 'Technology, accounting, and business solutions.',
    },
  },
};

export function getHome(locale: Locale): HomeMessages {
  return home[locale];
}
