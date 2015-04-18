// code that gets injected into the target page
// keep this as simple as possible

var selection = window.getSelection();
if (!selection.isCollapsed) {
    chrome.runtime.sendMessage(selection.toString())
} 

