# Info Server (Digital Dashboard)

[日本語 (Japanese)](./README.md)

**Info Server** is a comprehensive digital dashboard designed for always-on displays like iPads or older tablets (e.g., Nexus 5X). It aggregates essential information such as time, weather, news, and calendar events into a sleek, customizable interface.

## Features

- **Digital Clock**: High-precision clock with the "Orbitron" font. Supports sub-second display.
- **Weather Information**: Real-time weather updates using the OpenWeatherMap API.
- **RSS News Ticker**: Scrolling news ticker supporting multiple RSS feeds (preset & custom).
- **Calendar**: Monthly calendar with support for Japanese holidays.
- **Earthquake Alerts**: Earthquake early warning display using the P2PQuake API.
- **Theming**: Switch between various themes (Default, Blade Runner, Evangelion, 2001: A Space Odyssey).
- **Device Optimization**: Specialized layouts for iPad (9th Gen) and Nexus 5X.
- **Web-based Settings**: Easy configuration via a dedicated settings page.
- **Smart Caching**: API responses are configured to prevent client-side caching, ensuring your device storage doesn't fill up over time.

## Requirements

- **Node.js**: v14 or later recommended.
- **OpenWeatherMap API Key**: Required for fetching weather data.

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/Info-server.git
   cd Info-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your OpenWeatherMap API key:
   ```env
   OPENWEATHERMAP_API_KEY=your_api_key_here
   ```

## Usage

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Access the dashboard:**
   Open a browser and navigate to `http://localhost:3000`.

3. **Configure settings:**
   Click the gear icon (⚙️) on the dashboard or navigate to `http://localhost:3000/settings.html` to customize themes, layout, and feeds.

## License

This project is licensed under the ISC License.
