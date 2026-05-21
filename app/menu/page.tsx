"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";

import { apiFetch } from "@/lib/api";
import { canManageMenu, fetchProfileAccess } from "@/lib/access";
import { authHeaders, getAccessToken, jsonAuthHeaders } from "@/lib/auth";

type MenuItem = {
  id: number;
  menu_date: string;
  content: string;
};

export default function MenuPage() {
  const router = useRouter();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const [menuDate, setMenuDate] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  async function fetchMenus() {
    try {
      const response = await apiFetch("/menus");
      const data = await response.json();
      setMenus(data.menus || []);
    } catch {
      setMenus([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccess() {
    setCanManage(canManageMenu(await fetchProfileAccess()));
  }

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    fetchAccess();
    fetchMenus();
  }, [router]);

  function resetForm() {
    setEditingId(null);
    setMenuDate("");
    setContent("");
  }

  function startEdit(menu: MenuItem) {
    setEditingId(menu.id);
    setMenuDate(menu.menu_date);
    setContent(menu.content);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const response = await apiFetch(
      editingId ? `/menus/${editingId}` : "/menus",
      {
        method: editingId ? "PATCH" : "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          menu_date: menuDate,
          content,
        }),
      }
    );

    if (!response.ok) {
      alert("Menü kaydedilemedi");
      return;
    }

    resetForm();
    fetchMenus();
  }

  async function handleDelete(id: number) {
    if (!confirm("Bu menü silinsin mi?")) return;

    const response = await apiFetch(`/menus/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      alert("Menü silinemedi");
      return;
    }

    fetchMenus();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F6F9FF]">
        <Sidebar />

        <main className="flex-1 px-4 py-4 md:p-8">
          <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 text-sm text-slate-400 shadow-sm md:rounded-3xl md:p-5 md:text-base">
            Menü yükleniyor...
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
            </div>

            <div className="mt-5 md:mt-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
                Menü
              </h1>

              <p className="mt-1.5 text-sm text-slate-400 md:text-base">
                Günlük yemek menülerini görüntüleyin ve yönetin.
              </p>
            </div>
          </header>

          <div className="space-y-4 md:space-y-5">
            {canManage && (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <SectionTitle
                      icon="🍽"
                      title={editingId ? "Menü Düzenle" : "Menü Yönetimi"}
                      description="Günlük menü içeriğini oluşturun."
                    />

                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="h-10 w-fit rounded-2xl border border-[#E6EEF9] bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Düzenlemeyi İptal Et
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Tarih
                      </label>

                      <input
                        type="date"
                        value={menuDate}
                        onChange={(e) => setMenuDate(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        required
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Menü İçeriği
                      </label>

                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-28 w-full resize-none rounded-2xl border border-[#E6EEF9] bg-[#F8FBFF] px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                        placeholder={"Örn:\nMercimek çorbası\nTavuk sote\nPilav\nAyran"}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button className="h-11 rounded-2xl bg-sky-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
                      {editingId ? "Güncelle" : "Kaydet"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="h-11 rounded-2xl border border-[#E6EEF9] bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        Vazgeç
                      </button>
                    )}
                  </div>
                </form>
              </section>
            )}

            {menus.length === 0 ? (
              <section className="rounded-2xl border border-[#E6EEF9] bg-white p-4 text-center shadow-sm md:rounded-3xl md:p-5">
                <div className="rounded-2xl bg-[#F8FBFF] p-6 md:p-8">
                  <div className="mb-2 text-2xl">🍽</div>

                  <h2 className="text-lg font-bold text-slate-800 md:text-xl">
                    Henüz menü girilmemiş
                  </h2>

                  <p className="mt-1 text-sm text-slate-400 md:text-base">
                    Menü eklendiğinde burada görünecek.
                  </p>
                </div>
              </section>
            ) : (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {menus.map((menu) => (
                  <article
                    key={menu.id}
                    className="overflow-hidden rounded-2xl border border-[#E6EEF9] bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="border-b border-[#E6EEF9] bg-[#F8FBFF] p-4">
                      <p className="text-xs font-semibold capitalize text-slate-400 md:text-sm">
                        {new Date(menu.menu_date).toLocaleDateString("tr-TR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>

                      <h2 className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-800 md:text-xl">
                        <span>🍽</span>
                        <span>Günün Menüsü</span>
                      </h2>
                    </div>

                    <div className="p-4">
                      <div className="rounded-2xl bg-[#F8FBFF] p-4">
                        <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
                          {menu.content}
                        </p>
                      </div>

                      {canManage && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <button
                            onClick={() => startEdit(menu)}
                            className="h-10 rounded-2xl border border-[#E6EEF9] bg-white text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Düzenle
                          </button>

                          <button
                            onClick={() => handleDelete(menu.id)}
                            className="h-10 rounded-2xl bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
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
