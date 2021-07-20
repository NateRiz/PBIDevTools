if (typeof window.isLocalAnaheimLoaded === 'undefined'){
    window.isLocalAnaheimLoaded = false;
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
    isLocalAnaheimLoaded = true;
}

if (!window.isLocalAnaheimLoaded && document.readyState === "complete"){
    main();
}