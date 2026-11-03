# Secret of Evermore 非公式日本語化パッチ

SNES「Secret of Evermore」(北米版) の非公式日本語化パッチ。

## 動作環境

- [Deno](https://deno.com/) 2.9.7 で動作を確認

## フォント

[Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font)

配置先: `vendor/fusion-pixel-font/fusion-pixel-10px-proportional-ja.bdf`

## 対応 ROM

SHA-256: `17c864a76d498feb6479eee8e7d6807b951c66225033228622bb66754baab1db`

配置先: `/Secret of Evermore (USA).sfc`

## ビルド

```powershell
deno task check
deno task build
```

`build/soe-ja.sfc` が出力される。
