/**
 * Site-wide, language-neutral configuration.
 *
 * `contactEmail` is the owner's public contact address, intentionally
 * published on the contact page. It is not a credential; secrets still belong
 * in environment variables or GitHub Secrets.
 */
export const SITE = {
  url: 'https://portofolio.homelabchester.my.id',
  repoUrl: null,
  contactEmail: 'maulanazh15@gmail.com',
  location: 'Indonesia',
  defaultOgImage: null,
  socialLinks: [
    { key: 'github', label: 'GitHub', href: 'https://github.com/maulanazh15' },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/in/maulana-zhahran-7a6bb2192/',
    },
  ] as { key: 'github' | 'linkedin'; label: string; href: string }[],
} as const;

export function mailtoHref(email: string): string {
  return `mailto:${email}`;
}
