if (typeof isLocalAnaheimLoaded === 'undefined'){
    isLocalAnaheimLoaded = false;
}

function main(){
    var container = document.querySelector("#pbiThemed0");
    var notice = document.createElement("div")
    notice.style.backgroundColor = "#f2c811"
    notice.style.color = "black"
    notice.style.fontSize = "18px"
    notice.style.fontWeight = "bold"
    notice.style.textAlign = "center"
    notice.textContent = "== Using Anaheim From Localhost =="
    container.appendChild(notice)
}

if (!isLocalAnaheimLoaded && document.readyState === "complete") {
    isLocalAnaheimLoaded = true;
    main();
}