import type { Locale } from './config';

export interface AboutMessages {
  eyebrow: string;
  title: string;
  intro: string[];
  facts: { label: string; value: string }[];
  educationLabel: string;
  education: {
    degree: string;
    school: string;
    yearLabel: string;
    year: string;
    note: string;
  };
  languageLabel: string;
  languages: {
    name: string;
    test: string;
    score: string;
    note: string;
  }[];
  interestsLabel: string;
  interests: string[];
  approachLabel: string;
  approach: string;
  ctaTitle: string;
  ctaBody: string;
}

export const about: Record<Locale, AboutMessages> = {
  id: {
    eyebrow: 'Tentang',
    title: 'Menghubungkan teknologi dan bisnis.',
    intro: [
      'Halo, saya Maulana Zhahran.',
      'Saya lulusan Informatika Universitas Jenderal Soedirman (2025) dengan ketertarikan pada pengembangan perangkat lunak, sistem informasi, teknologi bisnis, dan pengelolaan keuangan.',
      'Saat ini saya bekerja di sebuah kantor konsultan pajak, terlibat dalam proses administrasi dan akuntansi. Pengalaman ini memberi kesempatan untuk memahami bagaimana bisnis mengelola informasi keuangan, menyusun transaksi, dan menjaga catatan operasionalnya.',
      'Dengan latar belakang akademik Informatika, saya mendekati masalah dari dua sisi: teknis dan praktis. Saya tertarik mengeksplorasi bagaimana teknologi dapat memperbaiki alur kerja bisnis, menyederhanakan proses keuangan, dan mendukung pengambilan keputusan yang lebih baik.',
      'Perjalanan ini adalah proses belajar, bereksperimen, dan menghubungkan berbagai bidang pengetahuan secara berkelanjutan.',
    ],
    facts: [
      { label: 'Bidang', value: 'Informatika & akuntansi' },
      { label: 'Domisili', value: 'Indonesia' },
      { label: 'Status', value: 'Lulusan 2025' },
    ],
    educationLabel: 'Pendidikan',
    education: {
      degree: 'Sarjana Informatika (S.Kom.)',
      school: 'Universitas Jenderal Soedirman',
      yearLabel: 'Lulus',
      year: '2025',
      note: 'Latar belakang akademik pada sistem informasi, pemrograman, basis data, dan analisis data.',
    },
    languageLabel: 'Kemampuan bahasa',
    languages: [
      {
        name: 'Inggris',
        test: 'TOEFL ITP',
        score: '597',
        note: 'Sertifikat kemampuan bahasa Inggris.',
      },
    ],
    interestsLabel: 'Minat',
    interests: [
      'Pengembangan perangkat lunak',
      'Sistem informasi',
      'Teknologi bisnis',
      'Pengelolaan keuangan',
      'Otomasi pekerjaan berulang',
    ],
    approachLabel: 'Cara saya bekerja',
    approach:
      'Saya lebih suka memahami prosesnya lebih dulu, lalu menulis program yang membuat proses itu lebih rapi. Dokumentasi dan pengujian dianggap bagian dari pekerjaan, bukan tambahan.',
    ctaTitle: 'Ingin melihat hasilnya?',
    ctaBody: 'Dua proyek yang sedang dan sudah dikerjakan tersedia lengkap dengan proses dan pelajarannya.',
  },
  en: {
    eyebrow: 'About',
    title: 'Bridging technology and business.',
    intro: [
      "Hello, I'm Maulana Zhahran.",
      'I am an Informatics graduate from Universitas Jenderal Soedirman (2025), with an interest in software development, information systems, business technology, and financial management.',
      'I currently work at a tax consulting firm, where I am involved in administrative and accounting processes. This experience has given me the opportunity to understand how businesses manage financial information, organise transactions, and maintain their operational records.',
      'With an academic background in Informatics, I approach problems from both a technical and a practical perspective. I am particularly interested in exploring how technology can improve business workflows, simplify financial processes, and support better decision-making.',
      'My journey is a continuous process of learning, experimenting, and connecting different fields of knowledge.',
    ],
    facts: [
      { label: 'Field', value: 'Informatics & accounting' },
      { label: 'Based in', value: 'Indonesia' },
      { label: 'Status', value: 'Graduated 2025' },
    ],
    educationLabel: 'Education',
    education: {
      degree: 'Bachelor of Informatics (S.Kom.)',
      school: 'Universitas Jenderal Soedirman',
      yearLabel: 'Graduated',
      year: '2025',
      note: 'Academic background in information systems, programming, databases, and data analysis.',
    },
    languageLabel: 'Language proficiency',
    languages: [
      {
        name: 'English',
        test: 'TOEFL ITP',
        score: '597',
        note: 'Certificate of English language proficiency.',
      },
    ],
    interestsLabel: 'Interests',
    interests: [
      'Software development',
      'Information systems',
      'Business technology',
      'Financial management',
      'Automating repetitive work',
    ],
    approachLabel: 'How I work',
    approach:
      'I prefer to understand the process first, then write the program that makes it tidier. Documentation and testing are part of the work, not an afterthought.',
    ctaTitle: 'Want to see the work?',
    ctaBody: 'Two projects, ongoing and completed, are documented along with their process and lessons.',
  },
};

export function getAbout(locale: Locale): AboutMessages {
  return about[locale];
}
