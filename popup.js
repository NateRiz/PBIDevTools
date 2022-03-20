function main(){
    var isDevToolbarEnabled = false
    var isUseLocalAnaheimEnabled = false
    var activityTypes = {}

    fetch(chrome.extension.getURL('/activities.json'))
    .then((resp) => resp.json())
    .then(function (jsonData) {
        activityTypes = jsonData
        var activityTypeInput = document.querySelector("#PbiDevActivityTypeInput")
        if (activityTypeInput !== null){
            activityTypeInput.oninput()
        }

    })

    fetch(chrome.extension.getURL('/VERSION.txt'))
    .then((resp) => resp.text())
    .then((resp) => document.querySelector("#PbiDevVersion").textContent = resp)

    chrome.storage.sync.get(["DevToolbar", "UseLocalAnaheim"], function(data){
        isDevToolbarEnabled = (data.DevToolbar===true)
        isUseLocalAnaheimEnabled = (data.UseLocalAnaheim===true)

        devToolbarSlider = document.querySelector("#PbiDevDevToolbar")
        devToolbarSlider.checked = isDevToolbarEnabled

        localAnaheimToolbarSlider = document.querySelector("#PbiDevLocalAnaheim")
        localAnaheimToolbarSlider.checked = isUseLocalAnaheimEnabled

        devToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"DevToolbar": devToolbarSlider.checked})
        }
        localAnaheimToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"UseLocalAnaheim": localAnaheimToolbarSlider.checked})
        }
    })

    var activityTypeInput = document.querySelector("#PbiDevActivityTypeInput")
    var activityTypeResult = document.querySelector("#PbiDevActivityTypeResult")
    if (activityTypeInput !== null && activityTypeResult !== null){
        activityTypeInput.oninput = function () {
            var activityType = activityTypeInput.value.toUpperCase()
            if (activityType.length != 4){
                return
            }

            activityTypeResult.value = (activityTypes[activityType] === undefined ? "Not Found" : activityTypes[activityType])
        }

        var clipboard = getClipboard()
        if (clipboard !== undefined && clipboard.length == 4){
            activityTypeInput.value = clipboard
            activityTypeInput.oninput()
        }
    }
}

function getClipboard(){
    var t = document.createElement("input");
    document.body.appendChild(t);
    t.focus();
    document.execCommand("paste");
    var clipboardText = t.value.trim();
    document.body.removeChild(t);
    return clipboardText
}

document.addEventListener("DOMContentLoaded", function(event) { 
    main()
});