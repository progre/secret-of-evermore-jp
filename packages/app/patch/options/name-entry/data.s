// 名前入力で選べる文字の表（packages/features/name-entry/name-table.ts が作る）
org {name_table}
incbin "build/name-table.bin"

// 濁点と半濁点の対応表。基本・濁音・半濁音の 3 つ組が並び、終端は 0x0000
org {name_voice}
incbin "build/name-voice.bin"
