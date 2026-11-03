/** スクリプトの命令 1 つの読み解き。分岐・呼び出し・ウィンドウ・文だけを取り出す */

import { globalScript, mapScript, read16, read24, read8, scriptToRom } from "../address.ts";
import { expressionEnd } from "./expression.ts";
import { layouts } from "./layouts.ts";

type Call = { address: number; global: number | null };

export type WindowSetting = {
  opcode: number;
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 文を出す命令。`queued` は 1 行のウィンドウに順に出す知らせ */
type Text = { slot: number; message: number; queued: boolean };

export type Instruction = {
  /** 次の命令の位置。流れが終わるか、読めなければ null */
  next: number | null;
  known: boolean;
  branches: number[];
  calls: Call[];
  window: WindowSetting | null;
  defaultWindow: boolean;
  text: Text | null;
};

const ends = [0x00, 0xab];

function plain(next: number | null): Instruction {
  return {
    next,
    known: true,
    branches: [],
    calls: [],
    window: null,
    defaultWindow: false,
    text: null,
  };
}

const signed16 = (value: number) => (value << 16) >> 16;

function call(next: number, address: number, global: number | null = null): Instruction {
  return { ...plain(next), calls: [{ address, global }] };
}

function decodeLayout(rom: Uint8Array, start: number, layout: string): Instruction {
  const result = plain(null);
  let at: number | null = start;
  for (const part of layout) {
    if (at == null) {
      break;
    }
    if (part === "e") {
      at = expressionEnd((p) => read8(rom, p), at);
    } else if (part === "j") {
      result.branches.push(at + 2 + signed16(read16(rom, at)));
      at += 2;
    } else if (part === "n") {
      result.calls.push({ address: mapScript(rom, read16(rom, at)), global: null });
      at += 2;
    } else {
      at += part === "b" ? 1 : part === "w" ? 2 : 3;
    }
  }
  return at == null ? { ...result, known: false } : { ...result, next: at };
}

function expressionsEnd(rom: Uint8Array, start: number, count: number): number | null {
  let at: number | null = start;
  for (let i = 0; i < count && at != null; i++) {
    at = expressionEnd((p) => read8(rom, p), at);
  }
  return at;
}

/** 錬金術の発動。3 つの式に続き、値 0 の式で終わる対象の並びを持つ */
function decodeAlchemy(rom: Uint8Array, at: number): Instruction {
  let end = expressionsEnd(rom, at + 1, 3);
  for (let i = 0; i < 16 && end != null; i++) {
    const element = read8(rom, end);
    const isZero = (element & 0x7f) === 0x30 ||
      ((element & 0x7f) === 0x02 && read8(rom, end + 1) === 0);
    end = expressionEnd((p) => read8(rom, p), end);
    if (isZero) {
      break;
    }
  }
  return end == null ? { ...plain(null), known: false } : plain(end);
}

/** 引数を式で渡す呼び出し。呼び先の指し方は命令ごとに違う */
function decodeCallWithArguments(rom: Uint8Array, at: number, opcode: number): Instruction {
  const end = expressionsEnd(rom, at + 2, read8(rom, at + 1));
  if (end == null) {
    return { ...plain(null), known: false };
  }
  switch (opcode) {
    case 0xb0:
      return call(end + 1, globalScript(rom, read8(rom, end)), read8(rom, end));
    case 0xb1:
      return call(end + 2, mapScript(rom, read16(rom, end)));
    case 0xb2:
      return plain(end + 1);
    case 0xb3:
      return plain(end + 2);
    default:
      return call(end + 3, scriptToRom(read24(rom, end)));
  }
}

/** 相対の呼び出し先。バンクの前半 32KB に落ちたら、詰めて数えた前後のバンクへ移す */
function relative(at: number, offset: number, wide: boolean): number {
  const target = at + offset;
  if (target & 0x8000) {
    return target;
  }
  return wide && offset >= 0 ? target + 0x8000 : target - 0x8000;
}

export function decode(rom: Uint8Array, at: number): Instruction {
  const opcode = read8(rom, at);
  const byte = (offset: number) => read8(rom, at + offset);
  const layout = layouts.get(opcode);
  if (layout != null) {
    return decodeLayout(rom, at + 1, layout);
  }
  if (ends.includes(opcode)) {
    return plain(null);
  }
  if (opcode >= 0x44 && opcode <= 0x47) {
    const window = {
      opcode,
      slot: byte(1),
      x: byte(2),
      y: byte(3),
      width: byte(4),
      height: byte(5),
    };
    return { ...plain(at + 6), window };
  }
  if (opcode >= 0x48 && opcode <= 0x4b) {
    return { ...plain(at + 1), defaultWindow: true };
  }
  if (opcode === 0x50) {
    return {
      ...plain(at + 4),
      text: { slot: byte(1), message: read16(rom, at + 2) / 3, queued: false },
    };
  }
  if (opcode === 0x51 || opcode === 0x52) {
    const text = { slot: 0, message: read16(rom, at + 1) / 3, queued: opcode === 0x52 };
    return { ...plain(at + 3), text };
  }
  switch (opcode) {
    case 0x07:
    case 0x29:
      return call(at + 4, scriptToRom(read24(rom, at + 1)));
    case 0xa3:
      return call(at + 2, globalScript(rom, byte(1)), byte(1));
    case 0xa4:
      return call(at + 3, mapScript(rom, read16(rom, at + 1)));
    case 0xa5:
      return call(at + 2, relative(at, byte(1) - 0x100, false));
    case 0xa6:
      return call(at + 3, relative(at, signed16(read16(rom, at + 1)), true));
    case 0x9e:
    case 0xac:
      return decodeAlchemy(rom, at);
  }
  if (opcode >= 0xaf && opcode <= 0xb4) {
    return decodeCallWithArguments(rom, at, opcode);
  }
  return { ...plain(null), known: false };
}
