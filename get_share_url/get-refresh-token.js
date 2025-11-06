/* -----------------------------------------------------------
   Dropbox リフレッシュトークン取得スクリプト
   ・OAuth 2.0 PKCEフローを使用してリフレッシュトークンを取得
   ・ブラウザで認証を行い、リダイレクトURLから認可コードを取得
   ----------------------------------------------------------- */

import 'dotenv/config';
import fetch from 'node-fetch';
import crypto from 'crypto';
import http from 'http';
import { URL } from 'url';

const APP_KEY = process.env.DROPBOX_APP_KEY;
const REDIRECT_URI = 'http://localhost:8080/callback';
const PORT = 8080;

if (!APP_KEY) {
  console.error('❌ 環境変数 DROPBOX_APP_KEY が設定されていません');
  console.error('   .env ファイルに DROPBOX_APP_KEY=your_app_key を追加してください');
  process.exit(1);
}

// PKCE用のコードチャレンジを生成
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

const { codeVerifier, codeChallenge } = generateCodeChallenge();

// 認可URLを構築
const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
authUrl.searchParams.append('client_id', APP_KEY);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('token_access_type', 'offline'); // リフレッシュトークンを取得
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('code_challenge_method', 'S256');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📱 Dropbox リフレッシュトークン取得');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('⚠️  事前準備:');
console.log('   Dropbox App Console (https://www.dropbox.com/developers/apps)');
console.log('   でアプリの設定を確認してください:');
console.log(`   - Redirect URIs に ${REDIRECT_URI} を追加`);
console.log('   - Permissions タブで必要な権限を有効化\n');

console.log('手順:');
console.log('1. 以下のURLをブラウザで開いてください:\n');
console.log(authUrl.toString());
console.log('\n2. Dropboxにログインし、アプリへのアクセスを許可してください');
console.log('3. 自動的にリダイレクトされ、リフレッシュトークンが表示されます\n');

// HTTPサーバーを起動してコールバックを受け取る
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (reqUrl.pathname === '/callback') {
    const code = reqUrl.searchParams.get('code');
    const error = reqUrl.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body>
            <h1>❌ エラー</h1>
            <p>認証に失敗しました: ${error}</p>
          </body>
        </html>
      `);
      console.error('❌ 認証エラー:', error);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body>
            <h1>❌ エラー</h1>
            <p>認可コードが取得できませんでした</p>
          </body>
        </html>
      `);
      console.error('❌ 認可コードが取得できませんでした');
      server.close();
      process.exit(1);
    }

    console.log('✅ 認可コードを取得しました');
    console.log('🔄 リフレッシュトークンを取得中...\n');

    // 認可コードをリフレッシュトークンに交換
    try {
      const tokenResponse = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: APP_KEY,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`トークン取得失敗 (${tokenResponse.status}): ${errorText}`);
      }

      const tokenData = await tokenResponse.json();

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .success { color: #22c55e; }
              .token-box {
                background: #f3f4f6;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                word-break: break-all;
              }
              .instruction {
                background: #fef3c7;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <h1 class="success">✅ リフレッシュトークン取得成功！</h1>

            <div class="token-box">
              <strong>リフレッシュトークン:</strong><br>
              <code>${tokenData.refresh_token}</code>
            </div>

            <div class="instruction">
              <strong>次のステップ:</strong><br>
              1. 上記のリフレッシュトークンをコピーしてください<br>
              2. <code>get_share_url/.env</code> ファイルに以下を追加してください:
              <pre>DROPBOX_REFRESH_TOKEN=${tokenData.refresh_token}</pre>
            </div>

            <p>このウィンドウを閉じて構いません。</p>
          </body>
        </html>
      `);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ リフレッシュトークン取得成功！');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('リフレッシュトークン:');
      console.log(tokenData.refresh_token);
      console.log('\n.envファイルに以下を追加してください:\n');
      console.log(`DROPBOX_REFRESH_TOKEN=${tokenData.refresh_token}\n`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body>
            <h1>❌ エラー</h1>
            <p>トークンの取得に失敗しました: ${error.message}</p>
          </body>
        </html>
      `);
      console.error('❌ トークン取得エラー:', error.message);
      server.close();
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 ローカルサーバーを起動しました (http://localhost:${PORT})`);
  console.log('   コールバックを待っています...\n');
});

// タイムアウト設定（5分）
setTimeout(() => {
  console.log('\n⏰ タイムアウトしました（5分経過）');
  console.log('   スクリプトを再実行してください');
  server.close();
  process.exit(1);
}, 5 * 60 * 1000);
