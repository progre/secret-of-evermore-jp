// 1 バイトの英字（原版のフォント）を、描く位置で 1 ドット下げる。
// 日本語の字は升目の 1-9 行目にあり、英字の大文字は 1-8 行目にある。
// 英字を 1 ドット下げると、大文字の下端が日本語の字の下端（9 行目）とそろう。
// 英字の絵をずらすと、升目の最下行（11 行目）を使う g・j・y の下端が欠けるため、
// 絵はそのままにして描き先の Y だけを下げる。
//
// 描き先は cca5d2 以降で `Y（$48）+ 列の位置（$4216）` として求まる。
// 太字では同じ字を 2 回描くため、$48 そのものではなく、この計算の結果に足す。
// 2 バイトの字かどうかは、直前の glyph_setup が {wide_flag} に置いている。

org {hook_narrow}

narrow_offset:
	db $A5,$48		// LDA $48
	CLC
	db $6D,$16,$42		// ADC $4216
	PHA
	SEP #$20
	LDA.l {wide_flag}
	REP #$20
	BNE narrow_offset_wide
	PLA
	INC
	RTL
narrow_offset_wide:
	PLA
	RTL
warnpc {hook_narrow}+$100

// cca5d2 の LDA $48 / CLC / ADC $4216（6 バイト）
org $CCA5D2
	JSL narrow_offset
	NOP
	NOP
