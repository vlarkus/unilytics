import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

function createWindow() {
    const isDev = !app.isPackaged;
    const iconPath = isDev
        ? path.join(__dirname, "../../web/public/logo.png")
        : path.join(__dirname, "renderer/dist/logo.png");

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simplicity in this setup, consider enabling contextIsolation for security in production
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In production, load the built index.html from the web app
        const rendererDist = path.join(__dirname, 'renderer/dist/index.html');
        const rendererRoot = path.join(__dirname, 'renderer/index.html');

        if (fs.existsSync(rendererDist)) {
            win.loadFile(rendererDist);
        } else {
            win.loadFile(rendererRoot);
        }
    }
}

app.whenReady().then(() => {
    if (process.platform === "win32") {
        app.setAppUserModelId("com.adaptive.telemetry.unilytics");
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
