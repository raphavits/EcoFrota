import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack">
      <h1 className="title">Página não encontrada</h1>
      <Link className="btn" href="/motorista">Voltar ao início</Link>
    </div>
  );
}
