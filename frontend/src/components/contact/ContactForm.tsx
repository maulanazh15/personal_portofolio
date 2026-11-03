import { useEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { ContactFormMessages } from '@/i18n/contact';

type FieldName = 'name' | 'email' | 'subject' | 'message';
type Values = Record<FieldName | 'website', string>;
type FieldErrors = Partial<Record<FieldName, string>>;

interface Props {
  endpoint: string;
  locale: 'id' | 'en';
  labels: ContactFormMessages;
}

const emptyValues: Values = { name: '', email: '', subject: '', message: '', website: '' };

function length(value: string): number {
  return Array.from(value.trim()).length;
}

export default function ContactForm({ endpoint, locale, labels }: Props) {
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'validation' | 'network' | 'rate-limit' | 'server'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reference) successRef.current?.focus();
  }, [reference]);

  function updateField(field: FieldName | 'website', value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== 'website') {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    setStatus('idle');
    setReference('');
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const nameLength = length(values.name);
    if (nameLength < 2 || nameLength > 100) next.name = labels.errors.name;

    const email = values.email.trim();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) next.email = labels.errors.email;
    if (length(values.subject) > 150) next.subject = labels.errors.subject;

    const messageLength = length(values.message);
    if (messageLength < 20 || messageLength > 5000) next.message = labels.errors.message;
    return next;
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (submitting) return;

    setReference('');
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setStatus('validation');
      focusFirstError(clientErrors);
      return;
    }

    setSubmitting(true);
    setStatus('idle');
    setErrors({});

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.subject.trim(),
          message: values.message.trim(),
          locale,
          website: values.website,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok && typeof payload.id === 'string') {
        setValues(emptyValues);
        setReference(payload.id);
        setStatus('idle');
        return;
      }

      if (response.status === 400) {
        const serverErrors: FieldErrors = {};
        for (const field of ['name', 'email', 'subject', 'message'] as FieldName[]) {
          if (payload.fields?.[field]) serverErrors[field] = labels.errors[field];
        }
        setErrors(serverErrors);
        setStatus('validation');
        focusFirstError(serverErrors);
      } else if (response.status === 429) {
        setStatus('rate-limit');
      } else {
        setStatus('server');
      }
    } catch {
      setStatus('network');
    } finally {
      setSubmitting(false);
    }
  }

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = (['name', 'email', 'subject', 'message'] as FieldName[]).find(
      (field) => fieldErrors[field],
    );
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  const errorMessage = {
    validation: labels.validationError,
    network: labels.networkError,
    'rate-limit': labels.rateLimitError,
    server: labels.genericError,
    idle: '',
  }[status];

  return (
    <div class="mt-7">
      {reference && (
        <div
          ref={successRef}
          tabIndex={-1}
          role="status"
          class="mb-6 rounded-card border border-accent/20 bg-accent-soft p-5 text-sm text-accent-ink focus:outline-none"
        >
          <p class="font-semibold">{labels.successTitle}</p>
          <p class="mt-1 break-all leading-relaxed">{labels.successBody.replace('{reference}', reference)}</p>
        </div>
      )}

      {status !== 'idle' && (
        <div role="alert" class="mb-6 rounded-card border border-ink/15 bg-canvas p-5 text-sm text-ink-soft">
          <p class="font-semibold text-ink">{labels.errorTitle}</p>
          <p class="mt-1 leading-relaxed">{errorMessage}</p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate class="grid gap-5 sm:grid-cols-2">
        <Field
          name="name"
          label={labels.nameLabel}
          error={errors.name}
          required
          input={
            <input
              id="contact-name"
              name="name"
              type="text"
              autocomplete="name"
              maxlength={100}
              required
              value={values.name}
              onInput={(event) => updateField('name', event.currentTarget.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
              class={inputClass(Boolean(errors.name))}
            />
          }
        />

        <Field
          name="email"
          label={labels.emailLabel}
          error={errors.email}
          required
          input={
            <input
              id="contact-email"
              name="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              maxlength={254}
              required
              value={values.email}
              onInput={(event) => updateField('email', event.currentTarget.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              class={inputClass(Boolean(errors.email))}
            />
          }
        />

        <div class="sm:col-span-2">
          <Field
            name="subject"
            label={labels.subjectLabel}
            optional={labels.subjectOptional}
            error={errors.subject}
            input={
              <input
                id="contact-subject"
                name="subject"
                type="text"
                maxlength={150}
                value={values.subject}
                onInput={(event) => updateField('subject', event.currentTarget.value)}
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                class={inputClass(Boolean(errors.subject))}
              />
            }
          />
        </div>

        <div class="sm:col-span-2">
          <Field
            name="message"
            label={labels.messageLabel}
            error={errors.message}
            required
            input={
              <textarea
                id="contact-message"
                name="message"
                rows={7}
                minlength={20}
                maxlength={5000}
                required
                value={values.message}
                onInput={(event) => updateField('message', event.currentTarget.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                class={`${inputClass(Boolean(errors.message))} resize-y`}
              />
            }
          />
        </div>

        <div class="hidden" aria-hidden="true">
          <label for="contact-website">{labels.websiteLabel}</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autocomplete="off"
            value={values.website}
            onInput={(event) => updateField('website', event.currentTarget.value)}
          />
        </div>

        <div class="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="max-w-md text-xs leading-relaxed text-muted">{labels.privacyNote}</p>
          <button type="submit" disabled={submitting} class="btn btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? labels.submittingLabel : labels.submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return `mt-2 min-h-11 w-full rounded-xl border bg-canvas px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent ${
    invalid ? 'border-accent' : 'border-line-strong'
  }`;
}

interface FieldProps {
  name: FieldName;
  label: string;
  optional?: string;
  error?: string;
  required?: boolean;
  input: JSX.Element;
}

function Field({ name, label, optional, error, required, input }: FieldProps) {
  return (
    <div>
      <label for={`contact-${name}`} class="text-sm font-medium text-ink-soft">
        {label}
        {optional && <span class="ml-1.5 text-xs font-normal text-faint">({optional})</span>}
        {required && <span class="ml-1 text-accent" aria-hidden="true">*</span>}
      </label>
      {input}
      {error && (
        <p id={`contact-${name}-error`} class="mt-2 text-xs leading-relaxed text-accent-ink">
          {error}
        </p>
      )}
    </div>
  );
}
