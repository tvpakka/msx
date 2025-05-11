/******************************************************************************/
//Movie Search Interaction Plugin v0.0.1
//(c) 2025 Modified version
/******************************************************************************/

/******************************************************************************/
//Search data
/******************************************************************************/
var MAX_INPUT_LENGTH = 32;
var MAX_PAGE_X = 12;
var MAX_PAGE_Y = 6;
var SEARCH_HEADLINE = "{ico:search} {INPUT}";
var RESULTS_HEADLINE = "{ITEMS} found";
var SERVER_URL = "https://msx.asdftv.workers.dev/";

var createInputButton = function(input, key, x, y) {
    return {
        type: "button",
        layout: x + "," + y + ",1,1",
        label: input,
        key: key,
        action: "interaction:commit",
        data: {
            action: "search:input:" + input
        }
    };
};
var createControlButton = function(control, key, x, y) {
    var label = null;
    if (control == "back") {
        label = "{ico:backspace}";
    } else if (control == "clear") {
        label = "{ico:clear}";
    } else if (control == "space") {
        label = "{ico:space-bar}";
    }
    return {
        type: "button",
        layout: x + "," + y + ",4,1",
        label: label,
        key: key,
        action: "interaction:commit",
        data: {
            action: "search:control:" + control
        }
    };
};
var inputPage = {
    headline: null,
    offset: "0,0,0,0.5",
    items: [
        createInputButton("A", "a", 0, 0),
        createInputButton("B", "b", 1, 0),
        createInputButton("C", "c", 2, 0),
        createInputButton("D", "d", 3, 0),
        createInputButton("E", "e", 4, 0),
        createInputButton("F", "f", 5, 0),
        createInputButton("G", "g", 6, 0),
        createInputButton("H", "h", 7, 0),
        createInputButton("I", "i", 8, 0),
        createInputButton("J", "j", 9, 0),
        createInputButton("K", "k", 10, 0),
        createInputButton("L", "l", 11, 0),
        createInputButton("M", "m", 0, 1),
        createInputButton("N", "n", 1, 1),
        createInputButton("O", "o", 2, 1),
        createInputButton("P", "p", 3, 1),
        createInputButton("Q", "q", 4, 1),
        createInputButton("R", "r", 5, 1),
        createInputButton("S", "s", 6, 1),
        createInputButton("T", "t", 7, 1),
        createInputButton("U", "u", 8, 1),
        createInputButton("V", "v", 9, 1),
        createInputButton("W", "w", 10, 1),
        createInputButton("X", "x", 11, 1),
        createInputButton("Y", "y", 0, 2),
        createInputButton("Z", "z", 1, 2),
        createInputButton("1", "1", 2, 2),
        createInputButton("2", "2", 3, 2),
        createInputButton("3", "3", 4, 2),
        createInputButton("4", "4", 5, 2),
        createInputButton("5", "5", 6, 2),
        createInputButton("6", "6", 7, 2),
        createInputButton("7", "7", 8, 2),
        createInputButton("8", "8", 9, 2),
        createInputButton("9", "9", 10, 2),
        createInputButton("0", "0", 11, 2),
        createControlButton("back", "delete", 0, 3),
        createControlButton("clear", "home|end", 4, 3),
        createControlButton("space", "space|insert", 8, 3)
    ]
};
var search = {
    cache: false,
    type: "list",
    important: true,
    headline: null,
    pages: null
};

// Add a more prominent search button
inputPage.items.push({
    type: "button",
    layout: "0,4,12,1",
    label: "Search Movies",
    color: "msx-blue",
    action: "interaction:commit",
    data: {
        action: "search:execute"
    }
});
/******************************************************************************/

