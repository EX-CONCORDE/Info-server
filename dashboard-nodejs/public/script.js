$(document).ready(function() {
    // --- 設定値の読み込み ---
    const rssUrlsRaw = localStorage.getItem('rssUrls');
    const rssUrls = rssUrlsRaw ? rssUrlsRaw.split('\n').filter(url => url.trim() !== '') : [];
    const scrollSpeed = localStorage.getItem('scrollSpeed') || 120; // 速度を読み込み、なければ120に
    const lat = localStorage.getItem('latitude');
    const lon = localStorage.getItem('longitude');

    // --- 時計の更新 ---
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        
        // メインの時計の各桁を更新
        $('#clock .clock-digit').eq(0).text(h.charAt(0));
        $('#clock .clock-digit').eq(1).text(h.charAt(1));
        $('#clock .clock-digit').eq(2).text(m.charAt(0));
        $('#clock .clock-digit').eq(3).text(m.charAt(1));
        
        // 秒の各桁を更新
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
        $.get(`/api/weather?lat=${lat}&lon=${lon}`, function(data) {
            const temp = data.main.temp.toFixed(1);
            const description = data.weather[0].description;
            const icon = data.weather[0].icon;
            $('#weather').html(`
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}" style="vertical-align: middle; height: 1.2em;">
                ${temp}°C ${description}
            `);
        }).fail(function() {
            $('#weather').text('天気情報の取得に失敗しました。');
        });
    }

    // --- ニュースの取得と表示 ---
    function fetchNews() {
        if (rssUrls.length === 0) return;

        const promises = rssUrls.map(url => 
            $.get(`/api/news?feedUrl=${encodeURIComponent(url)}`).catch(e => {
                console.error(`Failed to fetch ${url}`, e);
                return null;
            })
        );

        Promise.all(promises).then(feeds => {
            let allItems = [];
            feeds.forEach(feed => {
                if (feed && feed.items) {
                    allItems = allItems.concat(feed.items);
                }
            });

            if (allItems.length > 0) {
                allItems.sort(() => Math.random() - 0.5);
                
                const tickerText = allItems.map(item => item.title).join('　／　');
                const $tickerContent = $('#news-ticker-content');
                $tickerContent.text(tickerText);

                $tickerContent.css('animation', 'none');
                $tickerContent.get(0).offsetHeight; 

                setTimeout(() => {
                    const textWidth = $tickerContent.width();
                    const containerWidth = $('.news-container').width();
                    
                    const duration = (textWidth + containerWidth) / parseInt(scrollSpeed, 10);
                    
                    $tickerContent.css({
                        'animation-name': 'ticker-animation',
                        'animation-duration': `${Math.max(20, duration)}s`
                    });
                }, 100);

            } else {
                $('#news-ticker-content').text('ニュースが見つかりませんでした。');
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
