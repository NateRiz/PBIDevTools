var activityTypes = {}

function injectTooltip(node, activityType){
    console.log("injecting")
    var span = document.createElement("span");
    span.title = activityTypes[activityType]
    span.classList.add("PbiDevActivityTypeTooltip")
    span.style.borderStyle = "dashed"
    span.style.borderColor = "goldenrod"
    span.style.borderWidth = "1px"
    span.appendChild(document.createTextNode(activityType));
    var idx = node.textContent.indexOf(activityType)
    console.log(node, activityType, idx)
    node.childNodes[0].textContent = node.childNodes[0].textContent.replace(activityType, "")
    node.insertBefore(span, node.childNodes[0].splitText(idx))
}


async function checkForActivityTypes(){
    var elems = [...document.querySelectorAll("h1, h2, h3, h4, h5, p, li, td, caption, span, a")]
    var map = {}
    Array.from(elems).forEach((v)=>{
        var text = v.childNodes[0]?.nodeValue?.trim().replace("  "," ")
        if (text) {
            var strs = [...text.matchAll(/\b([a-zA-Z]{4})\b/g)]
            if (strs.length){
                Array.from(strs).forEach((s)=>{
                    s=s[0]
                    if (!map[s]){
                        map[s] = []
                    }
                    map[s].push(v)
                })
            }
        }
    })

    console.log(Object.keys(map))
    var activityKeys = Object.keys(activityTypes)
    Array.from(activityKeys).forEach((k)=>{
        if (map[k]){
            console.log("key:",k)
            var elements = map[k]
            Array.from(elements).forEach((elem)=>{
                injectTooltip(elem, k)
            })
        }
    })
}

async function main(){
    console.log("STARTING!!!")
    if(!activityTypes.length){
        fetch(chrome.extension.getURL('/activities.json'))
        .then((resp) => resp.json())
        .then(function (jsonData) {activityTypes = jsonData})
        .then(() => checkForActivityTypes())
    }
    else{
        // Twice because above is async
        checkForActivityTypes()
    }
}

if (document.readyState === "complete") {
    console.log("COMPLEtE")
    main();
} else {
    console.log("listening...")
    window.addEventListener("DOMContentLoaded", main);
}