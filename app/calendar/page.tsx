"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type MonthEvent = {
  date: string;
  event_id: number;
  title: string;
  category: string;
  icon: string;
  start_time: string;
};

type EventItem = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  category: string;
  icon: string;
};

const monthNames = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthEvents, setMonthEvents] = useState<MonthEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<EventItem[]>([]);
  const [message, setMessage] = useState("");

  async function fetchMonthEvents(selectedYear: number, selectedMonth: number) {
    try {
      const response = await apiFetch(
        `/events/month?year=${selectedYear}&month=${selectedMonth}`
      );

      const data = await response.json();
      setMonthEvents(data.days || []);
    } catch {
      setMonthEvents([]);
    }
  }

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetchMonthEvents(year, month);
  }, [router, year, month]);

  async function fetchEventsByDate(date: string) {
    setSelectedDate(date);

    try {
      const response = await apiFetch(`/events/by-date?selected_date=${date}`);

      const data = await response.json();

      setSelectedEvents(data.events || []);
      setMessage(data.message || "");
    } catch {
      setSelectedEvents([]);
      setMessage("Etkinlikler alınamadı");
    }
  }

  function goPreviousMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }

    setSelectedDate("");
    setSelectedEvents([]);
  }

  function goNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }

    setSelectedDate("");
    setSelectedEvents([]);
  }

  function getCalendarDays() {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const emptyDays = Array.from({ length: startDay }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return [...emptyDays, ...days];
  }

  function formatDate(day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  }

  function getEventsForDay(day: number) {
    const date = formatDate(day);
    return monthEvents.filter((event) => event.date === date);
  }

  function isToday(day: number) {
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    );
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
                Takvim
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Etkinlik ve duyuruları aylık görüntüleyin.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <button
                onClick={goPreviousMonth}
                className="h-11 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-700 shadow-sm transition active:scale-95"
              >
                Önceki
              </button>

              <div className="flex h-11 items-center justify-center rounded-2xl bg-sky-600 text-sm font-bold text-white shadow-sm">
                {monthNames[month - 1]}
              </div>

              <button
                onClick={goNextMonth}
                className="h-11 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-700 shadow-sm transition active:scale-95"
              >
                Sonraki
              </button>
            </div>
          </header>

          <section className="rounded-3xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 text-center">
              <div className="mb-3 flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-[#E6EEF9]" />

                <span className="text-lg font-bold text-slate-800">
                  {year}
                </span>

                <div className="h-px flex-1 bg-[#E6EEF9]" />
              </div>

              <div className="flex items-start gap-3 text-left">
                <span className="mt-0.5 text-xl">🗓️</span>

                <div>
                  <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                    Aylık Takvim
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Gün seçerek etkinlik detaylarını görüntüleyin.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-bold text-slate-400 md:text-sm"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {getCalendarDays().map((day, index) => {
                if (!day) {
                  return <div key={index} className="aspect-square" />;
                }

                const dayEvents = getEventsForDay(day);
                const date = formatDate(day);
                const isSelected = selectedDate === date;
                const todayCheck = isToday(day);

                return (
                  <button
                    key={date}
                    onClick={() => fetchEventsByDate(date)}
                    className={`relative flex aspect-square items-center justify-center rounded-2xl border text-sm font-bold transition active:scale-95 md:min-h-[92px] md:items-start md:justify-start md:p-2.5 ${
                      isSelected || todayCheck
                        ? "border-sky-500 bg-sky-600 text-white shadow-md"
                        : "border-[#E6EEF9] bg-[#F8FBFF] text-slate-700 hover:bg-white"
                    }`}
                  >
                    <span>{day}</span>

                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1 md:bottom-2">
                        {dayEvents.slice(0, 3).map((event) => (
                          <span
                            key={event.event_id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSelected || todayCheck
                                ? "bg-white"
                                : "bg-sky-500"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    <div className="mt-8 hidden w-full space-y-1 md:block">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.event_id}
                          className="truncate rounded-xl bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {event.icon || "📌"} {event.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-5 rounded-3xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-lg">
                ℹ️
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-800 md:text-lg">
                  {selectedDate
                    ? new Date(selectedDate).toLocaleDateString("tr-TR")
                    : "Etkinlik bilgisi"}
                </h2>

                <p className="text-sm leading-6 text-slate-400">
                  Takvimden bir gün seçerek o güne ait etkinlikleri
                  görebilirsiniz.
                </p>
              </div>
            </div>

            {!selectedDate && (
              <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400">
                Henüz gün seçilmedi.
              </div>
            )}

            {selectedDate && selectedEvents.length === 0 && (
              <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400">
                {message || "Planlanmış etkinlik yok."}
              </div>
            )}

            {selectedEvents.length > 0 && (
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">{event.icon || "📌"}</span>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-800">
                          {event.title}
                        </h3>

                        <p className="mt-1 text-xs text-sky-600">
                          {new Date(event.start_time).toLocaleString("tr-TR")}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {event.description || "Açıklama bulunmuyor."}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          📍 {event.location || "-"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
