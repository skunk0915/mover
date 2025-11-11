require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

// Amazon PA-API設定
const config = {
  accessKey: process.env.AWS_ACCESS_KEY_ID,
  secretKey: process.env.AWS_SECRET_ACCESS_KEY,
  associateTag: process.env.ASSOCIATE_TAG,
  region: process.env.AWS_REGION || 'us-west-2',
  host: process.env.PA_API_HOST || 'webservices.amazon.co.jp',
  endpoint: '/paapi5/searchitems'
};

// SHA256ハッシュを生成
function sha256(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest();
}

// HMACを生成
function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

// 署名キーを生成
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

// AWS署名バージョン4を生成
function createSignature(method, uri, queryString, headers, payload, secretKey, date, region) {
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');

  // 正規化されたリクエストを作成
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}\n`)
    .join('');

  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');

  const payloadHash = sha256(payload).toString('hex');

  const canonicalRequest = [
    method,
    uri,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  // 署名文字列を作成
  const credentialScope = `${dateStamp}/${region}/ProductAdvertisingAPI/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest).toString('hex')
  ].join('\n');

  // 署名を計算
  const signingKey = getSignatureKey(secretKey, dateStamp, region, 'ProductAdvertisingAPI');
  const signature = hmac(signingKey, stringToSign).toString('hex');

  return {
    signature,
    amzDate,
    credentialScope,
    signedHeaders
  };
}

// 本を検索して表紙画像URLを取得
async function searchBookCover(bookTitle, itemPage = 1) {
  const payload = JSON.stringify({
    Keywords: bookTitle,
    Resources: [
      'Images.Primary.Large',
      'Images.Primary.Medium',
      'Images.Primary.Small',
      'ItemInfo.Title'
    ],
    SearchIndex: 'Books',
    ItemCount: 10,
    ItemPage: itemPage,
    PartnerTag: config.associateTag,
    PartnerType: 'Associates',
    Marketplace: process.env.MARKETPLACE || 'www.amazon.co.jp'
  });

  const now = new Date();
  const headers = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    'host': config.host,
    'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems'
  };

  const signatureData = createSignature(
    'POST',
    config.endpoint,
    '',
    headers,
    payload,
    config.secretKey,
    now,
    config.region
  );

  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${signatureData.credentialScope}, SignedHeaders=${signatureData.signedHeaders}, Signature=${signatureData.signature}`;
  headers['X-Amz-Date'] = signatureData.amzDate;

  try {
    const response = await axios.post(
      `https://${config.host}${config.endpoint}`,
      payload,
      { headers }
    );

    if (response.data.SearchResult && response.data.SearchResult.Items && response.data.SearchResult.Items.length > 0) {
      const items = response.data.SearchResult.Items.map(item => {
        const title = item.ItemInfo?.Title?.DisplayValue || '不明';
        const images = {
          large: item.Images?.Primary?.Large?.URL || null,
          medium: item.Images?.Primary?.Medium?.URL || null,
          small: item.Images?.Primary?.Small?.URL || null
        };

        // 利用可能な最大サイズの画像URLを取得
        const primaryImageUrl = images.large || images.medium || images.small || '画像URLが見つかりません';

        return {
          title: title,
          asin: item.ASIN,
          primaryImageUrl: primaryImageUrl,
          images: images
        };
      });

      return {
        success: true,
        count: items.length,
        page: itemPage,
        totalPages: response.data.SearchResult.TotalResultCount ? Math.ceil(response.data.SearchResult.TotalResultCount / 10) : null,
        items: items
      };
    } else {
      return {
        success: false,
        message: '該当する本が見つかりませんでした'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `エラーが発生しました: ${error.response?.data?.Errors?.[0]?.Message || error.message}`
    };
  }
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('使用方法: node index.js "本のタイトル" [ページ番号]');
    console.log('例: node index.js "ハリー・ポッター" 1');
    console.log('    node index.js "ハリー・ポッター" 2  # 2ページ目（11-20件目）を表示');
    process.exit(1);
  }

  // 最後の引数が数字の場合はページ番号として扱う
  let page = 1;
  let titleArgs = args;
  const lastArg = args[args.length - 1];

  if (!isNaN(lastArg) && Number(lastArg) > 0) {
    page = parseInt(lastArg);
    titleArgs = args.slice(0, -1);
  }

  const bookTitle = titleArgs.join(' ');
  console.log(`検索中: "${bookTitle}" (ページ ${page})`);
  console.log('---');

  const result = await searchBookCover(bookTitle, page);

  if (result.success) {
    const startNum = (result.page - 1) * 10 + 1;
    console.log(`検索結果: ${result.count}件 (${startNum}〜${startNum + result.count - 1}件目を表示)`);
    if (result.totalPages) {
      console.log(`ページ: ${result.page} / ${result.totalPages}`);
    }
    console.log('');

    result.items.forEach((item, index) => {
      const itemNum = startNum + index;
      console.log(`[${itemNum}] ${item.title}`);
      console.log(`    ASIN: ${item.asin}`);
      console.log(`    画像URL: ${item.primaryImageUrl}`);

      // 各サイズの画像URLを表示
      if (item.images.large) console.log(`    - Large:  ${item.images.large}`);
      if (item.images.medium) console.log(`    - Medium: ${item.images.medium}`);
      if (item.images.small) console.log(`    - Small:  ${item.images.small}`);
      console.log('');
    });

    // 次のページがある場合は案内を表示
    if (result.totalPages && result.page < result.totalPages) {
      console.log('---');
      console.log(`次の10件を表示するには: node index.js "${bookTitle}" ${result.page + 1}`);
    }
  } else {
    console.log(result.message);
  }
}

// プログラム実行
if (require.main === module) {
  main();
}

module.exports = { searchBookCover };
