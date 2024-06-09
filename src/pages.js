

let activePage;
for (const tab of document.querySelectorAll("page-tab")) {
    if (tab.hasAttribute("active")) activePage = tab.id.substring(4);

    tab.addEventListener("click", () => {

        document.getElementById("tab#" + activePage).removeAttribute("active");
        document.getElementById(activePage).removeAttribute("active");

        activePage = tab.id.substring(4);
        console.log(activePage);
        
        tab.setAttribute("active", true);
        document.getElementById(activePage).setAttribute("active", true);
    });
}
