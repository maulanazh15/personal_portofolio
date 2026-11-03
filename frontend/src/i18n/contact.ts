import type { Locale } from './config';

export interface ContactFormMessages {
  nameLabel: string;
  emailLabel: string;
  subjectLabel: string;
  subjectOptional: string;
  messageLabel: string;
  websiteLabel: string;
  submitLabel: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  errorTitle: string;
  validationError: string;
  genericError: string;
  networkError: string;
  rateLimitError: string;
  privacyNote: string;
  noScriptNote: string;
  errors: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
}

export interface ContactMessages {
  eyebrow: string;
  title: string;
  description: string;
  emailLabel: string;
  locationLabel: string;
  profilesLabel: string;
  replyNote: string;
  formTitle: string;
  formDescription: string;
  form: ContactFormMessages;
  closingTitle: string;
  closingBody: string;
}

export const contact: Record<Locale, ContactMessages> = {
  id: {
    eyebrow: 'Kontak',
    title: 'Mari terhubung dan bertukar gagasan.',
    description:
      'Saya terbuka untuk kesempatan belajar, koneksi profesional, diskusi teknis, dan kolaborasi. Baik soal teknologi, sistem bisnis, proses akuntansi, maupun gagasan baru, silakan menghubungi.',
    emailLabel: 'Email',
    locationLabel: 'Domisili',
    profilesLabel: 'Profil',
    replyNote:
      'Lebih suka email? Alamat ini tetap menjadi jalur langsung untuk menghubungi saya.',
    formTitle: 'Kirim pesan',
    formDescription:
      'Ceritakan konteks singkatnya. Nama, email, dan pesan wajib diisi; subjek bersifat opsional.',
    form: {
      nameLabel: 'Nama',
      emailLabel: 'Email',
      subjectLabel: 'Subjek',
      subjectOptional: 'opsional',
      messageLabel: 'Pesan',
      websiteLabel: 'Biarkan kolom ini kosong',
      submitLabel: 'Kirim pesan',
      submittingLabel: 'Mengirim…',
      successTitle: 'Pesan berhasil dikirim.',
      successBody: 'Pesan Anda sudah tersimpan. Referensi: {reference}.',
      errorTitle: 'Pesan belum terkirim.',
      validationError: 'Periksa kembali kolom yang ditandai.',
      genericError: 'Server tidak dapat menerima pesan saat ini. Coba lagi nanti atau gunakan email.',
      networkError: 'Tidak dapat terhubung ke server. Periksa koneksi Anda, lalu coba lagi atau gunakan email.',
      rateLimitError: 'Terlalu banyak pesan dari jaringan ini. Coba lagi nanti atau gunakan email.',
      privacyNote: 'Pesan disimpan di server pribadi dan tidak ditampilkan kepada publik.',
      noScriptNote: 'Formulir memerlukan JavaScript. Anda juga dapat menghubungi saya melalui email di atas.',
      errors: {
        name: 'Masukkan nama antara 2 dan 100 karakter.',
        email: 'Masukkan alamat email yang valid.',
        subject: 'Subjek maksimal 150 karakter.',
        message: 'Masukkan pesan antara 20 dan 5000 karakter.',
      },
    },
    closingTitle: 'Terima kasih sudah berkunjung.',
    closingBody:
      'Saya percaya kemajuan yang berarti lahir dari rasa ingin tahu, pembelajaran berkelanjutan, dan kemauan mengubah gagasan menjadi solusi praktis.',
  },
  en: {
    eyebrow: 'Contact',
    title: "Let's connect and exchange ideas.",
    description:
      'I am always open to learning opportunities, professional connections, technical discussions, and collaborations. Whether it is technology, business systems, accounting processes, or new ideas, feel free to get in touch.',
    emailLabel: 'Email',
    locationLabel: 'Location',
    profilesLabel: 'Profiles',
    replyNote: 'Prefer email? This address remains a direct way to reach me.',
    formTitle: 'Send a message',
    formDescription:
      'Share a little context. Name, email, and message are required; the subject is optional.',
    form: {
      nameLabel: 'Name',
      emailLabel: 'Email',
      subjectLabel: 'Subject',
      subjectOptional: 'optional',
      messageLabel: 'Message',
      websiteLabel: 'Leave this field empty',
      submitLabel: 'Send message',
      submittingLabel: 'Sending…',
      successTitle: 'Message sent successfully.',
      successBody: 'Your message has been stored. Reference: {reference}.',
      errorTitle: 'Your message has not been sent.',
      validationError: 'Please check the highlighted fields.',
      genericError: 'The server cannot accept your message right now. Try again later or use email.',
      networkError: 'Could not connect to the server. Check your connection and try again, or use email.',
      rateLimitError: 'Too many messages from this network. Try again later or use email.',
      privacyNote: 'Messages are stored on a private server and are never displayed publicly.',
      noScriptNote: 'The form requires JavaScript. You can also reach me at the email address above.',
      errors: {
        name: 'Enter a name between 2 and 100 characters.',
        email: 'Enter a valid email address.',
        subject: 'The subject must be at most 150 characters.',
        message: 'Enter a message between 20 and 5000 characters.',
      },
    },
    closingTitle: 'Thank you for visiting.',
    closingBody:
      'I believe meaningful progress comes from curiosity, continuous learning, and the willingness to turn ideas into practical solutions.',
  },
};

export function getContact(locale: Locale): ContactMessages {
  return contact[locale];
}
