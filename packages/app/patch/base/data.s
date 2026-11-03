// original_font は原版フォントの複製（packages/features/font/game/original.ts が写す）。
// 日本語のグリフは次のバンクの先頭から 32 バイト間隔で並べ、
// その後ろに幅テーブル・先頭表・ダイアログ本体を続ける
org {glyphs}
incbin "build/font.bin"
org {widths}
incbin "build/width.bin"
org {lead_offset}
incbin "build/lead-offset.bin"
org {dialog_text}
incbin "build/text.bin"

// ダイアログのポインタテーブル。圧縮テーブル群は使わなくなるため上書きする
org {dialog_pointers}
incbin "build/ptr.bin"

// ROM を 4MB へ拡張する。チェックサムは適用しない（packages/app/rom.ts が後段で書く）
org $3fffff
db 0
