import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const AUTH_COOKIE_NAME = "inventory-auth";
const BCRYPT_ROUNDS = 10;

function looksLikeBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function validateLogin(account: string, password: string) {
  const normalizedAccount = account.trim();
  const normalizedPassword = password.trim();

  if (!normalizedAccount || !normalizedPassword) {
    return false;
  }

  const existingAccount = await prisma.account.findUnique({
    where: { account: normalizedAccount },
  });

  if (!existingAccount) {
    return false;
  }

  if (looksLikeBcryptHash(existingAccount.password)) {
    return bcrypt.compare(normalizedPassword, existingAccount.password);
  }

  if (existingAccount.password !== normalizedPassword) {
    return false;
  }

  const nextHash = await bcrypt.hash(normalizedPassword, BCRYPT_ROUNDS);
  await prisma.account.update({
    where: { id: existingAccount.id },
    data: { password: nextHash },
  });

  return true;
}

export async function setAuthSession(account: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, account, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getLoggedInAccount() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}

export async function requireAuth() {
  const account = await getLoggedInAccount();

  if (!account) {
    redirect("/login");
  }

  return account;
}