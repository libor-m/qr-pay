chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
        document.getElementById("txtar").innerText = request.viewsource;
    });

chrome.tabs.executeScript(null, {file:"script.js"});
