import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protege o app com usuário e senha (HTTP Basic) quando BASIC_AUTH_USER e BASIC_AUTH_PASSWORD estão definidos.
// Recomendado na Vercel enquanto não houver login de verdade: sem isso, qualquer pessoa com o link
// consegue criar, editar e apagar cadastros.
export function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      if (u === user && rest.join(":") === pass) return NextResponse.next();
    } catch {
      /* credencial malformada: cai no 401 */
    }
  }
  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="EcoFrota", charset="UTF-8"' },
  });
}

export const config = {
  // Deixa fora os arquivos que o navegador busca sem credenciais (manifesto, ícone, service worker).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)"],
};
