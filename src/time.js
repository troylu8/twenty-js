import { playChime } from "./audio.js";
import { settingsReady } from "./settings.js";
const {ipcRenderer} = require('electron');

class Timer {

    duration;

    /** 
     * @param {number} duration  
     * @param {object} events
     * @param {function()} events.onstart  
     * @param {function()} events.ontick  
     * @param {function()} events.onend
     * */
    constructor(duration, events) {

        this.duration = duration;

        let endTime;
        let remainingTime = this.duration;

        let state = "idle";
        let timer;

        let ticker;
        let tickAnchor;
        let interval = 1000;
        let tilNextTick = interval;

        const start = () => {
            if (state === "idle") {
                events.onstart();
                events.ontick();
            } 
            state = "running";

            endTime = Date.now() + remainingTime;
            
            timer = setTimeout(() => {
                events.ontick();
                state = "done";
                clearTimeout(timer);
                clearInterval(ticker);
                events.onend();
            }, remainingTime);
                
            tickAnchor = Date.now() - (interval - tilNextTick);
                
            ticker = setTimeout(() => {

                events.ontick();

                ticker = setInterval(events.ontick, interval);

            }, tilNextTick);
        }

        const stop = () => {
            state = "paused";
            clearTimeout(timer);
            remainingTime = endTime - Date.now();

            clearInterval(ticker);
            tilNextTick = interval - ((Date.now() - tickAnchor) % interval);
        }

        this.reset = () => { 
            state = "idle";
            clearTimeout(timer);
            clearInterval(ticker);
            remainingTime = this.duration;
            tilNextTick = interval;
        }

        this.toggle = () => (state === "running")? stop() : start();

        this.getTime = () => {
            if (state === "running")    return this.duration - (endTime - Date.now());
            if (state === "done")       return this.duration;
            if (state === "paused")     return this.duration - remainingTime;
            /*if (state === "idle")*/   return 0;
        }

        /** @returns {"running" | "done" | "paused" | "idle" } */
        this.getState = () => state;
        
    }
}


const timeElem = document.getElementById("time").firstElementChild;
const toggleBtn = document.getElementById("play");
const ffBtn = document.getElementById("ff");
const statusElem = document.getElementById("status");

const icons = {
    play:  `<svg width="25px" height="25px" viewBox="0 0 24 24" fill="white">
                <path d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z"/>
            </svg>`,
    pause: `<svg width="25px" height="25px" viewBox="0 0 24 24" fill="white">
                <path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z"/>
                <path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z"/>
            </svg>`
}
toggleBtn.innerHTML = icons["play"];

settingsReady.on("ready", (settings) => {

    const timer = new Timer(
        settings["working-duration"], 
        {
            onstart: () => {
                if (settings[status + "-start-notif-enabled"]) ipcRenderer.send("notification", settings[status + "-start-notif"]);
                if (settings["start-chime-enabled"]) playChime(settings["start-chime"]);
            },
            ontick: () => {
                timeElem.textContent = getTimeDisplay(timer.getTime() / 1000);
                if (minimized) ipcRenderer.send("edit-tray-tooltip", timeElem.textContent);
            },
            onend: () => {

                if (settings[status + "-end-notif-enabled"]) ipcRenderer.send("notification", settings[status + "-end-notif"]);
                if (settings["end-chime-enabled"]) playChime(settings["end-chime"]);

                toggleBtn.innerHTML = icons["play"];
            } 
        }
    );

    /** @type {"resting" | "working"} */
    let status = "working";

    function toggleStatus() {
        status = status === "resting"? "working" : "resting";
        statusElem.textContent = "currently " + status;
        timer.duration = settings[status + "-duration"];
        timer.reset();
    }
    

    toggleBtn.addEventListener("click", () => {
        if (timer.getState() === "done") toggleStatus();
        
        timer.toggle();
        toggleBtn.innerHTML = (timer.getState() === "running")? icons["pause"] : icons["play"];
    });
    ipcRenderer.on("toggle", () => {
        toggleBtn.click();
        const timeDisplay = getTimeDisplay(timer.getTime() / 1000);
        ipcRenderer.send("notification", 
            ((timer.getState() === "paused")? "paused - " : `${status} - `) + timeDisplay
        );
        if (minimized) ipcRenderer.send("edit-tray-info", status, timer.getState());
    });

    ffBtn.addEventListener("click", () => {
        if (timer.getState() === "paused") {
            toggleStatus();
            timeElem.textContent = getTimeDisplay(0);
            toggleBtn.innerHTML = icons["play"];
        } 
        else {
            toggleStatus();
            toggleBtn.click();
        }
    });
    ipcRenderer.on("ff", () => {
        ffBtn.click();
        if (minimized) ipcRenderer.send("edit-tray-info", status, timer.getState());
    });
    
    let minimized = false;
    ipcRenderer.on("request-tray-info", () => {
        minimized = true;
        ipcRenderer.send("edit-tray-info", status, timer.getState());
        ipcRenderer.send("edit-tray-tooltip", timeElem.textContent);
    });
    ipcRenderer.on("tray-destroyed", () => minimized = false);
});


export function getTimeDisplay(totalSeconds) {
    totalSeconds = Math.floor(totalSeconds);

    const res = [];

    res.push(("" + totalSeconds % 60).padStart(2, "0"));
    totalSeconds = Math.floor(totalSeconds / 60);

    res.push(("" + totalSeconds % 60).padStart(2, "0"));
    totalSeconds = Math.floor(totalSeconds / 60);
    
    if (totalSeconds > 0) res.push("" + totalSeconds);

    return res.reverse().join(":");
}