# How to Run the Hilton Chat Widget

## Why a Server is Required
The chat widget uses modern JavaScript features (**ES Modules**). For security reasons, web browsers block these features when you open the `index.html` file directly from your computer (using the `file://` protocol).

To make the widget work, you must serve it through a **local web server**.

## Recommended Methods

### Method 1: VS Code Live Server (Easiest)
1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Click the **"Go Live"** button in the bottom right corner of VS Code.
4. Your browser will automatically open the widget at `http://127.0.0.1:5500`.

### Method 2: Python (No installation needed on Mac)
1. Open your terminal.
2. Navigate to the project directory.
3. Run the following command:
   ```bash
   python3 -m http.server 8000
   ```
4. Open your browser and go to: `http://localhost:8000`

### Method 3: Node.js / npx
1. If you have Node.js installed, run:
   ```bash
   npx serve
   ```
2. Open the URL shown in the terminal (usually `http://localhost:3000`).

---
**Note:** If you see a blank page or the widget doesn't open, check the **Browser Console** (F12) for any lingering errors.
