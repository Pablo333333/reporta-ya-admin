"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Verificamos si hay un token en el almacenamiento local
    const token = localStorage.getItem("token"); // O como Cursor haya nombrado la cookie/item
    if (token) {
      router.push("/dashboard/reportes");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Cargando panel administrativo...</p>
    </div>
  );
}