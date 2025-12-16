import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();

  // Check if a user is logged in and sign them out
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");

  // Return success - client will handle redirect
  return NextResponse.json({ success: true });
}
