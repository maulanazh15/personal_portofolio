import type { Locale } from './config';

export interface ProjectsMessages {
  eyebrow: string;
  title: string;
  description: string;
  countLabel: string;
  featuredLabel: string;
  overviewLabel: string;
  backgroundLabel: string;
  objectivesLabel: string;
  areasLabel: string;
  roleLabel: string;
  processLabel: string;
  challengesLabel: string;
  resultsLabel: string;
  outcomesLabel: string;
  stackLabel: string;
  tagsLabel: string;
  statusLabel: string;
  linksLabel: string;
  repoLabel: string;
  docsPending: string;
  noLink: string;
  backToProjects: string;
  viewProject: string;
  nextProject: string;
  ctaTitle: string;
  ctaBody: string;
}

export const projects: Record<Locale, ProjectsMessages> = {
  id: {
    eyebrow: 'Proyek',
    title: 'Pekerjaan pilihan.',
    description:
      'Kumpulan proyek, eksplorasi teknis, dan implementasi praktis yang mencerminkan ketertarikan pada teknologi dan solusi bisnis.',
    countLabel: 'Proyek tercatat',
    featuredLabel: 'Pilihan',
    overviewLabel: 'Ringkasan',
    backgroundLabel: 'Latar & masalah',
    objectivesLabel: 'Tujuan',
    areasLabel: 'Area eksplorasi',
    roleLabel: 'Peran saya',
    processLabel: 'Proses pengembangan',
    challengesLabel: 'Tantangan & pelajaran',
    resultsLabel: 'Hasil',
    outcomesLabel: 'Pelajaran yang didapat',
    stackLabel: 'Teknologi',
    tagsLabel: 'Tag',
    statusLabel: 'Status',
    linksLabel: 'Tautan',
    repoLabel: 'Repositori',
    docsPending: 'Dokumentasi sedang disiapkan.',
    noLink: 'Tidak ada tautan publik.',
    backToProjects: 'Kembali ke daftar proyek',
    viewProject: 'Lihat proyek',
    nextProject: 'Proyek berikutnya',
    ctaTitle: 'Punya proses yang mirip?',
    ctaBody: 'Terbuka untuk mendiskusikan alur kerja, pencatatan, dan otomasi yang serupa.',
  },
  en: {
    eyebrow: 'Projects',
    title: 'Selected works.',
    description:
      'A collection of projects, technical explorations, and practical implementations that reflect an interest in technology and business solutions.',
    countLabel: 'Documented projects',
    featuredLabel: 'Selected',
    overviewLabel: 'Overview',
    backgroundLabel: 'Background & problem',
    objectivesLabel: 'Objectives',
    areasLabel: 'Areas of exploration',
    roleLabel: 'My role',
    processLabel: 'Development process',
    challengesLabel: 'Challenges & lessons',
    resultsLabel: 'Results',
    outcomesLabel: 'Learning outcomes',
    stackLabel: 'Stack',
    tagsLabel: 'Tags',
    statusLabel: 'Status',
    linksLabel: 'Links',
    repoLabel: 'Repository',
    docsPending: 'Documentation is being prepared.',
    noLink: 'No public link.',
    backToProjects: 'Back to all projects',
    viewProject: 'View project',
    nextProject: 'Next project',
    ctaTitle: 'Facing a similar process?',
    ctaBody: 'Open to discussing comparable workflows, record-keeping, and automation.',
  },
};

export function getProjectsMessages(locale: Locale): ProjectsMessages {
  return projects[locale];
}
