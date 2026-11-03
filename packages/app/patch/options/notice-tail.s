// 組み立てる知らせの語順の入れ替え。
// レベルアップなどの知らせは「名前、文字列、数」の順でつなぎ、数を書いた直後に表示へ進む。
// 数の後ろにも訳文を置けるよう、数を書く命令をフックへ替え、数の手前の文字列の後半をつなぐ。
// 訳文は「前半{00}後半」と書き、後半は最初の終端の次から読む。
// 対象の件が訳され {00} を含むことは packages/features/fixed/install.ts が検査する。

// 名前、「 reaches level 」、数（$80B21F）
org $8F8374
	JSL tail_number
org $8F8559
	JSL tail_number

// 武器の名前と「 is now level 」、犬の「Dog attack now level 」、錬金術の名前と「 now level 」。
// 数は 1 桁で、ADC #$0030 / STA [$22],Y が字と終端を書く
org $8F97A3
	JSL tail_digit
	NOP
org $8F97F7
	JSL tail_digit
	NOP
org $91CD9A
	JSL tail_digit
	NOP

// 「Received 」、数、空白、通貨の名前。
// 日本語では「100タロンを手に入れた」とするため、数の後ろの空白を通貨の名前で上書きし、
// 通貨の名前の後ろに後半をつなぐ
org $8F86D6
	NOP			// INC。空白の分だけ書く位置を進めない
org $8F86EE
	JSL tail_received

org {hook_notice}

// [{message_ptr}] の最初の終端の次から、後半を A の位置へつなぐ。
// {message} と Y は呼び出し前の値へ戻す。{message_ptr} は後半を指したまま残る
tail_append:
	PHY
	db $D4,$22		// PEI ($22)
	STA {message}
	LDY #$0000
	SEP #$20
tail_skip:
	db $B7,$26		// LDA [$26],Y
	BEQ tail_found
	INY
	BRA tail_skip
tail_found:
	REP #$20
	TYA
	SEC			// 終端の次
	ADC {message_ptr}
	STA {message_ptr}
	JSL $80B149
	PLA
	STA {message}
	PLY
	RTS

// 数を書き、その終端（$80B21F が X に返す）の位置から後半をつなぐ
tail_number:
	JSL $80B21F
	PHX
	TXA
	JSR tail_append
	PLX
	RTL

// 1 桁の数を字と終端で書き、終端の位置から後半をつなぐ。呼び出し元は X を後で使う
tail_digit:
	ADC #$0030
	db $97,$22		// STA [$22],Y
	PHX
	TYA
	SEC			// 字の次が終端
	ADC {message}
	JSR tail_append
	PLX
	RTL

// 通貨の名前をつなぎ、その後ろへ「Received 」の後半をつなぐ。
// 「Received 」を指す直値（8f86b8 と 8f86bd）は、固定テキストを移すときに書き替わるので、
// 書き替わった値をそのまま読む
tail_received:
	JSL $80B149
	TYA
	CLC
	ADC {message}
	PHA
	LDA.l $8F86B9
	STA {message_ptr}
	SEP #$20
	LDA.l $8F86BE
	db $85,$28		// STA $28。絶対番地にならないよう直に書く
	REP #$20
	PLA
	JSR tail_append
	RTL
warnpc {hook_notice}+$100
