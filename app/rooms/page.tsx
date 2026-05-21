"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch } from "@/lib/api";
import { canManageRooms, fetchProfileAccess } from "@/lib/access";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";

type Room = {
  id: number;
  name: string;
  description: string | null;
};

type Reservation = {
  reservation_id: number;
  room_id: number;
  room_name: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  weekday: number;
};

const weekdays = [
  { value: 0, label: "Pazartesi" },
  { value: 1, label: "Salı" },
  { value: 2, label: "Çarşamba" },
  { value: 3, label: "Perşembe" },
  { value: 4, label: "Cuma" },
  { value: 5, label: "Cumartesi" },
  { value: 6, label: "Pazar" },
];

const dayNames = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export default function RoomsPage() {
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, Reservation[]>>({});
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekday, setWeekday] = useState("0");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  async function fetchData() {
    try {
      setIsSuperAdmin(canManageRooms(await fetchProfileAccess()));

      const roomsRes = await apiFetch("/rooms");
      const roomsData = await roomsRes.json();
      setRooms(roomsData.rooms || []);

      const weeklyRes = await apiFetch("/room-reservations/weekly");
      const weeklyData = await weeklyRes.json();
      setWeeklySchedule(weeklyData.weekly_schedule || {});
    } catch {
      setRooms([]);
      setWeeklySchedule({});
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

    fetchData();
  }, [router]);

  function resetRoomForm() {
    setRoomName("");
    setRoomDescription("");
    setEditingRoomId(null);
  }

  function startEditRoom(room: Room) {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setRoomDescription(room.description || "");
  }

  async function handleRoomSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await apiFetch(
      editingRoomId ? `/rooms/${editingRoomId}` : "/rooms",
      {
        method: editingRoomId ? "PATCH" : "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          name: roomName,
          description: roomDescription,
        }),
      }
    );

    if (!response.ok) {
      alert("Mekan işlemi başarısız");
      return;
    }

    resetRoomForm();
    fetchData();
  }

  async function handleDeleteRoom(id: number) {
    if (!confirm("Bu mekan silinsin mi?")) return;

    const response = await apiFetch(`/rooms/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("Mekan silinemedi.");
      return;
    }

    fetchData();
  }

  function resetReservationForm() {
    setEditingId(null);
    setRoomId("");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setWeekday("0");
    setStartTime("");
    setEndTime("");
  }

  function startEditReservation(reservation: Reservation) {
    setEditingId(reservation.reservation_id);
    setRoomId(String(reservation.room_id));
    setTitle(reservation.title);
    setDescription(reservation.description || "");
    setStartDate(reservation.start_date);
    setEndDate(reservation.end_date);
    setWeekday(String(reservation.weekday));
    setStartTime(reservation.start_time.slice(0, 5));
    setEndTime(reservation.end_time.slice(0, 5));
  }

  async function handleReservationSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await apiFetch(
      editingId
        ? `/room-reservations/${editingId}`
        : "/room-reservations",
      {
        method: editingId ? "PATCH" : "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          room_id: Number(roomId),
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          weekday: Number(weekday),
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "İşlem başarısız");
      return;
    }

    resetReservationForm();
    fetchData();
  }

  async function handleDeleteReservation(id: number) {
    if (!confirm("Bu rezervasyon silinsin mi?")) return;

    const response = await apiFetch(`/room-reservations/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("Rezervasyon silinemedi");
      return;
    }

    fetchData();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
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
            </div>

            <div className="mt-5 md:mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Kat Planı
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Mekanları ve haftalık rezervasyonları yönetin.
              </p>
            </div>
          </header>

          <div className="space-y-4 md:space-y-5">
            {loading ? (
              <InfoBox>Kat planı yükleniyor...</InfoBox>
            ) : (
              <>
                {isSuperAdmin && (
                  <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                    <div className="mb-4">
                      <SectionTitle
                        icon="🏢"
                        title={editingRoomId ? "Mekan Düzenle" : "Mekan Yönetimi"}
                        description="Kat planında kullanılacak mekanları oluşturun."
                      />
                    </div>

                    <form
                      onSubmit={handleRoomSubmit}
                      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
                    >
                      <Input
                        value={roomName}
                        setValue={setRoomName}
                        placeholder="Mekan adı"
                        required
                      />

                      <Input
                        value={roomDescription}
                        setValue={setRoomDescription}
                        placeholder="Açıklama"
                      />

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="submit"
                          className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                        >
                          {editingRoomId ? "Güncelle" : "Mekan Ekle"}
                        </button>

                        {editingRoomId && (
                          <button
                            type="button"
                            onClick={resetRoomForm}
                            className="h-11 rounded-2xl border border-[#E6EEF9] bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Vazgeç
                          </button>
                        )}
                      </div>
                    </form>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {rooms.length === 0 ? (
                        <InfoBox>Henüz mekan eklenmemiş.</InfoBox>
                      ) : (
                        rooms.map((room) => (
                          <article
                            key={room.id}
                            className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 transition hover:bg-white hover:shadow-sm"
                          >
                            <div className="mb-4 flex items-center gap-3">
                              <span className="text-xl leading-none">🏢</span>

                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-slate-800 md:text-base">
                                  {room.name}
                                </h3>

                                <p className="mt-0.5 text-xs text-slate-400 md:text-sm">
                                  Mekan
                                </p>
                              </div>
                            </div>

                            <p className="line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-600">
                              {room.description || "Açıklama yok."}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <button
                                onClick={() => startEditRoom(room)}
                                className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Düzenle
                              </button>

                              <button
                                onClick={() => handleDeleteRoom(room.id)}
                                className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                              >
                                Sil
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                )}

                <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                  <form onSubmit={handleReservationSubmit} className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <SectionTitle
                        icon="📌"
                        title={editingId ? "Rezervasyon Düzenle" : "Rezervasyon Oluştur"}
                        description="Mekan, gün ve saat bilgilerini girin."
                      />

                      {editingId && (
                        <button
                          type="button"
                          onClick={resetReservationForm}
                          className="h-10 w-fit rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Düzenlemeyi İptal Et
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <Select
                        value={roomId}
                        setValue={setRoomId}
                        required
                        options={[
                          { value: "", label: "Mekan seç" },
                          ...rooms.map((room) => ({
                            value: String(room.id),
                            label: room.name,
                          })),
                        ]}
                      />

                      <Input
                        value={title}
                        setValue={setTitle}
                        placeholder="Başlık"
                        required
                      />

                      <Select
                        value={weekday}
                        setValue={setWeekday}
                        options={weekdays.map((day) => ({
                          value: String(day.value),
                          label: day.label,
                        }))}
                      />

                      <DateInput
                        type="date"
                        value={startDate}
                        setValue={setStartDate}
                        required
                      />

                      <DateInput
                        type="date"
                        value={endDate}
                        setValue={setEndDate}
                        required
                      />

                      <Input
                        value={description}
                        setValue={setDescription}
                        placeholder="Açıklama"
                      />

                      <DateInput
                        type="time"
                        value={startTime}
                        setValue={setStartTime}
                        required
                      />

                      <DateInput
                        type="time"
                        value={endTime}
                        setValue={setEndTime}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                      >
                        {editingId ? "Güncelle" : "Kaydet"}
                      </button>

                      {editingId && (
                        <button
                          type="button"
                          onClick={resetReservationForm}
                          className="h-11 rounded-2xl border border-[#E6EEF9] bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Vazgeç
                        </button>
                      )}
                    </div>
                  </form>
                </section>

                <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <SectionTitle
                      icon="🗓"
                      title="Haftalık Görünüm"
                      description="Günlere göre mekan rezervasyonları."
                    />

                    <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                      {dayNames.length} gün
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dayNames.map((day) => (
                      <article
                        key={day}
                        className="overflow-hidden rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF]"
                      >
                        <div className="border-b border-[#E6EEF9] bg-white px-4 py-3">
                          <h3 className="text-sm font-bold text-slate-800 md:text-base">
                            {day}
                          </h3>
                        </div>

                        <div className="p-4">
                          {!weeklySchedule[day] ||
                          weeklySchedule[day].length === 0 ? (
                            <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-400">
                              Rezervasyon yok.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {weeklySchedule[day].map((reservation) => (
                                <div
                                  key={reservation.reservation_id}
                                  className="rounded-2xl border border-[#E6EEF9] bg-white p-3 transition hover:shadow-sm"
                                >
                                  <div className="mb-2 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-800">
                                        {reservation.room_name}
                                      </p>

                                      <p className="mt-0.5 truncate text-sm text-slate-600">
                                        {reservation.title}
                                      </p>
                                    </div>

                                    <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                      {reservation.start_time.slice(0, 5)} -{" "}
                                      {reservation.end_time.slice(0, 5)}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-400">
                                    {formatDate(reservation.start_date)} →{" "}
                                    {formatDate(reservation.end_date)}
                                  </p>

                                  {reservation.description && (
                                    <p className="mt-3 rounded-2xl bg-[#F8FBFF] p-3 text-sm leading-6 text-slate-500">
                                      {reservation.description}
                                    </p>
                                  )}

                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() =>
                                        startEditReservation(reservation)
                                      }
                                      className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      Düzenle
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleDeleteReservation(
                                          reservation.reservation_id
                                        )
                                      }
                                      className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                    >
                                      Sil
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg leading-none md:text-xl">{icon}</span>

      <div>
        <h2 className="text-lg font-bold text-slate-800 md:text-xl">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 text-sm text-slate-400 shadow-sm md:rounded-3xl md:p-5 md:text-base">
      {children}
    </section>
  );
}

function Input({
  value,
  setValue,
  placeholder,
  required = false,
}: {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
    />
  );
}

function Select({
  value,
  setValue,
  options,
  required = false,
}: {
  value: string;
  setValue: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      required={required}
      className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
    >
      {options.map((option) => (
        <option key={`${option.value}-${option.label}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function DateInput({
  type,
  value,
  setValue,
  required = false,
}: {
  type: "date" | "time";
  value: string;
  setValue: (value: string) => void;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      required={required}
      className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
    />
  );
}
