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
            console.log("remaining", remainingTime);

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
const playBtn = document.getElementById("play");
const statusElem = document.getElementById("status");


settingsReady.on("ready", (settings) => {

    const timer = new Timer(
        settings["working-duration"], 
        {
            onstart: () => {
                ipcRenderer.send("notification", settings[status + "-start-notif"]);
                playChime(settings["start-chime"]);
            },
            ontick: () => timeElem.textContent = getTimeDisplay(timer.getTime() / 1000),
            onend: () => {
                ipcRenderer.send("notification", settings[status + "-end-notif"]);
                playBtn.textContent = "play";
                playChime(settings["end-chime"]);
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


    playBtn.addEventListener("click", () => {
        if (timer.getState() === "done") toggleStatus();
        
        timer.toggle();
        playBtn.textContent = (timer.getState() === "running")? "pause" : "play";
    });

    document.getElementById("ff").addEventListener("click", () => {
        toggleStatus();
        playBtn.textContent = "play";
        timeElem.textContent = getTimeDisplay(0);
    });

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