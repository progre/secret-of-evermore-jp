/** ROM のバイト列の読み書き。16bit 値はリトルエンディアン */

export function readU16(rom: Uint8Array, at: number): number {
  return rom[at] + rom[at + 1] * 256;
}

export function writeU16(rom: Uint8Array, at: number, value: number): void {
  rom[at] = value & 0xff;
  rom[at + 1] = value >> 8;
}

/** 終端 `0x00` の位置。見つからなければ末尾 */
export function endOfString(rom: Uint8Array, at: number): number {
  const end = rom.indexOf(0, at);
  return end < 0 ? rom.length : end;
}
