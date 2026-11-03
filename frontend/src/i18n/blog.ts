import type { Locale } from './config';

export interface BlogMessages {
  eyebrow: string;
  title: string;
  description: string;
  countLabel: (count: number) => string;
  readArticle: string;
  minRead: (minutes: number) => string;
  publishedLabel: string;
  updatedLabel: string;
  categoryLabel: string;
  tagsLabel: string;
  tocLabel: string;
  relatedLabel: string;
  backToBlog: string;
  relatedProjectLabel: string;
  forthcomingLabel: string;
  forthcomingNote: string;
  forthcoming: string[];
}

export const blog: Record<Locale, BlogMessages> = {
  id: {
    eyebrow: 'Catatan',
    title: 'Catatan, gagasan, dan pembelajaran.',
    description:
      'Ruang personal untuk membagikan eksperimen teknis, wawasan profesional, dan pelajaran yang ditemui sepanjang perjalanan.',
    countLabel: (count) => `${count} catatan terbit`,
    readArticle: 'Baca catatan',
    minRead: (minutes) => `${minutes} menit baca`,
    publishedLabel: 'Terbit',
    updatedLabel: 'Diperbarui',
    categoryLabel: 'Kategori',
    tagsLabel: 'Tag',
    tocLabel: 'Isi tulisan',
    relatedLabel: 'Catatan terkait',
    backToBlog: 'Kembali ke daftar catatan',
    relatedProjectLabel: 'Proyek terkait',
    forthcomingLabel: 'Rencana tulisan',
    forthcomingNote:
      'Daftar ini adalah rencana, bukan janji terbit. Tulisan akan ditambahkan setelah benar-benar selesai ditulis.',
    forthcoming: [
      'Mengeksplorasi ERPNext untuk akuntansi dan persediaan.',
      'Dari lulusan Informatika ke administrasi konsultan pajak.',
      'Peran teknologi dalam operasi bisnis modern.',
      'Mengotomasi tugas berulang melalui pemrograman.',
      'Belajar basis data melalui proyek nyata.',
    ],
  },
  en: {
    eyebrow: 'Notes',
    title: 'Notes, ideas, and learning.',
    description:
      'A personal space for sharing technical experiments, professional insights, and lessons learned along the way.',
    countLabel: (count) => `${count} ${count === 1 ? 'note' : 'notes'} published`,
    readArticle: 'Read the note',
    minRead: (minutes) => `${minutes} min read`,
    publishedLabel: 'Published',
    updatedLabel: 'Updated',
    categoryLabel: 'Category',
    tagsLabel: 'Tags',
    tocLabel: 'On this page',
    relatedLabel: 'Related notes',
    backToBlog: 'Back to all notes',
    relatedProjectLabel: 'Related project',
    forthcomingLabel: 'Planned writing',
    forthcomingNote:
      'This list is a plan, not a promise. Posts are added once they are actually written.',
    forthcoming: [
      'Exploring ERPNext for accounting and inventory management.',
      'From Informatics graduate to tax consulting administration.',
      'The role of technology in modern business operations.',
      'Automating repetitive tasks through programming.',
      'Learning database management through practical projects.',
    ],
  },
};

export function getBlog(locale: Locale): BlogMessages {
  return blog[locale];
}
