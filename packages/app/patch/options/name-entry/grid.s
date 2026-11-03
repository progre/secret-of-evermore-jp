// 名前入力のかな対応。
// 原版は 1 バイトの ASCII を並べた表から選ばせる。
// かなは Shift-JIS の 2 バイトなので、表の読み方・幅・描画を 2 バイトへ直す。
// 升目は固定ピッチで折り返すため、升の数さえ合えば並べ方は変わらない。

// 選べる升の総数。原版はウィンドウの縦横を掛けて求めるが、表から数えた値に差し替える。
// 表の長さを変えてもコードを直さずに済む
org $CCBAB8
	JSL name_count
	NOP
	NOP

// 画面に入るときのカーソル位置。原版は 0x47 で、72 升の末尾＝決定のキーを指す。
// 日本語版は 60 升なので、末尾は 0x3B になる。
// 直後の `LDX $22` は名前が空のときの再入（`cd:82e8`）の飛び先なので触れない。
// 表を数えて求める余地が 3 バイトしかないため、値は packages/features/name-entry/name-table.ts が
// 升の総数を検査して守る
org $CD82CB
	LDA #$003B

// カーソルの折り返しを、数えた総数と比べる形にする（原版は CMP #$0048）
org $CCB8C4
	db $DD,$30,$00		// CMP $0030,X

// カーソル位置の文字を 2 バイトで取る
org $CCB931
	JSL name_pick
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP

// 1 行に並べる升の数。原版は 18 で、4 行と掛けて 72 升になる。
// 15 にすると 4 行 × 15 = 60 升で表とちょうど合い、行がかなの段で揃う。
// カーソルの位置も「カーソル ÷ この値」で求まるため、表と揃えないと指す升がずれる
org $CD81B3
	LDA #$000F

// 桁幅は「枠幅 ÷ 1 行の升数」で求める。
// 切り捨てだと余りぶんの隙間へ升が 1 つ余計に入り、
// 「カーソル ÷ 升数」で位置を出すカーソル側と数え方がずれる。
// 割られる数に「升数 - 1」を足して切り上げにすると、必ず升数ちょうどで折り返す
org $CCBAC5
	JSL name_pitch
	NOP
	NOP

// 升目を描くループの読み出し
org $CCBB13
	JSL name_fetch
	NOP
	NOP
	NOP
	NOP

// 升に置く文字の幅
org $CCBB1F
	JSL name_width
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP

org {hook_name_grid}

// 表から 1 升ぶんの値を取り、添字を 2 進める。
// 呼び出し元は戻り値の Z で終端を判る。INX は Z を X で立て直してしまうため、
// 取った値を積んでおき、最後に PLA で Z を立て直す
name_fetch:
	LDA.l {name_table},x
	PHA
	INX
	INX
	PLA
	RTL

// カーソル位置の値を取る。原版と同じく X はカーソル番号にして返す
name_pick:
	db $BD,$36,$00		// LDA $0036,X
	TAX
	PHX
	TXA
	ASL
	TAX
	LDA.l {name_table},x
	PLX
	RTL

// 桁幅の割り算を切り上げにする。Y はウィンドウの情報を指したまま返す
name_pitch:
	db $B9,$0E,$00		// LDA $000E,Y。枠幅
	CLC
	db $79,$2E,$00		// ADC $002E,Y。1 行の升数
	db $3A			// DEC A
	db $8D,$04,$42		// STA $4204
	RTL

// 表の升数を数えて総数として置く
name_count:
	PHX
	LDX #$0000
name_count_loop:
	LDA.l {name_table},x
	BEQ name_count_done
	INX
	INX
	BRA name_count_loop
name_count_done:
	TXA
	LSR
	db $99,$30,$00		// STA $0030,Y
	PLX
	RTL

// 表の値をグリフ番号へ直す。
// 操作キーは 0x7F・0x7E のまま置いてあるので、小さい値はそのまま返す
name_glyph:
	CMP #$0100
	BCC name_glyph_done
	PHX
	PHA
	AND #$00FF		// 第 1 バイト
	SEC
	SBC #$0081
	ASL
	TAX
	PLA
	XBA			// 第 2 バイトを下位へ
	JSR wide_trail
	CLC
	ADC.l {lead_offset},x	// 先頭表
	CLC
	ADC #$0820
	JSR wide_clamp
	PLX
name_glyph_done:
	RTS

// 升に置く文字の幅。width_read が英数とかなを振り分ける。
// 呼び出し元は X を表の添字として持ち回るが、width_read は広い側で TAX して壊す。
// 原版は幅の計算に X を使わないため守っていない。ここで守る
name_width:
	LDA {glyph}
	JSR name_glyph
	SEC
	SBC #$0020
	PHX
	JSL width_read
	PLX
	RTL
warnpc {hook_name_grid}+$100
