import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, LoaderCircle, X } from 'lucide-react';
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { formatNumber } from '../lib/format';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

// ---------- buttons ----------

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-900/20',
  dark: 'bg-ink-900 text-white hover:bg-ink-700',
  outline: 'border border-ink-300 bg-white text-ink-800 hover:border-ink-500 hover:bg-ink-100',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100',
  gold: 'bg-gradient-to-l from-flame-500 to-gold-400 text-ink-950 hover:brightness-105 shadow-sm shadow-flame-600/30',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center rounded-xl font-bold whitespace-nowrap transition duration-150',
    'active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100',
    variants[variant], sizes[size], extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant, size, loading, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

// ---------- form fields ----------

const control =
  'w-full rounded-xl border border-ink-300 bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 transition ' +
  'focus:border-flame-500 focus:outline-none focus:ring-4 focus:ring-flame-500/15 disabled:bg-ink-100 disabled:text-ink-500';

interface FieldShell {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function Field({ label, hint, error, required, id, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink-800">
        {label}
        {required && <span className="ms-1 text-brand-600" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-brand-700">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, error, className, ...rest }: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={rest.required} id={id}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cx(control, 'h-11', error && 'border-brand-500', className)}
        {...rest}
      />
    </Field>
  );
}

export function Textarea({ label, hint, error, className, ...rest }: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={rest.required} id={id}>
      <textarea
        id={id}
        aria-invalid={!!error}
        className={cx(control, 'min-h-28 py-2.5 leading-7', error && 'border-brand-500', className)}
        {...rest}
      />
    </Field>
  );
}

export function Select({ label, hint, error, className, children, ...rest }: FieldShell & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} required={rest.required} id={id}>
      <select id={id} aria-invalid={!!error} className={cx(control, 'h-11', error && 'border-brand-500', className)} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export function Checkbox({ label, ...rest }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[15px] text-ink-800">
      <input type="checkbox" className="mt-1.5 size-4.5 shrink-0 accent-brand-600" {...rest} />
      <span>{label}</span>
    </label>
  );
}

// ---------- feedback ----------

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('animate-spin text-brand-600', className ?? 'size-6')} aria-label="جارٍ التحميل" />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status">
      <Spinner className="size-9" />
    </div>
  );
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  const tones = {
    error: 'border-brand-200 bg-brand-50 text-brand-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[15px] font-semibold', tones[tone])}>
      <Icon className="mt-1 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** A failed load always offers a way forward: retry, so the user is never left on a dead screen. */
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-ink-200 bg-white px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <AlertCircle className="size-6" aria-hidden />
      </span>
      <p className="font-bold text-ink-800">{message ?? 'تعذر تحميل البيانات.'}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>إعادة المحاولة</Button>}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
        <Inbox className="size-6" aria-hidden />
      </span>
      <p className="mt-1 text-lg font-extrabold text-ink-800">{title}</p>
      {text && <p className="max-w-sm text-[15px] text-ink-500">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'brand' | 'gold' | 'green' | 'amber' | 'dark'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700',
    brand: 'bg-brand-50 text-brand-700',
    gold: 'bg-amber-50 text-amber-800',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-orange-50 text-orange-700',
    dark: 'bg-ink-900 text-white',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', tones[tone])}>{children}</span>;
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="التنقل بين الصفحات">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronRight className="size-4" aria-hidden /> السابق
      </Button>
      <span className="text-sm font-bold text-ink-600">
        صفحة {formatNumber(page)} من {formatNumber(pages)}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        التالي <ChevronLeft className="size-4" aria-hidden />
      </Button>
    </nav>
  );
}

// ---------- modal ----------

export function Modal({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-sm animate-fade sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift outline-none sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-ink-500 hover:bg-ink-100" aria-label="إغلاق">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, loading, onConfirm, onClose }: {
  open: boolean; title: string; message: string; confirmLabel: string; loading?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-ink-700">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>تراجع</Button>
        <Button variant="primary" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ---------- toasts ----------

interface Toast { id: number; message: string; tone: 'success' | 'error' }
const ToastContext = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-bold text-white shadow-lift animate-rise',
              toast.tone === 'success' ? 'bg-ink-900' : 'bg-brand-700',
            )}
          >
            {toast.tone === 'success' ? <CheckCircle2 className="size-5 text-emerald-400" /> : <AlertCircle className="size-5" />}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---------- layout helpers ----------

export function SectionHeading({ eyebrow, title, action, light }: { eyebrow?: string; title: string; action?: ReactNode; light?: boolean }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className={cx('mb-1 text-sm font-extrabold tracking-wide', light ? 'text-gold-300' : 'text-brand-600')}>{eyebrow}</p>}
        <h2 className={cx('text-2xl font-black sm:text-3xl', light ? 'text-white' : 'text-ink-900')}>{title}</h2>
        <span className="mt-3 block h-1 w-16 rounded-full flag-line ring-1 ring-ink-200" aria-hidden />
      </div>
      {action}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-ink-200 bg-white shadow-card', className)}>{children}</div>;
}
