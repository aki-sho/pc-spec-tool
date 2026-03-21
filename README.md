<div align="center">

# PC Spec Tool
**Windows 上で PC の基本情報を確認できるデスクトップアプリ**

![Electron](https://img.shields.io/badge/Electron-39.x-47848f)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d6)

</div>

## 概要
**PC Spec Tool** は、Windows 上で PC の基本情報を確認するためのデスクトップアプリです。  
Electron を使用して構成しており、HTML・CSS・JavaScript ベースで動作します。

内部では `systeminformation` を利用して、PC の各種情報を取得・表示します。

## 特徴
- Windows 向けデスクトップアプリ
- HTML・CSS・JavaScript で構成
- `systeminformation` による PC 情報の取得
- インストール版とポータブル版を配布可能
- シンプルな構成で管理しやすい

## 主な機能
- PC の基本情報表示
- 各種スペック情報の確認
- Windows 環境でのローカル動作

## 動作環境
- Windows 10 / 11
- Node.js 22 系
- npm

## 配布ファイル
GitHub の **Releases** では、以下の形式で配布します。

### インストール版
`PC Spec Tool Setup 1.0.0.exe`

インストーラー形式でセットアップして利用する版です。

### ポータブル版
`PC-Spec-Tool-Portable-1.0.0.zip`

`win-unpacked` フォルダを zip 化したものです。  
展開後、`PC Spec Tool.exe` を実行して起動します。

## スクリーンショット
必要に応じて後から追加してください。

例:

- `assets/screenshot-1.png`：メイン画面
- `assets/screenshot-2.png`：スペック表示画面

## インストール
### 1. Releases からダウンロード
GitHub の **Releases** から、インストール版またはポータブル版を取得します。

### 2. 利用方法
- インストール版: `PC Spec Tool Setup 1.0.0.exe` を実行してセットアップ
- ポータブル版: zip を展開し、`PC Spec Tool.exe` を起動

## 開発環境での起動方法
### 1. リポジトリを取得
```bash
git clone https://github.com/aki-sho/pc-spec-tool.git
cd pc-spec-tool