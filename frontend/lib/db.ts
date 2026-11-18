// Camada de dados. Em produção usa o Firestore (firebase-admin, só no servidor).
// Sem credenciais do Firebase, cai num modo demonstração em memória (não persiste).
import { getFirestoreDb, hasFirebase } from "./firebase";

export type Doc<T> = T & { id: string };
export type Where = [field: string, op: "==" | ">=" | "<=", value: string | number | boolean];

export interface Store {
  list<T>(col: string, opts?: { where?: Where[] }): Promise<Doc<T>[]>;
  get<T>(col: string, id: string): Promise<Doc<T> | null>;
  /** Cria um documento. Sem `id`, gera um. Devolve o id. */
  create(col: string, data: object, id?: string): Promise<string>;
  update(col: string, id: string, patch: object): Promise<void>;
  remove(col: string, id: string): Promise<void>;
  /** Grava vários documentos de uma vez (cada um com seu id). */
  setMany(col: string, docs: { id: string; data: object }[]): Promise<void>;
  clear(col: string): Promise<void>;
}

const matches = (doc: Record<string, unknown>, [field, op, value]: Where) => {
  const v = doc[field] as string | number | boolean;
  return op === "==" ? v === value : op === ">=" ? v >= value : v <= value;
};

class MemoryStore implements Store {
  private cols = new Map<string, Map<string, Record<string, unknown>>>();
  private seq = 0;
  private col(name: string) {
    let c = this.cols.get(name);
    if (!c) this.cols.set(name, (c = new Map()));
    return c;
  }
  async list<T>(col: string, opts?: { where?: Where[] }) {
    const rows = [...this.col(col)].map(([id, d]) => ({ ...d, id }) as Doc<T>);
    return (opts?.where ?? []).reduce((acc, w) => acc.filter((r) => matches(r as Record<string, unknown>, w)), rows);
  }
  async get<T>(col: string, id: string) {
    const d = this.col(col).get(id);
    return d ? ({ ...d, id } as Doc<T>) : null;
  }
  async create(col: string, data: object, id?: string) {
    const key = id ?? `m${++this.seq}_${Math.random().toString(36).slice(2, 8)}`;
    this.col(col).set(key, structuredClone({ ...data }) as Record<string, unknown>);
    return key;
  }
  async update(col: string, id: string, patch: object) {
    const cur = this.col(col).get(id);
    if (!cur) throw new Error(`Documento ${col}/${id} não existe`);
    this.col(col).set(id, { ...cur, ...structuredClone({ ...patch }) });
  }
  async remove(col: string, id: string) {
    this.col(col).delete(id);
  }
  async setMany(col: string, docs: { id: string; data: object }[]) {
    for (const d of docs) this.col(col).set(d.id, structuredClone({ ...d.data }) as Record<string, unknown>);
  }
  async clear(col: string) {
    this.col(col).clear();
  }
}

class FirestoreStore implements Store {
  private db = getFirestoreDb();
  async list<T>(col: string, opts?: { where?: Where[] }) {
    let q: FirebaseFirestore.Query = this.db.collection(col);
    for (const [f, op, v] of opts?.where ?? []) q = q.where(f, op, v);
    const snap = await q.get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Doc<T>);
  }
  async get<T>(col: string, id: string) {
    const d = await this.db.collection(col).doc(id).get();
    return d.exists ? ({ ...d.data(), id: d.id } as Doc<T>) : null;
  }
  async create(col: string, data: object, id?: string) {
    const ref = id ? this.db.collection(col).doc(id) : this.db.collection(col).doc();
    await ref.set({ ...data });
    return ref.id;
  }
  async update(col: string, id: string, patch: object) {
    await this.db.collection(col).doc(id).update({ ...patch });
  }
  async remove(col: string, id: string) {
    await this.db.collection(col).doc(id).delete();
  }
  async setMany(col: string, docs: { id: string; data: object }[]) {
    for (let i = 0; i < docs.length; i += 400) {
      const batch = this.db.batch();
      for (const d of docs.slice(i, i + 400)) batch.set(this.db.collection(col).doc(d.id), { ...d.data });
      await batch.commit();
    }
  }
  async clear(col: string) {
    const snap = await this.db.collection(col).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = this.db.batch();
      for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
      await batch.commit();
    }
  }
}

type Global = typeof globalThis & { __ecofrotaStore?: Store; __ecofrotaSeeded?: Promise<void> };
const g = globalThis as Global;

export const isDemoMode = () => !hasFirebase();

/** Store única do processo. No modo demonstração, já vem com os dados de exemplo. */
export async function getStore(): Promise<Store> {
  if (!g.__ecofrotaStore) g.__ecofrotaStore = hasFirebase() ? new FirestoreStore() : new MemoryStore();
  if (!hasFirebase() && !g.__ecofrotaSeeded) {
    const store = g.__ecofrotaStore;
    g.__ecofrotaSeeded = import("./seed").then((m) => m.seedStore(store));
  }
  if (g.__ecofrotaSeeded) await g.__ecofrotaSeeded;
  return g.__ecofrotaStore;
}

/** Para testes: descarta a store atual (e o estado do modo demonstração). */
export function resetStoreForTests() {
  g.__ecofrotaStore = undefined;
  g.__ecofrotaSeeded = undefined;
}

export const COLLECTIONS = ["vehicles", "drivers", "routes", "trips", "settings"] as const;
