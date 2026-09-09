"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/Spinner";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/drive" : "/login");
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Spinner />
    </main>
  );
}
