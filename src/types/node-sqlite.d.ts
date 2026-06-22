// Type shim for node:sqlite (Node.js 22 experimental built-in)
// This supplements @types/node if the types are missing.
declare module "node:sqlite" {
  type SupportedValueType =
    | null
    | number
    | bigint
    | string
    | Buffer
    | Uint8Array;

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  class StatementSync {
    run(...args: SupportedValueType[]): RunResult;
    get(
      ...args: SupportedValueType[]
    ): Record<string, SupportedValueType> | undefined;
    all(...args: SupportedValueType[]): Record<string, SupportedValueType>[];
    setReadBigInts(enabled: boolean): void;
    expandedSQL: string;
    sourceSQL: string;
  }

  class DatabaseSync {
    constructor(
      location: string,
      options?: { open?: boolean; readOnly?: boolean },
    );
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    function(
      name: string,
      fn: (...args: SupportedValueType[]) => SupportedValueType,
    ): void;
    readonly open: boolean;
  }
}
