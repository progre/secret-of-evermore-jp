import type { Reconstruction } from "./bps.ts";

const MIN_LENGTH = 8;

export interface Run {
  offset: number;
  length: number;
}

function readGram(data: Uint8Array, offset: number): bigint {
  return new DataView(data.buffer, data.byteOffset + offset, MIN_LENGTH).getBigUint64(0);
}

function isKnownGram(known: Uint8Array, offset: number): boolean {
  return known.subarray(offset, offset + MIN_LENGTH).every((flag) => flag === 1);
}

/** パッチだけで決まるバイトのうち、元の ROM のどこかと 8 バイト以上一致する範囲を求める */
export function findCopiedRuns({ bytes, known }: Reconstruction, original: Uint8Array): Run[] {
  const offsets = Array.from({ length: Math.max(bytes.length - MIN_LENGTH + 1, 0) }, (_, i) => i)
    .filter((offset) => known[offset] === 1 && isKnownGram(known, offset));
  const grams = new Set(offsets.map((offset) => readGram(bytes, offset)));

  const copied = new Set<bigint>();
  for (let i = 0; i + MIN_LENGTH <= original.length; i++) {
    const gram = readGram(original, i);
    if (grams.has(gram)) {
      copied.add(gram);
    }
  }

  return offsets
    .filter((offset) => copied.has(readGram(bytes, offset)))
    .reduce<Run[]>((runs, offset) => {
      const last = runs.at(-1);
      if (last != null && last.offset + last.length - MIN_LENGTH + 1 === offset) {
        last.length++;
        return runs;
      }
      return [...runs, { offset, length: MIN_LENGTH }];
    }, []);
}
