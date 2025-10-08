# Bunny Stream セットアップガイド

## 1. Bunny.net アカウント設定

### アカウント作成
1. [Bunny.net](https://bunny.net) でアカウント作成
2. ダッシュボードにログイン
3. 「Stream」タブを選択

### Video Library作成
1. 「Create Video Library」をクリック
2. 設定：
   - Name: `sus-ec-videos`
   - Storage Zone: 適切な地域（Asia Pacific推奨）
   - Player: 有効化
   - Direct Play: 有効化

### API設定
1. Account → API Keys
2. 新しいAPI Keyを作成
3. Stream権限を付与

## 2. 環境変数設定

`.env`に以下を追加：
```
# Bunny Stream
VITE_BUNNY_STREAM_LIBRARY_ID=your_library_id
VITE_BUNNY_STREAM_API_KEY=your_api_key
VITE_BUNNY_STREAM_CDN_HOSTNAME=your_cdn_hostname
VITE_BUNNY_STREAM_COLLECTION_ID=your_collection_id
```

## 3. 料金体系

### Storage
- $0.01/GB/月（非常に安価）

### Encoding
- $0.005/分（HD）
- $0.01/分（4K）

### Bandwidth
- $0.005/GB（配信）

### HLS機能
- 自動トランスコーディング
- 適応ビットレート
- 世界規模CDN配信
- プレイヤー埋め込みコード自動生成

## 4. 特徴

### 自動最適化
- 複数解像度自動生成（240p～4K）
- WebM、MP4対応
- モバイル最適化

### セキュリティ
- ホットリンク保護
- 地域制限
- トークン認証

### 分析
- 視聴統計
- リアルタイム監視
- A/Bテスト
