function main(){
    isDevToolbarEnabled = false
    isActivityTypeTooltipsEnabled = false

    chrome.storage.sync.get(["DevToolbar", "ActivityTypeTooltips"], function(data){
        isDevToolbarEnabled = !(data.DevToolbar===false)
        isActivityTypeTooltipsEnabled = !(data.ActivityTypeTooltips===false)
    
        devToolbarSlider = document.querySelector("#PbiDevDevToolbar")
        devToolbarSlider.checked = isDevToolbarEnabled

        activityTypeToolbarSlider = document.querySelector("#PbiDevActivityType")
        activityTypeToolbarSlider.checked = isActivityTypeTooltipsEnabled

        devToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"DevToolbar": devToolbarSlider.checked})
        }
        activityTypeToolbarSlider.onchange = function(){
            chrome.storage.sync.set({"ActivityTypeTooltips": activityTypeToolbarSlider.checked})
        }
    })
}

document.addEventListener("DOMContentLoaded", function(event) { 
    main()
});