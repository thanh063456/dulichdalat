import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/chatbot/db";
import { BLOG_SEED_POSTS } from "@/data/blog-seed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getAnonClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export type BlogPostRecord = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  tags: string[];
  created_at: string;
  view_count: number;
  published: boolean;
  author?: { name: string } | null;
};

type BlogPostDbRow = Omit<BlogPostRecord, "author"> & {
  author?: { name: string }[] | { name: string } | null;
};

function normalizeBlogPostRow(row: BlogPostDbRow): BlogPostRecord {
  const author = Array.isArray(row.author) ? row.author[0] ?? null : row.author ?? null;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    cover_image: row.cover_image,
    tags: Array.isArray(row.tags) ? row.tags : [],
    created_at: row.created_at,
    view_count: row.view_count,
    published: row.published,
    author: author ? { name: author.name } : null,
  };
}

function mergePosts(dbPosts: BlogPostRecord[]) {
  const fallbackPosts = BLOG_SEED_POSTS.map((post, index) => ({
    id: index + 1000,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    cover_image: post.cover_image,
    tags: post.tags,
    created_at: post.created_at,
    view_count: post.view_count,
    published: post.published,
    author: { name: "Đà Lạt Travel" },
  } satisfies BlogPostRecord));

  const merged = new Map<string, BlogPostRecord>();

  for (const post of fallbackPosts) {
    merged.set(post.slug, post);
  }

  for (const post of dbPosts) {
    merged.set(post.slug, post);
  }

  return Array.from(merged.values()).filter((post) => post.published).sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
}

export async function getBlogPosts() {
  const supabase = getAnonClient();
  if (!supabase) {
    return mergePosts([]);
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, excerpt, content, slug, cover_image, tags, created_at, view_count, published, author:author_id(name)")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return mergePosts([]);
  }

  return mergePosts((data ?? []).map((row) => normalizeBlogPostRow(row as BlogPostDbRow)));
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getRelatedBlogPosts(slug: string) {
  const posts = await getBlogPosts();
  const currentPost = posts.find((post) => post.slug === slug);

  if (!currentPost) {
    return [] as BlogPostRecord[];
  }

  const withScores = posts
    .filter((post) => post.slug !== slug)
    .map((post) => ({
      ...post,
      score: (post.tags || []).filter((tag) => currentPost.tags.includes(tag)).length,
    }))
    .sort((left, right) => right.score - left.score || new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

  const scored = withScores.filter((post) => post.score > 0).slice(0, 5).map(({ score, ...post }) => {
    void score;
    return post;
  });

  if (scored.length >= 5) {
    return scored;
  }

  const existingIds = new Set(scored.map((post) => post.id));
  const fill = posts.filter((post) => post.slug !== slug && !existingIds.has(post.id)).slice(0, 5 - scored.length);

  return [...scored, ...fill].slice(0, 5);
}

export async function seedBlogPostsFromFallback(authorId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return 0;
  }

  const rows = BLOG_SEED_POSTS.map((post) => ({
    author_id: authorId,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    cover_image: post.cover_image,
    tags: post.tags,
    published: true,
    published_at: post.created_at,
    view_count: 0,
  }));

  const { error } = await supabase.from("blog_posts").upsert(rows, { onConflict: "slug" });
  if (error) {
    throw error;
  }

  return rows.length;
}
