import type { Metadata } from "next";
import { Suspense } from "react";
import { Splash } from "@/components/app-shell";
import { LoginScreen } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <Suspense fallback={<Splash />}>
      <LoginScreen />
    </Suspense>
  );
}
