$(document).ready(function() {
    // --- 設定の読み込みとデフォルト値の設定 ---
    function loadSettings() {
        const savedSettings = Cookies.get('dashboardSettings') ? JSON.parse(Cookies.get('dashboardSettings')) : {};
        const defaults = {
            rssUrls: '', scrollSpeed: 120, latitude: '', longitude: '',
            showRss: true, showWeather: true, showCalendar: false, showHolidays: true,
            highPrecisionSeconds: false, alarmTime: '', enableAlarm: false,
            enableChime: false, enableQuake: false, quakeThreshold: 1,
            showWind: true, showPressure: true, showVisibility: true,
            ipadMode: false, nexus5xMode: false, debugOverlayEnabled: false
        };
        // 保存された設定とデフォルト値をマージ
        return { ...defaults, ...savedSettings };
    }

    const settings = loadSettings();
    const rssUrls = settings.rssUrls ? settings.rssUrls.split('\n').filter(url => url.trim() !== '') : [];

    // --- 祝日データ ---
    let holidayData = {};
    function fetchHolidayData() {
        $.getJSON('https://holidays-jp.github.io/api/v1/date.json', function(data) {
            holidayData = data;
            renderCalendar();
        }).fail(() => console.error('祝日データの取得に失敗しました。'));
    }

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
        if (settings.nexus5xMode) $('body').addClass('nexus5x-layout');
        if (!settings.showRss) $('.news-container').hide();
        if (!settings.showWeather) $('#weather').hide();
        if (!settings.showCalendar || settings.nexus5xMode) {
            $('#calendar-container').hide();
            $('body').removeClass('calendar-active');
        } else {
            $('#calendar-container').show();
            $('body').addClass('calendar-active');
        }
        // 時計は常に表示する
        $('.clock-container').show();
    }

    // --- アラーム関連 ---
    const $alarmSound = $('#alarm-sound')[0];
    const $chimeSound = $('#hourly-chime')[0];
    let lastChimeHour = null;
    let isAlarmRinging = false;
    let alarmTriggeredToday = false;
    let lastQuakeId = null;
    
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

        if (settings.enableChime && now.getMinutes() === 0 && now.getSeconds() === 0) {
            if (lastChimeHour !== now.getHours()) {
                $chimeSound.currentTime = 0;
                $chimeSound.play();
                lastChimeHour = now.getHours();
            }
        }
        
        requestAnimationFrame(clockLoop);
    }

    // --- カレンダー ---
    function renderCalendar() {
        if (!settings.showCalendar || settings.nexus5xMode) return;
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
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (settings.showHolidays && holidayData[iso]) {
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
        if (settings.showCalendar && !settings.nexus5xMode) animateElement('#calendar-container');
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
            let html = `<div><img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}" style="vertical-align: middle; height: 2em; margin-right: 0.2em;"><span style="font-size: 1.5em; vertical-align: middle;">${data.main.temp.toFixed(1)}°C</span></div>`;
            html += `<div><span style="color: #ff6347;">${data.main.temp_max.toFixed(1)}°C</span> / <span style="color: #4682b4;">${data.main.temp_min.toFixed(1)}°C</span></div>`;
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

    // --- 地震情報取得 ---
    const scaleMap = {
        0: '0', 10: '1', 20: '2', 30: '3', 40: '4', 45: '5弱',
        50: '5強', 55: '6弱', 60: '6強', 70: '7'
    };

    function fetchQuake() {
        if (!settings.enableQuake) return;
        $.get('https://api.p2pquake.net/v2/jma/quake?limit=1', function(data) {
            if (!data || !data.length) return;
            const q = data[0];
            if (q.id === lastQuakeId) return;
            lastQuakeId = q.id;
            const scale = q.earthquake.maxScale;
            const threshold = (parseInt(settings.quakeThreshold, 10) || 1) * 10;
            if (scale >= threshold) {
                const text = `${q.earthquake.hypocenter.name}で震度${scaleMap[scale] || scale}`;
                $('#quake-banner').text(text).addClass('visible');
                setTimeout(() => $('#quake-banner').removeClass('visible'), 10000);
            }
            if (scale >= 50) {
                if (!isAlarmRinging) {
                    $('body').addClass('alarm-ringing');
                    $alarmSound.play();
                    isAlarmRinging = true;
                    setTimeout(stopAlarm, 10000);
                }
            }
        }).fail(() => console.error('地震情報の取得に失敗しました。'));
    }

    // --- アプリケーションの実行開始 ---
    applyUISettings();
    startUpSequence();
    updateDate();
    fetchWeather();
    fetchNews();
    fetchQuake();
    fetchHolidayData();
    renderCalendar();
    clockLoop(); // 時計のループを開始

    // 定期的なデータ更新
    setInterval(updateDate, 60000);
    setInterval(fetchWeather, 600000);
    setInterval(fetchNews, 3600000);
    setInterval(fetchQuake, 60000);
});
