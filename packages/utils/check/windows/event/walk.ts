/**
 * 部屋のスクリプトから呼び出しを辿り、ウィンドウを設定する箇所ごとに、そこへ出る文を集める。
 * スクリプトは先頭から順に読み、終わりに来たら覚えておいた分岐先から読み直す。
 */

import { read8, roomCount, roomScripts } from "./address.ts";
import { decode, type Instruction, type WindowSetting } from "./decode/instruction.ts";

/**
 * ウィンドウを設定する箇所。
 * `preset` は共通スクリプトの型を `a3` で呼ぶ箇所で、`patchAt` は型の番号のバイト。
 * `inline` は設定を直に書く箇所で、`patchAt` は高さのバイト。
 * `shared` は型を別の命令で呼ぶ箇所、`default` は既定のウィンドウ。
 */
export type WindowSite = {
  kind: "preset" | "inline" | "shared" | "default";
  patchAt: number;
  window: WindowSetting;
  messages: Set<number>;
};

export type Survey = {
  sites: WindowSite[];
  /** 1 行のウィンドウに出る知らせ */
  queued: Set<number>;
  unknownInstructions: number;
};

type State = Map<number, WindowSite>;

const callPreset = 0xa3;
const defaultWindow = { opcode: 0x48, slot: 0, x: 2, y: 2, width: 0x1c, height: 0x0a };

/** 型は「ウィンドウの設定 1 つと終端」だけからなる共通スクリプト */
function presetAt(rom: Uint8Array, address: number): WindowSetting | null {
  const first = decode(rom, address);
  return first.window != null && first.next != null && read8(rom, first.next) === 0
    ? first.window
    : null;
}

export function survey(rom: Uint8Array): Survey {
  const sites = new Map<number, WindowSite>();
  const queued = new Set<number>();
  const effects = new Map<string, State>();
  const visiting = new Set<string>();
  let unknownInstructions = 0;

  const siteOf = (site: Omit<WindowSite, "messages">) => {
    const known = sites.get(site.patchAt) ?? { ...site, messages: new Set<number>() };
    sites.set(site.patchAt, known);
    return known;
  };

  const callSite = (at: number, address: number): WindowSite | null => {
    const window = presetAt(rom, address);
    if (window == null) {
      return null;
    }
    const isPresetCall = read8(rom, at) === callPreset;
    return siteOf({
      kind: isPresetCall ? "preset" : "shared",
      patchAt: isPresetCall ? at + 1 : address + 5,
      window,
    });
  };

  const apply = (at: number, instruction: Instruction, state: State, depth: number) => {
    const { window, text } = instruction;
    if (window != null) {
      state.set(window.slot, siteOf({ kind: "inline", patchAt: at + 5, window }));
    }
    if (instruction.defaultWindow) {
      state.set(0, siteOf({ kind: "default", patchAt: at, window: defaultWindow }));
    }
    if (text?.queued) {
      queued.add(text.message);
    } else if (text != null) {
      state.get(text.slot)?.messages.add(text.message);
    }
    for (const call of instruction.calls) {
      const site = callSite(at, call.address);
      if (site != null) {
        state.set(site.window.slot, site);
      } else {
        walk(call.address, state, depth + 1);
      }
    }
  };

  const walkBody = (start: number, state: State, depth: number) => {
    const targets: number[] = [];
    let at: number | null = start;
    for (let count = 0; count < 20000 && at != null; count++) {
      const instruction = decode(rom, at);
      if (!instruction.known) {
        unknownInstructions++;
      }
      targets.push(...instruction.branches);
      apply(at, instruction, state, depth);
      const current: number = at;
      at = instruction.next ?? targets.filter((t) => t > current).sort((a, b) => a - b).at(0) ??
        null;
    }
  };

  // 呼び先がウィンドウを開いて戻る形があるため、呼び先の状態を呼び元へ持ち帰る
  const walk = (start: number, state: State, depth: number) => {
    if (depth > 6) {
      return;
    }
    const key = start + ":" + Array.from(state, ([slot, site]) => slot + "@" + site.patchAt);
    const cached = effects.get(key);
    if (cached != null) {
      state.clear();
      cached.forEach((site, slot) => state.set(slot, site));
      return;
    }
    if (visiting.has(key)) {
      return;
    }
    visiting.add(key);
    walkBody(start, state, depth);
    effects.set(key, new Map(state));
  };

  for (let room = 0; room < roomCount; room++) {
    roomScripts(rom, room).forEach((script) => walk(script, new Map(), 0));
  }
  return { sites: Array.from(sites.values()), queued, unknownInstructions };
}
