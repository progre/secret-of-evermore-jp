org {hook_glyph}

// フォント内の位置と、それが載るバンクを求める。
// 英語は原版どおり 8x8 の乗算ユニットを 2 回使い、バンク f0 の添字を返す。
// 日本語は 32 バイト間隔なので桁をずらすだけで求まり、
// 上位の桁がそのままバンクの増分になる。
glyph_setup:
	LDA {glyph}
	CMP #$0800
	BCS glyph_wide

glyph_narrow:
	SEP #$20
	STZ {wide_flag}
	LDA {font_size}
	STA $4202
	LDA {glyph}
	STA $4203		// 乗数を書くと乗算が始まる
	REP #$20
	NOP
	NOP
	NOP			// 積が出るまで待つ
	LDA $4216
	PHA
	SEP #$20
	db $A5,$13		// LDA {glyph}+1。グリフ番号の上位バイト
	STA $4203
	REP #$20
	NOP
	NOP
	NOP
	LDA $4216
	XBA
	AND #$FF00		// 上位バイトぶんは 256 倍
	CLC
	db $63,$01		// ADC $01,S
	db $83,$01		// STA $01,S
	PLA
	CLC
	ADC {font_base}
	RTL

glyph_wide:
	XBA
	AND #$00FF
	LSR
	LSR
	LSR			// グリフ番号 >> 11。f0 からのバンク増分
	SEP #$20
	STA {wide_flag}
	REP #$20
	LDA {glyph}
	ASL
	ASL
	ASL
	ASL
	ASL			// グリフ番号 * 32 の下位 16bit
	RTL

// グリフデータの 1 バイト読み出し。バンクだけを選び分ける。
// 呼び出し元が DB を 7f にしているため、判定はロングで読む。
// JIS X 0208 の全字で 4 バンクにわたる。字の多い前のバンクほど先に判定する。
glyph_read:
	SEP #$20
	db $AF,$40,$0B,$00	// LDA $000B40
	BEQ glyph_read_f0
	db $C9,$01		// CMP #$01
	BEQ glyph_read_f1
	db $C9,$02		// CMP #$02
	BEQ glyph_read_f2
	db $C9,$03		// CMP #$03
	BEQ glyph_read_f3
	REP #$20
	LDA.l {glyphs}+$30000,x
	RTL
glyph_read_f3:
	REP #$20
	LDA.l {glyphs}+$20000,x
	RTL
glyph_read_f2:
	REP #$20
	LDA.l {glyphs}+$10000,x
	RTL
glyph_read_f1:
	REP #$20
	LDA.l {glyphs},x
	RTL
glyph_read_f0:
	REP #$20
	LDA.l {original_font},x
	RTL

// 文字幅の参照。日本語は幅テーブルを直に引き、英語はゲームのポインタを使う。
// A にグリフ番号を取り、幅を返す。
width_read:
	CMP #$0800
	BCC width_narrow
	TAX
	LDA.l {widths}-$800,x	// グリフ番号に上乗せした 0x800 を差し引く
	AND #$00FF
	RTL
width_narrow:
	PHY
	TAY
	db $B7,$92		// LDA [{width_ptr}],Y
	PLY
	AND #$00FF
	RTL

// cca3af の上限判定。0x100 以上は 2 バイト文字のグリフ番号なので通す。
wide_dispatch:
	CMP #$0084
	BMI dispatch_glyph
	CMP #$0100
	BPL dispatch_glyph
	JML $CCA3BF		// 0x84-0xFF は元のジャンプテーブルへ
dispatch_glyph:
	JML $CCA4FE
warnpc {hook_glyph}+$100

// ここから下は、2 バイト文字を描くための書き換え箇所。

// cca3af の上限判定（cca3b7 の 5 バイト）
org $CCA3B7
	JML wide_dispatch
	db $EA

// 幅の参照は 3 箇所ある。いずれも A にグリフ番号が入った状態にして渡す。

// 幅測定（cc9ee5 の 5 バイト）。ここだけ Y にグリフ番号が入っている
org $CC9EE5
	TYA
	JSL width_read

// 折り返し境界との比較（cca552 の 5 バイト）
org $CCA552
	JSL width_read
	NOP

// 描画するグリフの幅（cca5a9 の 7 バイト）
org $CCA5A9
	JSL width_read
	NOP
	NOP
	NOP

// グリフ番号からフォント内の位置を求める（cca5b5 からの 17 バイト）
org $CCA5B5
	JSL glyph_setup
	TAX
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP

// グリフデータの参照をバンク選択つきにする（cca60c）
org $CCA60C
	JSL glyph_read

// 升を消すルーチン（cca928）の幅参照。描画側の cca5a9 と同じ形をしている。
// 消す幅を自前で引くため、ここを直さないと 2 バイト文字が消し残る
org $CCA935
	JSL width_read
	NOP
	NOP
	NOP
