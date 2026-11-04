import type { Locale, RouteKey } from './config';

export interface PageMeta {
  title: string;
  description: string;
}

export interface UIMessages {
  identity: {
    name: string;
    role: string;
    tagline: string;
  };
  nav: Record<RouteKey, string>;
  actions: {
    exploreProjects: string;
    contactMe: string;
    viewAllProjects: string;
    viewAllArticles: string;
    exploreExpertise: string;
    visitBlog: string;
    startConversation: string;
    backHome: string;
    readMore: string;
    getInTouch: string;
  };
  a11y: {
    skipToContent: string;
    primaryNav: string;
    footerNav: string;
    openMenu: string;
    closeMenu: string;
    languageSwitcher: string;
    switchLanguage: string;
    externalLink: string;
    switchToLight: string;
    switchToDark: string;
  };
  footer: {
    description: string;
    navigation: string;
    focus: string;
    focusItems: string[];
    builtWith: string;
    rights: string;
  };
  pages: Record<RouteKey, PageMeta>;
}

/**
 * Shared interface copy. All strings rendered in the chrome and page headers
 * come from this file or one of the `i18n/*.ts` modules so both languages stay
 * in sync.
 */
export const ui: Record<Locale, UIMessages> = {
  id: {
    identity: {
      name: 'Maulana Zhahran',
      role: 'Teknologi · Akuntansi · Solusi bisnis',
      tagline: 'Membangun solusi praktis melalui teknologi, pemahaman keuangan, dan pembelajaran berkelanjutan.',
    },
    nav: {
      home: 'Beranda',
      about: 'Tentang',
      projects: 'Proyek',
      expertise: 'Keahlian',
      blog: 'Blog',
      contact: 'Kontak',
    },
    actions: {
      exploreProjects: 'Jelajahi proyek',
      contactMe: 'Hubungi saya',
      viewAllProjects: 'Semua proyek',
      viewAllArticles: 'Semua catatan',
      exploreExpertise: 'Jelajahi keahlian',
      visitBlog: 'Kunjungi blog',
      startConversation: 'Mulai percakapan',
      backHome: 'Kembali ke beranda',
      readMore: 'Baca selengkapnya',
      getInTouch: 'Hubungi saya',
    },
    a11y: {
      skipToContent: 'Lewati ke konten utama',
      primaryNav: 'Navigasi utama',
      footerNav: 'Navigasi footer',
      openMenu: 'Buka menu navigasi',
      closeMenu: 'Tutup menu navigasi',
      languageSwitcher: 'Pilih bahasa',
      switchLanguage: 'Ganti ke',
      externalLink: 'Tautan eksternal',
      switchToLight: 'Ganti ke mode terang',
      switchToDark: 'Ganti ke mode gelap',
    },
    footer: {
      description:
        'Portofolio Maulana Zhahran: persimpangan antara pengembangan perangkat lunak, sistem enterprise, akuntansi, dan analisis data.',
      navigation: 'Navigasi',
      focus: 'Fokus',
      focusItems: [
        'Pengembangan perangkat lunak',
        'Sistem enterprise & basis data',
        'Akuntansi & proses bisnis',
      ],
      builtWith: 'Dibangun dengan Astro dan Tailwind CSS.',
      rights: 'Hak cipta dilindungi.',
    },
    pages: {
      home: {
        title: 'Teknologi, akuntansi & solusi bisnis',
        description:
          'Portofolio Maulana Zhahran, lulusan Informatika yang bekerja di bidang administrasi dan akuntansi, membangun solusi praktis di antara teknologi dan bisnis.',
      },
      about: {
        title: 'Tentang',
        description:
          'Latar belakang Informatika, pekerjaan di bidang administrasi dan akuntansi, pendidikan, serta minat pada teknologi dan proses bisnis.',
      },
      projects: {
        title: 'Proyek',
        description:
          'Proyek dan eksplorasi teknis: ERPNext untuk akuntansi dan persediaan, serta otomasi penerangan berbasis Arduino.',
      },
      expertise: {
        title: 'Keahlian',
        description:
          'Area kerja dan teknologi yang dipakai: pengembangan perangkat lunak, sistem enterprise, akuntansi, dan analisis data.',
      },
      blog: {
        title: 'Blog',
        description:
          'Catatan teknis dan profesional seputar Arduino, ERPNext, akuntansi, otomasi, dan pembelajaran berkelanjutan.',
      },
      contact: {
        title: 'Kontak',
        description:
          'Hubungi Maulana Zhahran untuk diskusi seputar teknologi, sistem bisnis, proses akuntansi, dan kolaborasi.',
      },
    },
  },
  en: {
    identity: {
      name: 'Maulana Zhahran',
      role: 'Technology · Accounting · Business Solutions',
      tagline:
        'Building practical solutions through technology, financial understanding, and continuous learning.',
    },
    nav: {
      home: 'Home',
      about: 'About',
      projects: 'Projects',
      expertise: 'Expertise',
      blog: 'Blog',
      contact: 'Contact',
    },
    actions: {
      exploreProjects: 'Explore projects',
      contactMe: 'Contact me',
      viewAllProjects: 'All projects',
      viewAllArticles: 'All notes',
      exploreExpertise: 'Explore expertise',
      visitBlog: 'Visit the blog',
      startConversation: 'Start a conversation',
      backHome: 'Back to home',
      readMore: 'Read more',
      getInTouch: 'Get in touch',
    },
    a11y: {
      skipToContent: 'Skip to main content',
      primaryNav: 'Primary navigation',
      footerNav: 'Footer navigation',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
      languageSwitcher: 'Select language',
      switchLanguage: 'Switch to',
      externalLink: 'External link',
      switchToLight: 'Switch to light mode',
      switchToDark: 'Switch to dark mode',
    },
    footer: {
      description:
        'The portfolio of Maulana Zhahran: at the intersection of software development, enterprise systems, accounting, and data analysis.',
      navigation: 'Navigation',
      focus: 'Focus',
      focusItems: [
        'Software development',
        'Enterprise systems & databases',
        'Accounting & business processes',
      ],
      builtWith: 'Built with Astro and Tailwind CSS.',
      rights: 'All rights reserved.',
    },
    pages: {
      home: {
        title: 'Technology, accounting & business solutions',
        description:
          'The portfolio of Maulana Zhahran, an Informatics graduate working in administration and accounting, building practical solutions between technology and business.',
      },
      about: {
        title: 'About',
        description:
          'An Informatics background, work in administration and accounting, education, and an interest in technology and business processes.',
      },
      projects: {
        title: 'Projects',
        description:
          'Projects and technical explorations: ERPNext for accounting and inventory, and Arduino-based lighting automation.',
      },
      expertise: {
        title: 'Expertise',
        description:
          'Areas of work and technologies in use: software development, enterprise systems, accounting, and data analysis.',
      },
      blog: {
        title: 'Blog',
        description:
          'Technical and professional notes on Arduino, ERPNext, accounting, automation, and continuous learning.',
      },
      contact: {
        title: 'Contact',
        description:
          'Get in touch with Maulana Zhahran about technology, business systems, accounting processes, and collaboration.',
      },
    },
  },
};

export function getUI(locale: Locale): UIMessages {
  return ui[locale];
}
