import { getBlogPosts } from "@/lib/blog";

export async function GET() {
  try {
    const posts = await getBlogPosts();
    return Response.json({ posts });
  } catch (error) {
    console.error("Error loading posts:", error);
    return Response.json({ posts: [] });
  }
}
