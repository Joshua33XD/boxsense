# ESP32 Drop Detection Dashboard

A professional, modern React-based dashboard for monitoring ESP32 sensor data and drop detection events.

## Features

- 📡 **Live Sensor Data**: Real-time display of sensor readings (Temperature, Humidity, Roll, Pitch, Yaw, G-Force, LDR, FLEX)
- 🚨 **Drop Detection**: Comprehensive drop event logging with detailed metrics:
  - Device and PC timestamps
  - Drop intensity (LOW/MEDIUM/HIGH) with color-coded badges
  - Peak G-force
  - Drop height
  - LDR and **Peak LDR** values (highlighted)
  - FLEX and **Peak FLEX** values (highlighted)
- 📊 **Professional UI**: Modern React-based dashboard with:
  - Auto-refreshing every 2 seconds
  - Smooth animations and transitions
  - Responsive design for all screen sizes
  - Clean, intuitive interface

## Tech Stack

- **Frontend**: React 18, HTML5, CSS3
- **Backend**: Python (Flask + SocketIO) - Integrated in `hi.py`
- **Data Source**: CSV file (`drop_log.csv`), real-time BLE data

## Prerequisites

- **Python 3.7+** with pip
- **Node.js 14+** and npm (for React frontend)
  - Download from [nodejs.org](https://nodejs.org/) if not installed
  - Verify installation: `node --version` and `npm --version`

## Installation

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Node.js dependencies (for React frontend)

```bash
npm install
```

**Note**: If you get `npm: command not found`, install Node.js from [nodejs.org](https://nodejs.org/)

## Usage

### Option 1: Full Setup (with React UI)

#### Step 1: Start the data fetcher + API server

In one terminal, run:
```bash
python hi.py
```

This will:
- Connect to ESP32 via BLE
- Fetch sensor data in real-time
- Start Flask API server on `http://localhost:5000`
- Save drop events to `drop_log.csv`

#### Step 2: Start the React Development Server

In another terminal, run:
```bash
npm start
```

The React app will automatically open in your browser at `http://localhost:3000`

#### One-command dev mode (optional)

Run both the Python server and React app together:

```bash
npm run dev
```

(Requires both Python and Node.js in your PATH)

### Option 2: Backend Only (API testing)

If you just want to test the backend without the React UI:

```bash
python hi.py
```

Then access the API endpoints directly:
- `http://localhost:5000/api/drops` - Get drop events
- `http://localhost:5000/api/live` - Get live sensor data
- `http://localhost:5000/api/peaks` - Get peak values

## Dashboard Features

### Live Data Section
- Displays 8 sensor readings in a responsive grid
- Shows "--" if data is not available
- Updates automatically every 2 seconds

### Drop Detection History
- Scrollable list of all drop events
- Each entry displays:
  - **PC Time** and **Device Time**
  - **Intensity badge** (color-coded: 🟢 Low, 🟠 Medium, 🔴 High)
  - **Peak G-force**
  - **Height** (meters)
  - **LDR** and **Peak LDR** (Peak values highlighted in blue)
  - **FLEX** and **Peak FLEX** (Peak values highlighted in blue)

### Auto-Refresh
- Dashboard automatically refreshes every 2 seconds
- Manual refresh button available in header
- Shows last update time

## CSV Format

The dashboard reads from `drop_log.csv`. Expected columns:

- `PC_Time` - Timestamp from PC
- `Device_Time` - Timestamp from ESP32
- `Intensity` - LOW, MEDIUM, or HIGH
- `Peak_G` - Peak G-force value
- `Height_m` - Drop height in meters
- `LDR_percent` - LDR sensor reading
- `FLEX_percent` - FLEX sensor reading
- `Peak_LDR_percent` - (Optional) Peak LDR value
- `Peak_FLEX_percent` - (Optional) Peak FLEX value

If Peak LDR/FLEX columns don't exist, the dashboard will use the regular LDR/FLEX values.

## Project Structure

```
paper/
├── src/
│   ├── components/
│   │   ├── Header.js          # Dashboard header with refresh
│   │   ├── Header.css
│   │   ├── LiveDataSection.js # Live sensor data display
│   │   ├── LiveDataSection.css
│   │   ├── DropHistorySection.js # Drop history container
│   │   ├── DropHistorySection.css
│   │   ├── DropItem.js        # Individual drop event card
│   │   └── DropItem.css
│   ├── App.js                 # Main React component
│   ├── App.css
│   ├── index.js              # React entry point
│   └── index.css             # Global styles
├── public/
│   └── index.html            # HTML template
├── hi.py                     # ESP32 BLE connection + Flask API server
├── package.json              # Node.js dependencies
└── requirements.txt          # Python dependencies
```

## API Endpoints

- `GET /api/drops` - Returns array of drop events from CSV
- `GET /api/live` - Returns current live sensor data
- `GET /api/peaks` - Returns peak sensor values
- **WebSocket**: `live_data` and `peak_update` events via Socket.IO

## Building for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build/` folder.

## Troubleshooting

- **No drops showing**: Ensure `hi.py` is running and creating `drop_log.csv`
- **API errors**: Make sure `python hi.py` is running on port 5000
- **React app won't start**: 
  - Run `npm install` to install dependencies
  - If `npm: command not found`, install Node.js from [nodejs.org](https://nodejs.org/)
- **BLE connection fails**: 
  - Check ESP32 address in `hi.py` (ESP_ADDRESS)
  - Ensure ESP32 is powered on and advertising
  - Check Bluetooth permissions on your system
- **CORS errors**: Restart `python hi.py` and `npm start`

## Development

The React app uses Create React App and includes:
- Hot module reloading
- ESLint configuration
- Modern JavaScript (ES6+)
- CSS3 with animations and transitions
