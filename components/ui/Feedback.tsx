"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ConfirmState = {
  message: string;
  resolve: (value: boolean) => void;
} | null;

type FeedbackContextValue = {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const removeToast = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      setToasts((items) => [...items, { id, message, type }]);
      window.setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const closeConfirm = useCallback(
    (value: boolean) => {
      confirmState?.resolve(value);
      setConfirmState(null);
    },
    [confirmState]
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 md:right-6 md:top-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-3xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur ${
              item.type === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-700"
                : item.type === "error"
                  ? "border-red-200 bg-red-50/95 text-red-700"
                  : "border-sky-200 bg-sky-50/95 text-sky-700"
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#E6EEF9] bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800">Onay gerekiyor</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {confirmState.message}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="h-11 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className="h-11 rounded-2xl bg-red-500 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }

  return context;
}
