// xkas-plus 向けのパッチ。ROM を 4MB へ拡張し、日本語データを拡張領域へ置く。
// 拡張領域の番地は `deno task build` が build/layout.s へ書き出し、`{glyphs}` などで参照する。
arch snes.cpu; hirom
incsrc build/layout.s

define message		$22
define message_ptr	$26

// 描画ルーチンが使う変数
define glyph		$12
define width_ptr	$92
define font_size	$0b3f
define font_base	$0b41

// 描画中の 1 文字が 2 バイト文字かを持ち回る。
// 原版で `!$0xb3f` を 16bit で読むのは cca5b8 だけで、このパッチは cca5b8 を書き換える。
// このため、`!$0xb3f` の上位バイトにあたる `$0b40` は誰も読まない。
define wide_flag	$0b40

// 名前入力の濁点と半濁点。
// 表からは 16bit で読むため、Shift-JIS の第 1 バイトが下位に来る
define mark_voiced	$4a81
define mark_half	$4b81

// フック本体は {hooks} の 4KB に、ファイルごと 256 バイトずつ置く。
// 各ファイルは本体の直後の warnpc で、自分の区画を超えていないことを確かめる。
define hook_control	{hooks}+$000
define hook_wide	{hooks}+$100
define hook_glyph	{hooks}+$200
define hook_redirect	{hooks}+$300
define hook_name_grid	{hooks}+$400
define hook_name_input	{hooks}+$500
define hook_notice	{hooks}+$600
define hook_shadow	{hooks}+$700
define hook_alchemy	{hooks}+$800
define hook_narrow	{hooks}+$900

// 取り込むファイルのパスは、この位置からではなく
// xkas を起動したディレクトリーからの相対で解決される。
// ラベルと define は全ファイルで 1 つの名前空間を共有する。
incsrc packages/app/patch/base/dialog-pointer.s
incsrc packages/app/patch/base/control-code.s
incsrc packages/app/patch/base/wide-char.s
incsrc packages/app/patch/base/glyph.s
incsrc packages/app/patch/base/fixed-redirect.s
incsrc packages/app/patch/base/data.s
incsrc packages/app/patch/options/notice-tail.s
incsrc packages/app/patch/options/shadow.s
incsrc packages/app/patch/options/narrow-offset.s
incsrc packages/app/patch/options/save-slot.s
incsrc packages/app/patch/options/alchemy-width.s
incsrc packages/app/patch/options/dog-name.s
incsrc packages/app/patch/options/name-entry/grid.s
incsrc packages/app/patch/options/name-entry/input.s
incsrc packages/app/patch/options/name-entry/data.s
