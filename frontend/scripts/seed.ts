// Grava os dados de demonstração no Firestore. Uso: npm run seed  (precisa de FIREBASE_SERVICE_ACCOUNT)
import { getStore } from "../lib/db";
import { hasFirebase } from "../lib/firebase";
import { seedStore } from "../lib/seed";

async function main() {
  if (!hasFirebase()) {
    console.error("Defina FIREBASE_SERVICE_ACCOUNT (ou FIRESTORE_EMULATOR_HOST) no .env.local antes de rodar o seed.");
    process.exit(1);
  }
  if (!process.argv.includes("--yes")) {
    console.error("Isto APAGA vehicles, drivers, routes, trips e settings do Firestore e grava dados de demonstração.\nRode de novo com --yes para confirmar:  npm run seed -- --yes");
    process.exit(1);
  }
  const store = await getStore();
  await seedStore(store);
  console.log("Pronto: dados de demonstração gravados no Firestore.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
