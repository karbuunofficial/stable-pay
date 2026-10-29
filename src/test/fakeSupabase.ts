/** A minimal chainable stand-in for the Supabase client: records every call, answers from per-table queues. */
export type Result = { data: unknown; error: { message: string; code?: string } | null };
export type Call = { table: string; ops: [string, unknown[]][] };

export function createFakeSupabase() {
  const calls: Call[] = [];
  const queues = new Map<string, Result[]>();

  const respond = (table: string, ...results: Result[]) => {
    queues.set(table, [...(queues.get(table) ?? []), ...results]);
  };
  const ok = (data: unknown): Result => ({ data, error: null });
  const fail = (message: string, code?: string): Result => ({ data: null, error: { message, ...(code ? { code } : {}) } });

  const client = {
    from(table: string) {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const chain: object = new Proxy({}, {
        get(_t, prop: string | symbol) {
          if (prop === "then") {
            return (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) => {
              const next = queues.get(table)?.shift() ?? ok(null);
              return Promise.resolve(next).then(resolve, reject);
            };
          }
          return (...args: unknown[]) => {
            call.ops.push([String(prop), args]);
            return chain;
          };
        },
      });
      return chain;
    },
  };

  /** Calls made against a table, optionally only those that include a given operation. */
  const on = (table: string, op?: string) => calls.filter((c) => c.table === table && (!op || c.ops.some(([n]) => n === op)));
  const args = (call: Call, op: string) => call.ops.find(([n]) => n === op)?.[1];
  const reset = () => { calls.length = 0; queues.clear(); };

  return { client, calls, respond, ok, fail, on, args, reset };
}
