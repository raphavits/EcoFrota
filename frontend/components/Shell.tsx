"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const NAV = {
  motorista: [
    { href: "/motorista", label: "Início" },
    { href: "/motorista/rotas", label: "Rotas" },
    { href: "/motorista/perfil", label: "Perfil" },
  ],
  gestor: [
    { href: "/gestor", label: "Painel" },
    { href: "/gestor/frota", label: "Frota" },
    { href: "/gestor/motoristas", label: "Motoristas" },
    { href: "/gestor/rotas", label: "Rotas" },
    { href: "/gestor/relatorios", label: "Relatórios" },
  ],
} as const;

const ROOTS = new Set(["/motorista", "/gestor"]);

/** O item fica ativo na própria página e nas páginas filhas (ex.: Rotas em /gestor/rotas/nova). */
const isActive = (pathname: string, href: string) =>
  pathname === href || (!ROOTS.has(href) && pathname.startsWith(`${href}/`));

export function Shell({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  const pathname = usePathname();
  const role = pathname.startsWith("/gestor") ? "gestor" : "motorista";

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const links = NAV[role].map((item) => (
    <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
      {item.label}
    </Link>
  ));

  const switcher = (
    <>
      <Link href="/motorista" aria-current={role === "motorista" ? "true" : undefined}>Motorista</Link>
      <Link href="/gestor" aria-current={role === "gestor" ? "true" : undefined}>Gestor</Link>
    </>
  );

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="logo">EcoFrota</div>
        <nav className="side-nav">{links}</nav>
        <div className="role-switch">{switcher}</div>
      </aside>
      <div className="content">
        <div className="role-switch top-switch">{switcher}</div>
        {demo ? (
          <p className="demo-banner" role="note">
            Modo demonstração: sem Firebase configurado, os dados ficam só na memória e voltam ao padrão quando o servidor reinicia.
          </p>
        ) : null}
        <main>{children}</main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">{links}</nav>
    </div>
  );
}
