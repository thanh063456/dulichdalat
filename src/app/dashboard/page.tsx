import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { DashboardBookingList } from "@/components/admin/dashboard-booking-list";
import { getPlaces } from "@/lib/places";

export const dynamic = "force-dynamic";

type BookingRow = {
  id: number;
  place_name: string;
  customer_name: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled";
  date_in: string;
  created_at: string;
};

type ReviewRow = {
  id: number;
  place_slug: string;
  user_name: string;
  rating: number;
  content: string;
  approved: boolean;
  created_at: string;
};

type AdminNavItem = {
  href: string;
  label: string;
  detail: string;
};

type DashboardStats = {
  users: number;
  bookings: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  unreadNotifications: number;
  totalPlaces: number;
  totalBlogPosts: number;
  totalToursBooked: number;
  reviewsThisWeek: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

type CountQuery = PromiseLike<{ error?: unknown; count?: number | null }>;

async function safeCount(query: CountQuery) {
  try {
    const result = await query;
    return result.error ? 0 : result.count ?? 0;
  } catch {
    return 0;
  }
}

const reviewWeekCutoff = new Date();
reviewWeekCutoff.setDate(reviewWeekCutoff.getDate() - 7);

export default async function DashboardPage() {
  const supabase = getSupabaseAdminClient();

  const stats: DashboardStats = {
    users: 0,
    bookings: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    unreadNotifications: 0,
    totalPlaces: 0,
    totalBlogPosts: 0,
    totalToursBooked: 0,
    reviewsThisWeek: 0,
  };
  let recentBookings: BookingRow[] = [];
  let pendingReviews: ReviewRow[] = [];

  if (supabase) {
    const [usersCount, bookingsCount, pendingCount, confirmedCount, cancelledCount, notificationsCount, recentRes, blogCount, toursCount, reviewCount, pendingReviewRes] =
      await Promise.all([
        safeCount(supabase.from("profiles").select("id", { count: "exact", head: true })),
        safeCount(supabase.from("bookings").select("id", { count: "exact", head: true })),
        safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending")),
        safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed")),
        safeCount(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "cancelled")),
        safeCount(supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false)),
        supabase
          .from("bookings")
          .select("id, place_name, customer_name, guests, status, date_in, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        safeCount(supabase.from("blog_posts").select("id", { count: "exact", head: true })),
        safeCount(supabase.from("bookings").select("id", { count: "exact", head: true })),
        safeCount(
          supabase
            .from("place_reviews")
            .select("id", { count: "exact", head: true })
            .gte("created_at", reviewWeekCutoff.toISOString()),
        ),
        supabase
          .from("place_reviews")
          .select("id, place_slug, user_name, rating, content, approved, created_at")
          .eq("approved", false)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

    stats.users = usersCount;
    stats.bookings = bookingsCount;
    stats.pending = pendingCount;
    stats.confirmed = confirmedCount;
    stats.cancelled = cancelledCount;
    stats.unreadNotifications = notificationsCount;
    recentBookings = (recentRes.data ?? []) as BookingRow[];
    stats.totalBlogPosts = blogCount;
    stats.totalToursBooked = toursCount;
    stats.reviewsThisWeek = reviewCount;
    pendingReviews = (pendingReviewRes.data ?? []) as ReviewRow[];
  }

  const placeList = await getPlaces();
  stats.totalPlaces = placeList.length;
  const placeMap = new Map(placeList.map((place) => [place.slug, place.name]));

  const confirmationRate = stats.bookings > 0 ? Math.round((stats.confirmed / stats.bookings) * 100) : 0;
  const bookingOccupancy = stats.bookings > 0 ? Math.round(((stats.confirmed + stats.pending) / stats.bookings) * 100) : 0;
  const liveStatus = supabase ? "Dữ liệu real-time từ Supabase" : "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY";

  const adminNav: AdminNavItem[] = [
    { href: "/dashboard", label: "Tổng quan", detail: "Số liệu chính và booking gần đây" },
    { href: "/admin/blog", label: "Quản lý Blog", detail: "Bài viết và trạng thái xuất bản" },
    { href: "/admin/places", label: "Quản lý Địa điểm", detail: "Thêm, sửa, xóa địa điểm" },
    { href: "/admin/bookings", label: "Quản lý Tour", detail: "Đơn đặt tour và xác nhận" },
    { href: "/admin/danh-gia", label: "Quản lý Đánh giá", detail: "Duyệt review địa điểm" },
    { href: "/admin/binh-luan", label: "Quản lý Bình luận", detail: "Duyệt và xóa bình luận blog" },
    { href: "/admin/users", label: "Quản lý Users", detail: "Tài khoản và vai trò" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-4xl border border-pine-500/10 bg-white p-5 shadow-[0_20px_60px_rgba(26,47,15,0.08)] lg:sticky lg:top-24 lg:self-start">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Admin Menu</p>
          <h2 className="mt-3 font-display text-3xl text-pine-900">Điều hướng</h2>
          <nav className="mt-6 space-y-3">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl border border-pine-500/10 px-4 py-3 transition hover:border-pine-500/25 hover:bg-pine-500/5"
              >
                <p className="font-semibold text-pine-900">{item.label}</p>
                <p className="mt-1 text-sm text-smoke">{item.detail}</p>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="space-y-8">
      <section className="rounded-4xl border border-pine-500/10 bg-white p-8 shadow-[0_20px_60px_rgba(26,47,15,0.08)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pine-700">Dashboard</p>
            <h1 className="mt-4 font-display text-5xl text-pine-900">Quản lý đặt chỗ và khách truy cập</h1>
            <p className="mt-3 text-sm leading-7 text-smoke">
              Bảng điều khiển này đang đọc trực tiếp từ Supabase: người dùng, booking, trạng thái duyệt và thông báo admin.
            </p>
          </div>
          <div className="rounded-2xl bg-pine-500/5 px-5 py-4 text-sm text-smoke">
            <p className="font-semibold text-pine-900">{liveStatus}</p>
            <p className="mt-1">Cập nhật theo dữ liệu thật của hệ thống.</p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        {[
          { label: "Địa điểm", value: stats.totalPlaces, detail: "Tổng địa điểm (dataset)" },
          { label: "Bài blog", value: stats.totalBlogPosts, detail: "Tổng bài viết" },
          { label: "Tour đã đặt", value: stats.totalToursBooked, detail: "Tổng tour/booking" },
          { label: "Review (7 ngày)", value: stats.reviewsThisWeek, detail: "Số review trong tuần" },
        ].map((item) => (
          <article key={item.label} className="rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-smoke">{item.label}</p>
            <p className="mt-4 font-heading text-5xl text-pine-900">{formatNumber(item.value)}</p>
            <p className="mt-2 text-sm text-smoke">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pine-700">Review cần duyệt</p>
            <h2 className="mt-2 font-display text-3xl text-pine-900">Đánh giá đang chờ admin xử lý</h2>
          </div>
          <p className="text-sm text-smoke">{pendingReviews.length} review</p>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-pine-500/10">
          {pendingReviews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-pine-500/10">
                <thead className="bg-pine-500/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Địa điểm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Người gửi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Sao</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Nội dung</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-smoke">Ngày gửi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pine-500/10 bg-white">
                  {pendingReviews.map((review) => (
                    <tr key={review.id}>
                      <td className="px-4 py-4 text-sm font-semibold text-pine-900">{placeMap.get(review.place_slug) ?? review.place_slug}</td>
                      <td className="px-4 py-4 text-sm text-charcoal">{review.user_name}</td>
                      <td className="px-4 py-4 text-sm text-gold">{review.rating}★</td>
                      <td className="px-4 py-4 text-sm text-smoke">
                        <span className="line-clamp-2">{review.content}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-smoke">{new Date(review.created_at).toLocaleDateString("vi-VN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-sm text-smoke">Không có review nào đang chờ duyệt.</div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pine-700">Phân bổ trạng thái</p>
              <h2 className="mt-2 font-display text-3xl text-pine-900">Booking theo trạng thái</h2>
            </div>
            <p className="text-sm text-smoke">Tỷ lệ xác nhận {confirmationRate}%</p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Đã xác nhận", value: stats.confirmed, tone: "bg-emerald-500/10 text-emerald-700" },
              { label: "Chờ duyệt", value: stats.pending, tone: "bg-amber-500/10 text-amber-700" },
              { label: "Đã hủy", value: stats.cancelled, tone: "bg-rose-500/10 text-rose-700" },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-4 ${item.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em]">{item.label}</p>
                <p className="mt-2 font-heading text-3xl">{formatNumber(item.value)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-pine-500/5 p-4">
            <div className="flex items-center justify-between text-sm text-smoke">
              <span>Mức phủ booking</span>
              <span>{bookingOccupancy}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-linear-to-r from-pine-700 to-gold" style={{ width: `${bookingOccupancy}%` }} />
            </div>
            <p className="mt-3 text-sm text-smoke">
              Chỉ số này phản ánh tỷ lệ booking đang ở trạng thái chờ hoặc đã xác nhận so với tổng booking.
            </p>
          </div>
        </article>

        <article className="rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pine-700">Hành động nhanh</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { label: "Mở API stats", href: "/api/admin/stats", detail: "Kiểm tra JSON số liệu hiện tại" },
              { label: "Xem booking", href: "/admin/bookings", detail: "Danh sách booking có drill-down" },
              { label: "Mở địa điểm", href: "/places", detail: "Quay về dữ liệu du lịch" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="rounded-2xl border border-pine-500/10 p-4 transition hover:border-pine-500/25 hover:bg-pine-500/5">
                <p className="font-semibold text-pine-900">{item.label}</p>
                <p className="mt-1 text-sm text-smoke">{item.detail}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-4xl border border-pine-500/10 bg-white p-6 shadow-[0_16px_42px_rgba(26,47,15,0.06)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-pine-700">Hoạt động gần đây</p>
            <h2 className="mt-2 font-display text-3xl text-pine-900">Danh sách booking mới nhất</h2>
          </div>
          <p className="text-sm text-smoke">{recentBookings.length} bản ghi gần nhất</p>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-pine-500/10">
          {recentBookings.length > 0 ? (
            <DashboardBookingList bookings={recentBookings} />
          ) : (
            <div className="px-5 py-10 text-sm text-smoke">
              Chưa có booking nào. Khi có dữ liệu Supabase, danh sách recent bookings sẽ xuất hiện ở đây.
            </div>
          )}
        </div>
      </section>
        </main>
      </div>
    </div>
  );
}