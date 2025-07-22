$(document).ready(function() {
    // --- localStorageから設定を読み込む ---
    const settings = {
        rssUrlsRaw: localStorage.getItem('rssUrls'),
        scrollSpeed: localStorage.getItem('scrollSpeed') || 120,
        lat: localStorage.getItem('latitude'),
        lon: localStorage.getItem('longitude'),
        showRss: JSON.parse(localStorage.getItem('showRss') || 'true'),
        showWeather: JSON.parse(localStorage.getItem('showWeather') || 'true'),
        showCalendar: JSON.parse(localStorage.getItem('showCalendar') || 'false'),
        showHolidays: JSON.parse(localStorage.getItem('showHolidays') || 'true'),
        highPrecisionSeconds: JSON.parse(localStorage.getItem('highPrecisionSeconds') || 'false'),
        alarmTime: localStorage.getItem('alarmTime') || '',
        enableAlarm: JSON.parse(localStorage.getItem('enableAlarm') || 'false'),
        showWind: JSON.parse(localStorage.getItem('showWind') || 'true'),
        showPressure: JSON.parse(localStorage.getItem('showPressure') || 'true'),
        showVisibility: JSON.parse(localStorage.getItem('showVisibility') || 'true'),
        ipadMode: JSON.parse(localStorage.getItem('ipadMode') || 'false'),
        debugOverlayEnabled: JSON.parse(localStorage.getItem('debugOverlay') || 'false')
    };
    const rssUrls = settings.rssUrlsRaw ? settings.rssUrlsRaw.split('\n').filter(url => url.trim() !== '') : [];

    // --- デバッグモニター ---
    if (settings.debugOverlayEnabled) {
        const debugContent = $('#overlay-debug-monitor').show();
        function logToMonitor(message) {
            const entry = $('<div>').text(`[${new Date().toLocaleTimeString()}] ${message}`);
            debugContent.append(entry);
            if (debugContent.children().length > 3) debugContent.children().first().remove();
        }
        const originalConsole = { log: console.log, error: console.error };
        console.log = (...args) => { logToMonitor(args.join(' ')); originalConsole.log(...args); };
        console.error = (...args) => { logToMonitor(args.join(' '), 'error'); originalConsole.error(...args); };
        console.log("Overlay debug init.");
    }

    // --- レイアウト・表示設定 ---
    if (settings.ipadMode) $('body').addClass('ipad-layout');
    if (!settings.showRss) $('.news-container').hide();
    if (!settings.showWeather) $('#weather').hide();
    if (!settings.showCalendar) $('#calendar-container').hide();

    // --- アラーム関連 ---
    const $alarmSound = $('#alarm-sound')[0];
    let isAlarmRinging = false;
    let alarmTriggeredToday = false;
    
    function stopAlarm() {
        if (isAlarmRinging) {
            $alarmSound.pause();
            $alarmSound.currentTime = 0;
            $('body').removeClass('alarm-ringing');
            isAlarmRinging = false;
            console.log("アラームを停止しました。");
        }
    }
    $(document).on('click', stopAlarm);

    // --- 時計の更新 ---
    function clockLoop() {
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

        if (settings.highPrecisionSeconds) {
            const ms = String(now.getMilliseconds()).padStart(3, '0');
            $('#second-decimals').text(`.${ms.slice(0,4)}`);
        }

        // アラームチェック
        if (settings.enableAlarm && settings.alarmTime) {
            const currentTime = `${h}:${m}`;
            if (currentTime === settings.alarmTime && !isAlarmRinging && !alarmTriggeredToday) {
                console.log("アラーム作動！");
                $('body').addClass('alarm-ringing');
                $alarmSound.play();
                isAlarmRinging = true;
                alarmTriggeredToday = true;
            }
            if (currentTime === "00:00") alarmTriggeredToday = false;
        }
        
        requestAnimationFrame(clockLoop);
    }

    // --- カレンダー ---
    function renderCalendar() {
        if (!settings.showCalendar) return;
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let html = `<div class="calendar-header">${year}年 ${month + 1}月</div><div class="calendar-grid">`;
        '日月火水木金土'.split('').forEach(day => html += `<div class="calendar-weekday">${day}</div>`);
        for (let i = 0; i < firstDay; i++) html += '<div></div>';
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            let classes = 'calendar-day';
            if (day === today) classes += ' today';
            if (settings.showHolidays && holiday_jp.isHoliday(date)) classes += ' holiday';
            html += `<div class="${classes}">${day}</div>`;
        }
        html += '</div>';
        $('#calendar-container').html(html);
    }

    // --- 起動シーケンス ---
    function animateElement(selector) {
        const $element = $(selector);
        $element.removeClass('hidden-on-load');
        $element.addClass('blinking');
        setTimeout(() => {
            $element.removeClass('blinking');
            setTimeout(() => {
                $element.addClass('fade-in');
            }, 500); // 0.5s wait
        }, 450); // 3 blinks * 150ms
    }

    function startUpSequence() {
        // 1. 時計
        animateElement('.clock-container');
        // 2. RSS (1秒後)
        setTimeout(() => animateElement('.news-container'), 1000);
        // 3. 天気、日付、秒 (2秒後)
        setTimeout(() => animateElement('.meta-container, .seconds-wrapper'), 2000);
    }

    // --- 初期化 & 定期実行 ---
    function initialize() {
        startUpSequence(); // 起動アニメーションを開始
        updateDate();
        if (settings.showWeather) fetchWeather();
        if (settings.showRss) fetchNews();
        renderCalendar();
        clockLoop(); // 高速ループを開始

        setInterval(updateDate, 60000);
        if (settings.showWeather) setInterval(fetchWeather, 600000);
        if (settings.showRss) setInterval(fetchNews, 3600000);
    }

    if (!settings.rssUrlsRaw || !settings.lat || !settings.lon) {
        if (window.location.pathname !== '/settings.html') {
             $('.news-container').text('右上の歯車アイコンからRSSと地域を設定してください。').show();
        }
    } else {
        initialize();
    }
    
    // --- 既存の関数 ---
    function updateDate() {
        const now = new Date();
        $('#date').html(`${now.getFullYear()}年 ${now.getMonth() + 1}月${now.getDate()}日 ${["日", "月", "火", "水", "木", "金", "土"][now.getDay()]}曜日`);
    }

    function fetchWeather() {
        console.log("天気情報を取得中...");
        $.get(`/api/weather?lat=${settings.lat}&lon=${settings.lon}`, function(data) {
            let html = `<div>${data.name} (緯度:${data.coord.lat.toFixed(2)}, 経度:${data.coord.lon.toFixed(2)})</div>`;
            html += `<div><img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}" style="vertical-align: middle; height: 2em; margin-right: 0.2em;"><span style="font-size: 1.5em; vertical-align: middle;">${data.main.temp.toFixed(1)}°C</span> (${data.weather[0].description})</div>`;
            html += `<div><span style="color: #ff6347;">${data.main.temp_max.toFixed(1)}°C</span> / <span style="color: #4682b4;">${data.main.temp_min.toFixed(1)}°C</span> (体感: ${data.main.feels_like.toFixed(1)}°C)</div>`;
            if (settings.showWind) html += `<div>風速: ${data.wind.speed.toFixed(1)}m/s, 風向: ${data.wind.deg}°</div>`;
            if (settings.showPressure) html += `<div>湿度: ${data.main.humidity}%, 気圧: ${data.main.pressure}hPa</div>`;
            if (settings.showVisibility) html += `<div>雲量: ${data.clouds.all}%, 視程: ${(data.visibility / 1000).toFixed(1)}km</div>`;
            $('#weather').html(html);
            console.log("天気情報を更新しました。");
        }).fail(function() { console.error("天気情報の取得に失敗しました。"); });
    }

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
                    const duration = (textWidth + containerWidth) / parseInt(settings.scrollSpeed, 10);
                    $tickerContent.css({ 'animation-name': 'ticker-animation', 'animation-duration': `${Math.max(20, duration)}s` });
                    console.log(`ニュースティッカーを更新しました。 DURATION: ${duration.toFixed(2)}s`);
                }, 100);
            } else { console.warn("ニュースフィードが見つかりませんでした。"); }
        });
    }
});
