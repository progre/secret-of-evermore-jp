// セーブデータの欄の横位置。
// 読み込み、読み込みの確認、記録の 3 画面が同じ形で、欄ごとに書き込み位置へ直値を入れる。
// 欄のウィンドウは幅 28 タイル（224 ドット）で、左の余白は 0、字間は 1 である（cd:c9b7 以降）。
// 幅は字の幅に字間を足して見積もる。
//
// | 欄 | 位置 | 中身の最大 | 幅 |
// | 場所の名前 | 0 | 全角 9 字 | 99 |
// | Lv | 120 | Lv と 2 桁 | 29 |
// | 体力 | 156 | 体力：と 3 桁 | 57 |
// | 経験（2 行目） | 120 | 経験：と 7 桁 | 89 |

define slot_level	$0078
define slot_hp		$009C

// 読み込み
org $CDCC4F
	LDA #{slot_level}
org $CDCC88
	LDA #{slot_hp}
org $CDCCDA
	LDA #{slot_level}

// 読み込みの確認
org $CDD1F5
	LDA #{slot_level}
org $CDD22E
	LDA #{slot_hp}
org $CDD280
	LDA #{slot_level}

// 記録
org $CDD7CA
	LDA #{slot_level}
org $CDD803
	LDA #{slot_hp}
org $CDD855
	LDA #{slot_level}
