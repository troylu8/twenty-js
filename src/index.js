const { app, BrowserWindow, Notification, ipcMain, dialog } = require('electron');

app.whenReady().then(() => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('view/index.html');
    win.webContents.openDevTools();


    let notif;
    ipcMain.on("notification", (e, title, body) => {
        if (notif) notif.close();

        notif = new Notification({title: title, body: body, silent: true});

        notif.show();
        setTimeout(() => notif.close(), 3000);
    });


    win.once("close", (e) => {
        win.webContents.send("cleanup");
        e.preventDefault();
    });
    ipcMain.on("cleanup-done", () => app.quit());
    
});

ipcMain.handle("show-dialog", async (e, options) => await dialog.showOpenDialog(options));
