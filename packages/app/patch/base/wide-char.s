// 2 バイト文字。
// グリフ番号 = 先頭表[第 1 バイト] + (第 2 バイト - 0x40) - (第 2 バイト > 0x7F なら 1)
// 求めたグリフ番号に 0x20 を足して渡すと、既存の `SBC #$0x20` がそのまま戻す。
//
// さらに 0x800 を上乗せする。cca3af は 0x84-0xFF を制御コードの
// ジャンプテーブルへ送るため、この範囲に落ちるグリフ番号は
// テーブルの外を関数ポインタとして読んで暴走する。
// 1 グリフ 32 バイト間隔なので上乗せぶんはちょうど 1 バンクにあたり、
// グリフの位置は「f1 バンクの先頭 + グリフ番号 * 32」で求まる。
//
// 日本語はフォントの所在をゲームの変数（`$0x92`-`$0x94`・`!$0xb3f`・`!$0xb41`）で
// 渡さない。これらを書き換えるとメニューなどの英語表示が崩れるためである。

org {hook_wide}

// グリフ番号が上乗せぶんの 0x820 に満たないのは、先頭表を持たない第 1 バイト（0x85-0x87）が来たときか、
// 第 2 バイトが範囲外の不正な並びのときである。その場合はグリフ 0 にして暴走を防ぐ。
wide_clamp:
	CMP #$0820		// 0x800（上乗せ）+ 0x20（既存の SBC ぶん）
	BCS wide_clamp_done
	LDA #$0820
wide_clamp_done:
	RTS

// 第 2 バイトを A に取り、テーブル内の位置へ直す
wide_trail:
	AND #$00FF
	SEC
	SBC #$0040
	CMP #$0040
	BCC wide_trail_done
	db $3A			// DEC A。0x7F を飛ばすぶん
wide_trail_done:
	RTS

measure_wide:
	PHX
	SEC
	SBC #$0081
	ASL
	TAX			// X = 先頭表の添字
	db $B7,$22		// LDA [{message}],Y。第 2 バイト
	INY
	JSR wide_trail
	CLC
	ADC.l {lead_offset},x	// 先頭表を足す
	CLC
	ADC #$0820
	JSR wide_clamp
	PLX
	// ここから cc9ed6-cc9ef4 の幅加算と同じ処理。
	// 末尾だけ cc9e49（次の文字へ）ではなく幅判定へ向ける。
	SEC
	SBC #$0020		// 上乗せぶんの 0x20 を戻す
	PHY
	PHA
	LDA $02			// 保留幅を単語の幅へ繰り入れる
	CLC
	ADC $0a
	STA $0a
	STZ $02
	PLA
	JSL width_read
	CLC
	ADC $0a
	LDY $8e
	CLC
	db $79,$06,$00		// ADC $0006,Y。字間
	STA $0a
	PLY
	JML $CC9F4E		// cc9f4e は先頭で PLX する。ここで PLX してはならない

ingest_wide:
	db $9D,$B1,$05		// STA $05B1,X。第 1 バイトを積む
	INX
	db $B7,$22		// LDA [{message}],Y。第 2 バイト
	INY
	AND #$00FF
	db $9D,$B1,$05		// STA $05B1,X。第 2 バイトを積む
	INX
	// スペースの処理（cca176）と同じ形で 1 文字ぶんを確定する
	TYA
	CLC
	db $65,$22		// ADC {message}
	db $85,$22		// STA {message}
	JML $CC9E44		// 測定へ戻す

draw_wide:
	PHX
	SEC
	SBC #$0081
	ASL
	TAX
	LDA.l {lead_offset},x	// 先頭表
	PLX
	PHA			// 先頭表の値を退避
	db $BD,$B1,$05		// LDA $05B1,X。第 2 バイト
	INX
	JSR wide_trail
	CLC
	db $63,$01		// ADC $01,S
	CLC
	ADC #$0820
	db $83,$01		// STA $01,S
	PLA
	JSR wide_clamp
	JML $CCA30C		// 表示文字の描画へ
warnpc {hook_wide}+$100
