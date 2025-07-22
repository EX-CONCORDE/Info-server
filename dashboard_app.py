import os
from flask import Flask, request, jsonify, Response, render_template_string
import requests
import feedparser

# --- HTMLコンテンツ ---

INDEX_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <div class="clock-container">
            <div id="clock">00:00:00</div>
        </div>
        <div class="info-container">
            <div class="news-container">
                <p id="news-title">ニュースを読み込んでいます...</p>
            </div>
            <div class="bottom-container">
                <div id="weather"></div>
                <div id="date"></div>
            </div>
        </div>
        <a href="/settings" class="settings-link" title="設定">⚙️</a>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="/script.js"></script>
</body>
</html>
"""

SETTINGS_HTML = """
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container settings-page">
        <h1>設定</h1>
        <form id="settings-form">
            <div class="form-group">
                <label for="rss-url">RSSフィードURL:</label>
                <input type="url" id="rss-url" placeholder="例: https://news.yahoo.co.jp/rss/topics/top-picks.xml" required>
            </div>
            <div class="form-group">
                <label for="latitude">緯度:</label>
                <input type="number" step="any" id="latitude" placeholder="例: 35.6895" required>
            </div>
            <div class="form-group">
                <label for="longitude">経度:</label>
                <input type="number" step="any" id="longitude" placeholder="例: 139.6917" required>
            </div>
            <button type="submit">保存</button>
        </form>
        <a href="/" class="back-link">ダッシュボードに戻る</a>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        $(document).ready(function() {
            $('#rss-url').val(localStorage.getItem('rssUrl'));
            $('#latitude').val(localStorage.getItem('latitude'));
            $('#longitude').val(localStorage.getItem('longitude'));
            $('#settings-form').on('submit', function(e) {
                e.preventDefault();
                localStorage.setItem('rssUrl', $('#rss-url').val());
                localStorage.setItem('latitude', $('#latitude').val());
                localStorage.setItem('longitude', $('#longitude').val());
                alert('設定を保存しました。');
                window.location.href = '/';
            });
        });
    </script>
</body>
</html>
"""

# --- CSSコンテンツ ---

STYLE_CSS = """
body, html {
    margin: 0; padding: 0; height: 100%;
    background-color: #000; color: #fff;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    overflow: hidden;
}
.container {
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 30px; box-sizing: border-box; height: 100%;
}
.clock-container {
    text-align: center; flex-grow: 1; display: flex;
    align-items: center; justify-content: center;
}
#clock {
    font-family: 'Orbitron', sans-serif; font-size: 18vw;
    font-weight: 700; letter-spacing: 0.05em;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
}
.info-container { width: 100%; }
.news-container {
    text-align: left; margin-bottom: 20px;
    font-size: 3vw; min-height: 4vw;
}
.bottom-container {
    display: flex; justify-content: space-between;
    align-items: flex-end; font-size: 2.5vw;
}
#weather, #date { line-height: 1.4; }
#weather { text-align: left; }
#date { text-align: right; }
.settings-link {
    position: absolute; bottom: 25px; right: 30px;
    font-size: 2.5vw; color: #888; text-decoration: none;
    transition: color 0.3s;
}
.settings-link:hover { color: #fff; }
.settings-page {
    justify-content: center; align-items: center; text-align: center;
}
.form-group { margin-bottom: 20px; text-align: left; display: inline-block; }
label { display: block; margin-bottom: 8px; color: #aaa; }
input[type="url"], input[type="number"] {
    width: 400px; max-width: 80vw; padding: 12px;
    background-color: #222; border: 1px solid #444;
    color: #fff; border-radius: 5px; font-size: 16px;
}
button[type="submit"] {
    padding: 12px 30px; background-color: #007bff; color: #fff;
    border: none; cursor: pointer; border-radius: 5px;
    font-size: 16px; transition: background-color 0.3s;
}
button[type="submit"]:hover { background-color: #0056b3; }
.back-link {
    display: block; margin-top: 30px;
    color: #888; text-decoration: none;
}
.back-link:hover { color: #fff; }
"""

# --- JavaScriptコンテンツ ---

SCRIPT_JS = """
$(document).ready(function() {
    const rssUrl = localStorage.getItem('rssUrl');
    const lat = localStorage.getItem('latitude');
    const lon = localStorage.getItem('longitude');

    if (!rssUrl || !lat || !lon) {
        if (window.location.pathname !== '/settings') {
             $('#news-title').text('右下の歯車アイコンからRSSと地域を設定してください。');
        }
        return;
    }

    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        $('#clock').text(`${h}:${m}:${s}`);
    }

    function updateDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const week = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
        $('#date').html(`${year}年 ${month}月${day}日 ${week}曜日`);
    }

    function fetchWeather() {
        if (!lat || !lon) return;
        $.get(`/api/weather?lat=${lat}&lon=${lon}`, function(data) {
            const temp = data.main.temp.toFixed(1);
            const description = data.weather[0].description;
            const icon = data.weather[0].icon;
            const humidity = data.main.humidity;
            const pressure = data.main.pressure;
            $('#weather').html(`
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}" style="vertical-align: middle; height: 1.5em;">
                ${description}<br>
                ${temp}°C / ${humidity}% / ${pressure}hPa
            `);
        }).fail(function() {
            $('#weather').text('天気情報の取得に失敗しました。');
        });
    }

    let newsItems = [];
    let currentNewsIndex = 0;
    function fetchNews() {
        if (!rssUrl) return;
        $.get(`/api/news?feedUrl=${encodeURIComponent(rssUrl)}`, function(data) {
            newsItems = data.items;
            if (newsItems.length > 0) {
                displayNextNews();
            } else {
                $('#news-title').text('ニュースが見つかりませんでした。');
            }
        }).fail(function() {
            $('#news-title').text('ニュースの取得に失敗しました。');
        });
    }

    function displayNextNews() {
        if (newsItems.length === 0) return;
        $('#news-title').text(newsItems[currentNewsIndex].title);
        currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
    }

    updateClock();
    updateDate();
    fetchWeather();
    fetchNews();

    setInterval(updateClock, 1000);
    setInterval(displayNextNews, 15000);
    setInterval(fetchWeather, 600000);
    setInterval(fetchNews, 3600000);
});
"""

# --- Flaskアプリケーション本体 ---

app = Flask(__name__)
WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY', 'YOUR_OPENWEATHERMAP_API_KEY')

@app.route('/')
def index():
    return render_template_string(INDEX_HTML)

@app.route('/settings')
def settings():
    return render_template_string(SETTINGS_HTML)

@app.route('/style.css')
def style():
    return Response(STYLE_CSS, mimetype='text/css')

@app.route('/script.js')
def script():
    return Response(SCRIPT_JS, mimetype='application/javascript')

@app.route('/api/weather')
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({'error': 'Latitude and longitude are required'}), 400
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={WEATHER_API_KEY}&units=metric&lang=ja"
        response = requests.get(url)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Weather fetch error: {e}")
        return jsonify({'error': 'Failed to fetch weather data'}), 500

@app.route('/api/news')
def get_news():
    feed_url = request.args.get('feedUrl')
    if not feed_url:
        return jsonify({'error': 'RSS feed URL is required'}), 400
    try:
        feed = feedparser.parse(feed_url)
        items = [{'title': entry.title, 'link': entry.link} for entry in feed.entries]
        return jsonify({'items': items})
    except Exception as e:
        print(f"RSS fetch error: {e}")
        return jsonify({'error': 'Failed to fetch RSS feed'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
