// 必要なモジュールをインポートします
require('dotenv').config(); // .envファイルから環境変数を読み込む
const express = require('express');
const fetch = require('node-fetch');
const Parser = require('rss-parser');

const app = express();
const port = 3000;
const parser = new Parser();

// APIキーを環境変数から取得します
const WEATHER_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

// APIキーが設定されていない場合はエラーメッセージを表示して終了します
if (!WEATHER_API_KEY) {
    console.error('エラー: OpenWeatherMapのAPIキーが設定されていません。');
    console.error('.envファイルを作成し、OPENWEATHERMAP_API_KEY="YOUR_KEY" の形式でキーを設定してください。');
    process.exit(1); // プロセスを終了
}

// publicディレクトリのファイルを静的ファイルとして提供します
app.use(express.static('public'));

// キャッシュ無効化ミドルウェア (iPad等での容量圧迫を防止)
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// 天気情報取得API
app.get('/api/weather', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=ja`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Weather fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

// RSSフィード取得API
app.get('/api/news', async (req, res) => {
    const { feedUrl } = req.query;
    if (!feedUrl) {
        return res.status(400).json({ error: 'RSS feed URL is required' });
    }
    try {
        const decodedUrl = decodeURIComponent(feedUrl);
        const feed = await parser.parseURL(decodedUrl);
        res.json(feed);
    } catch (error) {
        console.error('RSS fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch RSS feed' });
    }
});

// サーバーを起動
app.listen(port, () => {
    console.log(`Dashboard server running at http://localhost:${port}`);
});
