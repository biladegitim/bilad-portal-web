"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  category: string | null;
  icon: string | null;
};

import { apiFetch } from "@/lib/api";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";

export default function EventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [icon, setIcon] = useState("📅");

  async function fetchEvents() {
    try {
      const response = await apiFetch("/events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetchEvents();
  }, [router]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setLocation("");
    setStartTime("");
    setEndTime("");
    setIcon("📅");
    setShowForm(false);
  }

  function startEdit(event: EventItem) {
    setEditingId(event.id);
    setTitle(event.title);
    setDescription(event.description || "");
    setLocation(event.location || "");
    setStartTime(event.start_time?.slice(0, 16) || "");
    setEndTime(event.end_time ? event.end_time.slice(0, 16) : "");
    setIcon(event.icon || "📅");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await apiFetch(
      editingId ? `/events/${editingId}` : "/events",
      {
        method: editingId ? "PATCH" : "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          title,
          description,
          location,
          start_time: startTime,
          end_time: endTime || null,
          category: "genel",
          icon,
        }),
      }
    );

    if (!response.ok) {
      alert("İşlem başarısız");
      return;
    }

    resetForm();
    fetchEvents();
  }

  async function handleDelete(id: number) {
    if (!confirm("Etkinlik silinsin mi?")) return;

    const response = await apiFetch(`/events/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("Etkinlik silinemedi");
      return;
    }

    fetchEvents();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex min-h-screen bg-[#F6F9FF]">
      <Sidebar />

      <main className="flex-1 px-4 py-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 md:mb-8">
            <div className="flex h-14 items-center justify-between md:h-16">
              <div className="h-11 w-11 md:hidden" />

              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="ml-auto h-11 rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                + Etkinlik Ekle
              </button>
            </div>

            <div className="mt-5 md:mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Etkinlikler
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Kurum içi etkinlikleri oluşturun ve yönetin.
              </p>
            </div>
          </header>

          <div className="space-y-4 md:space-y-5">
            {showForm && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg md:text-xl">📌</span>

                      <div>
                        <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                          {editingId ? "Etkinlik Düzenle" : "Yeni Etkinlik"}
                        </h2>

                        <p className="text-sm text-slate-400">
                          Etkinlik bilgilerini doldurun.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-2xl border border-[#E6EEF9] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Kapat
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <Input label="Başlık" placeholder="Etkinlik başlığı" value={title} setValue={setTitle} required />
                    <Input label="Konum" placeholder="Etkinlik konumu" value={location} setValue={setLocation} />

                    <div className="lg:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Açıklama
                      </label>

                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-24 w-full resize-none rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        placeholder="Etkinlik açıklaması..."
                      />
                    </div>

                    <DateInput label="Başlangıç" value={startTime} setValue={setStartTime} required />
                    <DateInput label="Bitiş" value={endTime} setValue={setEndTime} />

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        İkon
                      </label>

                      <select
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="📅">📅 Genel</option>
                        <option value="📋">📋 Toplantı</option>
                        <option value="🚌">🚌 Gezi</option>
                        <option value="🎓">🎓 Mezuniyet</option>
                        <option value="☕">☕ Buluşma</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    >
                      {editingId ? "Güncelle" : "Kaydet"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="h-11 rounded-2xl border border-[#E6EEF9] bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Vazgeç
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-lg md:text-xl">📌</span>

                <div>
                  <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                    Etkinlikler
                  </h2>

                  <p className="text-sm text-slate-400">
                    {loading
                      ? "Etkinlikler yükleniyor..."
                      : `Toplam ${events.length} etkinlik bulundu.`}
                  </p>
                </div>
              </div>

              {loading ? (
                <InfoBox>Etkinlikler yükleniyor...</InfoBox>
              ) : events.length === 0 ? (
                <EmptyBox title="Henüz etkinlik yok" text="Yeni etkinlik eklendiğinde burada listelenecek." />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {events.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-xl leading-none">
                          {event.icon || "📌"}
                        </span>

                        <div className="min-w-0">
                          <h3 className="line-clamp-1 text-sm font-semibold text-slate-800 md:text-base">
                            {event.title}
                          </h3>

                          <p className="mt-0.5 text-xs text-sky-600 md:text-sm">
                            {formatDate(event.start_time)}
                          </p>
                        </div>
                      </div>

                      <p className="line-clamp-3 min-h-[64px] text-sm leading-6 text-slate-600">
                        {event.description || "Açıklama girilmemiş."}
                      </p>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-500 md:text-sm">
                        <p>📍 {event.location || "Konum belirtilmemiş"}</p>
                        {event.end_time && <p>🕓 Bitiş: {formatDate(event.end_time)}</p>}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => startEdit(event)}
                          className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Düzenle
                        </button>

                        <button
                          onClick={() => handleDelete(event.id)}
                          className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          Sil
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
      {children}
    </div>
  );
}

function EmptyBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#F8FBFF] p-6 text-center md:p-8">
      <div className="mb-2 text-2xl">📌</div>
      <h2 className="text-lg font-bold text-slate-800 md:text-xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-400 md:text-base">{text}</p>
    </div>
  );
}

function Input({
  label,
  placeholder,
  value,
  setValue,
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  setValue: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}

function DateInput({
  label,
  value,
  setValue,
  required = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}
