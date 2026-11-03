/**
 * SNES ROM の内部ヘッダーチェックサム。
 * コピアヘッダーなしの HiROM を前提とし、ファイルオフセットは SNES アドレスと一致する。
 */

/** 1 の補数の位置。チェックサムはその直後の 2 バイトに並ぶ */
export const checksumComplementOffset = 0xffdc;

function sumRange(rom: Uint8Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum = (sum + rom[i]) & 0xffff;
  return sum;
}

/**
 * 全バイトを 16bit で加算する。
 * サイズが 2 のべき乗でない ROM は、最大のべき乗ブロックの後に余りが続くとみなし、
 * 余りをブロックとの比で重み付けして加算する（3MB の ROM は 2MB + 1MB を 1:2 で数える）。
 */
export function computeChecksum(rom: Uint8Array): number {
  const work = rom.slice();
  work.set(Uint8Array.of(0xff, 0xff, 0x00, 0x00), checksumComplementOffset);

  let base = 1;
  while (base * 2 <= work.length) base *= 2;
  const remaining = work.length - base;
  if (remaining === 0) return sumRange(work, 0, work.length);

  if (base % remaining !== 0) {
    throw new Error("ROM サイズがべき乗ブロックの整数倍で割り切れない: " + work.length);
  }
  const weight = base / remaining;
  const sum = sumRange(work, 0, base) + sumRange(work, base, work.length) * weight;
  return sum & 0xffff;
}

/** チェックサムと、その 1 の補数（`0xFFFF` との XOR）をヘッダーへ書き込む */
export function writeChecksum(rom: Uint8Array): void {
  const checksum = computeChecksum(rom);
  const complement = checksum ^ 0xffff;
  rom.set(
    Uint8Array.of(
      complement & 0xff,
      (complement >> 8) & 0xff,
      checksum & 0xff,
      (checksum >> 8) & 0xff,
    ),
    checksumComplementOffset,
  );
}
