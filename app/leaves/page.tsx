"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch } from "@/lib/api";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";
import { markLeaveNotificationsRead } from "@/lib/notifications";

type LeaveItem = {
  id: number;
  user_id?: number;
  user_name?: string;
  start_time: string;
  end_time: string;
  reason: string;
  status: string;
};

export default function LeavesPage() {
  const router = useRouter();

  const [myLeaves, setMyLeaves] = useState<LeaveItem[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  async function fetchLeaves() {
    try {
      const myResponse = await apiFetch("/my-leaves", {
        headers: authHeaders(),
      });

      const myData = await myResponse.json();
      setMyLeaves(myData.leaves || []);

      const teamResponse = await apiFetch("/team-leaves", {
        headers: authHeaders(),
      });

      if (teamResponse.ok) {
        const teamData = await teamResponse.json();
        setTeamLeaves(teamData.leaves || []);
      }
    } catch {
      setMyLeaves([]);
      setTeamLeaves([]);
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

  markLeaveNotificationsRead();

  fetchLeaves();
}, [router]);

  async function handleCreateLeave(e: React.FormEvent) {
    e.preventDefault();

    const response = await apiFetch("/leave-requests", {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        start_time: startTime,
        end_time: endTime,
        reason,
      }),
    });

    if (!response.ok) {
      alert("İzin oluşturulamadı");
      return;
    }

    setStartTime("");
    setEndTime("");
    setReason("");
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
            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
              <form onSubmit={handleCreateLeave} className="space-y-4">
                <SectionTitle
                  icon="📝"
                  title="Yeni İzin Talebi"
                  description="Başlangıç, bitiş ve izin açıklamasını girin."
                />

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DateInput
                    label="Başlangıç"
                    value={startTime}
                    setValue={setStartTime}
                    required
                  />

                  <DateInput
                    label="Bitiş"
                    value={endTime}
                    setValue={setEndTime}
                    required
                  />

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
                </div>

                <button
                  type="submit"
                  className="h-11 w-full rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 md:w-auto"
                >
                  İzin Talebi Oluştur
                </button>
              </form>
            </section>

            {teamLeaves.length > 0 && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionTitle
                    icon="👥"
                    title="İzin Yönetimi"
                    description="Personel izin taleplerini yönetin."
                  />

                  <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                    {teamLeaves.length} talep
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {teamLeaves.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      statusLabel={statusLabel}
                      statusClass={statusClass}
                      formatDate={formatDate}
                      admin
                      onApprove={() => updateLeaveStatus(leave.id, "approve")}
                      onReject={() => updateLeaveStatus(leave.id, "reject")}
                      onDelete={() => deleteLeave(leave.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
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
                      formatDate={formatDate}
                    />
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

function LeaveCard({
  leave,
  statusLabel,
  statusClass,
  formatDate,
  admin = false,
  onApprove,
  onReject,
  onDelete,
}: {
  leave: LeaveItem;
  statusLabel: (status: string) => string;
  statusClass: (status: string) => string;
  formatDate: (date: string) => string;
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
            {admin ? leave.user_name || "Personel" : "İzin Talebi"}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
            {formatDate(leave.start_time)} → {formatDate(leave.end_time)}
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

      <p className="rounded-2xl bg-white p-3 text-sm leading-6 text-slate-600">
        {leave.reason}
      </p>

      {admin && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {leave.status === "pending" && (
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

          <button
            onClick={onDelete}
            className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Sil
          </button>
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
