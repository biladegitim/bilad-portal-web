import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

type PageShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

export function PageShell({ children, sidebar }: PageShellProps) {
  return (
    <div className="flex min-h-screen bg-[#F6F9FF]">
      {sidebar}
      <main className="min-w-0 flex-1 px-4 pb-8 pt-20 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

type SectionHeaderProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function SectionHeader({
  icon,
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-lg leading-none text-sky-700">
            {icon}
          </span>
        )}

        <div>
          <h2 className="text-lg font-bold text-slate-800 md:text-xl">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-400">{description}</p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

type ActionPanelButtonProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  active?: boolean;
  badge?: ReactNode;
  onClick: () => void;
};

export function ActionPanelButton({
  title,
  description,
  icon,
  active = false,
  badge,
  onClick,
}: ActionPanelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-[92px] w-full items-center gap-4 rounded-3xl border p-4 text-left shadow-sm transition active:scale-[0.99] ${
        active
          ? "border-sky-300 bg-sky-50 ring-4 ring-sky-100"
          : "border-[#E6EEF9] bg-white hover:border-sky-200 hover:bg-[#F8FBFF]"
      }`}
    >
      {icon && (
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl transition ${
            active ? "bg-white text-sky-700" : "bg-sky-50 text-sky-700"
          }`}
        >
          {icon}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-slate-800 md:text-base">
            {title}
          </span>
          {badge}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-slate-400 md:text-sm">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function EmptyState({
  icon = "•",
  title,
  text,
}: {
  icon?: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#D9E8FA] bg-[#F8FBFF] p-7 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800 md:text-lg">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-400">
        {text}
      </p>
    </div>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 text-sm leading-6 text-slate-500 md:text-base">
      {children}
    </div>
  );
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function FormInput({ label, className = "", ...props }: FormInputProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-slate-500">
          {label}
        </span>
      )}
      <input
        {...props}
        className={`h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${className}`}
      />
    </label>
  );
}

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

export function FormSelect({ label, className = "", children, ...props }: FormSelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold text-slate-500">
          {label}
        </span>
      )}
      <select
        {...props}
        className={`h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 ${className}`}
      >
        {children}
      </select>
    </label>
  );
}
