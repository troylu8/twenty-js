const { app, BrowserWindow, Notification, ipcMain, dialog, globalShortcut, Tray, Menu, MenuItem } = require('electron');

app.whenReady().then(() => {
    const win = new BrowserWindow({
        width: 600,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('view/index.html');
    win.setMenu(null);
    win.webContents.openDevTools();


    let notif;
    let timeout;
    ipcMain.on("notification", (e, title, body) => {
        if (notif) {
            notif.close();
            clearTimeout(timeout);
        } 

        notif = new Notification({title: title, body: body, silent: true});

        notif.show();
        timeout = setTimeout(() => notif.close(), 3000);
    });


    win.once("close", (e) => {
        win.webContents.send("cleanup");
        e.preventDefault();
    });
    ipcMain.on("cleanup-done", () => app.quit());
    

    globalShortcut.register('CommandOrControl+Alt+Space', () => {
        win.webContents.send("toggle");
    });
    globalShortcut.register('CommandOrControl+Alt+Right', () => {
        win.webContents.send("ff");
    });

    win.on("minimize", () => {
        win.hide();

        const tray = new Tray("moonlight.ico");

        function showWindow() {
            win.webContents.send("tray-destroyed");
            win.show();
            
            ipcMain.removeListener("edit-tray-tooltip", editTrayTooltip);
            ipcMain.removeListener("edit-tray-info", editTrayInfo);
            
            tray.destroy();
        }

        function editTrayTooltip(e, tooltip) {
            tray.setToolTip(tooltip);
        }
        function editTrayInfo(e, currStatus, timerState) {
            const prompt =  timerState === "paused"? "resume" :
                            timerState === "running"? "pause" :
                            "start"; //timerState === "idle" || timerState === "done"
            
            tray.setContextMenu(
                Menu.buildFromTemplate([
                    {
                        label: `${currStatus} ${timerState === "paused"? "(paused)" : ""}`, 
                        enabled: false
                    },
                    {type: "separator"},
                    {
                        label: prompt,
                        click: () => win.webContents.send("toggle")
                    },
                    {
                        label: "fast forward",
                        click: () => win.webContents.send("ff")
                    },
                    {
                        label: "open ui",
                        click: showWindow
                    },
                    {
                        label: "quit",
                        click: app.quit
                    }
                ])
            );
        }

        ipcMain.on("edit-tray-tooltip", editTrayTooltip);
        ipcMain.on("edit-tray-info", editTrayInfo);

        tray.addListener("click", showWindow);
        
        win.webContents.send("request-tray-info");
    });
    
});

ipcMain.handle("show-dialog", async (e, options) => await dialog.showOpenDialog(options));
