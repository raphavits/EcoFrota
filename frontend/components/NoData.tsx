export function NoData({ what }: { what: string }) {
  return (
    <div className="stack">
      <h1 className="title">Sem dados</h1>
      <p className="callout">
        {what} não foi encontrado no banco. Se acabou de ligar o Firebase, grave os dados de exemplo com{" "}
        <code>npm run seed -- --yes</code> ou cadastre pelo painel do gestor.
      </p>
    </div>
  );
}