/******************************************************************************/
//SearchHandler
/******************************************************************************/
function SearchHandler() {
    var searchInput = TVXServices.urlParams.getFullStr("input", "");
    var resultItems = null;

    var createPages = function(items, itemCallback, pageCallback) {
        var x = 0;
        var y = 0;
        var w = 1;
        var h = 1;
        var page = null;
        var index = 0;
        //Create movie items
        if (items != null && items.length > 0) {
            for (var i in items) {
                var item = items[i];
                var pageItem = {
                    enumerate: true,
                    type: "default",
                    layout: x + "," + y + "," + w + "," + h,
                    color: "msx-glass",
                    iconSize: "small",
                    icon: item.poster || "movie",
                    label: item.title,
                    action: "panel:data",
                    data: {
                        pages: [
                            {
                                items: [
                                    {
                                        type: "default",
                                        layout: "2,1,4,4",
                                        offset: "0,0,0,-0.33",
                                        color: "msx-glass",
                                        iconSize: "large",
                                        label: item.title,
                                        icon: item.poster || "movie",
                                        description: item.description || "",
                                        action: "back"
                                    }
                                ]
                            }
                        ]
                    }
                };
                itemCallback(item, pageItem, index);
                if (page == null) {
                    page = {
                        items: []
                    };
                    pageCallback(page);
                }
                page.items.push(pageItem);
                x += w;
                if (x + w > MAX_PAGE_X) {
                    x = 0;
                    y += h;
                    if (y + h > MAX_PAGE_Y) {
                        y = 0;
                        page = null;
                    }
                }
                index++;
            }
        }
    };
    var handleSearchInput = function(input) {
        if (searchInput.length < MAX_INPUT_LENGTH) {
            searchInput += input;
        }
        // Update the input field display immediately
        updateSearchInput();
    };
    
    var handleSearchControl = function(control) {
        if (control == "back") {
            if (searchInput.length > 0) {
                searchInput = searchInput.substr(0, searchInput.length - 1);
            }
        } else if (control == "clear") {
            searchInput = "";
        } else if (control == "space") {
            if (searchInput.length > 0 && searchInput.length < MAX_INPUT_LENGTH && searchInput[searchInput.length - 1] != " ") {
                searchInput += " ";
            }
        } else {
            TVXInteractionPlugin.warn("Unknown search control: '" + control + "'");
        }
        // Update the input field display immediately
        updateSearchInput();
    };
    var performSearch = function(callback) {
        if (searchInput.length > 0) {
            var searchUrl = SERVER_URL + "movies/filesearch/?query=" + encodeURIComponent(searchInput);
            TVXServices.ajax.get(searchUrl, {
                success: function(data) {
                    Object.assign(search, data);
                    if ('cache' in search) {
                        search.cache = false;
                    } else {
                        search['cache'] = false;
                    }
                    callback();
                },
                error: function(error) {
                    TVXInteractionPlugin.error("Search request failed: " + error);
                    resultItems = [];
                    callback();
                }
            });
        } else {
            resultItems = [];
            callback();
        }
    };
    var updateSearch = function() {
        search.headline = SEARCH_HEADLINE.replace("{INPUT}", searchInput);
        search.pages = [inputPage];
        console.log("Search input: " + searchInput);
        
        // Add results pages if we have results
        if (resultItems && resultItems.length > 0) {
            Object.assign(search, resultItems);
            if ('cache' in search) {
                search.cache = false;
            } else {
                search['cache'] = false;
            }
        } else {
            inputPage.headline = searchInput.length > 0 ? "No movies found" : null;
        }
    };
    var updateSearchInput = function() {
        // Just update the input display without performing a search
        search.headline = SEARCH_HEADLINE.replace("{INPUT}", searchInput);
        TVXInteractionPlugin.executeAction("reload:content");
    };
    
    var reloadSearch = function() {
        // Update status to show searching
        search.headline = SEARCH_HEADLINE.replace("{INPUT}", searchInput + " (searching...)");
        TVXInteractionPlugin.executeAction("reload:content");
        
        // Perform the actual search
        performSearch(function() {
            updateSearch();
            TVXInteractionPlugin.executeAction("reload:content");
        });
    };
    this.init = function() {
        //Placeholder
    };
    this.ready = function() {
        //Placeholder       
    };
    this.handleData = function(data) {
        if (data.data != null && TVXTools.isFullStr(data.data.action)) {
            var action = data.data.action;
            if (action.indexOf("search:") == 0) {
                var searchAction = action.substr(7);
                if (searchAction.indexOf("init:") == 0) {
                    searchInput = searchAction.substr(5);
                    updateSearch();
                } else if (searchAction.indexOf("input:") == 0) {
                    handleSearchInput(searchAction.substr(6));
                    // No automatic search - only update the input display
                } else if (searchAction.indexOf("control:") == 0) {
                    handleSearchControl(searchAction.substr(8));
                    // No automatic search - only update the input display
                } else if (searchAction == "reload") {
                    updateSearch(); // Just reload the UI without searching
                } else if (searchAction == "execute") {
                    // Execute search when user clicks "Search Now"
                    reloadSearch();
                } else {
                    TVXInteractionPlugin.warn("Unknown search action: '" + searchAction + "'");
                }
            } else {
                TVXInteractionPlugin.warn("Invalid search action: '" + action + "'");
            }
        } else {
            TVXInteractionPlugin.warn("Unknown search data");
        }
    };
    this.handleRequest = function(dataId, data, callback) {
        if (dataId === "init") {
            updateSearch();
            callback(search);
        } else {
            TVXInteractionPlugin.warn("Unknown request data ID: '" + dataId + "'");
            callback();
        }
    };
}
/******************************************************************************/

/******************************************************************************/
//Setup
/******************************************************************************/
TVXPluginTools.onReady(function() {
    TVXInteractionPlugin.setupHandler(new SearchHandler());
    TVXInteractionPlugin.init();
});
/******************************************************************************/
