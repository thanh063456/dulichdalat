"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { PlaceRecord } from "@/lib/places";

type UserData = { role?: string };

type FormState = {
  slug: string;
  name: string;
  category: string;
  rating: string;
  reviewCount: string;
  address: string;
  hours: string;
  description: string;
  summary: string;
  tags: string;
  image: string;
  phone: string;
  gmapsLink: string;
  verified: boolean;
};

function subscribeToUserStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getUserSnapshot() {
  return window.localStorage.getItem("dalat_user");
}

function emptyForm(): FormState {
  return {
    slug: "",
    name: "",
    category: "Điểm đến",
    rating: "4.5",
    reviewCount: "0",
    address: "",
    hours: "",
    description: "",
    summary: "",
    tags: "",
    image: "",
    phone: "",
    gmapsLink: "",
    verified: false,
  };
}

export default function AdminPlacesPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<PlaceRecord[]>([]);
  const [fallbackPlaces, setFallbackPlaces] = useState<PlaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const userSnapshot = useSyncExternalStore(subscribeToUserStorage, getUserSnapshot, () => null);
  const user = useMemo<UserData | null>(() => {
    if (!userSnapshot) return null;
    try {
      return JSON.parse(userSnapshot) as UserData;
    } catch {
      return null;
    }
  }, [userSnapshot]);

  function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, image: result }));
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!user) {
      void router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      void router.push("/");
    }
  }, [router, user]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    async function loadPlaces() {
      try {
        const response = await fetch("/api/admin/places", { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error("Failed to load places");
        const data = (await response.json()) as { places?: PlaceRecord[]; fallbackPlaces?: PlaceRecord[] };
        setPlaces(data.places ?? []);
        setFallbackPlaces(data.fallbackPlaces ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải địa điểm");
      } finally {
        setLoading(false);
      }
    }

    void loadPlaces();
  }, [user]);

  function startCreate() {
    setEditingSlug(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(place: PlaceRecord) {
    setEditingSlug(place.slug);
    setForm({
      slug: place.slug,
      name: place.name,
      category: place.category,
      rating: String(place.rating),
      reviewCount: String(place.reviewCount),
      address: place.address,
      hours: place.hours,
      description: place.description,
      summary: place.summary,
      tags: place.tags.join(", "),
      image: place.image,
      phone: place.phone,
      gmapsLink: place.gmapsLink,
      verified: place.verified,
    });
    setShowForm(true);
  }

  async function handleSeed() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/places/seed", { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Failed to seed places");
      const data = (await response.json()) as { count?: number };
      setError("");
      setLoading(true);
      const reload = await fetch("/api/admin/places", { cache: "no-store", credentials: "include" });
      const payload = (await reload.json()) as { places?: PlaceRecord[] };
      setPlaces(payload.places ?? []);
      window.alert(`Đã import ${data.count ?? 0} địa điểm.`);
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Không thể import dữ liệu gốc");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const method = editingSlug ? "PUT" : "POST";
      const url = editingSlug ? `/api/admin/places/${editingSlug}` : "/api/admin/places";
      const payload = {
        ...form,
        slug: form.slug.trim(),
        name: form.name.trim(),
        category: form.category.trim() || "Điểm đến",
        rating: Number(form.rating || 0),
        reviewCount: Number(form.reviewCount || 0),
        address: form.address.trim(),
        hours: form.hours.trim(),
        description: form.description.trim(),
        summary: form.summary.trim(),
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        image: form.image.trim(),
        phone: form.phone.trim(),
        gmapsLink: form.gmapsLink.trim(),
        verified: form.verified,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to save place");
      }

      const data = (await response.json()) as { place?: PlaceRecord };
      if (data.place) {
        setPlaces((current) => {
          const filtered = current.filter((item) => item.slug !== data.place!.slug);
          return [...filtered, data.place!].sort((left, right) => left.name.localeCompare(right.name, "vi"));
        });
      }

      setShowForm(false);
      setEditingSlug(null);
      setForm(emptyForm());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu địa điểm");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!window.confirm("Bạn chắc chắn muốn xóa địa điểm này?")) return;

    try {
      const response = await fetch(`/api/admin/places/${slug}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Failed to delete place");
      setPlaces((current) => current.filter((item) => item.slug !== slug));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa địa điểm");
    }
  }

  if (!user || user.role !== "admin") {
    return <div className="flex min-h-screen items-center justify-center text-smoke">Không có quyền truy cập.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      <section className="rounded-4xl border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Admin · Địa điểm</p>
        <h1 className="mt-4 font-display text-5xl text-pine-900">Quản lý địa điểm</h1>
        <p className="mt-3 text-sm leading-7 text-smoke">Thêm mới, chỉnh sửa hoặc xóa địa điểm. Dữ liệu được lưu trong bảng <span className="font-semibold text-pine-900">places</span>.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={startCreate} className="rounded-full bg-pine-700 px-5 py-3 text-sm font-semibold text-cream hover:bg-pine-900">+ Địa điểm mới</button>
          <button type="button" onClick={handleSeed} disabled={submitting} className="rounded-full border border-pine-500/20 px-5 py-3 text-sm font-semibold text-pine-700 hover:bg-pine-500/5 disabled:opacity-60">
            Import / đồng bộ dữ liệu gốc ({fallbackPlaces.length})
          </button>
        </div>
      </section>

      {error ? <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {showForm ? (
        <section className="mt-8 rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Slug</span>
              <input value={form.slug} disabled={Boolean(editingSlug)} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500 disabled:bg-pine-500/5" required />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Tên</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" required />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Danh mục</span>
              <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Địa chỉ</span>
              <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" required />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Giờ mở cửa</span>
              <input value={form.hours} onChange={(event) => setForm((current) => ({ ...current, hours: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Điểm rating</span>
              <input type="number" step="0.1" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Số review</span>
              <input type="number" min="0" value={form.reviewCount} onChange={(event) => setForm((current) => ({ ...current, reviewCount: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal md:col-span-2">
              <span>Tóm tắt</span>
              <textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} rows={3} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal md:col-span-2">
              <span>Mô tả</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal md:col-span-2">
              <span>Tags, ngăn cách bằng dấu phẩy</span>
              <input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <div className="space-y-3 md:col-span-2">
              <div className="text-sm font-semibold text-charcoal">Ảnh</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-charcoal">
                  <span>Chọn từ máy</span>
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-pine-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cream hover:file:bg-pine-900" />
                </label>
                <label className="space-y-2 text-sm font-semibold text-charcoal">
                  <span>Dán link ảnh</span>
                  <input value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} placeholder="https://..." className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
                </label>
              </div>
              {form.image ? (
                <div className="rounded-2xl border border-pine-500/10 bg-pine-500/5 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-pine-700">Xem trước</p>
                  <img src={form.image} alt="Xem trước ảnh địa điểm" className="max-h-64 w-full rounded-xl object-cover" />
                </div>
              ) : null}
            </div>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>SĐT</span>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-charcoal">
              <span>Google Maps</span>
              <input value={form.gmapsLink} onChange={(event) => setForm((current) => ({ ...current, gmapsLink: event.target.value }))} className="w-full rounded-2xl border border-pine-500/15 px-4 py-3 outline-none focus:border-pine-500" />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-charcoal md:col-span-2">
              <input type="checkbox" checked={form.verified} onChange={(event) => setForm((current) => ({ ...current, verified: event.target.checked }))} className="h-4 w-4 rounded border-pine-500/30 text-pine-700" />
              Đã xác thực
            </label>
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" disabled={submitting} className="rounded-full bg-pine-700 px-5 py-3 text-sm font-semibold text-cream hover:bg-pine-900 disabled:opacity-60">
                {submitting ? "Đang lưu..." : editingSlug ? "Cập nhật" : "Tạo mới"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingSlug(null); }} className="rounded-full border border-pine-500/20 px-5 py-3 text-sm font-semibold text-pine-700 hover:bg-pine-500/5">
                Hủy
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-4xl border border-pine-500/10 bg-white shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
        <div className="flex items-center justify-between border-b border-pine-500/10 px-6 py-5">
          <div>
            <h2 className="font-display text-3xl text-pine-900">Danh sách địa điểm</h2>
            <p className="mt-1 text-sm text-smoke">{places.length} địa điểm trong DB</p>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-smoke">Đang tải...</div>
        ) : places.length === 0 ? (
          <div className="px-6 py-10 text-sm text-smoke">Chưa có dữ liệu địa điểm trong DB.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-pine-500/10">
              <thead className="bg-pine-500/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Tên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Danh mục</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Trạng thái</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pine-500/10 bg-white">
                {places.map((place) => (
                  <tr key={place.slug}>
                    <td className="px-4 py-4 text-sm font-semibold text-pine-900">{place.name}</td>
                    <td className="px-4 py-4 text-sm text-smoke">{place.slug}</td>
                    <td className="px-4 py-4 text-sm text-smoke">{place.category}</td>
                    <td className="px-4 py-4 text-sm text-smoke">{place.hidden ? "Đã ẩn" : place.verified ? "Đã xác thực" : "Chưa xác thực"}</td>
                    <td className="px-4 py-4 text-right text-sm">
                      <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => startEdit(place)} className="rounded-full border border-pine-500/20 px-4 py-2 font-semibold text-pine-700 hover:bg-pine-500/5">Sửa</button>
                        <button type="button" onClick={() => handleDelete(place.slug)} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700">Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
