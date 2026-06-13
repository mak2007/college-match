"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LogoutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <button onClick={handleLogout} className={className} type="button">
      {children || "Logout"}
    </button>
  );
}
