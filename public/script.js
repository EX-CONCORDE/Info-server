$(document).ready(function() {
    // --- 設定の読み込みとデフォルト値の設定 ---
    function loadSettings() {
        const savedSettings = Cookies.get('dashboardSettings') ? JSON.parse(Cookies.get('dashboardSettings')) : {};
        const defaults = {
            rssUrls: '', scrollSpeed: 120, latitude: '', longitude: '',
            showRss: true, showWeather: true, showCalendar: false, showHolidays: true,
            highPrecisionSeconds: false, alarmTime: '', enableAlarm: false,
            showWind: true, showPressure: true, showVisibility: true,
            ipadMode: false, debugOverlayEnabled: false
        };
        // 保存された設定とデフォルト値をマージ
        return { ...defaults, ...savedSettings };
    }

    const settings = loadSettings();
    const rssUrls = settings.rssUrls ? settings.rssUrls.split('\n').filter(url => url.trim() !== '') : [];

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

    // --- UIの初期設定 ---
    function applyUISettings() {
        if (settings.ipadMode) $('body').addClass('ipad-layout');
        if (!settings.showRss) $('.news-container').hide();
        if (!settings.showWeather) $('#weather').hide();
        if (!settings.showCalendar) {
            $('#calendar-container').hide();
        }
        // 時計は常に表示する
        $('.clock-container').show();
    }

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

    // --- 時計の更新ループ ---
    function clockLoop() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        
        $('#clock .clock-digit').eq(0).text(h.charAt(0));
        $('#clock .clock-digit').eq(1).text(h.charAt(1));
        $('#clock .clock-digit').eq(2).text(m.charAt(0));
        $('#clock .clock-digit').eq(3).text(m.charAt(1));
        
        $('.seconds-main .second-digit').eq(0).text(s.charAt(0));
        $('.seconds-main .second-digit').eq(1).text(s.charAt(1));

        if (settings.highPrecisionSeconds) {
            const ms = String(now.getMilliseconds()).padStart(3, '0');
            $('#second-decimals').text(`.${ms.slice(0,4)}`);
        } else {
            $('#second-decimals').text('');
        }

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
            if (settings.showHolidays && typeof holiday_jp !== 'undefined' && holiday_jp.isHoliday(date)) {
                classes += ' holiday';
            }
            html += `<div class="${classes}">${day}</div>`;
        }
        html += '</div>';
        $('#calendar-container').html(html);
    }

    // --- 起動シーケンス ---
    function animateElement(selector) {
        const $element = $(selector);

        $element.removeClass('hidden-on-load').addClass('blinking');
        setTimeout(() => {
            $element.removeClass('blinking');
            setTimeout(() => $element.addClass('fade-in'), 500);
        }, 450); // 3 blinks * 150ms
    }

    function startUpSequence() {
        animateElement('.clock-container');
        animateElement('.seconds-wrapper');
        if (settings.showCalendar) animateElement('#calendar-container');
        setTimeout(() => animateElement('.news-container'), 1000);
        setTimeout(() => animateElement('.meta-container'), 2000);
    }

    // --- データ取得・更新関数 ---
    function updateDate() {
        const now = new Date();
        $('#date').html(`${now.getFullYear()}年 ${now.getMonth() + 1}月${now.getDate()}日 ${["日", "月", "火", "水", "木", "金", "土"][now.getDay()]}曜日`);
    }

    function fetchWeather() {
        if (!settings.showWeather || !settings.latitude || !settings.longitude) {
            if (settings.showWeather) $('#weather').text('位置情報が設定されていません。');
            return;
        }
        console.log("天気情報を取得中...");
        $.get(`/api/weather?lat=${settings.latitude}&lon=${settings.longitude}`, function(data) {
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
        if (!settings.showRss || rssUrls.length === 0) {
            if (settings.showRss) $('#news-ticker-content').text('RSSフィードが設定されていません。');
            return;
        }
        console.log("RSSフィードを取得中...");
        const promises = rssUrls.map(url => $.get(`/api/news?feedUrl=${encodeURIComponent(url)}`).catch(e => { console.error(`Failed to fetch ${url}`, e); return null; }));
        Promise.all(promises).then(feeds => {
            let allItems = [];
            feeds.forEach(feed => { if (feed && feed.items) allItems = allItems.concat(feed.items); });
            if (allItems.length > 0) {
                allItems.sort(() => Math.random() - 0.5);
                const tickerText = allItems.map(item => item.title).join('　／　');
                const $newsContainer = $('.news-container');
                const $oldTickerContent = $('#news-ticker-content');
                const $newTickerContent = $('<div>').attr('id', 'news-ticker-content').text(tickerText);
                $oldTickerContent.replaceWith($newTickerContent);
                requestAnimationFrame(() => {
                    const textWidth = $newTickerContent.width();
                    const containerWidth = $newsContainer.width();
                    let speed = parseInt(settings.scrollSpeed, 10);
                    if (!speed || speed <= 0) { console.error("無効なスクロール速度のため、120に設定します。"); speed = 120; }
                    const duration = (textWidth + containerWidth) / speed;
                    $newTickerContent.css({ 'animation-name': 'ticker-animation', 'animation-duration': `${Math.max(20, duration)}s` });
                    console.log(`ニュースティッカーを更新しました。 DURATION: ${duration.toFixed(2)}s`);
                });
            } else { 
                $('#news-ticker-content').text('ニュースが見つかりませんでした。');
                console.warn("ニュースフィードが見つかりませんでした。"); 
            }
        });
    }

    // --- アプリケーションの実行開始 ---
    applyUISettings();
    startUpSequence();
    updateDate();
    fetchWeather();
    fetchNews();
    renderCalendar();
    clockLoop(); // 時計のループを開始

    // 定期的なデータ更新
    setInterval(updateDate, 60000);
    setInterval(fetchWeather, 600000);
    setInterval(fetchNews, 3600000);
});
