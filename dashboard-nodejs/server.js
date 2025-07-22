// 必要なモジュールをインポートします
const express = require('express');
const fetch = require('node-fetch'); // v2.xをインストールしてください
const Parser = require('rss-parser');

// Expressアプリケーションを初期化します
const app = express();
const port = 3000; // サーバーがリッスンするポート
const parser = new Parser();

// OpenWeatherMapから取得したAPIキーをここに設定してください
// 注意: このキーはご自身で無料で取得する必要があります
const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';

// 静的ファイル（HTML, CSS, JS）を 'public' ディレクトリから提供します
app.use(express.static('public'));

/**
 * 天気情報取得APIエンドポイント
 * クエリパラメータとして緯度(lat)と経度(lon)を受け取ります
 */
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

/**
 * RSSフィード取得APIエンドポイント
 * クエリパラメータとしてRSSフィードのURL(feedUrl)を受け取ります
 */
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

// 指定したポートでサーバーを起動します
app.listen(port, () => {
    console.log(`Dashboard server running at http://localhost:${port}`);
});
