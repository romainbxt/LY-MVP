export async function register() {
  const mem: Record<string, string> = {}
  const safe = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => { mem[k] = v },
    removeItem: (k: string) => { delete mem[k] },
    clear: () => { Object.keys(mem).forEach(k => delete mem[k]) },
    key: (i: number) => Object.keys(mem)[i] ?? null,
    get length() { return Object.keys(mem).length },
  }
  if (typeof (globalThis as any).localStorage?.getItem !== 'function') {
    ;(globalThis as any).localStorage = safe
  }
  if (typeof (globalThis as any).sessionStorage?.getItem !== 'function') {
    ;(globalThis as any).sessionStorage = safe
  }
}
