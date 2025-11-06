/* -----------------------------------------------------------
   Dropbox 「フォルダ内の全ファイル → 共有リンク → raw URL」取得
   ・node-fetch v3 / ESModules
   ・リフレッシュトークン対応（長期間有効なトークン）
   ・.env に以下を設定:
     - DROPBOX_REFRESH_TOKEN (推奨)
     - DROPBOX_APP_KEY
     - DROPBOX_APP_SECRET
     または
     - DBX_TOKEN (従来の短期トークン、4時間で期限切れ)
   ----------------------------------------------------------- */

import 'dotenv/config';
import fetch from 'node-fetch';
import { writeFileSync, appendFileSync, readFileSync, existsSync } from 'node:fs';

//------------------------------------------------------------
// 0. リフレッシュトークンを使ってアクセストークンを取得
//------------------------------------------------------------
async function getAccessToken() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;

  if (!refreshToken || !appKey || !appSecret) {
    // リフレッシュトークンが設定されていない場合、従来のDBX_TOKENを使用
    const legacyToken = process.env.DBX_TOKEN;
    if (legacyToken) {
      console.log('⚠️  従来の短期トークン（DBX_TOKEN）を使用しています');
      console.log('⚠️  リフレッシュトークンへの移行を推奨します（README参照）');
      return legacyToken;
    }

    console.error('❌  環境変数が設定されていません');
    console.error('   以下のいずれかを設定してください:');
    console.error('   1) DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET (推奨)');
    console.error('   2) DBX_TOKEN (4時間で期限切れ)');
    process.exit(1);
  }

  // リフレッシュトークンを使ってアクセストークンを取得
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: appKey,
    client_secret: appSecret
  });

  try {
    const res = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`トークン取得失敗 (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    console.log('✅ リフレッシュトークンからアクセストークンを取得しました');
    console.log(`⏰ 有効期限: ${data.expires_in}秒 (約${Math.floor(data.expires_in / 3600)}時間)`);
    return data.access_token;
  } catch (error) {
    console.error('❌ アクセストークン取得エラー:', error.message);
    process.exit(1);
  }
}

//------------------------------------------------------------
// 1. 引数・トークン確認
//------------------------------------------------------------
const arg    = process.argv[2] || '/';             // CLI 引数（例: "/Movies/2023"）
const folder = arg.startsWith('/') ? arg : `/${arg}`;

console.log('📁 対象フォルダ:', folder);

// アクセストークンを取得
const token = await getAccessToken();
console.log('🔑 Token head   :', token.slice(0, 15), '...');

//------------------------------------------------------------
// 2. API 呼び出しヘルパ
//------------------------------------------------------------
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function api(endpoint, body) {
  const url = `https://api.dropboxapi.com/2/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const text = await res.text();
  console.log(`🛰️  [${endpoint}] status ${res.status}`);
  if (!res.ok) throw new Error(text.trim());
  return JSON.parse(text);
}

//------------------------------------------------------------
// 3. 指定フォルダ内のファイル一覧を取得（非再帰）
//------------------------------------------------------------
console.log('\n--- フォルダ一覧取得 --------------------------------');
let { entries, cursor, has_more } =
  await api('files/list_folder', { path: folder, recursive: false });

const files = entries.filter(e => e['.tag'] === 'file');
console.log('🗂️  1回目で取得したファイル数:', files.length);

while (has_more) {
  ({ entries, cursor, has_more } =
    await api('files/list_folder/continue', { cursor }));
  files.push(...entries.filter(e => e['.tag'] === 'file'));
  console.log('  ➡️  続きを取得、累計ファイル数:', files.length);
}

if (!files.length) {
  console.log('⚠️  ファイルが 0 件です。終了します');
  process.exit(0);
}

//------------------------------------------------------------
// 4. 各ファイルの共有リンク取得／新規生成
//------------------------------------------------------------
console.log('\n--- 共有リンク取得／生成 ------------------------------');

// urls_tmp.csvファイルのパス（同じディレクトリ）
const urlsCsvPath = './urls_tmp.csv';

const table = [];

for (const f of files) {
  // 3-1) 既存リンクを検索
  let url = '';
  try {
    const { links } = await api('sharing/list_shared_links', {
      path: f.path_lower,
      direct_only: true
    });
    if (links?.length) url = links[0].url;
  } catch (e) {
    console.error('   🚨 list_shared_links 失敗:', f.name, e.message);
  }

  // 3-2) 無ければ新規作成
  if (!url) {
    try {
      ({ url } = await api('sharing/create_shared_link_with_settings', {
        path: f.path_lower
      }));
      console.log('   ➕ 新規作成:', f.name);
    } catch (e) {
      console.error('   🚨 create_shared_link 失敗:', f.name, e.message);
      continue;
    }
  } else {
    console.log('   ✅ 既存あり  :', f.name);
  }

  // 3-3) "raw" URL へ変換
  const raw = url
    .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    .replace('?dl=0', '');

  table.push({ name: f.name, raw });

  // 3-4) urls_tmp.csvに1行ずつ追記（中断しても残るように）
  try {
    appendFileSync(urlsCsvPath, url + '\n', 'utf8');
    console.log('   💾 urls_tmp.csvに追記:', f.name);
  } catch (e) {
    console.error('   🚨 CSV書き込み失敗:', f.name, e.message);
  }
}

//------------------------------------------------------------
// 5. 出力
//------------------------------------------------------------
console.log('\n--- 取得結果 ----------------------------------------');
console.table(table);

writeFileSync('dropbox_raw_links.json', JSON.stringify(table, null, 2));
console.log(`💾 dropbox_raw_links.json に ${table.length} 件を書き出しました`);

//------------------------------------------------------------
// 6. urls_tmp.csvの重複削除
//------------------------------------------------------------
console.log('\n--- urls_tmp.csvの重複削除 ----------------------------');
if (existsSync(urlsCsvPath)) {
  try {
    const content = readFileSync(urlsCsvPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const uniqueLines = [...new Set(lines)];

    writeFileSync(urlsCsvPath, uniqueLines.join('\n') + '\n', 'utf8');
    console.log(`✅ urls_tmp.csv: ${lines.length}件 → ${uniqueLines.length}件（重複削除済み）`);
  } catch (e) {
    console.error('🚨 重複削除失敗:', e.message);
  }
} else {
  console.log('⚠️  urls_tmp.csvが見つかりませんでした');
}