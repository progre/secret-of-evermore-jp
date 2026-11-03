// 固定テキストを原版のオフセットで指す参照の読み替え。
// 固定テキストはバンクごと移したが、既知の表の外にあるデータは原版のオフセットを持ったまま残る。
// 表示ルーチン（Display_mes）と、知らせを組み立てる文字列の連結（$80B149）の入口で、
// 原版の区画にあたる範囲を指していれば、読み替え表 {fixed_redirect} で新しい位置へ直す。
// 対象のバンクは、移した先のバンクと原版のバンク C4 の 2 つである。
// 直値で積むバンクは、移すときに移した先へ書き替わる。
// データが 24bit のポインタで持つバンクは C4 のまま残る。モンスターの名前がこれにあたる。
// 範囲の $60AE-$781D は packages/features/fixed/install.ts の originalRange と同じ値である。
// 表は旧位置 1 つにつき 2 バイトで、$FFFF は読み替えない。

org $CC9E03
	JSL fixed_redirect_hook

// 連結の先頭の SEP #$20 / LDY #$0000（5 バイト）を置き換える
org $80B149
	JSL concat_redirect_hook
	NOP

// 錬金術のレベルアップは、書き替え済みの表から新しいオフセットを引くため、バンクも移した先にする。
// STA $28 の形は画像の転送にも使われ、一括では書き替えられない
org $91CD62
	db ({fixed_text}>>16)

org {hook_redirect}
fixed_redirect_hook:
	PHX
	LDX.w #{message}
	JSR fixed_redirect
	PLX
	JML $8CB5A4		// 置き換えた JSL の先。戻りは Display_mes の続き（cc9e07）になる

concat_redirect_hook:
	PHX
	LDX.w #$0026		// 連結元のポインタ
	JSR fixed_redirect
	PLX
	SEP #$20
	LDY #$0000
	RTL

// X が指すダイレクトページの 24bit ポインタを読み替える。A を壊す
fixed_redirect:
	LDA.b $02,x
	AND #$00FF
	CMP #$00C4
	BEQ fixed_redirect_check
	CMP.w #({fixed_text}>>16)
	BNE fixed_redirect_done
fixed_redirect_check:
	LDA.b $00,x
	SEC
	SBC #$60AE
	CMP #$1770
	BCS fixed_redirect_done
	PHX
	ASL
	TAX
	LDA.l {fixed_redirect},x
	PLX
	CMP #$FFFF
	BEQ fixed_redirect_done
	STA.b $00,x
	SEP #$20
	LDA.b #({fixed_text}>>16)
	STA.b $02,x
	REP #$20
fixed_redirect_done:
	RTS
warnpc {hook_redirect}+$100
