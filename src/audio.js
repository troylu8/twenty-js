export const audio = new Audio();

export function playChime(basename) {
    audio.src = __dirname + "/../view/audio/" + basename;
    audio.play();
}