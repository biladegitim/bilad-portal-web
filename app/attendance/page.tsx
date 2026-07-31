"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth";

type AttendanceSummary = {
  user_id: number;
  full_name: string;
  position: string | null;
  first_entry: string | null;
  last_exit: string | null;
  is_inside: boolean;
  late: boolean;
};

type DashboardData = {
  date: string;
  counts: {
    arrived: number;
    inside: number;
    late: number;
    not_checked_out: number;
  };
  summary: AttendanceSummary[];
};

export default function AttendancePage() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAttendance() {
    try {
      const response = await apiFetch("/attendance/dashboard", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("Attendance fetch failed");
      }

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error(error);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  async function downloadExcel() {
    try {
      const response = await apiFetch("/attendance/export-excel", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        alert("Excel indirilemedi");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `giris-cikis-raporu-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      alert("Excel indirilemedi");
    }
  }

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetchAttendance();
  }, [router]);

  function formatTime(date: string | null) {
    if (!date) return "-";

    const utcDate = date.endsWith("Z") ? date : `${date}Z`;

    return new Date(utcDate).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });
  }

  function statusLabel(record: AttendanceSummary) {
    if (record.is_inside) return "İçeride";
    if (record.late) return "Geç";
    if (record.last_exit) return "Çıkış Yaptı";

    return "Bekleniyor";
  }

  function statusClass(record: AttendanceSummary) {
    if (record.is_inside) return "bg-emerald-50 text-emerald-700";
    if (record.late) return "bg-amber-50 text-amber-700";
    if (record.last_exit) return "bg-slate-100 text-slate-700";

    return "bg-sky-50 text-sky-700";
  }

  return (
    <div className="flex min-h-screen bg-[#F6F9FF]">
      <Sidebar />

      <main className="flex-1 px-4 py-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 md:mb-8">
            <div className="flex h-16 items-center justify-between border-b border-[#E6EEF9] md:h-20">
              <div className="h-12 w-12 md:hidden" />
            </div>

            <div className="mt-6 flex flex-col gap-4 md:mt-8 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 md:text-4xl">
                  Giriş - Çıkış
                </h1>

                <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
                  Günlük personel giriş ve çıkış kayıtlarını görüntüleyin.
                </p>
              </div>

              <button
                onClick={downloadExcel}
                className="h-11 rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                Excel Oluştur
              </button>
            </div>
          </header>

          {loading ? (
            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 text-sm text-slate-400 shadow-sm md:rounded-3xl md:p-5 md:text-base">
              Veriler yükleniyor...
            </section>
          ) : !dashboard ? (
            <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-600 shadow-sm md:rounded-3xl">
              Attendance verileri alınamadı.
            </section>
          ) : (
            <div className="space-y-4 md:space-y-5">
              <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard title="Gelen Personel" value={dashboard.counts.arrived} icon="👥" />
                <StatCard title="İçeride" value={dashboard.counts.inside} icon="🏢" />
                <StatCard title="Geç Kalan" value={dashboard.counts.late} icon="⏰" />
                <StatCard
                  title="Çıkış Yapmayan"
                  value={dashboard.counts.not_checked_out}
                  icon="🚪"
                />
              </section>

              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-xl md:h-11 md:w-11 md:text-2xl">
                      🚪
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                        Günlük Kayıtlar
                      </h2>

                      <p className="text-sm text-slate-400">
                        Tüm personel giriş çıkış özeti.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                    {dashboard.summary.length} personel
                  </span>
                </div>

                {dashboard.summary.length === 0 ? (
                  <div className="rounded-2xl bg-[#F8FBFF] p-6 text-center md:p-8">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-2xl">
                      🚪
                    </div>

                    <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                      Kayıt bulunamadı
                    </h2>

                    <p className="mt-1 text-sm text-slate-400 md:text-base">
                      Henüz giriş çıkış kaydı oluşmamış.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dashboard.summary.map((record) => (
                      <article
                        key={record.user_id}
                        className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 transition hover:bg-white hover:shadow-sm"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800 md:text-base">
                              {record.full_name}
                            </h3>

                            <p className="mt-1 text-xs text-slate-400 md:text-sm">
                              {record.position || "Personel"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              record
                            )}`}
                          >
                            {statusLabel(record)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-400">
                              İlk Giriş
                            </p>

                            <p className="mt-1 text-base font-bold text-slate-800">
                              {formatTime(record.first_entry)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs font-semibold text-slate-400">
                              Son Çıkış
                            </p>

                            <p className="mt-1 text-base font-bold text-slate-800">
                              {formatTime(record.last_exit)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-2xl">
        {icon}
      </div>

      <p className="text-sm text-slate-400">{title}</p>

      <h2 className="mt-1 text-2xl font-bold text-slate-800 md:text-3xl">
        {value}
      </h2>
    </div>
  );
}
