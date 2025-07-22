$(document).ready(function() {
    // --- localStorageから設定を読み込む ---
    const rssUrlsRaw = localStorage.getItem('rssUrls');
    const rssUrls = rssUrlsRaw ? rssUrlsRaw.split('\n').filter(url => url.trim() !== '') : [];
    const scrollSpeed = localStorage.getItem('scrollSpeed') || 120;
    const lat = localStorage.getItem('latitude');
    const lon = localStorage.getItem('longitude');
    const showWind = JSON.parse(localStorage.getItem('showWind') || 'true');
    const showPressure = JSON.parse(localStorage.getItem('showPressure') || 'true');
    const showVisibility = JSON.parse(localStorage.getItem('showVisibility') || 'true');
    const ipadMode = JSON.parse(localStorage.getItem('ipadMode') || 'false');
    const debugOverlayEnabled = JSON.parse(localStorage.getItem('debugOverlay') || 'false');

    // --- デバッグモニター設定 ---
    if (debugOverlayEnabled) {
        const debugContent = $('#overlay-debug-monitor');
        debugContent.show(); // モニターを表示
        function logToMonitor(message, type = 'log') {
            const entry = $('<div>').addClass('debug-entry').text(`[${new Date().toLocaleTimeString()}] ${message}`);
            debugContent.append(entry);
            // 常に最新のログが見えるようにスクロール
            if (debugContent.children().length > 10) { // ログが溜まりすぎないように調整
                debugContent.children().first().remove();
            }
        }
        const originalConsole = { log: console.log, error: console.error, warn: console.warn };
        console.log = (...args) => { logToMonitor(args.join(' ')); originalConsole.log(...args); };
        console.error = (...args) => { logToMonitor(args.join(' '), 'error'); originalConsole.error(...args); };
        console.warn = (...args) => { logToMonitor(args.join(' '), 'warn'); originalConsole.warn(...args); };
        console.log("オーバーレイデバッグモニターが初期化されました。");
    }

    // iPadレイアウトモードがONの場合、bodyにクラスを追加
    if (ipadMode) {
        $('body').addClass('ipad-layout');
    }

    // --- 時計の更新 ---
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        
        $('#clock .clock-digit').eq(0).text(h.charAt(0));
        $('#clock .clock-digit').eq(1).text(h.charAt(1));
        $('#clock .clock-digit').eq(2).text(m.charAt(0));
        $('#clock .clock-digit').eq(3).text(m.charAt(1));
        
        $('#seconds .second-digit').eq(0).text(s.charAt(0));
        $('#seconds .second-digit').eq(1).text(s.charAt(1));
    }

    // --- 日付の表示 ---
    function updateDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const week = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
        $('#date').html(`${year}年 ${month}月${day}日 ${week}曜日`);
    }

    // --- 天気情報の取得と表示 ---
    function fetchWeather() {
        if (!lat || !lon) return;
        console.log("天気情報を取得中...");
        $.get(`/api/weather?lat=${lat}&lon=${lon}`, function(data) {
            let weatherHtml = '';
            weatherHtml += `<div>${data.name} (緯度: ${data.coord.lat.toFixed(2)}, 経度: ${data.coord.lon.toFixed(2)})</div>`;
            weatherHtml += `<div><img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}" style="vertical-align: middle; height: 2em; margin-right: 0.2em;"><span style="font-size: 1.5em; vertical-align: middle;">${data.main.temp.toFixed(1)}°C</span> (${data.weather[0].description})</div>`;
            weatherHtml += `<div><span style="color: #ff6347;">${data.main.temp_max.toFixed(1)}°C</span> / <span style="color: #4682b4;">${data.main.temp_min.toFixed(1)}°C</span> (体感: ${data.main.feels_like.toFixed(1)}°C)</div>`;
            if (showWind) weatherHtml += `<div>風速: ${data.wind.speed.toFixed(1)}m/s, 風向: ${data.wind.deg}°</div>`;
            if (showPressure) weatherHtml += `<div>湿度: ${data.main.humidity}%, 気圧: ${data.main.pressure}hPa</div>`;
            if (showVisibility) weatherHtml += `<div>雲量: ${data.clouds.all}%, 視程: ${(data.visibility / 1000).toFixed(1)}km</div>`;
            $('#weather').html(weatherHtml);
            console.log("天気情報を更新しました。");
        }).fail(function() {
            $('#weather').text('天気情報の取得に失敗しました。');
            console.error("天気情報の取得に失敗しました。");
        });
    }

    // --- ニュースの取得と表示 ---
    function fetchNews() {
        if (rssUrls.length === 0) return;
        console.log("RSSフィードを取得中...");
        const promises = rssUrls.map(url => $.get(`/api/news?feedUrl=${encodeURIComponent(url)}`).catch(e => { console.error(`Failed to fetch ${url}`, e); return null; }));

        Promise.all(promises).then(feeds => {
            let allItems = [];
            feeds.forEach(feed => { if (feed && feed.items) allItems = allItems.concat(feed.items); });

            if (allItems.length > 0) {
                allItems.sort(() => Math.random() - 0.5);
                const tickerText = allItems.map(item => item.title).join('　／　');
                const $tickerContent = $('#news-ticker-content');
                $tickerContent.css('animation', 'none').text(tickerText);
                
                setTimeout(() => {
                    const textWidth = $tickerContent.width();
                    const containerWidth = $('.news-container').width();
                    const duration = (textWidth + containerWidth) / parseInt(scrollSpeed, 10);
                    $tickerContent.css({ 'animation-name': 'ticker-animation', 'animation-duration': `${Math.max(20, duration)}s` });
                    console.log(`ニュースティッカーを更新しました。 DURATION: ${duration.toFixed(2)}s`);
                }, 100);
            } else {
                $('#news-ticker-content').text('ニュースが見つかりませんでした。');
                console.warn("ニュースフィードが見つかりませんでした。");
            }
        });
    }

    // --- 関数の初回実行と定期実行 ---
    if (!rssUrlsRaw || !lat || !lon) {
        if (window.location.pathname !== '/settings.html') {
             $('.news-container').text('右上の歯車アイコンからRSSと地域を設定してください。');
        }
    } else {
        updateClock();
        updateDate();
        fetchWeather();
        fetchNews();

        setInterval(updateClock, 1000);
        setInterval(fetchWeather, 600000);
        setInterval(fetchNews, 3600000);
    }
});
