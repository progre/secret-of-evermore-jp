/**
 * イベントスクリプトの所在。番地は SNES アドレスで表し、ROM は HiROM として引く。
 * スクリプトの番地は `$928000` 起点の 24bit 値で、ROM の各バンクの後半 32KB だけを詰めて数える。
 */

const scriptBase = 0x928000;
/** 部屋ごとのデータへの 24bit ポインタの表。1 部屋 4 バイト */
const roomTable = 0x9ffde7;
export const roomCount = 127;

export function read8(rom: Uint8Array, address: number): number {
  return rom[address & 0x3fffff];
}

export function read16(rom: Uint8Array, address: number): number {
  return read8(rom, address) | (read8(rom, address + 1) << 8);
}

export function read24(rom: Uint8Array, address: number): number {
  return read16(rom, address) | (read8(rom, address + 2) << 16);
}

export function scriptToRom(scriptAddress: number): number {
  return scriptBase + (scriptAddress & 0x7fff) + ((scriptAddress & 0xff8000) << 1);
}

/** 16bit の番号（3 の倍数）で指すスクリプトの表。部屋の仕掛けや NPC が使う */
function mapScriptTable(rom: Uint8Array): number {
  return scriptBase + read16(rom, scriptBase);
}

function globalScriptTable(rom: Uint8Array): number {
  return mapScriptTable(rom) + read16(rom, scriptBase + 8);
}

export function mapScript(rom: Uint8Array, id: number): number {
  return scriptToRom(read24(rom, mapScriptTable(rom) + id));
}

export function globalScript(rom: Uint8Array, id: number): number {
  return scriptToRom(read24(rom, globalScriptTable(rom) + 3 * id));
}

function roomData(rom: Uint8Array, room: number): number | null {
  const data = read24(rom, roomTable + 4 * room);
  return data >= 0x800000 && data <= 0xafffff ? data : null;
}

/** 部屋に入ったとき・踏んだとき・調べたときのスクリプト */
export function roomScripts(rom: Uint8Array, room: number): number[] {
  const data = roomData(rom, room);
  if (data == null) {
    return [];
  }
  const enter = scriptToRom(read24(rom, scriptBase + 0x1b + 5 * room));
  const stepLength = read16(rom, data + 0x0d);
  const buttonList = data + 0x0f + stepLength;
  const lists = [
    { start: data + 0x0f, length: stepLength },
    { start: buttonList + 2, length: read16(rom, buttonList) },
  ];
  // 踏む範囲と調べる範囲は 6 バイトの組で、末尾 2 バイトがスクリプトの番号
  const triggers = lists
    .filter((list) => list.length % 6 === 0 && list.length <= 600)
    .flatMap((list) =>
      Array.from(
        { length: list.length / 6 },
        (_, i) => mapScript(rom, read16(rom, list.start + 6 * i + 4)),
      )
    );
  return [enter, ...triggers];
}
