// 制御コードを 0x00-0x1F の新しい配置で読ませる。
// 3 箇所とも `CMP #$0x80` と分岐の 5 バイトで、どちらへ進むかだけを決めており、
// 続きの `AND #$0x7f` 以降がテーブルの添字を作る。
// この 5 バイトをフックへの JML に置き換え、判定だけを本来の値で行う。
// 添字の計算とハンドラーへの受け渡しは既存のコードにそのまま任せる。

// 幅測定ループの分岐（cc9e55）
org $CC9E55
	JML control_hook_measure
	db $EA

// 取り込みループの分岐（cc9f7a）
org $CC9F7A
	JML control_hook_ingest
	db $EA

// 実描画ループの分岐（cca1b6）
org $CCA1B6
	JML control_hook_draw
	db $EA

// フック本体
org {hook_control}

control_hook_measure:
	JSR control_index
	BCC measure_narrow
	ORA #$0080		// 元の値へ戻し、既存の添字計算へ渡す
	JML $CC9E5A
measure_narrow:
	JSR is_lead
	BCC measure_individual
	JML measure_wide
measure_individual:
	JML $CC9EA3

// 取り込みのハンドラーは制御コードを一時バッファへ積み、描画側がそれを読み直す。
// 積む値は cc9f82 が `$0x12` へ控えるが、原版の値のままでは
// 描画側が `0x81`-`0x9F` を 2 バイト文字の第 1 バイトとして読んでしまう。
// 本文のバイト（再配置後の値）を自分で控え、cc9f82 の控えを飛ばす。
control_hook_ingest:
	db $85,$12		// STA $12
	JSR control_index
	BCC ingest_narrow
	ORA #$0080
	JML $CC9F84		// cc9f82 の STA $12 を飛ばす
ingest_narrow:
	JSR is_lead
	BCC ingest_individual
	JML ingest_wide
ingest_individual:
	JML $CCA12E

control_hook_draw:
	JSR control_index
	BCC draw_narrow
	ORA #$0080
	JML $CCA1BE
draw_narrow:
	JSR is_lead
	BCC draw_individual
	JML draw_wide
draw_individual:
	JML $CCA30C

// A が Shift-JIS の第 1 バイト（0x81-0x9F、0xE0-0xEF）ならキャリーを立てる。A は変えない。
is_lead:
	CMP #$0081
	BCC is_lead_no
	CMP #$00A0
	BCC is_lead_yes
	CMP #$00E0
	BCC is_lead_no
	CMP #$00F0
	BCC is_lead_yes
is_lead_no:
	CLC
	RTS
is_lead_yes:
	SEC
	RTS

// A の値がジャンプテーブルへ送る制御コードかを判定する。
// 送るならキャリーを立てて A にテーブルの添字を返し、
// 送らないならキャリーを倒して A を元のまま返す。
//
// 再配置は高位ビットを落とす形なので、移した値がそのまま添字になる。
// `0x0C` だけは逃がし先のため添字と食い違い、単独で読み替える。
control_index:
	CMP #$0020
	BCC index_control
	CMP #$0080
	BCC index_plain		// 0x20-0x7F は表示文字
	CMP #$0081
	BCC index_legacy	// 0x80 は据え置きの可変長シーケンス
	JSR is_lead
	BCS index_plain		// Shift-JIS の第 1 バイト
index_legacy:
	AND #$007F
	SEC
	RTS
index_plain:
	CLC
	RTS

index_control:
	CMP #$0001
	BCC index_plain		// 0x00 は終端
	CMP #$0008
	BCC index_moved		// 0x01-0x07（名前の埋め込み・入力待ち・改ページ）
	CMP #$000C
	BEQ index_choice
	CMP #$0012
	BCC index_plain		// 0x08-0x0B は元から個別に処理される
	CMP #$0015
	BCC index_moved		// 0x12-0x14（配置モード）
	CMP #$0016
	BCC index_plain
	CMP #$0018
	BCC index_moved		// 0x16-0x17（用途未特定）
	CLC
	RTS
index_choice:
	LDA #$000B		// 0x0C は 0x8B のテーブル位置へ戻す
index_moved:
	SEC
	RTS
warnpc {hook_control}+$100
