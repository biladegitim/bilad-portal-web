"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import Sidebar from "@/components/Sidebar";
import SplashScreen from "@/components/SplashScreen";
import { apiFetch, apiUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth";

type HomeData = {
  upcoming_events: {
    id: number;
    title: string;
    location: string | null;
    start_time: string;
    icon: string;
  }[];
  today_menu: {
    menu_date: string;
    content: string;
  } | null;
  today_approved_leaves: {
    leave_id: number;
    full_name: string;
    start_time: string;
    end_time: string;
    reason: string | null;
  }[];
};

type TodayRecord = {
  id: number;
  record_type: string;
  record_time: string;
  source: string;
};

type ProfileData = {
  full_name: string;
  email: string;
  position?: string;
  profile_photo?: string | null;
};

export default function Home() {
  const router = useRouter();

  const [data, setData] = useState<HomeData | null>(null);
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [splashLoading, setSplashLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setSplashLoading(false), 900);
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return () => clearTimeout(timer);
    }

    apiFetch("/profile", {
      headers: authHeaders(),
    })
      .then((res) => res.json())
      .then((profileData) => {
        setProfile(profileData);
        localStorage.setItem("user", JSON.stringify(profileData));
      })
      .catch(() => setProfile(null));

    apiFetch("/home")
      .then((res) => res.json())
      .then((homeData) => setData(homeData))
      .catch(() =>
        setData({
          upcoming_events: [],
          today_menu: null,
          today_approved_leaves: [],
        })
      );

    apiFetch("/attendance/today", {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((attendanceData) => {
        if (attendanceData) {
          setTodayRecords(attendanceData.records || []);
        }
      })
      .catch(() => setTodayRecords([]));

    return () => clearTimeout(timer);
  }, [router]);

  function getProfilePhotoUrl() {
    if (!profile?.profile_photo) return null;
    if (profile.profile_photo.startsWith("http")) return profile.profile_photo;
    return apiUrl(profile.profile_photo);
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  if (splashLoading) return <SplashScreen />;

  if (!data) {
    return (
      <main className="min-h-screen bg-[#F6F9FF] p-5 text-slate-700">
        Ana sayfa yükleniyor...
      </main>
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

              <div className="ml-auto flex max-w-[185px] shrink-0 items-center gap-2 rounded-xl border border-[#E6EEF9] bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:shadow-md sm:max-w-[210px]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 sm:h-9 sm:w-9">
                  {getProfilePhotoUrl() ? (
                    <img
                      src={getProfilePhotoUrl()!}
                      alt="Profil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-sky-700">
                      {profile?.full_name?.charAt(0) || "B"}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-tight text-slate-800 sm:text-sm">
                    {profile?.full_name || "Kullanıcı"}
                  </p>

                  <div className="hidden">
                    Profili Gör
                  </div>

                  <div className="mt-0.5 flex items-center gap-x-1.5 whitespace-nowrap text-[11px] font-semibold leading-tight">
                    <button
                      type="button"
                      onClick={() => router.push("/profile")}
                      className="text-sky-600 transition hover:text-sky-700"
                    >
                      Profili Gör
                    </button>

                    <span className="text-slate-200">|</span>

                    <button
                      type="button"
                      onClick={logout}
                      className="text-red-500 transition hover:text-red-600"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4 md:mt-6">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                  Ana Sayfa
                </h1>

                <p className="mt-1 text-sm capitalize text-slate-400 md:text-base">
                  {new Date().toLocaleDateString("tr-TR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/qr-scan")}
                aria-label="QR okut"
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-[#E6EEF9] bg-white p-2 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:shadow-md active:scale-95 md:h-14 md:w-14"
              >
                <QRCodeSVG
                  value="qr-scan-shortcut"
                  size={34}
                  bgColor="transparent"
                  fgColor="#0f172a"
                  marginSize={0}
                  level="M"
                />
              </button>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <DashboardCard title="Günün Menüsü" icon="🍽">
              <div className="min-h-32 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 md:min-h-40">
                {data.today_menu ? (
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-700 md:text-base md:leading-8">
                    {data.today_menu.content}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 md:text-base">
                    Bugün için menü girilmemiş.
                  </p>
                )}
              </div>
            </DashboardCard>

            <DashboardCard title="Yaklaşan Etkinlikler" icon="📌">
              {data.upcoming_events.length === 0 ? (
                <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
                  Yaklaşan etkinlik yok.
                </div>
              ) : (
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                  {data.upcoming_events.map((event) => (
                    <div
                      key={event.id}
                      className="min-w-[260px] max-w-[260px] rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl">
                          {event.icon || "📌"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-slate-800">
                            {event.title}
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            {event.location || "Konum belirtilmedi"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                          Etkinlik
                        </span>

                        <span className="text-sm font-bold text-sky-600">
                          {new Date(event.start_time).toLocaleDateString(
                            "tr-TR",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>

            <DashboardCard title="Bugün İzinli Olanlar" icon="📝">
              <div className="space-y-2.5 md:space-y-3">
                {data.today_approved_leaves.length === 0 ? (
                  <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
                    Bugün izinli kişi yok.
                  </div>
                ) : (
                  data.today_approved_leaves.map((leave) => (
                    <div
                      key={leave.leave_id}
                      className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3.5 md:p-4"
                    >
                      <p className="text-sm font-semibold text-slate-800 md:text-base">
                        {leave.full_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500 md:text-sm">
                        {formatTime(leave.start_time)} -{" "}
                        {formatTime(leave.end_time)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard title="Bugünkü Giriş-Çıkışım" icon="📊">
              <div className="space-y-2.5 md:space-y-3">
                {todayRecords.length === 0 ? (
                  <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
                    Bugün henüz kayıt yok.
                  </div>
                ) : (
                  todayRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3.5 md:p-4"
                    >
                      <span className="text-sm font-medium text-slate-700 md:text-base">
                        {record.record_type === "check_in"
                          ? "Giriş"
                          : "Çıkış"}
                      </span>

                      <span className="text-sm text-slate-500 md:text-base">
                        {formatTime(record.record_time)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>
          </section>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="mb-4 flex items-center gap-3 md:mb-5">
        <span className="text-lg leading-none md:text-xl">{icon}</span>

        <h2 className="text-lg font-bold text-slate-800 md:text-xl">
          {title}
        </h2>
      </div>

      {children}
    </div>
  );
}
