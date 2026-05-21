"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch, apiUrl } from "@/lib/api";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";

type ProfileData = {
  full_name: string;
  email: string;
  position?: string;
  profile_photo?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchProfile() {
    try {
      const response = await apiFetch("/profile", {
        headers: authHeaders(),
      });

      if (!response.ok) {
        throw new Error("Profil alınamadı");
      }

      const data = await response.json();
      setProfile(data);
      localStorage.setItem("user", JSON.stringify(data));
    } catch {
      setProfile(null);
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

    fetchProfile();
  }, [router]);

  function getPhotoUrl() {
    if (!profile?.profile_photo) return "/default-avatar.png";
    if (profile.profile_photo.startsWith("http")) return profile.profile_photo;

    return apiUrl(profile.profile_photo);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    const response = await apiFetch("/profile/upload-photo", {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });

    if (!response.ok) {
      alert("Fotoğraf yüklenemedi");
      return;
    }

    const data = await response.json();

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            profile_photo: data.profile_photo,
          }
        : prev
    );
  }

  async function handleRemovePhoto() {
    if (!confirm("Profil fotoğrafı kaldırılsın mı?")) return;

    const response = await apiFetch("/profile/remove-photo", {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("Fotoğraf kaldırılamadı");
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            profile_photo: null,
          }
        : prev
    );
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const response = await apiFetch("/profile/change-password", {
      method: "PATCH",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.detail || "Şifre değiştirilemedi.");
      return;
    }

    setMessage("Şifre başarıyla değiştirildi.");
    setOldPassword("");
    setNewPassword("");
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
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
                Profilim
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Hesap bilgilerinizi ve profil fotoğrafınızı yönetin.
              </p>
            </div>
          </header>

          {loading ? (
            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 text-sm text-slate-400 shadow-sm md:rounded-3xl md:p-5 md:text-base">
              Profil yükleniyor...
            </section>
          ) : !profile ? (
            <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-600 shadow-sm md:rounded-3xl">
              Profil bilgileri alınamadı.
            </section>
          ) : (
            <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
                <div>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="text-lg md:text-xl">👤</span>

                    <div>
                      <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                        Hesap Bilgileri
                      </h2>

                      <p className="text-sm text-slate-400">
                        Kişisel hesap detaylarınız.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InfoItem label="Ad Soyad" value={profile.full_name} />
                    <InfoItem label="Kurumdaki Konum" value={profile.position || "Tanımlanmamış"} />
                    <InfoItem label="Mail" value={profile.email} wide />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    >
                      Şifre Değiştir
                    </button>

                    <button
                      onClick={logout}
                      className="h-11 rounded-2xl bg-red-50 px-6 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Çıkış Yap
                    </button>
                  </div>

                  {showPasswordForm && (
                    <div className="mt-5 rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4">
                      <h3 className="mb-4 text-base font-bold text-slate-800">
                        Şifre Değiştir
                      </h3>

                      <form
                        onSubmit={handlePasswordChange}
                        className="grid grid-cols-1 gap-4 md:grid-cols-2"
                      >
                        <PasswordInput
                          label="Mevcut Şifre"
                          value={oldPassword}
                          setValue={setOldPassword}
                        />

                        <PasswordInput
                          label="Yeni Şifre"
                          value={newPassword}
                          setValue={setNewPassword}
                        />

                        <div className="md:col-span-2">
                          <button className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
                            Güncelle
                          </button>

                          {message && (
                            <p className="mt-3 text-sm text-slate-500">
                              {message}
                            </p>
                          )}
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                <aside className="rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 text-center">
                  <div className="mx-auto h-36 w-36 overflow-hidden rounded-full border border-[#E6EEF9] bg-white shadow-sm md:h-44 md:w-44">
                    <img
                      src={getPhotoUrl()}
                      alt="Profil"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <h3 className="mt-4 text-base font-bold text-slate-800 md:text-lg">
                    {profile.full_name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {profile.position || "Personel"}
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="h-10 rounded-2xl bg-sky-600 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                    >
                      Ekle
                    </button>

                    <button
                      onClick={handleRemovePhoto}
                      className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Kaldır
                    </button>
                  </div>
                </aside>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function InfoItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] p-4 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      <p className="mb-1.5 text-xs font-semibold text-slate-400">{label}</p>
      <p className="break-all text-sm font-semibold text-slate-800 md:text-base">
        {value}
      </p>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
        {label}
      </label>

      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        required
      />
    </div>
  );
}
