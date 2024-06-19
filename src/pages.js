const {shell} = require("electron");

let activePage;
for (const tab of document.querySelectorAll("page-tab")) {
    if (tab.hasAttribute("active")) activePage = tab.id.substring(4);

    tab.addEventListener("click", () => {

        document.getElementById("tab#" + activePage).removeAttribute("active");
        document.getElementById(activePage).removeAttribute("active");

        activePage = tab.id.substring(4);
        
        tab.setAttribute("active", true);
        document.getElementById(activePage).setAttribute("active", true);
    });
}

for (const a of document.querySelectorAll("a")) {
    a.addEventListener("click", (e) => {
        shell.openExternal(a.getAttribute("href"));
        e.preventDefault();
    });
}
