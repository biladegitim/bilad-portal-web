"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch } from "@/lib/api";
import { fetchProfileAccess } from "@/lib/access";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";
import { formatLocalDate, formatLocalDateTime } from "@/lib/dateTime";
import { markLeaveNotificationsRead } from "@/lib/notifications";

type LeaveItem = {
  id: number;
  user_id?: number;
  user_name?: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  leave_type: string;
  day_count: number;
  status: string;
};

type AnnualLeaveBalance = {
  user_id: number;
  full_name: string;
  year: number;
  total_days: number;
  used_days: number;
  automatic_used_days?: number;
  manual_adjustment_days?: number;
  pending_days: number;
  remaining_days: number;
  available_days: number;
};

type WeeklyLeaveBalance = {
  year: number;
  month: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  available_days: number;
};

type LeavePanel = "annual" | "team" | "archive" | "mine";

const leaveTypeOptions = [
  { value: "annual", label: "Yıllık izin", description: "Yıllık hakkınızdan düşer" },
  { value: "weekly", label: "Haftalık izin", description: "Otomatik onaylanır" },
  { value: "report", label: "Rapor", description: "Otomatik onaylanır" },
  { value: "excuse", label: "Mazeret", description: "Onaya gönderilir" },
];

function getLeaveTypeLabel(leaveType: string) {
  if (leaveType === "annual") return "Yıllık izin";
  if (leaveType === "weekly") return "Haftalık izin";
  if (leaveType === "report") return "Rapor";
  if (leaveType === "excuse" || leaveType === "standard") return "Mazeret izni";

  return "İzin";
}

function shouldShowLeaveTime(leaveType: string) {
  return leaveType === "excuse" || leaveType === "standard";
}

function formatLeaveCardDate(leave: LeaveItem, value: string) {
  return shouldShowLeaveTime(leave.leave_type)
    ? formatLocalDateTime(value)
    : formatLocalDate(value);
}

function calculateLeaveDays(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.max(Math.floor((endDay.getTime() - startDay.getTime()) / dayMs) + 1, 1);
}

function isWeeklyBalanceMonth(dateValue: string, balance: WeeklyLeaveBalance | null) {
  if (!dateValue || !balance) return false;

  const selectedDate = new Date(dateValue);

  if (Number.isNaN(selectedDate.getTime())) return false;

  return (
    selectedDate.getFullYear() === balance.year &&
    selectedDate.getMonth() + 1 === balance.month
  );
}

function isArchivedLeave(leave: LeaveItem) {
  if (leave.status !== "approved") return false;

  const end = new Date(leave.end_time);
  const today = new Date();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return endDay < todayDay;
}

