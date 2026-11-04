import { useEffect, useRef, useState } from 'preact/hooks';

interface NavItem {
  label: string;
  href: string;
  active: boolean;
}

interface LanguageOption {
  code: string;
  shortLabel: string;
  nativeName: string;
  href: string;
  current: boolean;
}

interface Props {
  brand: {
    name: string;
    role: string;
    href: string;
  };
  items: NavItem[];
  languages: LanguageOption[];
  labels: {
    open: string;
    close: string;
    navigation: string;
    language: string;
  };
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      class="h-5 w-5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 8h16" />
      <path d="M4 16h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      class="h-5 w-5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export default function MobileNav({ brand, items, languages, labels }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasOpened = useRef(false);

  function close() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    hasOpened.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) close();
    };
    desktopQuery.addEventListener('change', handleViewportChange);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((element) => element.offsetParent !== null);

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      desktopQuery.removeEventListener('change', handleViewportChange);
    };
  }, [open]);

  useEffect(() => {
    if (!open && hasOpened.current) {
      hasOpened.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  return (
    <div class="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={labels.open}
        class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-line-strong"
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          ref={dialogRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-navigation-title"
          class="fixed inset-0 z-50 flex flex-col bg-canvas"
        >
          <h2 id="mobile-navigation-title" class="sr-only">
            {labels.navigation}
          </h2>

          <div class="container-page flex h-[4.75rem] shrink-0 items-center justify-between border-b border-line">
            <a href={brand.href} onClick={close} class="flex min-w-0 flex-col">
              <span class="truncate font-display text-sm font-bold tracking-[-0.02em]">
                {brand.name}
              </span>
              <span class="mt-0.5 truncate text-[0.5625rem] font-semibold uppercase tracking-[0.15em] text-muted">
                {brand.role}
              </span>
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label={labels.close}
              class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-line-strong"
            >
              <CloseIcon />
            </button>
          </div>

          <div class="container-page flex flex-1 flex-col overflow-y-auto py-6">
            <nav aria-label={labels.navigation}>
              <ul>
                {items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={close}
                      aria-current={item.active ? 'page' : undefined}
                      class="flex items-center justify-between border-b border-line py-4 font-display text-2xl font-semibold tracking-[-0.03em]"
                    >
                      {item.label}
                      {item.active && (
                        <span class="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div class="mt-10">
              <p class="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
                {labels.language}
              </p>
              <div class="mt-3 grid grid-cols-2 gap-2">
                {languages.map((language) => (
                  <a
                    key={language.code}
                    href={language.href}
                    onClick={close}
                    lang={language.code}
                    hreflang={language.code}
                    aria-current={language.current ? 'true' : undefined}
                    class={
                      language.current
                        ? 'rounded-xl border border-ink bg-ink px-4 py-3 text-on-ink'
                        : 'rounded-xl border border-line bg-surface px-4 py-3 text-ink transition-colors hover:border-line-strong'
                    }
                  >
                    <span class="block text-sm font-semibold">{language.shortLabel}</span>
                    <span
                      class={
                        language.current
                          ? 'mt-0.5 block text-[0.6875rem] text-on-ink/65'
                          : 'mt-0.5 block text-[0.6875rem] text-muted'
                      }
                    >
                      {language.nativeName}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <p class="mt-auto pt-10 text-xs text-faint">{brand.role}</p>
          </div>
        </div>
      )}
    </div>
  );
}
