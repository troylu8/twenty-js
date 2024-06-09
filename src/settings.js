import { audio } from './audio.js';
import { getTimeDisplay } from './time.js';
const fs = require('fs');
const EventEmitter = require('events');
const { ipcRenderer } = require("electron");
const { basename } = require("path");

export const settingsReady = new EventEmitter();

export let settings;
(async () => {
    settings = JSON.parse(await fs.promises.readFile(__dirname + "/../settings.json"));
    settingsReady.emit("ready", settings);


    function setTimeInputValue(sects, seconds) {
        const arr = getTimeDisplay(seconds).split(":");
        for (let i = 0; i < 3; i++) {
            sects[2-i].value = arr[arr.length-i-1] ?? "00";
        }
    }
    function getTimeInputValue(sects) {
        let res = 0;
        for (let i = 0; i < 3; i++) {
            res += sects[i].value * Math.pow(60, 2-i);
        }
        return res;
    }

    for (const status of ["working", "resting"]) {
        const sects = document.getElementById("timeinput#" + status).getElementsByTagName("input");
    
        for (let i = 0; i < 3; i++) {
            const sect = sects[i];
            sect.addEventListener("input", (e) => {
                sect.value = sect.value.replace(/[^0-9]/g, '');
    
                if (sect.value.length === 2) sects[Math.min(i+1, sects.length-1)].focus();
            });
            sect.addEventListener("focusout", () => {
                settings[status + "-duration"] = getTimeInputValue(sects) * 1000;
                sect.value = sect.value.padStart(2, "0");
            });
            
        }
    
        setTimeInputValue(sects, settings[status + "-duration"] / 1000);
    }


    for (const textInput of document.getElementById("notifications").querySelectorAll("input")) {
        textInput.addEventListener("input", () => settings[textInput.id] = textInput.value);
        textInput.value = settings[textInput.id];
    }

    for (const time of ["start", "end"]) {
        const audioInput = document.getElementById("audioinput#" + time);
        
        audioInput.querySelector("button").addEventListener("click", async () => {
            const dialog = await ipcRenderer.invoke("show-dialog", {
                title: `edit ${time} chime`,
                properties: ['openFile'],
                filters: [
                    { name: 'audio', extensions: ["mp3", "wav", "m4a", "avi"] },
                ],
            });
            if (dialog.canceled) return;

            fs.unlink(__dirname + "/../view/audio/" + settings[time + "-chime"], () => {});

            fs.createReadStream(dialog.filePaths[0]).pipe(
                fs.createWriteStream(__dirname + "/../view/audio/" + basename(dialog.filePaths[0]))
            )
                
            settings[time + "-chime"] = basename(dialog.filePaths[0]);
        });
    }

    const volumeInput = document.getElementById("volume-input");
    audio.volume = settings["volume"] / 100;
    volumeInput.value = settings["volume"];

    volumeInput.addEventListener("mouseup", () => {
        settings["volume"] = audio.volume * 100;
    });

    addDragEvent(volumeInput, () => audio.volume = volumeInput.value / 100);
    setSliderColors(volumeInput, "var(--accent)", "grey");

})();


function addDragEvent(elem, ondrag, onmousedown, onmouseup) {
    if (elem.dragging === undefined) {
        elem.dragging = false;
        elem.addEventListener("mousedown", (e) => { 
            if (e.button !== 0) return;
            elem.dragging = true; 
            if (onmousedown) onmousedown(e);
        });
        document.body.addEventListener("mouseup", (e) => { 
            if (!elem.dragging) return;
            elem.dragging = false; 
            if (onmouseup) onmouseup(e);
        });
    }
    document.body.addEventListener("mousemove", (e) => { if (elem.dragging) ondrag(e); });
}

function setSliderColors(slider, left, right) {
    slider.updateSliderColors = function () {
        this.style.background = `linear-gradient(to right, ${left} 0%, ${left} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} 100%)`;
    }
    slider.addEventListener("input", slider.updateSliderColors);
    slider.updateSliderColors();
}



ipcRenderer.on("cleanup", async () => {
    await fs.promises.writeFile(__dirname + "/../settings.json", JSON.stringify(settings, null, 4));
    ipcRenderer.send("cleanup-done");
});