export default function LeavesPage() {
  const router = useRouter();

  const [myLeaves, setMyLeaves] = useState<LeaveItem[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveItem[]>([]);
  const [annualLeaveBalances, setAnnualLeaveBalances] = useState<AnnualLeaveBalance[]>([]);
  const [myAnnualLeaveBalance, setMyAnnualLeaveBalance] = useState<AnnualLeaveBalance | null>(null);
  const [myWeeklyLeaveBalance, setMyWeeklyLeaveBalance] = useState<WeeklyLeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canViewTeamLeaves, setCanViewTeamLeaves] = useState(false);
  const [canViewAnnualLeaveBalances, setCanViewAnnualLeaveBalances] = useState(false);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [activePanel, setActivePanel] = useState<LeavePanel | null>(null);
  const [annualUsedDrafts, setAnnualUsedDrafts] = useState<Record<number, string>>({});
  const isExcuseLeave = leaveType === "excuse";
  const activeTeamLeaves = teamLeaves.filter((leave) => !isArchivedLeave(leave));
  const archivedTeamLeaves = teamLeaves.filter(isArchivedLeave);

  const fetchLeaves = useCallback(async () => {
    try {
      const myResponse = await apiFetch("/my-leaves", {
        headers: authHeaders(),
      });

      const myData = await myResponse.json();
      setMyLeaves(myData.leaves || []);
      setMyAnnualLeaveBalance(
        myData.annual_leave_balance
          ? {
              user_id: 0,
              full_name: "Ben",
              ...myData.annual_leave_balance,
            }
          : null
      );
      setMyWeeklyLeaveBalance(myData.weekly_leave_balance || null);

      const teamResponse = await apiFetch("/team-leaves", {
        headers: authHeaders(),
      });

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        setTeamLeaves(teamData.leaves || []);
        setCanViewTeamLeaves(true);
      } else {
        setTeamLeaves([]);
        setCanViewTeamLeaves(false);
      }

      const balanceResponse = await apiFetch("/annual-leave-balances", {
        headers: authHeaders(),
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        const balances = balanceData.balances || [];
        setAnnualLeaveBalances(balances);
        setAnnualUsedDrafts(
          Object.fromEntries(
            balances.map((balance: AnnualLeaveBalance) => [
              balance.user_id,
              String(balance.used_days ?? 0),
            ])
          )
        );
        setCanViewAnnualLeaveBalances(true);
      } else {
        setAnnualLeaveBalances([]);
        setCanViewAnnualLeaveBalances(false);
      }
    } catch {
      setMyLeaves([]);
      setTeamLeaves([]);
      setAnnualLeaveBalances([]);
      setMyAnnualLeaveBalance(null);
      setMyWeeklyLeaveBalance(null);
      setCanViewTeamLeaves(false);
      setCanViewAnnualLeaveBalances(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  const token = getAccessToken();

  if (!token) {
    router.push("/login");
    return;
  }

  markLeaveNotificationsRead();

  fetchProfileAccess().then((access) => {
    setIsSuperAdmin(access?.role === "super_admin" || access?.is_super_admin === true);
  });

  fetchLeaves();

  const refreshTimer = window.setInterval(fetchLeaves, 30000);

  function handleFocus() {
    fetchLeaves();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      fetchLeaves();
    }
  }

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.clearInterval(refreshTimer);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [fetchLeaves, router]);

  useEffect(() => {
    if (activePanel === "annual" && !canViewAnnualLeaveBalances) {
      setActivePanel(null);
    }

    if (
      (activePanel === "team" || activePanel === "archive") &&
      !canViewTeamLeaves
    ) {
      setActivePanel(null);
    }
  }, [activePanel, canViewAnnualLeaveBalances, canViewTeamLeaves]);

  async function handleCreateLeave(e: React.FormEvent) {
    e.preventDefault();

    if (!leaveType) {
      alert("Lütfen izin türü seçin");
      return;
    }

    const myBalance = myAnnualLeaveBalance;
    const requestStartTime = isExcuseLeave ? startTime : `${startTime}T00:00`;
    const requestEndTime = isExcuseLeave ? endTime : `${endTime}T23:59`;

    if (
      leaveType === "weekly" &&
      myWeeklyLeaveBalance &&
      isWeeklyBalanceMonth(requestStartTime, myWeeklyLeaveBalance)
    ) {
      const start = new Date(requestStartTime);
      const end = new Date(requestEndTime);

      if (
        start.getFullYear() !== end.getFullYear() ||
        start.getMonth() !== end.getMonth()
      ) {
        alert("Haftalık izin talebi tek takvim ayı içinde olmalıdır");
        return;
      }

      const requestedDays = calculateLeaveDays(requestStartTime, requestEndTime);

      if (requestedDays > myWeeklyLeaveBalance.available_days) {
        alert(
          myWeeklyLeaveBalance.available_days <= 0
            ? "Bu ay haftalık izin hakkınız doldu"
            : `Bu ay haftalık izin hakkınız ${myWeeklyLeaveBalance.available_days} gün kaldı`
        );
        return;
      }
    }

    if (leaveType === "annual" && myBalance) {
      const start = new Date(requestStartTime);
      const end = new Date(requestEndTime);

      if (start.getFullYear() !== end.getFullYear()) {
        alert("Yıllık izin talebi tek takvim yılı içinde olmalıdır");
        return;
      }

      const requestedDays = calculateLeaveDays(requestStartTime, requestEndTime);

      if (requestedDays > myBalance.available_days) {
        alert(
          myBalance.available_days <= 0
            ? "Yıllık izin hakkınız kalmadı"
            : `Yıllık izin hakkınız ${myBalance.available_days} gün kaldı`
        );
        return;
      }
    }

    const response = await apiFetch("/leave-requests", {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        start_time: requestStartTime,
        end_time: requestEndTime,
        reason: isExcuseLeave ? reason : null,
        leave_type: leaveType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      alert(errorData?.detail || "İzin oluşturulamadı");
      return;
    }

    setStartTime("");
    setEndTime("");
    setReason("");
    setLeaveType("");
    fetchLeaves();
  }

  async function updateLeaveStatus(
    leaveId: number,
    action: "approve" | "reject"
  ) {
    const response = await apiFetch(
      `/leave-requests/${leaveId}/${action}`,
      {
        method: "PATCH",
        headers: authHeaders(),
      }
    );

    if (!response.ok) {
      alert("İşlem yapılamadı");
      return;
    }

    fetchLeaves();
  }

  async function deleteLeave(leaveId: number) {
    if (!confirm("Bu izin talebi silinsin mi?")) return;

    const response = await apiFetch(`/leave-requests/${leaveId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("İzin talebi silinemedi");
      return;
    }

    fetchLeaves();
  }

  async function updateAnnualUsedDays(balance: AnnualLeaveBalance) {
    const usedDays = Number(annualUsedDrafts[balance.user_id] ?? balance.used_days);

    if (!Number.isInteger(usedDays) || usedDays < 0) {
      alert("Kullanılan gün sıfır veya pozitif tam sayı olmalıdır.");
      return;
    }

    const response = await apiFetch(
      `/annual-leave-balances/${balance.user_id}/used-days`,
      {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          year: balance.year,
          used_days: usedDays,
        }),
      }
    );

    if (!response.ok) {
      alert("Kullanılan gün güncellenemedi.");
      return;
    }

    fetchLeaves();
  }

  function statusLabel(status: string) {
    if (status === "approved") return "Onaylandı";
    if (status === "rejected") return "Reddedildi";
    return "Bekliyor";
  }

  function statusClass(status: string) {
    if (status === "approved") return "bg-emerald-50 text-emerald-700";
    if (status === "rejected") return "bg-red-50 text-red-700";
    return "bg-amber-50 text-amber-700";
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
                İzinler
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                İzin taleplerinizi oluşturun, takip edin ve yönetin.
              </p>
            </div>
          </header>

          <div className="space-y-4 md:space-y-5">
            {activePanel === null && (
              <>
                <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                  <form onSubmit={handleCreateLeave} className="space-y-4">
                    <SectionTitle
                      icon="📝"
                      title="Yeni İzin Talebi"
                      description={
                        isExcuseLeave
                          ? "Mazeret için saat aralığı ve açıklama girin."
                          : "Tarih aralığını seçin; bu izin türü otomatik onaylanır."
                      }
                    />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DateInput
                    label={isExcuseLeave ? "Başlangıç" : "Başlangıç Tarihi"}
                    value={startTime}
                    setValue={setStartTime}
                    type={isExcuseLeave ? "datetime-local" : "date"}
                    required
                  />

                  <DateInput
                    label={isExcuseLeave ? "Bitiş" : "Bitiş Tarihi"}
                    value={endTime}
                    setValue={setEndTime}
                    type={isExcuseLeave ? "datetime-local" : "date"}
                    required
                  />

                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                      {leaveTypeOptions.map((option) => {
                        const active = leaveType === option.value;
                        const weeklyLimitReached =
                          option.value === "weekly" &&
                          isWeeklyBalanceMonth(startTime, myWeeklyLeaveBalance) &&
                          (myWeeklyLeaveBalance?.available_days ?? 1) <= 0;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={weeklyLimitReached}
                            onClick={() => {
                              setLeaveType((current) =>
                                current === option.value ? "" : option.value
                              );
                              setStartTime("");
                              setEndTime("");
                            }}
                            className={`flex items-center gap-2.5 text-left text-sm font-semibold transition md:text-base ${
                              active ? "text-sky-700" : "text-slate-700"
                            } ${weeklyLimitReached ? "cursor-not-allowed text-slate-300" : "hover:text-sky-700"}`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-black ${
                                active
                                  ? "border-slate-400 bg-white text-black"
                                  : weeklyLimitReached
                                    ? "border-slate-200 bg-slate-50"
                                    : "border-slate-300 bg-white"
                              }`}
                            >
                              {active ? "✓" : ""}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {myAnnualLeaveBalance && (
                      <p className="mt-2 text-xs text-slate-500 md:text-sm">
                        {myAnnualLeaveBalance.year} yılı kalan yıllık izin hakkınız:{" "}
                        <span className="font-semibold text-sky-700">
                          {myAnnualLeaveBalance.remaining_days} gün
                        </span>
                        {myAnnualLeaveBalance.pending_days > 0 &&
                          ` (${myAnnualLeaveBalance.available_days} gün kullanılabilir, ${myAnnualLeaveBalance.pending_days} gün onay bekliyor)`}
                      </p>
                    )}
                    {myWeeklyLeaveBalance && (
                      <p className="mt-1 text-xs text-slate-500 md:text-sm">
                        Bu ay kalan haftalık izin hakkınız:{" "}
                        <span className="font-semibold text-sky-700">
                          {myWeeklyLeaveBalance.available_days} gün
                        </span>
                      </p>
                    )}
                  </div>

                  {isExcuseLeave && (
                    <div className="lg:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Açıklama
                      </label>

                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="h-24 w-full resize-none rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        placeholder="İzin sebebi..."
                        required
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 md:w-auto"
                >
                  İzin Talebi Oluştur
                </button>
              </form>
            </section>

                <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  {canViewAnnualLeaveBalances && (
                    <PanelButton
                      label="Yıllık İzin Yönetimi"
                      count={annualLeaveBalances.length}
                      active={activePanel === "annual"}
                      disabled={annualLeaveBalances.length === 0}
                      onClick={() =>
                        setActivePanel((current) =>
                          current === "annual" ? null : "annual"
                        )
                      }
                    />
                  )}

                  {canViewTeamLeaves && (
                    <PanelButton
                      label="İzin Yönetimi"
                      count={activeTeamLeaves.length}
                      active={activePanel === "team"}
                      disabled={activeTeamLeaves.length === 0}
                      onClick={() =>
                        setActivePanel((current) =>
                          current === "team" ? null : "team"
                        )
                      }
                    />
                  )}

                  {canViewTeamLeaves && (
                    <PanelButton
                      label="Arşiv"
                      count={archivedTeamLeaves.length}
                      active={activePanel === "archive"}
                      disabled={archivedTeamLeaves.length === 0}
                      onClick={() =>
                        setActivePanel((current) =>
                          current === "archive" ? null : "archive"
                        )
                      }
                    />
                  )}

                  <PanelButton
                    label="Benim İzinlerim"
                    count={myLeaves.length}
                    active={activePanel === "mine"}
                    onClick={() =>
                      setActivePanel((current) =>
                        current === "mine" ? null : "mine"
                      )
                    }
                  />
                </section>
              </>
            )}

            {activePanel === "annual" && canViewAnnualLeaveBalances && annualLeaveBalances.length > 0 && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="h-10 rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionTitle
                    icon="📆"
                    title="Yıllık İzin Yönetimi"
                    description="Yıllık hak her takvim yılında yeniden uygulanır."
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {annualLeaveBalances.map((balance) => (
                    <div
                      key={balance.user_id}
                      className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4"
                    >
                      <p className="truncate text-sm font-semibold text-slate-800 md:text-base">
                        {balance.full_name}
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 md:text-sm">
                        <span>Toplam: {balance.total_days} gün</span>
                        <span>Kalan: {balance.remaining_days} gün</span>
                        <span>Bekleyen: {balance.pending_days} gün</span>
                        <span className="font-semibold text-sky-700">
                          Kullanılabilir: {balance.available_days} gün
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white p-3">
                        <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                          Kullanılan gün
                        </label>

                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={0}
                            value={annualUsedDrafts[balance.user_id] ?? ""}
                            onChange={(event) =>
                              setAnnualUsedDrafts((current) => ({
                                ...current,
                                [balance.user_id]: event.target.value,
                              }))
                            }
                            className="h-10 min-w-0 flex-1 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                          />

                          <button
                            type="button"
                            onClick={() => updateAnnualUsedDays(balance)}
                            className="h-10 rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activePanel === "team" && canViewTeamLeaves && activeTeamLeaves.length > 0 && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="h-10 rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionTitle
                    icon="👥"
                    title="İzin Yönetimi"
                    description="Personel izin taleplerini yönetin."
                  />

                  <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                    {activeTeamLeaves.length} talep
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {activeTeamLeaves.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      statusLabel={statusLabel}
                      statusClass={statusClass}
                      admin
                      onApprove={() => updateLeaveStatus(leave.id, "approve")}
                      onReject={() => updateLeaveStatus(leave.id, "reject")}
                      onDelete={() => deleteLeave(leave.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {activePanel === "archive" && canViewTeamLeaves && archivedTeamLeaves.length > 0 && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="h-10 rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionTitle
                    icon="🗄️"
                    title="Arşiv"
                    description="Tarihi geçmiş onaylanmış izinler."
                  />

                  <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                    {archivedTeamLeaves.length} izin
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {archivedTeamLeaves.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      statusLabel={statusLabel}
                      statusClass={statusClass}
                      admin
                      onDelete={() => deleteLeave(leave.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {activePanel === "mine" && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActivePanel(null)}
                    className="h-10 rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Kapat
                  </button>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionTitle
                    icon="📋"
                    title="Benim İzinlerim"
                    description="Oluşturduğunuz izin talepleri."
                  />

                <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                  {loading ? "..." : `${myLeaves.length} kayıt`}
                </span>
              </div>

              {loading ? (
                <InfoBox>İzinler yükleniyor...</InfoBox>
              ) : myLeaves.length === 0 ? (
                <EmptyBox />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {myLeaves.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      statusLabel={statusLabel}
                      statusClass={statusClass}
                      admin={isSuperAdmin}
                      onApprove={isSuperAdmin ? () => updateLeaveStatus(leave.id, "approve") : undefined}
                      onReject={isSuperAdmin ? () => updateLeaveStatus(leave.id, "reject") : undefined}
                      onDelete={() => deleteLeave(leave.id)}
                    />
                  ))}
                </div>
              )}
              </section>
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
        <h2 className="text-lg font-bold text-slate-800 md:text-xl">
          {title}
        </h2>

        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function PanelButton({
  label,
  count,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-[#E6EEF9] bg-white text-slate-700 hover:bg-[#F8FBFF]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className="block text-sm font-bold md:text-base">{label}</span>
      <span className="mt-1 block text-xs font-semibold text-slate-400">
        {count} kayıt
      </span>
    </button>
  );
}

function LeaveCard({
  leave,
  statusLabel,
  statusClass,
  admin = false,
  onApprove,
  onReject,
  onDelete,
}: {
  leave: LeaveItem;
  statusLabel: (status: string) => string;
  statusClass: (status: string) => string;
  admin?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 transition hover:bg-white hover:shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-800 md:text-base">
            {admin ? leave.user_name || "İzin Talebi" : "İzin Talebi"}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
            {formatLeaveCardDate(leave, leave.start_time)} →{" "}
            {formatLeaveCardDate(leave, leave.end_time)}
          </p>
          <p className="mt-1 text-xs font-semibold text-sky-600 md:text-sm">
            {getLeaveTypeLabel(leave.leave_type)}
            {leave.day_count ? ` - ${leave.day_count} gün` : ""}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
            leave.status
          )}`}
        >
          {statusLabel(leave.status)}
        </span>
      </div>

      {leave.reason && (
        <p className="rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600">
          {leave.reason}
        </p>
      )}

      {(admin || onDelete) && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {admin && leave.status === "pending" && (
            <>
              <button
                onClick={onApprove}
                className="h-10 rounded-2xl bg-emerald-500 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Onayla
              </button>

              <button
                onClick={onReject}
                className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Reddet
              </button>
            </>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              Sil
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#F8FBFF] p-4 text-sm text-slate-400 md:text-base">
      {children}
    </div>
  );
}

function EmptyBox() {
  return (
    <div className="rounded-2xl bg-[#F8FBFF] p-6 text-center md:p-8">
      <div className="mb-2 text-2xl">📝</div>

      <h3 className="text-lg font-bold text-slate-800 md:text-xl">
        Henüz izin talebi yok
      </h3>

      <p className="mt-1 text-sm text-slate-400 md:text-base">
        Oluşturduğunuz izin talepleri burada görünecek.
      </p>
    </div>
  );
}

function DateInput({
  label,
  value,
  setValue,
  type = "datetime-local",
  required = false,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  type?: "date" | "datetime-local";
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}
