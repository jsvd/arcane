// Fixture that uses crypto.randomUUID()
const id: string = crypto.randomUUID();
(globalThis as any).__testUUID = id;
