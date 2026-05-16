import { getRelatedBlogPosts } from "@/lib/blog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const related = await getRelatedBlogPosts(slug);
    return Response.json({ related });
  } catch (error) {
    console.error("Error loading related posts:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
