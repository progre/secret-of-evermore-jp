// 錬金術の設定の画面で、名前のウィンドウの右の上限だけを広げる。
// 左の余白は描き始める X にもなる（ccacb3）ため、余白は変えずに上限の計算にだけ足す。
//
// | 箇所 | 計算 |
// | cc9e07・ccaca3 | 折り返しの上限 `幅 × 8 − 余白 × 2` |
// | cca53c | 字ごとの残り `幅 × 8 − 余白 − X`。字の幅以上なら描かない |
//
// | 画面 | ウィンドウ | 上限に足す量 | 残りに足す量 |
// | 材料 | 左の列 $0379・右の列 $03DD、幅 10、余白 3 | 4（74 → 78、7 字 77 ドット） | 3 |
// | 術の一覧 | $0379、幅 12、余白 0、X 5（cdc3bb 以降） | 15（96 → 111、10 字 110 ドット） | 14 |
//
// 術名はレベルの列（X 17）のおよそ 2 タイル目まではみ出す。

org {hook_alchemy}

// Y が指すウィンドウの構造体が材料の名前のウィンドウなら、C を立てて戻る。A の値は保つ
ingredient_is_name:
	PHA
	db $C0,$79,$03		// CPY #$0379。左の列
	BEQ ingredient_size
	db $C0,$DD,$03		// CPY #$03DD。右の列
	BNE ingredient_no
ingredient_size:
	db $B9,$1C,$00		// LDA $001C,Y。幅
	db $C9,$0A,$00		// CMP #$000A
	BNE ingredient_no
	db $B9,$0A,$00		// LDA $000A,Y。左の余白
	db $C9,$03,$00		// CMP #$0003
	BNE ingredient_no
	PLA
	SEC
	RTS
ingredient_no:
	PLA
	CLC
	RTS

// Y が指すウィンドウの構造体が術の一覧の名前のウィンドウなら、C を立てて戻る。A の値は保つ
spell_is_name:
	PHA
	db $C0,$79,$03		// CPY #$0379
	BNE spell_no
	db $B9,$1C,$00		// LDA $001C,Y。幅
	db $C9,$0C,$00		// CMP #$000C
	BNE spell_no
	db $B9,$0A,$00		// LDA $000A,Y。左の余白
	BNE spell_no
	db $B9,$16,$00		// LDA $0016,Y。X 位置。幅 12・余白 0 の $0379 は X 18 の画面にもある
	db $C9,$05,$00		// CMP #$0005
	BNE spell_no
	PLA
	SEC
	RTS
spell_no:
	PLA
	CLC
	RTS

// cc9e11・ccacad の SBC $000A,Y / STA $000E,Y の代わり
alchemy_line:
	db $F9,$0A,$00		// SBC $000A,Y
	JSR ingredient_is_name
	BCC alchemy_line_spell
	db $69,$03,$00		// ADC #$0003。C が立っているので 4 足す
	BRA alchemy_line_store
alchemy_line_spell:
	JSR spell_is_name
	BCC alchemy_line_store
	db $69,$0E,$00		// ADC #$000E。C が立っているので 15 足す
alchemy_line_store:
	db $99,$0E,$00		// STA $000E,Y
	RTL

// cca546 の SBC $0000,Y / STA $14 の代わり
alchemy_room:
	db $F9,$00,$00		// SBC $0000,Y
	JSR ingredient_is_name
	BCC alchemy_room_spell
	db $69,$02,$00		// ADC #$0002。C が立っているので 3 足す
	BRA alchemy_room_store
alchemy_room_spell:
	JSR spell_is_name
	BCC alchemy_room_store
	db $69,$0D,$00		// ADC #$000D。C が立っているので 14 足す
alchemy_room_store:
	db $85,$14		// STA $14
	RTL
warnpc {hook_alchemy}+$100

org $CC9E11
	JSL alchemy_line
	NOP
	NOP

org $CCACAD
	JSL alchemy_line
	NOP
	NOP

org $CCA546
	JSL alchemy_room
	NOP
