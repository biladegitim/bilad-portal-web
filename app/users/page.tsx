"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import { apiFetch } from "@/lib/api";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";

type UserItem = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  position: string;
  supervisor_id: number | null;
  is_active: boolean;
  work_start_time: string | null;
  work_end_time: string | null;
};

const permissionOptions = [
  { code: "menu.manage", label: "Menü Yönetimi" },
  { code: "leave.approve", label: "İzin Onaylama" },
  { code: "attendance.view", label: "Giriş-Çıkış Raporları" },
];

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [editRole, setEditRole] = useState("employee");
  const [editPosition, setEditPosition] = useState("");
  const [editSupervisorId, setEditSupervisorId] = useState("");
  const [editWorkStart, setEditWorkStart] = useState("");
  const [editWorkEnd, setEditWorkEnd] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await apiFetch("/users", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        router.push("/");
        return;
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetchUsers();
  }, [fetchUsers, router]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    const response = await apiFetch("/users", {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
      }),
    });

    if (!response.ok) {
      alert("Kullanıcı oluşturulamadı");
      return;
    }

    setFullName("");
    setEmail("");
    setPassword("");
    setShowCreateForm(false);
    fetchUsers();
  }

  async function startEdit(user: UserItem) {
    setEditingUser(user);
    setEditRole(user.role || "employee");
    setEditPosition(user.position || "");
    setEditSupervisorId(user.supervisor_id ? String(user.supervisor_id) : "");
    setEditWorkStart(user.work_start_time ? user.work_start_time.slice(0, 5) : "");
    setEditWorkEnd(user.work_end_time ? user.work_end_time.slice(0, 5) : "");

    const response = await apiFetch(`/users/${user.id}/permissions`, {
      headers: authHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      setSelectedPermissions(data.permissions || []);
    } else {
      setSelectedPermissions([]);
    }
  }

  function resetEdit() {
    setEditingUser(null);
    setSelectedPermissions([]);
  }

  function togglePermission(code: string) {
    setSelectedPermissions((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code]
    );
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!editingUser) return;

    try {
      const roleResponse = await apiFetch(`/users/${editingUser.id}/role`, {
        method: "PATCH",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          role: editRole,
        }),
      });

      const orgResponse = await apiFetch(
        `/users/${editingUser.id}/organization`,
        {
          method: "PATCH",
          headers: jsonAuthHeaders(),
          body: JSON.stringify({
            position: editPosition,
            supervisor_id: editSupervisorId ? Number(editSupervisorId) : null,
          }),
        }
      );

      let workResponseOk = true;

      if (editWorkStart && editWorkEnd) {
        const workResponse = await apiFetch(
          `/users/${editingUser.id}/work-hours`,
          {
            method: "PATCH",
            headers: jsonAuthHeaders(),
            body: JSON.stringify({
              work_start_time: `${editWorkStart}:00`,
              work_end_time: `${editWorkEnd}:00`,
            }),
          }
        );

        workResponseOk = workResponse.ok;
      }

      if (!roleResponse.ok || !orgResponse.ok || !workResponseOk) {
        alert("Kullanıcı güncellenemedi. Backend endpointlerini kontrol edin.");
        return;
      }

      for (const option of permissionOptions) {
        const hasPermission = selectedPermissions.includes(option.code);

        if (hasPermission) {
          await apiFetch(`/users/${editingUser.id}/permissions`, {
            method: "POST",
            headers: jsonAuthHeaders(),
            body: JSON.stringify({
              permission_code: option.code,
            }),
          });
        } else {
          await apiFetch(
            `/users/${editingUser.id}/permissions/${option.code}`,
            {
              method: "DELETE",
              headers: authHeaders(),
            }
          );
        }
      }

      alert("Kullanıcı güncellendi.");
      resetEdit();
      fetchUsers();
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      alert("Sunucuya bağlanılamadı.");
    }
  }
  async function handleDeleteUser(user: UserItem) {
    if (!confirm(`${user.full_name} silinsin mi?`)) return;

    const response = await apiFetch(`/users/${user.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("Kullanıcı silinemedi");
      return;
    }

    fetchUsers();
  }

  function roleLabel(role: string) {
    if (role === "super_admin") return "Süper Admin";
    if (role === "admin") return "Admin";
    return "Çalışan";
  }

  function roleClass(role: string) {
    if (role === "super_admin") return "bg-sky-50 text-sky-700";
    if (role === "admin") return "bg-indigo-50 text-indigo-700";
    return "bg-slate-100 text-slate-700";
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F6F9FF]">
        <Sidebar />
        <main className="flex-1 px-4 py-4 md:p-8">
          <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 text-sm text-slate-400 shadow-sm">
            Kullanıcılar yükleniyor...
          </section>
        </main>
      </div>
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

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  resetEdit();
                }}
                className="ml-auto h-11 rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                {showCreateForm ? "Formu Kapat" : "+ Kullanıcı Ekle"}
              </button>
            </div>

            <div className="mt-5 md:mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Kullanıcı Yönetimi
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Personel, roller, mesai saatleri ve yetkileri yönetin.
              </p>
            </div>
          </header>

          <div className="space-y-4 md:space-y-5">
            {showCreateForm && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <SectionTitle
                    icon="👥"
                    title="Yeni Kullanıcı"
                    description="Portala yeni personel hesabı ekleyin."
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Input
                      placeholder="Ad Soyad"
                      value={fullName}
                      setValue={setFullName}
                      required
                    />

                    <Input
                      placeholder="Mail"
                      type="email"
                      value={email}
                      setValue={setEmail}
                      required
                    />

                    <Input
                      placeholder="Şifre"
                      type="password"
                      value={password}
                      setValue={setPassword}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                  >
                    Kaydet
                  </button>
                </form>
              </section>
            )}

            {editingUser && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <SectionTitle
                      icon="📝"
                      title="Kullanıcı Düzenle"
                      description={editingUser.full_name}
                    />

                    <button
                      type="button"
                      onClick={resetEdit}
                      className="h-10 w-fit rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Düzenlemeyi İptal Et
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Select
                      label="Rol"
                      value={editRole}
                      setValue={setEditRole}
                      options={[
                        { value: "employee", label: "Çalışan" },
                        { value: "admin", label: "Admin" },
                        { value: "super_admin", label: "Süper Admin" },
                      ]}
                    />

                    <LabeledInput
                      label="Kurumdaki Konum"
                      placeholder="Aşçı / Koordinatör"
                      value={editPosition}
                      setValue={setEditPosition}
                    />

                    <Select
                      label="Bağlı Olduğu Kişi"
                      value={editSupervisorId}
                      setValue={setEditSupervisorId}
                      options={[
                        { value: "", label: "Yok" },
                        ...users
                          .filter((user) => user.id !== editingUser.id)
                          .map((user) => ({
                            value: String(user.id),
                            label: user.full_name,
                          })),
                      ]}
                    />

                    <LabeledInput
                      label="Mesai Başlangıç"
                      type="time"
                      value={editWorkStart}
                      setValue={setEditWorkStart}
                    />

                    <LabeledInput
                      label="Mesai Bitiş"
                      type="time"
                      value={editWorkEnd}
                      setValue={setEditWorkEnd}
                    />

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Yetkiler
                      </label>

                      <div className="space-y-2 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-3">
                        {permissionOptions.map((permission) => (
                          <label
                            key={permission.code}
                            className="flex items-center gap-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(
                                permission.code
                              )}
                              onChange={() =>
                                togglePermission(permission.code)
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />

                            {permission.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    >
                      Güncelle
                    </button>

                    <button
                      type="button"
                      onClick={resetEdit}
                      className="h-11 rounded-2xl border border-[#E6EEF9] bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Vazgeç
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionTitle
                  icon="👥"
                  title="Kullanıcılar"
                  description="Sisteme kayıtlı personel listesi."
                />

                <span className="rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-slate-500 md:text-sm">
                  {users.length} kullanıcı
                </span>
              </div>

              {users.length === 0 ? (
                <div className="rounded-2xl bg-[#F8FBFF] p-6 text-center md:p-8">
                  <div className="mb-2 text-2xl">👥</div>

                  <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                    Kullanıcı bulunamadı
                  </h2>

                  <p className="mt-1 text-sm text-slate-400 md:text-base">
                    Kullanıcı eklendiğinde burada görünecek.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-[#E6EEF9] lg:block">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#F8FBFF] text-slate-500">
                        <tr>
                          <th className="p-4 font-semibold">Ad Soyad</th>
                          <th className="p-4 font-semibold">Mail</th>
                          <th className="p-4 font-semibold">Konum</th>
                          <th className="p-4 font-semibold">Rol</th>
                          <th className="p-4 font-semibold">Mesai</th>
                          <th className="p-4 font-semibold">Durum</th>
                          <th className="p-4 font-semibold">İşlem</th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map((user) => (
                          <tr
                            key={user.id}
                            className="border-t border-[#E6EEF9]"
                          >
                            <td className="p-4 font-semibold text-slate-800">
                              {user.full_name}
                            </td>

                            <td className="p-4 text-slate-600">
                              {user.email}
                            </td>

                            <td className="p-4 text-slate-600">
                              {user.position || "-"}
                            </td>

                            <td className="p-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${roleClass(
                                  user.role
                                )}`}
                              >
                                {roleLabel(user.role)}
                              </span>
                            </td>

                            <td className="p-4 text-slate-600">
                              {user.work_start_time?.slice(0, 5) || "-"} /{" "}
                              {user.work_end_time?.slice(0, 5) || "-"}
                            </td>

                            <td className="p-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  user.is_active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {user.is_active ? "Aktif" : "Pasif"}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCreateForm(false);
                                    startEdit(user);
                                  }}
                                  className="h-10 rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  Düzenle
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(user)}
                                  className="h-10 rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                                >
                                  Sil
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-4 lg:hidden">
                    {users.map((user) => (
                      <article
                        key={user.id}
                        className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-800">
                              {user.full_name}
                            </h3>

                            <p className="mt-1 truncate text-sm text-slate-500">
                              {user.email}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {user.is_active ? "Aktif" : "Pasif"}
                          </span>
                        </div>

                        <div className="space-y-2 rounded-2xl bg-white p-3 text-sm text-slate-600">
                          <p>Konum: {user.position || "-"}</p>
                          <p>Rol: {roleLabel(user.role)}</p>
                          <p>
                            Mesai: {user.work_start_time?.slice(0, 5) || "-"}{" "}
                            / {user.work_end_time?.slice(0, 5) || "-"}
                          </p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateForm(false);
                              startEdit(user);
                            }}
                            className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600"
                          >
                            Düzenle
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600"
                          >
                            Sil
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
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

function Input({
  value,
  setValue,
  placeholder,
  type = "text",
  required = false,
}: {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
    />
  );
}

function LabeledInput({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <Input
        value={value}
        setValue={setValue}
        placeholder={placeholder || ""}
        type={type}
      />
    </div>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
