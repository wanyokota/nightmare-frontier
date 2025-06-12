# NIGHTMARE FRONTIER - 3D Horror FPS Game

恐怖の3DFPSゲーム「NIGHTMARE FRONTIER」へようこそ！

## 🎮 ゲームの特徴

- **3DFPSシューティング**: Three.jsを使用したリアルタイム3D描画
- **ホラー雰囲気**: 不気味な音響効果とダークな視覚演出
- **カスタマイズ機能**: 
  - 3Dモデル（FBX/OBJ/GLTF）のアップロード対応
  - 写真を敵に貼り付け機能（友達や自分の写真で遊べます！）
- **地形システム**: 起伏のある地形とリアルな物理演算
- **レーダーシステム**: 敵の位置を表示する円形レーダー
- **ランキング機能**: ローカル＆オンラインランキング対応

## 🚀 オンライン公開方法

### 1. GitHub Pages（推奨・無料）

```bash
# 1. GitHubアカウントを作成
# 2. 新しいリポジトリを作成
# 3. 以下のファイルをアップロード：
#    - index.html
#    - game.js
#    - README.md

# 4. リポジトリ設定でPages機能を有効化
# Settings → Pages → Source: Deploy from a branch → main
```

**生成されるURL例**: `https://yourusername.github.io/nightmare-frontier`

### 2. Netlify（簡単デプロイ）

1. [Netlify](https://netlify.com)にサインアップ
2. フォルダをドラッグ&ドロップでデプロイ
3. 自動的にHTTPS対応URLが生成されます

### 3. Vercel（高速CDN）

1. [Vercel](https://vercel.com)にサインアップ
2. プロジェクトをインポート
3. 自動ビルド＆デプロイ

## 🌐 オンラインランキング設定

現在はデモ設定になっています。実際に使用するには：

### Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクト作成
2. Firestoreデータベースを有効化
3. `game.js`の`firebaseConfig`を更新：

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

4. Firestoreルールを設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rankings/{document} {
      allow read, write: if true;
    }
  }
}
```

## 📱 操作方法

- **WASD**: プレイヤー移動
- **マウス**: 視点移動
- **左クリック**: 射撃
- **スペース**: ジャンプ
- **R**: リロード
- **ESC**: ポインターロック解除

## 🎯 ゲーム目標

- 敵を10体倒してゲームクリア
- 3体撃破でパワーアップ（弾が大きくなる）
- 最大3体まで同時出現
- 敵は5発で撃破可能

## 🛠️ 技術仕様

- **3Dエンジン**: Three.js r128
- **音響**: Web Audio API（プロシージャル生成）
- **物理**: カスタム当たり判定システム
- **データベース**: Firebase Firestore
- **対応ブラウザ**: Chrome, Firefox, Safari, Edge

## 📞 サポート

問題や要望がある場合は、GitHubのIssuesページでお知らせください。

---

**Enjoy the NIGHTMARE FRONTIER!** 👻🔫