/**
 * features が共有する型。
 * トークン付きテキストの書式と、原版と日本語版の codec の実装は `@features/encoding` にある。
 * features は `@features/encoding` を import せず、app と utils から関数の引数で受け取る。
 */

/** トークン付きテキストを読んだ結果の部品。トークンは表示上の役割まで見分けてある */
export type Piece =
  | { kind: "char"; value: string }
  | { kind: "newline" }
  | { kind: "pageBreak" }
  /** 名前・アイテム名・数量などを差し込む */
  | { kind: "embed" }
  /** そのほかの制御コード */
  | { kind: "control" }
  /** 話者の印。ROM へは書かない */
  | { kind: "speaker"; name: string };

/** トークン付きテキストとバイト列を相互に変換する codec */
export interface TextCodec {
  /** 表せない字は落として `missing` に積む */
  encode(text: string): { bytes: Uint8Array; missing: string[] };
  decode(bytes: Uint8Array): string;
}
