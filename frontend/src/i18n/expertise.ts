import type { Locale } from './config';

export type ExpertiseIcon = 'code' | 'stack' | 'ledger' | 'chart';

export interface ExpertiseGroup {
  title: string;
  description: string;
  items: string[];
  technologies: string[];
  icon: ExpertiseIcon;
}

export interface ExpertiseMessages {
  eyebrow: string;
  title: string;
  description: string;
  groupsLabel: string;
  technologiesLabel: string;
  note: string;
  groups: ExpertiseGroup[];
}

/**
 * Single source of truth for the skill areas. The homepage renders these as
 * summary cards; the Expertise page renders the full breakdown.
 */
export const expertise: Record<Locale, ExpertiseMessages> = {
  id: {
    eyebrow: 'Keahlian',
    title: 'Alat dan disiplin untuk pekerjaan yang nyata.',
    description:
      'Teknologi, sistem enterprise, akuntansi, dan data dipakai bersama. Tidak ada skor atau tingkat kemahiran yang dibuat-buat di sini.',
    groupsLabel: 'Area kerja',
    technologiesLabel: 'Teknologi',
    note: 'Daftar ini mencerminkan alat dan area yang sedang dipakai serta dipelajari, bukan sertifikasi atau penilaian resmi.',
    groups: [
      {
        title: 'Teknologi & pengembangan perangkat lunak',
        description: 'Menulis, merawat, dan menghubungkan aplikasi.',
        icon: 'code',
        items: [
          'Dasar pemrograman',
          'Pengembangan aplikasi web',
          'Pengembangan aplikasi desktop',
          'Pemrograman berorientasi objek',
          'Logika aplikasi & otomasi',
        ],
        technologies: [
          'Python',
          'PHP',
          'JavaScript',
          'Go',
          'C++',
          'Laravel',
          'Next.js',
          'React',
          'Flutter',
          'Wails',
        ],
      },
      {
        title: 'Sistem enterprise & basis data',
        description: 'Menyusun data dan proses agar konsisten.',
        icon: 'stack',
        items: [
          'Eksplorasi sistem ERP',
          'Manajemen basis data',
          'Konfigurasi proses bisnis',
          'Pengelolaan data',
        ],
        technologies: ['ERPNext', 'Frappe', 'MySQL', 'PostgreSQL', 'MongoDB', 'Prisma'],
      },
      {
        title: 'Akuntansi & proses bisnis',
        description: 'Mencatat, merekonsiliasi, dan melaporkan.',
        icon: 'ledger',
        items: [
          'Pembukuan & jurnal',
          'Penyusunan laporan keuangan',
          'Rekonsiliasi bank',
          'Rekonsiliasi persediaan',
          'Administrasi keuangan',
          'Dukungan administrasi perpajakan',
        ],
        technologies: [],
      },
      {
        title: 'Analisis data',
        description: 'Mengolah data menjadi informasi yang berguna.',
        icon: 'chart',
        items: [
          'Pengolahan data',
          'Pembersihan data',
          'Visualisasi data',
          'Dasar machine learning',
        ],
        technologies: ['Python', 'Pandas', 'Scikit-learn', 'XGBoost', 'Matplotlib'],
      },
    ],
  },
  en: {
    eyebrow: 'Expertise',
    title: 'Tools and disciplines for real work.',
    description:
      'Technology, enterprise systems, accounting, and data are used together. There are no invented scores or proficiency levels here.',
    groupsLabel: 'Areas of work',
    technologiesLabel: 'Technologies',
    note: 'This list reflects tools and areas currently in use and under study, not certifications or formal assessments.',
    groups: [
      {
        title: 'Technology & software development',
        description: 'Writing, maintaining, and connecting applications.',
        icon: 'code',
        items: [
          'Programming fundamentals',
          'Web application development',
          'Desktop application development',
          'Object-oriented programming',
          'Application logic & automation',
        ],
        technologies: [
          'Python',
          'PHP',
          'JavaScript',
          'Go',
          'C++',
          'Laravel',
          'Next.js',
          'React',
          'Flutter',
          'Wails',
        ],
      },
      {
        title: 'Enterprise systems & database',
        description: 'Structuring data and processes for consistency.',
        icon: 'stack',
        items: [
          'ERP system exploration',
          'Database management',
          'Business process configuration',
          'Data management',
        ],
        technologies: ['ERPNext', 'Frappe', 'MySQL', 'PostgreSQL', 'MongoDB', 'Prisma'],
      },
      {
        title: 'Accounting & business processes',
        description: 'Recording, reconciling, and reporting.',
        icon: 'ledger',
        items: [
          'Bookkeeping & journal entries',
          'Financial statement preparation',
          'Bank reconciliation',
          'Inventory reconciliation',
          'Financial administration',
          'Tax administration support',
        ],
        technologies: [],
      },
      {
        title: 'Data analysis',
        description: 'Turning data into something useful.',
        icon: 'chart',
        items: [
          'Data processing',
          'Data cleaning',
          'Data visualization',
          'Machine learning fundamentals',
        ],
        technologies: ['Python', 'Pandas', 'Scikit-learn', 'XGBoost', 'Matplotlib'],
      },
    ],
  },
};

export function getExpertise(locale: Locale): ExpertiseMessages {
  return expertise[locale];
}
