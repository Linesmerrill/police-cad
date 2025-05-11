import { NextResponse } from "next/server";
import { parse } from "cookie";

const protectedPrefixes = ["/dashboard", "/settings", "/profile"];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies.authToken;

  const isProtectedPath = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtectedPath && !token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth/login"; // match your app router
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
