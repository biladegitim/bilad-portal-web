"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch } from "@/lib/api";
import { canApproveRooms, canManageRooms, fetchProfileAccess } from "@/lib/access";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";
import { sortFloors } from "@/lib/floors";

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
  created_by?: number;
  created_by_name?: string;
  status?: string;
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

const FLOOR_STORAGE_KEY = "bilad-room-floors";
const ROOM_FLOOR_STORAGE_KEY = "bilad-room-floor-map";
const unassignedFloor = "Kat seçilmemiş";

function getRoomFloor(room: Room, roomFloorMap: Record<number, string>) {
  return room.floor_name || room.floor || roomFloorMap[room.id] || unassignedFloor;
}

function normalizeWeeklySchedule(
  schedule: Record<string, Reservation[]>
): Record<string, Reservation[]> {
  const normalized = Object.fromEntries(
    dayNames.map((day) => [day, [] as Reservation[]])
  );
  const reservations = Object.values(schedule).flat();

  for (const reservation of reservations) {
    const dayName = dayNames[reservation.weekday];

    if (dayName) {
      normalized[dayName].push(reservation);
    }
  }

  return normalized;
}

export default function RoomsPage() {
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, Reservation[]>>({});
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canReviewRoomRequests, setCanReviewRoomRequests] = useState(false);
  const [openPanel, setOpenPanel] = useState<"rooms" | "request" | "pending" | null>(null);

  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomFloor, setRoomFloor] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [floors, setFloors] = useState<string[]>([]);
  const [floorName, setFloorName] = useState("");
  const [roomFloorMap, setRoomFloorMap] = useState<Record<number, string>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(["0"]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(dayNames[0]);
  const [selectedScheduleFloor, setSelectedScheduleFloor] = useState("");
  const [selectedScheduleRoomId, setSelectedScheduleRoomId] = useState<number | null>(null);

  useEffect(() => {
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
  }, []);

  const floorOptions = useMemo(() => {
    const names = new Set(floors);

    rooms.forEach((room) => {
      const floor = getRoomFloor(room, roomFloorMap);
      names.add(floor);
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

  const hasAssignableFloors = floorOptions.some(
    (floor) => floor !== unassignedFloor
  );
  const selectedDayReservations = weeklySchedule[selectedScheduleDay] || [];
  const selectedFloorRooms = selectedScheduleFloor
    ? roomsByFloor[selectedScheduleFloor] || []
    : [];
  const selectedScheduleRoom = rooms.find(
    (room) => room.id === selectedScheduleRoomId
  );
  const selectedRoomReservations = selectedDayReservations.filter(
    (reservation) => reservation.room_id === selectedScheduleRoomId
  );

  async function fetchData() {
    try {
      const access = await fetchProfileAccess();
      const canManage = canManageRooms(access);
      const canReview = canApproveRooms(access);

      setIsSuperAdmin(canManage);
      setCanReviewRoomRequests(canReview);

      const roomsRes = await apiFetch("/rooms");
      const roomsData = await roomsRes.json();
      setRooms(roomsData.rooms || []);

      const weeklyRes = await apiFetch("/room-reservations/weekly");
      const weeklyData = await weeklyRes.json();
      setWeeklySchedule(
        normalizeWeeklySchedule(weeklyData.weekly_schedule || {})
      );

      if (canReview) {
        const pendingRes = await apiFetch("/room-reservations/pending", {
          headers: authHeaders(),
        });

        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingReservations(pendingData.reservations || []);
        } else {
          setPendingReservations([]);
        }
      } else {
        setPendingReservations([]);
      }
    } catch {
      setRooms([]);
      setWeeklySchedule({});
      setPendingReservations([]);
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
    setRoomFloor("");
    setEditingRoomId(null);
  }

  function startEditRoom(room: Room) {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setRoomDescription(room.description || "");
    const floor = getRoomFloor(room, roomFloorMap);
    setRoomFloor(floor === unassignedFloor ? "" : floor);
  }

  function saveFloors(nextFloors: string[]) {
    setFloors(nextFloors);
    localStorage.setItem(FLOOR_STORAGE_KEY, JSON.stringify(nextFloors));
  }

  function saveRoomFloorMap(nextMap: Record<number, string>) {
    setRoomFloorMap(nextMap);
    localStorage.setItem(ROOM_FLOOR_STORAGE_KEY, JSON.stringify(nextMap));
  }

  function handleFloorSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalizedName = floorName.trim();
    if (!normalizedName) return;

    const floorExists = floors.some(
      (floor) =>
        floor.toLocaleLowerCase("tr-TR") ===
        normalizedName.toLocaleLowerCase("tr-TR")
    );

    if (floorExists) {
      alert("Bu kat zaten eklenmiş.");
      return;
    }

    saveFloors([...floors, normalizedName]);
    setFloorName("");
    setRoomFloor(normalizedName);
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
          floor: roomFloor,
        }),
      }
    );

    if (!response.ok) {
      alert("Mekan işlemi başarısız");
      return;
    }

    if (editingRoomId) {
      saveRoomFloorMap({ ...roomFloorMap, [editingRoomId]: roomFloor });
    } else {
      const data = await response.json().catch(() => null);
      const createdRoom = data?.room || data;

      if (createdRoom?.id) {
        saveRoomFloorMap({ ...roomFloorMap, [createdRoom.id]: roomFloor });
      }
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

    const nextMap = { ...roomFloorMap };
    delete nextMap[id];
    saveRoomFloorMap(nextMap);
    fetchData();
  }

  function resetReservationForm() {
    setEditingId(null);
    setRoomId("");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setSelectedWeekdays(["0"]);
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
    setSelectedWeekdays([String(reservation.weekday)]);
    setStartTime(reservation.start_time.slice(0, 5));
    setEndTime(reservation.end_time.slice(0, 5));
    setOpenPanel("request");
  }

  async function handleReservationSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedWeekdays.length === 0) {
      alert("En az bir gün seçmelisiniz.");
      return;
    }

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
          ...(editingId
            ? { weekday: Number(selectedWeekdays[0]) }
            : { weekdays: selectedWeekdays.map(Number) }),
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

    alert(editingId ? "Program güncellendi." : "Program talebi oluşturuldu. Onaylanınca haftalık planda görünecek.");
    resetReservationForm();
    setOpenPanel(null);
    fetchData();
  }

  async function updateRoomRequestStatus(
    reservationId: number,
    action: "approve" | "reject"
  ) {
    const response = await apiFetch(
      `/room-reservations/${reservationId}/${action}`,
      {
        method: "PATCH",
        headers: authHeaders(),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      alert(data.detail || "Talep güncellenemedi");
      return;
    }

    fetchData();
  }

  async function handleDeleteReservation(reservation: Reservation) {
    if (!confirm("Bu program ve seçili tüm günleri silinsin mi?")) return;

    const matchingReservations = Object.values(weeklySchedule)
      .flat()
      .filter(
        (item) =>
          item.room_id === reservation.room_id &&
          item.title === reservation.title &&
          item.description === reservation.description &&
          item.start_date === reservation.start_date &&
          item.end_date === reservation.end_date &&
          item.start_time === reservation.start_time &&
          item.end_time === reservation.end_time
      );

    const responses = await Promise.all(
      matchingReservations.map((item) =>
        apiFetch(`/room-reservations/${item.reservation_id}`, {
          method: "DELETE",
          headers: authHeaders(),
        })
      )
    );

    if (responses.some((response) => !response.ok)) {
      alert("Program silinemedi");
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

  function toggleWeekday(value: string) {
    setSelectedWeekdays((current) => {
      if (editingId) return [value];

      if (current.includes(value)) {
        return current.filter((day) => day !== value);
      }

      return [...current, value].sort((a, b) => Number(a) - Number(b));
    });
  }

  function selectScheduleDay(day: string) {
    setSelectedScheduleDay(day);
    setSelectedScheduleFloor("");
    setSelectedScheduleRoomId(null);
  }

  function selectScheduleFloor(floor: string) {
    setSelectedScheduleFloor(floor);
    setSelectedScheduleRoomId(null);
  }

  return (
    <div className="flex min-h-screen bg-[#F6F9FF]">
      <Sidebar />

      <main className="flex-1 px-4 py-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-5 md:mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Kat Planı
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Mekanları ve haftalık programları yönetin.
              </p>
            </div>
          </header>

          <div className="flex flex-col gap-4 md:gap-5">
            {loading ? (
              <InfoBox>Kat planı yükleniyor...</InfoBox>
            ) : (
              <>
                {isSuperAdmin && openPanel === "rooms" && (
                  <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <SectionTitle
                        icon="🏢"
                        title={editingRoomId ? "Mekan Düzenle" : "Mekan Yönetimi"}
                        description="Kat planında kullanılacak mekanları oluşturun."
                      />

                      <button
                        type="button"
                        onClick={() => {
                          resetRoomForm();
                          setOpenPanel(null);
                        }}
                        className="rounded-2xl border border-[#E6EEF9] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Kapat
                      </button>
                    </div>

                    <form
                      onSubmit={handleFloorSubmit}
                      className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3 md:grid-cols-[1fr_auto]"
                    >
                      <Input
                        value={floorName}
                        setValue={setFloorName}
                        placeholder="Kat adı ekle"
                        required
                      />

                      <button
                        type="submit"
                        className="h-11 rounded-2xl bg-slate-800 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                      >
                        Kat Ekle
                      </button>
                    </form>

                    <form
                      onSubmit={handleRoomSubmit}
                      className="grid grid-cols-1 gap-4 lg:grid-cols-4"
                    >
                      <Select
                        value={roomFloor}
                        setValue={setRoomFloor}
                        required
                        options={[
                          { value: "", label: "Önce kat seç" },
                          ...floorOptions
                            .filter((floor) => floor !== unassignedFloor)
                            .map((floor) => ({
                              value: floor,
                              label: floor,
                            })),
                        ]}
                      />

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
                          disabled={!hasAssignableFloors}
                          className="h-11 rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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

                    <div className="mt-4 space-y-4">
                      {floorOptions.length === 0 ? (
                        <InfoBox>Önce kat ekleyin, ardından mekanları ilgili kata bağlayın.</InfoBox>
                      ) : (
                        floorOptions.map((floor) => (
                          <div
                            key={floor}
                            className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <h3 className="text-sm font-bold text-slate-800 md:text-base">
                                {floor}
                              </h3>

                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                                {(roomsByFloor[floor] || []).length} mekan
                              </span>
                            </div>

                            {(roomsByFloor[floor] || []).length === 0 ? (
                              <div className="rounded-2xl bg-white p-4 text-sm text-slate-400">
                                Bu kata henüz mekan eklenmemiş.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {(roomsByFloor[floor] || []).map((room) => (
                                  <article
                                    key={room.id}
                                    className="rounded-2xl border border-[#E6EEF9] bg-white p-4 transition hover:shadow-sm"
                                  >
                                    <div className="mb-3 flex items-center gap-3">
                                      <span className="text-xl leading-none">🏢</span>

                                      <div className="min-w-0">
                                        <h4 className="truncate text-sm font-semibold text-slate-800 md:text-base">
                                          {room.name}
                                        </h4>

                                        <p className="mt-0.5 text-xs text-slate-400 md:text-sm">
                                          {floor}
                                        </p>
                                      </div>
                                    </div>

                                    <p className="line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-600">
                                      {room.description || "Açıklama yok."}
                                    </p>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                      <button
                                        type="button"
                                        onClick={() => startEditRoom(room)}
                                        className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                      >
                                        Düzenle
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRoom(room.id)}
                                        className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                      >
                                        Sil
                                      </button>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                )}

                {openPanel === "request" && (
                  <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                  <form onSubmit={handleReservationSubmit} className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <SectionTitle
                        icon="📌"
                        title={editingId ? "Program Düzenle" : "Program Talebi Oluştur"}
                        description="Mekan, gün ve saat bilgilerini girin. Talep onaylanınca haftalık plana eklenir."
                      />

                      <button
                        type="button"
                        onClick={() => {
                          resetReservationForm();
                          setOpenPanel(null);
                        }}
                        className="h-10 w-fit rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {editingId ? "Düzenlemeyi İptal Et" : "Kapat"}
                      </button>
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
                            label: `${getRoomFloor(room, roomFloorMap)} / ${room.name}`,
                          })),
                        ]}
                      />

                      <Input
                        value={title}
                        setValue={setTitle}
                        placeholder="Başlık"
                        required
                      />

                      <WeekdayPicker
                        selectedValues={selectedWeekdays}
                        onToggle={toggleWeekday}
                        singleSelect={editingId !== null}
                      />

                      <DateInput
                        type="date"
                        value={startDate}
                        setValue={setStartDate}
                        placeholder="Başlangıç tarihini giriniz"
                        required
                      />

                      <DateInput
                        type="date"
                        value={endDate}
                        setValue={setEndDate}
                        placeholder="Bitiş tarihini giriniz"
                        required
                      />
                      <DateInput
                        type="time"
                        value={startTime}
                        setValue={setStartTime}
                        placeholder="Başlangıç saatini giriniz"
                        required
                      />

                      <DateInput
                        type="time"
                        value={endTime}
                        setValue={setEndTime}
                        placeholder="Bitiş saatini giriniz"
                        required
                      />
                      <Input
                        value={description}
                        setValue={setDescription}
                        placeholder="Açıklama"
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                      >
                        {editingId ? "Güncelle" : "Talep Oluştur"}
                      </button>

                      {editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            resetReservationForm();
                            setOpenPanel(null);
                          }}
                          className="h-11 rounded-2xl border border-[#E6EEF9] bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Vazgeç
                        </button>
                      )}
                    </div>
                  </form>
                  </section>
                )}

                {canReviewRoomRequests && openPanel === "pending" && (
                  <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <SectionTitle
                        icon="✅"
                        title="Bekleyen Program Talepleri"
                        description="Onaylanınca haftalık plana eklenecek mekan programları."
                      />

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                          {pendingReservations.length} talep
                        </span>

                        <button
                          type="button"
                          onClick={() => setOpenPanel(null)}
                          className="rounded-2xl border border-[#E6EEF9] bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>

                    {pendingReservations.length === 0 ? (
                      <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
                        Bekleyen program talebi yok.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {pendingReservations.map((reservation) => (
                          <article
                            key={reservation.reservation_id}
                            className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 transition hover:bg-white hover:shadow-sm"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800 md:text-base">
                                  {reservation.room_name}
                                </p>

                                <p className="mt-0.5 truncate text-sm text-slate-600">
                                  {reservation.title}
                                </p>
                              </div>

                              <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                Bekliyor
                              </span>
                            </div>

                            <div className="rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600">
                              <p>Talep eden: {reservation.created_by_name || "Bilinmiyor"}</p>
                              <p>Gün: {dayNames[reservation.weekday] || "-"}</p>
                              <p>
                                Saat: {reservation.start_time.slice(0, 5)} -{" "}
                                {reservation.end_time.slice(0, 5)}
                              </p>
                              <p>
                                Tarih: {formatDate(reservation.start_date)} →{" "}
                                {formatDate(reservation.end_date)}
                              </p>
                            </div>

                            {reservation.description && (
                              <p className="mt-3 rounded-2xl bg-white p-3 text-sm leading-6 text-slate-500">
                                {reservation.description}
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomRequestStatus(
                                    reservation.reservation_id,
                                    "approve"
                                  )
                                }
                                className="h-10 rounded-2xl bg-emerald-500 text-sm font-semibold text-white transition hover:bg-emerald-600"
                              >
                                Onayla
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateRoomRequestStatus(
                                    reservation.reservation_id,
                                    "reject"
                                  )
                                }
                                className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                              >
                                Reddet
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {openPanel === null && (
                  <>
                  <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <SectionTitle
                        icon="🗓️"
                        title="Haftalık Görünüm"
                        description="Gün, kat ve mekan seçerek program durumunu görün."
                      />

                      <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                        {selectedDayReservations.length} program
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                      {dayNames.map((day) => {
                        const active = selectedScheduleDay === day;

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => selectScheduleDay(day)}
                            aria-pressed={active}
                            className={`flex h-16 items-center justify-center rounded-2xl border px-1 text-center transition md:h-20 md:px-3 ${
                              active
                                ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                                : "border-[#E6EEF9] bg-[#F8FBFF] text-slate-600 hover:bg-sky-50"
                            }`}
                          >
                            <span className="block truncate text-[11px] font-bold md:text-sm">
                              {day.slice(0, 3)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-800 md:text-base">
                          {selectedScheduleDay}
                        </h3>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                          Kat seç
                        </span>
                      </div>

                      {floorOptions.length === 0 ? (
                        <div className="rounded-2xl bg-white p-4 text-sm text-slate-400">
                          Haftalık görünüm için önce Mekan Yönetimi bölümünden kat ekleyin.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {floorOptions.map((floor) => {
                            const floorRoomIds = new Set(
                              (roomsByFloor[floor] || []).map((room) => room.id)
                            );
                            const floorReservationCount = selectedDayReservations.filter(
                              (reservation) => floorRoomIds.has(reservation.room_id)
                            ).length;
                            const active = selectedScheduleFloor === floor;

                            return (
                              <button
                                key={floor}
                                type="button"
                                onClick={() => selectScheduleFloor(floor)}
                                aria-pressed={active}
                                className={`min-h-12 rounded-2xl border px-3 py-2 text-left transition ${
                                  active
                                    ? "border-sky-500 bg-white text-sky-700 shadow-sm"
                                    : "border-[#E6EEF9] bg-white text-slate-600 hover:bg-sky-50"
                                }`}
                              >
                                <span className="block truncate text-sm font-bold">
                                  {floor}
                                </span>

                                <span className="mt-0.5 block text-xs text-slate-400">
                                  {floorReservationCount} kullanım
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedScheduleFloor && (
                      <div className="mt-4 rounded-2xl border border-[#E6EEF9] bg-white p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-slate-800 md:text-base">
                            {selectedScheduleFloor} Mekanları
                          </h3>

                          <span className="rounded-full bg-[#F8FBFF] px-3 py-1 text-xs font-semibold text-slate-500">
                            {selectedFloorRooms.length} mekan
                          </span>
                        </div>

                        {selectedFloorRooms.length === 0 ? (
                          <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400">
                            Bu katta mekan yok.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                            {selectedFloorRooms.map((room) => {
                              const roomReservations = selectedDayReservations.filter(
                                (reservation) => reservation.room_id === room.id
                              );
                              const hasUsage = roomReservations.length > 0;
                              const active = selectedScheduleRoomId === room.id;

                              return (
                                <button
                                  key={room.id}
                                  type="button"
                                  onClick={() => setSelectedScheduleRoomId(room.id)}
                                  aria-pressed={active}
                                  className={`min-h-20 rounded-2xl border p-3 text-left transition ${
                                    hasUsage
                                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                      : "border-[#E6EEF9] bg-[#F8FBFF] text-slate-600 hover:bg-sky-50"
                                  } ${active ? "ring-2 ring-sky-300" : ""}`}
                                >
                                  <span className="line-clamp-2 text-sm font-bold">
                                    {room.name}
                                  </span>

                                  <span className="mt-2 block text-xs font-semibold">
                                    {hasUsage ? `${roomReservations.length} program` : "Boş"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedScheduleRoom && (
                      <div className="mt-4 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-slate-800 md:text-base">
                              {selectedScheduleRoom.name}
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-400">
                              {selectedScheduleDay} program durumu
                            </p>
                          </div>

                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                            selectedRoomReservations.length > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}>
                            {selectedRoomReservations.length > 0 ? "Kullanım var" : "Boş"}
                          </span>
                        </div>

                        {selectedRoomReservations.length === 0 ? (
                          <div className="rounded-2xl bg-white p-4 text-sm text-slate-400">
                            Bu mekan için seçili günde program bulunmuyor.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedRoomReservations.map((reservation) => (
                              <article
                                key={reservation.reservation_id}
                                className="rounded-2xl border border-[#E6EEF9] bg-white p-3"
                              >
                                <div className="mb-2 flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">
                                      {reservation.title}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                      {formatDate(reservation.start_date)} →{" "}
                                      {formatDate(reservation.end_date)}
                                    </p>
                                  </div>

                                  <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                    {reservation.start_time.slice(0, 5)} -{" "}
                                    {reservation.end_time.slice(0, 5)}
                                  </span>
                                </div>

                                {reservation.description && (
                                  <p className="rounded-2xl bg-[#F8FBFF] p-3 text-sm leading-6 text-slate-500">
                                    {reservation.description}
                                  </p>
                                )}

                                {canReviewRoomRequests && (
                                  <div className="mt-3 grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditReservation(reservation)}
                                      className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                    >
                                      Düzenle
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReservation(reservation)}
                                      className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                    >
                                      Sil
                                    </button>
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {isSuperAdmin && (
                      <HeaderActionButton
                        active={openPanel === "rooms"}
                        onClick={() =>
                          setOpenPanel(openPanel === "rooms" ? null : "rooms")
                        }
                      >
                        {openPanel === "rooms" ? "Mekanları Kapat" : "+ Mekan Yönetimi"}
                      </HeaderActionButton>
                    )}

                    <HeaderActionButton
                      active={openPanel === "request"}
                      onClick={() =>
                        setOpenPanel(openPanel === "request" ? null : "request")
                      }
                    >
                      {openPanel === "request" ? "Talebi Kapat" : "+ Program Talebi"}
                    </HeaderActionButton>

                    {canReviewRoomRequests && (
                      <HeaderActionButton
                        active={openPanel === "pending"}
                        onClick={() =>
                          setOpenPanel(openPanel === "pending" ? null : "pending")
                        }
                      >
                        {openPanel === "pending"
                          ? "Talepleri Kapat"
                          : `Bekleyen Talepler (${pendingReservations.length})`}
                      </HeaderActionButton>
                    )}
                  </div>
                  </>
                )}
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

function HeaderActionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-2xl px-4 text-sm font-semibold shadow-sm transition ${
        active
          ? "border border-[#E6EEF9] bg-white text-slate-600 hover:bg-slate-50"
          : "bg-sky-600 text-white hover:bg-sky-700"
      }`}
    >
      {children}
    </button>
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
      className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-left text-sm font-normal text-slate-700 outline-none transition placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
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

function WeekdayPicker({
  selectedValues,
  onToggle,
  singleSelect,
}: {
  selectedValues: string[];
  onToggle: (value: string) => void;
  singleSelect: boolean;
}) {
  return (
    <fieldset className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3 lg:col-span-3">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        Gün seçiniz
      </legend>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {weekdays.map((day) => {
          const value = String(day.value);
          const selected = selectedValues.includes(value);

          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={selected}
              className={`h-10 rounded-2xl border px-3 text-xs font-semibold transition sm:text-sm ${
                selected
                  ? "border-sky-500 bg-sky-600 text-white shadow-sm"
                  : "border-[#E6EEF9] bg-white text-slate-600 hover:bg-sky-50"
              }`}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {singleSelect
          ? "Düzenleme sırasında bir gün seçilebilir."
          : "Birden fazla gün seçebilirsiniz."}
      </p>
    </fieldset>
  );
}

function DateInput({
  type,
  value,
  setValue,
  placeholder,
  required = false,
}: {
  type: "date" | "time";
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="relative block h-11 w-full">
      {!value && (
        <span className="pointer-events-none absolute inset-y-0 left-4 right-10 z-10 flex items-center truncate text-sm font-normal text-slate-400">
          {placeholder}
        </span>
      )}

      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        aria-label={placeholder}
        className={`h-11 w-full appearance-none rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 pr-10 text-left text-sm font-normal outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100 [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-date-and-time-value]:text-left ${
          value ? "text-slate-700" : "text-transparent focus:text-slate-700"
        }`}
      />
    </label>
  );
}
