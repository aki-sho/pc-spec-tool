<div align="center">

# PC Spec Tool
**Electron で作成した、PC情報を確認するための Windows デスクトップアプリ**

![Electron](https://img.shields.io/badge/Electron-39.x-47848f)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d6)
![Status](https://img.shields.io/badge/Status-WIP-orange)

</div>

## 概要
**PC Spec Tool** は、Windows 上で PC の基本情報を確認するための Electron アプリです。  
HTML・CSS・JavaScript を使って作成しており、PC の構成確認や Electron 学習用のサンプルとしても使えるようにしています。

内部では `systeminformation` を利用して、PC の各種情報を取得・表示します。

## 特徴
- Electron を使った Windows デスクトップアプリ
- HTML・CSS・JavaScript ベースで作成
- `systeminformation` を利用して PC 情報を取得
- インストール版とポータブル版の両方を配布可能
- 学習用・実験用として構成を把握しやすいシンプルなプロジェクト

## 主な用途
- 自分の PC 構成を確認したいとき
- Electron アプリ開発の練習
- HTML・CSS・JavaScript でデスクトップアプリを作る流れを学びたいとき
- GitHub でソースコードと配布物を公開する練習

## 動作環境
- Windows 10 / 11
- Node.js 22 系
- npm

## 配布ファイル
GitHub の **Releases** では、以下の形式で配布します。

### インストール版
`PC Spec Tool Setup 1.0.0.exe`

セットアップ形式でインストールして使う版です。  
通常のアプリとして利用したい場合はこちらを使います。

### ポータブル版
`PC-Spec-Tool-Portable-1.0.0.zip`

`win-unpacked` フォルダを zip 化したものです。  
展開後、`PC Spec Tool.exe` を実行すると起動できます。  
インストール不要で試したい場合はこちらを利用してください。


## 開発環境での起動方法

### 1. リポジトリを取得
```bash
git clone https://github.com/aki-sho/pc-spec-tool.git
cd pc-spec-tool