if (isPageLoaded === undefined)
{
    var isPageLoaded = false
    var activityTypes = {}
    var isActivityTypeTooltipsEnabled = false
}

function injectTooltip(node, activityType){
    var span = document.createElement("span");
    span.title = activityTypes[activityType]
    span.classList.add("PbiDevActivityTypeTooltip")
    span.style.borderStyle = "dashed"
    span.style.borderColor = "goldenrod"
    span.style.borderWidth = "1px"
    span.appendChild(document.createTextNode(activityType));
    var idx = node.textContent.indexOf(activityType)
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

    var activityKeys = Object.keys(activityTypes)
    Array.from(activityKeys).forEach((k)=>{
        if (map[k]){
            var elements = map[k]
            Array.from(elements).forEach((elem)=>{
                injectTooltip(elem, k)
            })
        }
    })
}

function main(){
    fetch(chrome.extension.getURL('/activities.json'))
    .then((resp) => resp.json())
    .then(function (jsonData) {activityTypes = jsonData})
    .then(() => checkForActivityTypes())
}

if (!isPageLoaded && document.readyState === "complete") {
    isPageLoaded = true
    main();
}