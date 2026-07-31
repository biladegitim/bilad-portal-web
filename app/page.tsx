"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import Sidebar from "@/components/Sidebar";
import SplashScreen from "@/components/SplashScreen";
import { apiFetch, apiUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth";
import { formatLocalDate, formatLocalDateShort, formatLocalTime } from "@/lib/dateTime";
import { sortFloors } from "@/lib/floors";

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

type ProfileData = {
  full_name: string;
  email: string;
  position?: string;
  profile_photo?: string | null;
};

type Room = {
  id: number;
  name: string;
  description: string | null;
  floor?: string | null;
  floor_name?: string | null;
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
  created_by_name?: string;
  status?: string;
};

const FLOOR_STORAGE_KEY = "bilad-room-floors";
const ROOM_FLOOR_STORAGE_KEY = "bilad-room-floor-map";
const unassignedFloor = "Kat seçilmemiş";
type UsageStatus = "active" | "future" | "past" | "idle";

function getRoomFloor(room: Room, roomFloorMap: Record<number, string>) {
  return room.floor_name || room.floor || roomFloorMap[room.id] || unassignedFloor;
}

function getTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getCurrentIstanbulMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return hour * 60 + minute;
}

function timeStringToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})/);

  if (match) {
    return Number(match[1]) * 60 + Number(match[2]);
  }

  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);

  return date.getHours() * 60 + date.getMinutes();
}

function getReservationTimeStatus(reservation: Reservation): UsageStatus {
  const now = getCurrentIstanbulMinutes();
  const start = timeStringToMinutes(reservation.start_time);
  const end = timeStringToMinutes(reservation.end_time);

  if (end < start) {
    if (now >= start || now < end) return "active";
    return now < start ? "future" : "past";
  }

  if (now >= start && now < end) return "active";
  if (now < start) return "future";

  return "past";
}

function getRoomUsageStatus(reservations: Reservation[]) {
  if (reservations.some((reservation) => getReservationTimeStatus(reservation) === "active")) {
    return "active";
  }

  if (reservations.some((reservation) => getReservationTimeStatus(reservation) === "future")) {
    return "future";
  }

  if (reservations.length > 0) return "past";

  return "idle";
}

function getRoomUsageLabel(status: UsageStatus) {
  if (status === "active") return "Kullanımda";
  if (status === "future") return "Kullanılacak";
  if (status === "past") return "Tamamlandı";

  return "Boş";
}

function getRoomUsageClasses(status: UsageStatus) {
  if (status === "active") {
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
  }

  if (status === "future") {
    return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
  }

  return "border-[#E6EEF9] bg-[#F8FBFF] text-slate-600 hover:bg-sky-50";
}

function getUsageBadgeClasses(status: UsageStatus) {
  if (status === "active") return "bg-red-100 text-red-700";
  if (status === "future") return "bg-amber-100 text-amber-700";
  if (status === "past") return "bg-slate-100 text-slate-600";

  return "bg-emerald-50 text-emerald-700";
}

function getReservationCardClasses(status: UsageStatus) {
  if (status === "active") return "border-red-200 bg-red-50";
  if (status === "future") return "border-amber-200 bg-amber-50";

  return "border-[#E6EEF9] bg-white";
}

