// Get_mes0 と Get_mes1 が使う圧縮込みの 15bit + 7bit 方式をやめ、
// packages/features/dialog/insert/pack.ts の writePointer が書く 24bit リトルエンディアンを
// そのままロングアドレスとして読むようにする。展開ルーチン本体は
// 呼ばれなくなるだけで残す。書き換え先は Get_mes0・Get_mes1 の内部
// （`AND #$0x7fff` の位置）である。
// 書き換えの命令列は SecretOfEverhack（https://github.com/Gemini-Loboto3/SecretOfEverhack）の
// hack/hacks.s から取った。packages/app/patch/main.s の message と message_ptr の定義も同じである。
org $CCCD01
	STA {message}
	INY
	db $B7,$26	//LDA [{message_ptr}], Y
	XBA
	AND.w #$00FF
	STA {message}+2
	RTL

org $CCCD3F
	STA {message}
	INY
	db $B7,$26	//LDA [{message_ptr}], Y
	XBA
	AND.w #$00FF
	STA {message}+2
	RTL
