// GET /api/admin/session — rol de la sesión y qué áreas están configuradas.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  adminConfigured,
  photoConfigured,
  sessionRole,
} from "@/lib/admin-session";
import { cloudinaryConfigured } from "@/lib/cloudinary-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const role = sessionRole(cookies().get(COOKIE_NAME)?.value);
  return NextResponse.json({
    role,
    authenticated: role !== null,
    photoConfigured,
    adminConfigured,
    cloudinaryConfigured,
  });
}