export default function Home() {
  const router = useRouter();

  const [data, setData] = useState<HomeData | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [todayRoomReservations, setTodayRoomReservations] = useState<Reservation[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [roomFloorMap, setRoomFloorMap] = useState<Record<number, string>>({});
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [splashLoading, setSplashLoading] = useState(true);

  const floorOptions = useMemo(() => {
    const names = new Set(floors);

    rooms.forEach((room) => {
      names.add(getRoomFloor(room, roomFloorMap));
    });

    return sortFloors(Array.from(names), unassignedFloor);
  }, [floors, rooms, roomFloorMap]);

  const roomsByFloor = useMemo(() => {
    const grouped = Object.fromEntries(
      floorOptions.map((floor) => [floor, [] as Room[]])
    );

    rooms.forEach((room) => {
      const floor = getRoomFloor(room, roomFloorMap);
      if (!grouped[floor]) grouped[floor] = [];
      grouped[floor].push(room);
    });

    return grouped;
  }, [floorOptions, rooms, roomFloorMap]);

  const reservationsByRoom = useMemo(() => {
    const grouped: Record<number, Reservation[]> = {};

    todayRoomReservations.forEach((reservation) => {
      if (!grouped[reservation.room_id]) grouped[reservation.room_id] = [];
      grouped[reservation.room_id].push(reservation);
    });

    return grouped;
  }, [todayRoomReservations]);

  const selectedFloorRooms = selectedFloor ? roomsByFloor[selectedFloor] || [] : [];
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const selectedRoomReservations = selectedRoomId
    ? reservationsByRoom[selectedRoomId] || []
    : [];
  const selectedRoomUsageStatus = getRoomUsageStatus(selectedRoomReservations);

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

    try {
      const storedFloors = JSON.parse(
        localStorage.getItem(FLOOR_STORAGE_KEY) || "[]"
      );
      const storedRoomFloors = JSON.parse(
        localStorage.getItem(ROOM_FLOOR_STORAGE_KEY) || "{}"
      );

      setFloors(Array.isArray(storedFloors) ? storedFloors : []);
      setRoomFloorMap(storedRoomFloors || {});
    } catch {
      setFloors([]);
      setRoomFloorMap({});
    }

    apiFetch("/rooms", {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((roomsData) => setRooms(roomsData?.rooms || []))
      .catch(() => setRooms([]));

    apiFetch(`/room-reservations/by-date?selected_date=${getTodayDateString()}`, {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((reservationData) =>
        setTodayRoomReservations(reservationData?.reservations || [])
      )
      .catch(() => setTodayRoomReservations([]));

    return () => clearTimeout(timer);
  }, [router]);

  function getProfilePhotoUrl() {
    if (!profile?.profile_photo) return null;
    if (profile.profile_photo.startsWith("http")) return profile.profile_photo;
    return apiUrl(profile.profile_photo);
  }

  function formatTime(date: string) {
    const utcDate = date.endsWith("Z") ? date : `${date}Z`;

    return new Date(utcDate).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });
  }

  function formatRoomTime(value: string) {
    if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);

    return formatTime(value);
  }

  function formatLeaveTime(value: string) {
    return formatLocalTime(value);
  }

  function formatDate(date: string) {
    return formatLocalDate(date);
  }

  function selectFloor(floor: string) {
    setSelectedFloor((current) => (current === floor ? "" : floor));
    setSelectedRoomId(null);
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
            <DashboardCard title="Günün Menüsü" icon="🍽" className="order-1">
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

            <DashboardCard title="Yaklaşan Etkinlikler" icon="📌" className="order-3">
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
                          {formatLocalDateShort(event.start_time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>

            <DashboardCard title="Bugün İzinli Olanlar" icon="📝" className="order-4">
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
                        {formatLeaveTime(leave.start_time)} -{" "}
                        {formatLeaveTime(leave.end_time)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard title="Mekan Kullanımı" icon="🏢" className="order-2">
              <div className="space-y-4">
                {floorOptions.length === 0 ? (
                  <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
                    Henüz kat veya mekan eklenmemiş.
                  </div>
                ) : (
                  <div
                    role="tablist"
                    aria-label="Kat seçimi"
                    className="scrollbar-hidden -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
                  >
                    {floorOptions.map((floor) => {
                      const active = selectedFloor === floor;

                      return (
                        <button
                          key={floor}
                          type="button"
                          role="tab"
                          onClick={() => selectFloor(floor)}
                          aria-selected={active}
                          className={`shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-bold transition ${
                            active
                              ? "border-sky-500 bg-white text-sky-700 shadow-sm"
                              : "border-[#E6EEF9] bg-[#F8FBFF] text-slate-600 hover:bg-white"
                          }`}
                        >
                          {floor}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedFloor && (
                  <div className="rounded-2xl border border-[#E6EEF9] bg-white p-3">
                    <h3 className="mb-3 text-sm font-bold text-slate-800 md:text-base">
                      {selectedFloor}
                    </h3>

                    {selectedFloorRooms.length === 0 ? (
                      <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400">
                        Bu katta mekan yok.
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.95fr)]">
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-2">
                          {selectedFloorRooms.map((room) => {
                            const roomReservations = reservationsByRoom[room.id] || [];
                            const roomStatus = getRoomUsageStatus(roomReservations);
                            const active = selectedRoomId === room.id;

                            return (
                              <button
                                key={room.id}
                                type="button"
                                onClick={() =>
                                  setSelectedRoomId((current) =>
                                    current === room.id ? null : room.id
                                  )
                                }
                                aria-pressed={active}
                                className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                                  getRoomUsageClasses(roomStatus)
                                } ${active ? "ring-2 ring-sky-300" : ""}`}
                              >
                                <span className="line-clamp-2 text-sm font-bold">
                                  {room.name}
                                </span>

                                <span className="mt-2 block text-xs font-semibold">
                                  {getRoomUsageLabel(roomStatus)}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="min-h-36 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3">
                          {selectedRoom ? (
                            <>
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-bold text-slate-800 md:text-base">
                                    {selectedRoom.name}
                                  </h3>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Bugünkü kullanım bilgisi
                                  </p>
                                </div>

                                <span
                                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                    getUsageBadgeClasses(selectedRoomUsageStatus)
                                  }`}
                                >
                                  {getRoomUsageLabel(selectedRoomUsageStatus)}
                                </span>
                              </div>

                              {selectedRoomReservations.length === 0 ? (
                                <div className="rounded-2xl bg-white p-4 text-sm text-slate-400">
                                  Bu mekan bugün kullanılmıyor.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {selectedRoomReservations.map((reservation) => {
                                    const reservationStatus =
                                      getReservationTimeStatus(reservation);

                                    return (
                                      <article
                                        key={reservation.reservation_id}
                                        className={`rounded-2xl border p-3 ${getReservationCardClasses(
                                          reservationStatus
                                        )}`}
                                      >
                                        <div className="mb-2 flex items-start justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">
                                              {reservation.title}
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-400">
                                              {formatDate(reservation.start_date)} -{" "}
                                              {formatDate(reservation.end_date)}
                                            </p>
                                          </div>

                                          <span
                                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUsageBadgeClasses(
                                              reservationStatus
                                            )}`}
                                          >
                                            {formatRoomTime(reservation.start_time)} -{" "}
                                            {formatRoomTime(reservation.end_time)}
                                          </span>
                                        </div>

                                        {reservation.created_by_name && (
                                          <p className="mb-2 text-xs font-semibold text-slate-400">
                                            Oluşturan: {reservation.created_by_name}
                                          </p>
                                        )}

                                        {reservation.description && (
                                          <p className="rounded-2xl bg-white/70 p-3 text-sm leading-6 text-slate-500">
                                            {reservation.description}
                                          </p>
                                        )}
                                      </article>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex h-full min-h-32 items-center justify-center rounded-2xl bg-white p-4 text-center text-sm text-slate-400">
                              Kullanım bilgisini görmek için bir mekan seçin.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
  className = "",
  children,
}: {
  title: string;
  icon: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5 ${className}`}
    >
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
