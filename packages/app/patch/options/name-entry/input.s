// 名前欄への書き込みと削除。

org {hook_name_input}

// 選んだ文字を名前バッファへ書き、画面にも出して索引を 2 進める。
// バッファへ入れるのは Shift-JIS の生の値で、描画へ渡すのはグリフ番号である。
// 16bit の STA なので 1 度で 2 バイト書ける。
// 原版は上位バイトが 0 の値を書くので終端が勝手に付いたが、
// 2 バイト文字では埋まってしまうため、次の 2 バイトへ自分で 0 を置く
name_store:
	LDA {glyph}
	CMP #{mark_voiced}
	BEQ name_store_mark
	CMP #{mark_half}
	BEQ name_store_mark
	PHX
	LDA {glyph}
	TXY
	JSR name_put
	db $A4,$8E		// LDY $8E
	LDA {glyph}
	JSR name_glyph
	db $22,$AF,$A3,$8C	// JSL $8CA3AF
	PLX
	INX
	INX
	RTL

// A の字を [{message}],Y へ置き、続く 2 バイトを終端にする。Y は動かさない
name_put:
	db $97,$22		// STA [{message}],Y
	INY
	INY
	LDA #$0000
	db $97,$22		// STA [{message}],Y
	DEY
	DEY
	RTS

// 濁点と半濁点は 1 文字として入れず、直前の字を濁った字へ置き換える。
// 「タ」に濁点で「ダ」になる。「タ゛」と 2 文字にすると本編の会話にもそのまま出る。
// 基本字と濁音の字は細部が違い、重ねて描くと崩れるため、
// 削除の処理（$8CB9D9）を借りて升を消してから描き直す
name_store_mark:
	CPX #$0002
	BCC name_store_ret	// 直前の字が無い
	PHX
	DEX
	DEX
	TXY
	db $B7,$22		// LDA [{message}],Y。直前の字
	JSR name_voice
	BEQ name_store_pop	// 濁点の付かない字だった
	PHA			// 濁った字。削除処理が {glyph} を使うので積んでおく
	db $A6,$8E		// LDX $8E
	db $22,$D9,$B9,$8C	// JSL $8CB9D9。升を消して書き込み位置を戻す
	PLA
	STA {glyph}
	JSR name_put
	db $A4,$8E		// LDY $8E
	LDA {glyph}
	JSR name_glyph
	db $22,$AF,$A3,$8C	// JSL $8CA3AF
name_store_pop:
	PLX
name_store_ret:
	RTL

// 直前の字に濁点か半濁点を付けた字を返す。付かない字なら 0 を返す。
// どちらの印かは {glyph} で判る。Y は触らない
name_voice:
	db $85,$14		// STA $14。探す字
	PHX
	LDX #$0000
name_voice_loop:
	LDA.l {name_voice},x	// 基本の字
	BEQ name_voice_none
	db $C5,$14		// CMP $14
	BEQ name_voice_hit
	INX
	INX
	INX
	INX
	INX
	INX
	BRA name_voice_loop
name_voice_hit:
	INX
	INX			// 濁音の欄へ
	LDA {glyph}
	CMP #{mark_half}
	BNE name_voice_take
	INX
	INX			// 半濁音の欄へ
name_voice_take:
	LDA.l {name_voice},x
	PLX
	CMP #$0000		// PLX で立った Z を A で立て直す
	RTS
name_voice_none:
	PLX
	LDA #$0000
	RTS

// 削除。原版は索引を 1 バイトだけ戻して消しに行く。
// 呼び出し元の DEY と合わせて 2 バイトぶん戻す
name_delete:
	DEY
	db $22,$D9,$B9,$8C	// JSL $8CB9D9
	RTL

// 消す升の位置を求める。A は消す字、X はウィンドウを指す。
// 原版は 8bit で計算し、幅を 1 バイトの添字で `[{width_ptr}],Y` から引くため、
// 2 バイト文字では違う値になる。16bit のまま width_read で引き直す。
// 戻り先の cc:ba12 は消す字を {glyph} から取るので、グリフ番号にして置く
name_erase:
	JSR name_glyph
	STA {glyph}
	SEC
	SBC #$0020
	PHX			// width_read が TAX で X を壊す
	JSL width_read
	PLX
	PHA			// 幅
	db $BD,$02,$00		// LDA $0002,X。升の Y
	db $85,$48		// STA $48
	db $BD,$00,$00		// LDA $0000,X。次に書く位置
	SEC
	db $FD,$06,$00		// SBC $0006,X。字送りの間隔
	db $E3,$01		// SBC $01,S。幅
	db $85,$46		// STA $46。升の X
	db $9D,$00,$00		// STA $0000,X。書き込み位置を 1 文字ぶん戻す
	PLA
	JML $CCBA12

// 升への描画。cca5a2 は先頭で SBC #$0020 するため、上乗せこみの値を渡す
name_draw:
	LDA {glyph}
	JSR name_glyph
	db $22,$A2,$A5,$8C	// JSL $8CA5A2
	RTL
warnpc {hook_name_input}+$100

// 選んだ文字の幅。升目と同じく日本語の経路へ向ける
org $CCB9B6
	JSL name_width
	NOP
	NOP
	NOP
	NOP
	NOP
	NOP

// 選んだ文字を名前へ書き込む。2 バイト書いて索引を 2 進める。
// 末尾の RTL は、収まらないときの分岐先（`cc:b9c8` の BPL）なので残す
org $CCB9CA
	JSL name_store
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
	RTL

// 削除は索引を 1 バイトしか戻さない。かなは 2 バイトなのでもう 1 つ戻す
org $CCB97D
	JSL name_delete

// 削除するとき、消す字を 1 バイトに切っていた
org $CCB9DC
	NOP
	NOP
	NOP

// 消す升の位置の計算。原版は 8bit で行い、幅を 1 バイトの添字で引く。
// 以降の 27 バイトは name_erase が引き受けるので使われない
org $CCB9F7
	JML name_erase

// 升への描画
org $CCBB5E
	JSL name_draw
	NOP
	NOP
