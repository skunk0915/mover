/* -----------------------------------------------------------
   Dropbox 「フォルダ内の全ファイル → 共有リンク → raw URL」取得
   ・node-fetch v3 / ESModules
   ・.env に DBX_TOKEN=sl.xxxxxx を設定
   ----------------------------------------------------------- */

import 'dotenv/config';
import fetch from 'node-fetch';
import { writeFileSync } from 'node:fs';

//------------------------------------------------------------
// 0. 引数・トークン確認
//------------------------------------------------------------
const token  = process.env.DBX_TOKEN;
const arg    = process.argv[2] || '/';             // CLI 引数（例: "/Movies/2023"）
const folder = arg.startsWith('/') ? arg : `/${arg}`;

if (!token) {
  console.error('❌  環境変数 DBX_TOKEN が設定されていません (.env か set コマンドで定義)');
  process.exit(1);
}

console.log('📁 対象フォルダ:', folder);
console.log('🔑 Token head   :', token.slice(0, 15), '...');

//------------------------------------------------------------
// 1. API 呼び出しヘルパ
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
// 2. 指定フォルダ内のファイル一覧を取得（非再帰）
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
// 3. 各ファイルの共有リンク取得／新規生成
//------------------------------------------------------------
console.log('\n--- 共有リンク取得／生成 ------------------------------');
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

  // 3-3) “raw” URL へ変換
  const raw = url
    .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    .replace('?dl=0', '');

  table.push({ name: f.name, raw });
}

//------------------------------------------------------------
// 4. 出力
//------------------------------------------------------------
console.log('\n--- 取得結果 ----------------------------------------');
console.table(table);

writeFileSync('dropbox_raw_links.json', JSON.stringify(table, null, 2));
console.log(`💾 dropbox_raw_links.json に ${table.length} 件を書き出しました`);