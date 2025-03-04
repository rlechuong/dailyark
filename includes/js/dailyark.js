const storage = window.localStorage;

const timeframesRoster = ['dailies', 'weeklies'];
const timeframesCharacter = ['dailychar', 'weeklychar'];
var currentProfile = 'default';
var currentLayout = 'default';
var characters = '';
var dragRow; //global for currently dragged row

/**
 * Populate the HTML with data for a timeFrame and attach listeners
 * @param {String} timeFrame
 * @returns
 */
const populateTable = function (timeFrame, char) {
    profilePrefix = char;
    let data = window[timeFrame];
    let table;
    let hideTable;
    let customOrder;

    const sampleRow = document.querySelector('#sample_row');
    if (profilePrefix != null) {
        table = document.getElementById(profilePrefix + '_' + timeFrame + '_table');
    } else {
        table = document.getElementById(timeFrame + '_table');

    }
    const tbody = table.querySelector('tbody');

    //Hidden table
    if (profilePrefix != null) {
        hideTable = storage.getItem(profilePrefix + '-' + timeFrame + '-hide') ?? 'false';
    } else {
        hideTable = storage.getItem(timeFrame + '-hide') ?? 'false';
    }

    if (hideTable == 'hide') {
        if (profilePrefix != null) {
            document.querySelector('div.' + profilePrefix + '_' + timeFrame + '_table').dataset.hide = 'hide';
        } else {
            document.querySelector('div.' + timeFrame + '_table').dataset.hide = 'hide';
        }

    }

    //User defined sorting
    if (profilePrefix != null) {
        customOrder = storage.getItem(profilePrefix + '-' + timeFrame + '-order') ?? 'false';
    } else {
        customOrder = storage.getItem(timeFrame + '-order') ?? 'false';
    }
    if (customOrder !== 'false' && !['asc', 'desc', 'alpha', 'default'].includes(customOrder)) {
        let sortArray = customOrder.split(',');

        data = Object.keys(data).sort(function (a, b) {
            return sortArray.indexOf(a) - sortArray.indexOf(b);
        }).reduce(
            (obj, key) => {
                obj[key] = data[key];
                return obj;
            }, {}
        );
    }

    for (let taskSlug in data) {
        let rowClone = sampleRow.content.cloneNode(true);
        let newRow = rowClone.querySelector('tr');
        let newRowAnchor = rowClone.querySelector('td.activity_name a');
        let newRowColor = rowClone.querySelector('td.activity_color .activity_desc');
        let taskState;

        if (profilePrefix != null) {
            taskState = storage.getItem(profilePrefix + '-' + taskSlug) ?? 'false';
        } else {
            taskState = storage.getItem(taskSlug) ?? 'false';
        }

        newRow.dataset.task = taskSlug;

        if (!!data[taskSlug].url) {
            if (data[taskSlug].url !== "#") {
                newRowAnchor.href = data[taskSlug].url;
            }
        }

        if (!!data[taskSlug].img) {
            newRowAnchor.innerHTML = "<img class='icon' src='./includes/img/activities/" + data[taskSlug].img + ".png' alt=" + data[taskSlug].img + "/>" + data[taskSlug].task;
        } else {
            newRowAnchor.innerHTML = data[taskSlug].task
        }

        if (!!data[taskSlug].desc) {
            newRowColor.innerHTML = data[taskSlug].desc;
        }

        tbody.appendChild(newRow);
        newRow.dataset.completed = taskState;
    }

    if (['asc', 'desc', 'alpha'].includes(customOrder)) {
        table.dataset.sort = customOrder;
        let tableRows = Array.from(tbody.querySelectorAll('tr'));
        tableRows.sort((a, b) => {
            if (customOrder == 'alpha') {
                return a.dataset.task.localeCompare(b.dataset.task)
            } else if (customOrder == 'asc') {
                return a.dataset.profit - b.dataset.profit;
            } else if (customOrder == 'desc') {
                return b.dataset.profit - a.dataset.profit;
            }
        });

        for (let sortedrow of tableRows) {
            tbody.appendChild(sortedrow);
        }
    }

    let tableRows = Array.from(tbody.querySelectorAll('tr'));
    for (let row of tableRows) {
        if (row.dataset.completed == 'hide') {
            tbody.appendChild(row);
        }
    }
};

/**
 * Attach event listeners to table cells
 */
const tableEventListeners = function () {
    let rowsColor = document.querySelectorAll('td.activity_color');
    let rowsHide = document.querySelectorAll('td.activity_name button.hide-button');

    for (let colorCell of rowsColor) {
        colorCell.addEventListener('click', function () {
            let thisTimeframe = this.closest('table').dataset.timeframe;
            let thisCharacter = this.closest('table').dataset.character;
            let thisRow = this.closest('tr');
            let taskSlug = thisRow.dataset.task;
            let newState = (thisRow.dataset.completed === 'true') ? 'false' : 'true'
            thisRow.dataset.completed = newState;
            if (newState === 'true') {
                if (thisCharacter != null) {
                    storage.setItem(thisCharacter + '-' + taskSlug, newState);
                } else {
                    storage.setItem(taskSlug, newState);
                }

            } else {
                if (thisCharacter != null) {
                    storage.removeItem(thisCharacter + '-' + taskSlug);
                } else {
                    storage.removeItem(taskSlug);
                }
            }
            if (thisCharacter != null) {
                storage.setItem(thisCharacter + '-' + thisTimeframe + '-updated', new Date().getTime());
            } else {
                storage.setItem(thisTimeframe + '-updated', new Date().getTime());
            }
            eventTracking("click", "slugs", thisCharacter + '-' + thisTimeframe);
        });

        let descriptionAnchors = colorCell.querySelectorAll('a');
        for (let anchor of descriptionAnchors) {
            anchor.addEventListener('click', function (e) {
                e.stopPropagation();
            });
        }
    }

    for (let rowHide of rowsHide) {
        rowHide.addEventListener('click', function () {
            let thisTbody = this.closest('tbody');
            let thisRow = this.closest('tr');
            let taskSlug = thisRow.dataset.task;
            let thisCharacter = this.closest('table').dataset.character;
            thisRow.dataset.completed = 'hide';
            eventTracking("hide", "slugs", taskSlug);
            if (thisCharacter != null) {
                storage.setItem(thisCharacter + '-' + taskSlug, 'hide');
            } else {
                storage.setItem(taskSlug, 'hide');
            }
            thisTbody.appendChild(thisRow);
        });
    }
};

/**
 * Attach drag and drop functionality after elements added to DOM
 * @param {String} timeFrame
 */
const draggableTable = function (timeFrame, char) {
    profilePrefix = char;
    let targetRows;
    if (profilePrefix != null) {
        targetRows = document.querySelectorAll('#' + profilePrefix + '_' + timeFrame + '_table tbody tr');
    } else {
        targetRows = document.querySelectorAll('#' + timeFrame + '_table tbody tr');
    }

    for (let row of targetRows) {
        row.addEventListener('dragstart', function (e) {
            eventTracking("drag start", "layout", "table layout");
            dragRow = e.target;
        });

        row.addEventListener('dragenter', function (e) {
            this.classList.add('dragover');
        });

        row.addEventListener('dragover', function (e) {
            e.preventDefault();
            let rowArray
            let thisCharacter = this.closest('table').dataset.character;
            //requery this in case rows reordered since load
            if (thisCharacter != null) {
                rowArray = Array.from(document.querySelectorAll('#' + thisCharacter + '_' + timeFrame + '_table tbody tr'));
            } else {
                rowArray = Array.from(document.querySelectorAll('#' + timeFrame + '_table tbody tr'));
            }


            let dragOverRow = e.target.closest('tr');

            if (rowArray.indexOf(dragRow) < rowArray.indexOf(dragOverRow)) {
                dragOverRow.after(dragRow);
            } else {
                dragOverRow.before(dragRow);
            }
        });

        row.addEventListener('dragleave', function (e) {
            this.classList.remove('dragover');
        });

        row.addEventListener('dragend', function (e) {
            this.classList.remove('dragover');
            let clearRows;
            let thisCharacter = this.closest('table').dataset.character;
            if (thisCharacter != null) {
                clearRows = document.querySelectorAll('#' + thisCharacter + '_' + timeFrame + '_table tbody tr');
            } else {
                clearRows = document.querySelectorAll('#' + timeFrame + '_table tbody tr');
            }
            for (let clearRow of clearRows) {
                clearRow.classList.remove('dragover');
            }
            eventTracking("drag end", "layout", "table layout");
        });

        row.addEventListener('drop', function (e) {
            e.stopPropagation();
            let thisCharacter = this.closest('table').dataset.character;

            //save the order
            let csv = [];
            let rows;
            if (thisCharacter != null) {
                rows = document.querySelectorAll('#' + thisCharacter + '_' + timeFrame + '_table tbody tr');
            } else {
                rows = document.querySelectorAll('#' + timeFrame + '_table tbody tr');
            }
            for (let row of rows) {
                csv.push(row.dataset.task);
            }

            if (thisCharacter != null) {
                storage.setItem(thisCharacter + '-' + timeFrame + '-order', csv.join(','));
            } else {
                storage.setItem(timeFrame + '-order', csv.join(','));
            }

            return false;
        });
    }
};

/**
 * Takes a timeframe name and clear the associated localstorage and toggle the html data off
 * @param {String} timeFrame
 * @param {Boolean} html change the data on the element or not
 */
const resetTable = function (timeFrame, html, char) {
    profilePrefix = char;
    let tableRows;
    if (profilePrefix != null) {
        tableRows = document.querySelectorAll('#' + profilePrefix + '_' + timeFrame + '_table tbody tr');
    } else {
        tableRows = document.querySelectorAll('#' + timeFrame + '_table tbody tr');
    }

    for (let rowTarget of tableRows) {
        let itemState;
        if (profilePrefix != null) {
            itemState = storage.getItem(profilePrefix + '-' + rowTarget.dataset.task) ?? 'false';
        } else {
            itemState = storage.getItem(rowTarget.dataset.task) ?? 'false';
        }

        if (itemState != 'hide') {
            if (html) {
                rowTarget.dataset.completed = false;
            }
            if (profilePrefix != null) {
                storage.removeItem(profilePrefix + '-' + rowTarget.dataset.task);
            } else {
                storage.removeItem(rowTarget.dataset.task);
            }
        }
    }

    if (profilePrefix != null) {
        storage.removeItem(profilePrefix + '-' + timeFrame + '-updated');
    } else {
        storage.removeItem(timeFrame + '-updated');
    }

};

/**
 * Attach event listener to button for resetting table
 * @param {String} timeFrame
 */
const resettableSection = function (timeFrame, char) {
    profilePrefix = char;
    let data = window[timeFrame];
    let resetButton;

    if (profilePrefix != null) {
        resetButton = document.querySelector('#' + profilePrefix + '_' + timeFrame + '_reset_button');
    } else {
        resetButton = document.querySelector('#' + timeFrame + '_reset_button');
    }

    resetButton.addEventListener('click', function () {
        let thisCharacter = this.closest('table').dataset.character;
        resetTable(timeFrame, false, thisCharacter);

        for (let taskSlug in data) {
            let itemState;
            if (profilePrefix != null) {
                itemState = storage.getItem(profilePrefix + '-' + taskSlug) ?? 'false';
            } else {
                itemState = storage.getItem(taskSlug) ?? 'false';
            }

            if (itemState == 'hide') {
                if (profilePrefix != null) {
                    storage.removeItem(profilePrefix + '-' + taskSlug);
                } else {
                    storage.removeItem(taskSlug);
                }
            }
        }
        if (profilePrefix != null) {
            eventTracking("reset", "layout", profilePrefix + '-' + timeFrame + '-order');
            storage.removeItem(profilePrefix + '-' + timeFrame + '-order');
            storage.removeItem('pos_' + profilePrefix + '_' + timeFrame + '_table');
        } else {
            eventTracking("reset", "layout", timeFrame + '-order');
            storage.removeItem(timeFrame + '-order');
            storage.removeItem('pos_' + timeFrame);
        }
        window.location.reload();
    });
};

/**
 * Attach event listener for hiding/unhiding table
 * @param {String} timeFrame
 */
const hidableSection = function (timeFrame, char) {
    profilePrefix = char;
    let hideButton;
    let unhideButton;
    let hideTable;

    if (profilePrefix != null) {
        hideButton = document.querySelector('#' + profilePrefix + '_' + timeFrame + '_hide_button');
        unhideButton = document.querySelector('#' + profilePrefix + '_' + timeFrame + '_unhide_button');
    } else {
        hideButton = document.querySelector('#' + timeFrame + '_hide_button');
        unhideButton = document.querySelector('#' + timeFrame + '_unhide_button');
    }

    hideButton.addEventListener('click', function () {
        let thisCharacter = this.closest('table').dataset.character;
        if (thisCharacter != null) {
            hideTable = document.querySelector('div.' + thisCharacter + '_' + timeFrame + '_table');
            hideTable.dataset.hide = 'hide';
            eventTracking("hide", "layout", thisCharacter + '-' + timeFrame + '-hide');
            storage.setItem(thisCharacter + '-' + timeFrame + '-hide', 'hide');
        } else {
            hideTable = document.querySelector('div.' + timeFrame + '_table');
            hideTable.dataset.hide = 'hide';
            eventTracking("hide", "layout", timeFrame + '_table');
            storage.setItem(timeFrame + '-hide', 'hide');
        }
    });

    unhideButton.addEventListener('click', function () {
        let thisCharacter = this.closest('table').dataset.character;
        if (thisCharacter != null) {
            hideTable = document.querySelector('div.' + thisCharacter + '_' + timeFrame + '_table');
            hideTable.dataset.hide = '';
            eventTracking("unhide", "layout", thisCharacter + '-' + timeFrame + '-hide');
            storage.removeItem(thisCharacter + '-' + timeFrame + '-hide');
        } else {
            hideTable = document.querySelector('div.' + timeFrame + '_table');
            hideTable.dataset.hide = '';
            eventTracking("unhide", "layout", timeFrame + '_table');
            storage.removeItem(timeFrame + '-hide');
        }

    });
};

/**
 * Check if last updated timestamp for a timeframe is less than
 * the last reset for that timeframe if so reset the category
 * @param {String} timeFrame
 * @returns
 */
const checkReset = function (timeFrame, char) {
    profilePrefix = char;
    const resetHour = 10;
    const resetday = 3; //Wednesday
    let tableUpdateTime;

    if (profilePrefix != null) {
        tableUpdateTime = storage.getItem(profilePrefix + '-' + timeFrame + '-updated') ?? 'false';
    } else {
        tableUpdateTime = storage.getItem(timeFrame + '-updated') ?? 'false';
    }

    if (tableUpdateTime === 'false') {
        return false;
    }

    let updateTime = new Date(parseInt(tableUpdateTime));

    let nextdate = new Date();
    nextdate.setUTCHours(resetHour);
    nextdate.setUTCMinutes(0);
    nextdate.setUTCSeconds(0);

    //check lastupdated < last weekly reset
    if (timeFrame == 'weeklies' || timeFrame == 'weeklychar') {
        let weekmodifier = (7 - resetday + nextdate.getUTCDay()) % 7;
        nextdate.setUTCDate(nextdate.getUTCDate() - weekmodifier);
    }

    // Checking for the update for the daily timeframe is a little more complex because 
    // originally we pulled this from RS, this expects that if the new day has happened 
    // its reset time, but we need to allow some freedom between 0 - 10am UTC (resetTime).
    const isAfterReset = new Date().getUTCHours() >= resetHour;
    const isAfterWeeklyReset = new Date().getUTCDay() >= resetday;
    if ((updateTime.getUTCHours() < resetHour || nextdate.getUTCHours() == resetHour) && updateTime.getTime() < nextdate.getTime() && isAfterReset) {
        if ((timeFrame == 'weeklies' || timeFrame == 'weeklychar') && (updateTime.getUTCDay() < resetday || nextdate.getUTCDay() == resetday) && isAfterWeeklyReset) {
            resetTable(timeFrame, true, profilePrefix);
        } else if (timeFrame == 'dailies' || timeFrame == 'dailychar') {
            resetTable(timeFrame, true, profilePrefix);
        } else {
            return;
        }
    }
};

/**
 * Add a countdown timer until the next reset for a timeframe
 * @param {String} timeFrame
 */
const countDown = function (timeFrame) {
    const resetHour = 10; // 10am
    const resetday = 3; // Wednesday
    const isAfterDailyReset = new Date().getUTCHours() >= resetHour;
    const isAfterWeeklyReset = new Date().getUTCDay() == resetday;

    let nextdate = new Date();

    if (timeFrame == 'weeklies') {
        nextdate.setUTCHours(resetHour);
        nextdate.setUTCMinutes(0);
        nextdate.setUTCSeconds(0);
        let weekmodifier = (7 + resetday - nextdate.getUTCDay()) % 7;
        nextdate.setUTCDate(nextdate.getUTCDate() + weekmodifier);
        if (isAfterWeeklyReset && isAfterDailyReset) {
            nextdate.setUTCDate(nextdate.getUTCDate() + 7);
        }
    } else {
        nextdate.setUTCHours(resetHour);
        nextdate.setUTCMinutes(0);
        nextdate.setUTCSeconds(0);
        if (isAfterDailyReset) {
            nextdate.setUTCDate(nextdate.getUTCDate() + 1);
        }
    }

    let nowtime = new Date();
    let remainingtime = (nextdate.getTime() - nowtime.getTime()) / 1000;

    let timeparts = [
        Math.floor(remainingtime / 86400), //d
        Math.floor(remainingtime % 86400 / 3600), //h
        Math.floor(remainingtime % 3600 / 60), //m
        Math.floor(remainingtime % 60) //s
    ];

    if (timeFrame == 'weeklies') {
        document.getElementById('countdown-' + timeFrame).innerHTML = (timeparts[0] > 0 ? (timeparts[0] + 'd ') : '0d ') + (timeparts[1] > 0 ? (timeparts[1] + 'h ') : '') + timeparts[2] + 'm ' + timeparts[3] + 's';
    } else {
        document.getElementById('countdown-' + timeFrame).innerHTML = (timeparts[0] > 0 ? (timeparts[0] + 'd ') : '') + (timeparts[1] > 0 ? (timeparts[1] + 'h ') : '') + timeparts[2] + 'm ' + timeparts[3] + 's';
    }
};

const populateNavigation = function (index, character) {
    let navigation = document.getElementById('character_dropdown');
    charNavigation = '';
    if (index > 0) {
        charNavigation += '<div class="dropdown-divider"></div>';
    }
    charNavigation += '<h6 class="dropdown-header nav-char">' + character + '</h6>';
    for (let timeframe in timeframesRoster) {
        charNavigation += '<a href="#' + character + '_' + timeframesCharacter[timeframe] + '" class="dropdown-item sub-color" id="' + character + '_' + timeframesCharacter[timeframe] + '_nav" style="text-transform: capitalize;">' + timeframesRoster[timeframe] + '</a>';
    }
    navigation.innerHTML += charNavigation;
}

const charactersFunction = function () {
    let charactersStored = storage.getItem('characters');
    let characterControl = document.getElementById('character-control');
    let characterForm = characterControl.querySelector('form');
    let charactersArray = [];

    if (charactersStored !== null) {
        charactersArray = charactersStored.split(',');

        let characterBody = document.getElementById('characters_body')

        //populate list of characters
        for (let character of charactersArray) {
            characterBody.innerHTML +=
                '<div class="table_container_characters">' +
                '<div id="' + character + '_dailychar" class="table_container ' + character + '_dailychar_table">' +
                '<input type="checkbox" class="theme-switch" />' +
                '<table id="' + character + '_dailychar_table" class="activity_table table table-dark table-striped table-hover draggable" data-timeframe="dailychar" data-character="' + character + '" data-x="0" data-y="0">' +
                '<thead>' +
                '<tr>' +
                '<th>' + character + ' Daily</th>' +
                '<td>' +
                '<span class="text-nowrap">' +
                '<button class="drag-handle expanding_button btn btn-secondary btn-sm active" title="Click, hold and drag to move section">✥<span class="expanding_text"> Move</span></button> ' +
                '<button id="' + character + '_dailychar_hide_button" class="hide_button expanding_button btn btn-secondary btn-sm active" title="Hide section">▲<span class="expanding_text"> Hide</span></button> ' +
                '<button id="' + character + '_dailychar_unhide_button" class="unhide_button expanding_button btn btn-secondary btn-sm active" title="Unhide Section">▼<span class="expanding_text"> Unhide</span></button> ' +
                '<button id="' + character + '_dailychar_reset_button" class="reset_button expanding_button btn btn-secondary btn-sm active" title="Completely reset checked items, hiding and order to default">↺<span class="expanding_text"> Reset</span></button> ' +
                '<button id="character-delete" class="btn btn-danger btn-sm active expanding_button" data-character="' + character + '" title="Delete ' + character + '">⊘<span class="expanding_text"> Delete ' + character + '?</span></button>' +
                '</td>' +
                '</tr>' +
                '</thead>' +
                '<tbody></tbody>' +
                '</table>' +
                '</div>' +
                '<div id="' + character + '_weeklychar" class="table_container ' + character + '_weeklychar_table">' +
                '<input type="checkbox" class="theme-switch" />' +
                '<table id="' + character + '_weeklychar_table" class="activity_table table table-dark table-striped table-hover draggable" data-timeframe="weeklychar" data-character="' + character + '" data-x="0" data-y="0">' +
                '<thead>' +
                '<tr>' +
                '<th>' + character + ' Weekly</th>' +
                '<td>' +
                '<span class="text-nowrap">' +
                '<button class="drag-handle expanding_button btn btn-secondary btn-sm active" title="Click, hold and drag to move section">✥<span class="expanding_text"> Move</span></button> ' +
                '<button id="' + character + '_weeklychar_hide_button" class="hide_button expanding_button btn btn-secondary btn-sm active" title="Hide section">▲<span class="expanding_text"> Hide</span></button> ' +
                '<button id="' + character + '_weeklychar_unhide_button" class="unhide_button expanding_button btn btn-secondary btn-sm active" title="Unhide Section">▼<span class="expanding_text"> Unhide</span></button> ' +
                '<button id="' + character + '_weeklychar_reset_button" class="reset_button expanding_button btn btn-secondary btn-sm active" title="Completely reset checked items, hiding and order to default">↺<span class="expanding_text"> Reset</span></button> ' +
                '<button id="character-delete" class="btn btn-danger btn-sm active expanding_button" data-character="' + character + '" title="Delete ' + character + '">⊘<span class="expanding_text"> Delete ' + character + '?</span></button>' +
                '</td>' +
                '</tr>' +
                '</thead>' +
                '<tbody></tbody>' +
                '</table>' +
                '</div>' +
                '</div>'
        }
    }

    //Event listener for deleting character button
    let characterBody = document.getElementById('characters_body');
    let deleteButtons = characterBody.querySelectorAll('#character-delete');
    for (let deleteButton of deleteButtons) {
        deleteButton.addEventListener('click', function (e) {
            e.preventDefault();
            charactersArray = charactersArray.filter(e => e != this.dataset.character);
            if (charactersArray.length == 0) {
                storage.removeItem('characters');
            } else {
                storage.setItem('characters', charactersArray.join(','));
            }

            let prefix = this.dataset.character == 'default' ? '' : (this.dataset.character + '-');
            for (const timeFrame of timeframesCharacter) {
                let data = window[timeFrame];
                for (let task in data) {
                    storage.removeItem(prefix + task);
                }
                storage.removeItem(prefix + timeFrame + '-order');
                storage.removeItem(prefix + timeFrame + '-updated');
            }
            eventTracking("remove character", "characters", prefix);

            window.location.reload();
        });
    }

    //alpha profile names only
    characterName.addEventListener('keypress', function (e) {
        if (!/^[A-Za-z]+$/.test(e.key)) {
            e.preventDefault();
            return false;
        }
    });

    // Save data on submit
    characterForm.addEventListener('submit', function (e) {
        e.preventDefault();

        let characterNameField = this.querySelector('input#characterName');
        let characterErrorMsg = characterNameField.parentNode.querySelector('.invalid-feedback');

        if (!/^[A-Za-z]+$/.test(characterNameField.value)) {
            characterName.classList.add('is-invalid');
            characterErrorMsg.innerHTML = 'Letters only';
        } else if (charactersArray.includes(characterNameField.value)) {
            characterName.classList.add('is-invalid');
            characterErrorMsg.innerHTML = 'Character already exists';
        } else {
            eventTracking("add character", "characters", characterNameField.value);
            charactersArray.push(characterNameField.value);
            storage.setItem('characters', charactersArray.join(','));
            window.location.reload();
        }
    });

    characterControl.addEventListener('click', function (e) {
        e.stopPropagation();
    });
}

const layouts = function () {
    const layoutButton = document.getElementById('compact-button');
    let currentLayout = storage.getItem('current-layout') ?? 'default';
    if (currentLayout !== 'default') {
        document.body.classList.add('compact');
        layoutButton.innerHTML = '⊞<span class="expanding_text">&nbsp;Full Mode</span>';
    }

    layoutButton.addEventListener('click', function (e) {
        e.preventDefault();

        let setLayout = document.body.classList.contains('compact') ? 'compact' : 'default';

        if (setLayout == 'default') {
            eventTracking("set layout", "layout", "compact");
            storage.setItem('current-layout', 'compact');
            document.body.classList.add('compact');
            layoutButton.innerHTML = '⊞<span class="expanding_text">&nbsp;Full Mode</span>';
        } else {
            eventTracking("set layout", "layout", "default");
            storage.removeItem('current-layout');
            document.body.classList.remove('compact');
            layoutButton.innerHTML = '⊟<span class="expanding_text">&nbsp;Compact Mode</span>';
        }
    });
};

const positions = function () {
    keys = Object.keys(localStorage), i = keys.length;
    while (i--) {
        var item = keys[i];
        if (item.startsWith('pos_')) {
            var element = document.getElementById(item.substring(4))
            if (element != null) {
                element.style.transform = localStorage.getItem(keys[i])
            }
        }
    }
}

const resetPositions = function () {
    const layoutButton = document.getElementById('layout-button');
    layoutButton.addEventListener('click', function (e) {
        e.preventDefault();
        eventTracking("reset", "layout", "");
        keys = Object.keys(localStorage), i = keys.length;

        // Positions
        while (i--) {
            var item = keys[i];
            if (item.startsWith('pos_')) {
                localStorage.removeItem(item);
            }
        }

        // Tasks
        let charactersStored = storage.getItem('characters');
        if (charactersStored !== null) {
            let characterArray = charactersStored.split(',');
            for (const index in characterArray) {
                character = characterArray[index];
                for (const timeFrame of timeframesCharacter) {
                    tableRows = document.querySelectorAll('#' + character + '_' + timeFrame + '_table tbody tr');
                    for (let rowTarget of tableRows) {
                        let itemState;
                        itemState = storage.getItem(character + '-' + rowTarget.dataset.task) ?? 'false';
                
                        if (itemState != 'hide') {
                            storage.removeItem(character + '-' + rowTarget.dataset.task);
                        }
                    }

                    storage.removeItem(character + '-' + timeFrame + '-updated');
                }
            }
        }

        for (const timeFrame of timeframesRoster) {            
            tableRows = document.querySelectorAll('#' + timeFrame + '_table tbody tr');
            for (let rowTarget of tableRows) {
                itemState = storage.getItem(rowTarget.dataset.task)
                if (itemState != 'hide') {
                    storage.removeItem(rowTarget.dataset.task);
                }
            }
            storage.removeItem(timeFrame + '-updated');
        }

        window.location.reload();
    });
}

/**
 * Make bootstrap 5 dropdown menus collapse after link is clicked
 * old method of adding `data-toggle="collapse" data-target=".navbar-collapse.show"` to the <li>s was preventing navigation by the same element
 */
const dropdownMenuHelper = function () {
    const navLinks = document.querySelectorAll('.nav-item:not(.dropdown), .dropdown-item');
    const menuToggle = document.getElementById('navbarSupportedContent');
    const bsCollapse = new bootstrap.Collapse(menuToggle, {
        toggle: false
    });

    navLinks.forEach(function (l) {
        l.addEventListener('click', function () {
            if (menuToggle.classList.contains('show')) {
                bsCollapse.toggle();
            }
        });
    });
};

/**
 * Track events with google analytics
 * @param {string} action of the event
 * @param {string} category of the event
 * @param {string} label optional extra information about the event
 */
const eventTracking = function (action, category, label) {
    gtag('event', action, {
        'event_category': category,
        'event_label': label
    });
};

/**
 * Exports current localStorage to file
 */
const exportData = function () {
    window.localStorage.setItem("dailyArk-export", 1);
    var exportJson = JSON.stringify(window.localStorage);
    var jsonBlob = new Blob([exportJson], {type: 'application/json'});
    var fileName = "dailyArk-export-" + new Date();

    var download = document.createElement("a");
    download.download = fileName;
    download.innerHTML = "Download File";
    if (window.webkitURL != null) {
        download.href = window.webkitURL.createObjectURL(jsonBlob);
    } else {
        download.href = window.URL.createObjectURL(jsonBlob);
        download.onclick = destroyClickedElement;
        download.style.display = "none";
        document.body.appendChild(download);
    }
    download.click();
    alert("DailyArk data succesfully exported.");
}

/**
 * Imports save file to localStorage
 */
const importData = function () {
    var input = document.getElementById('import');

    input.onchange = event => {
        var file = event.target.files[0];

        var reader = new FileReader();
        reader.readAsText(file, "UTF-8");

        reader.onload = readerEvent => {
            var content = readerEvent.target.result;
            json = JSON.parse(content);
            if (json["dailyArk-export"] == 1) {
                storage.clear();
                for (var key in json) {
                    storage.setItem(key, json[key]);
                }
                if (!alert("DailyArk data succesfully imported.")) {
                    window.location.reload();
                }
            } else {
                alert("This is not a valid DailyArk file.");
            }
        }
    }
    input.click();
}

const themeSwitcher = function(state) {
    for (const switcher of document.querySelectorAll('.theme-switch')){
        switcher.checked = state;
    }
}


window.onload = function () {
    charactersFunction();
    layouts();
    positions();
    resetPositions();

    let charactersStored = storage.getItem('characters');
    if (charactersStored !== null) {
        let characterArray = charactersStored.split(',');

        for (const index in characterArray) {
            character = characterArray[index];
            for (const timeFrame of timeframesCharacter) {
                populateTable(timeFrame, character);
                draggableTable(timeFrame, character);
                checkReset(timeFrame, character);
                resettableSection(timeFrame, character);
                hidableSection(timeFrame, character);
            }
            populateNavigation(index, character);
        }
    }

    for (const timeFrame of timeframesRoster) {
        populateTable(timeFrame, null);
        draggableTable(timeFrame, null);
        checkReset(timeFrame, null);
        resettableSection(timeFrame, null);
        hidableSection(timeFrame, null);
        countDown(timeFrame);
    }

    dropdownMenuHelper();
    tableEventListeners();

    const themeSwitch = document.querySelector('.main-switch');
    console.log(themeSwitch);
    if (localStorage.getItem('switchedTheme') !== null) {
        themeSwitch.checked = localStorage.getItem('switchedTheme') === 'true';
        themeSwitcher(true);
    }else{
        themeSwitcher(false);
    }

    themeSwitch.addEventListener('change', function (e) {
        if (e.currentTarget.checked === true) {
            // Add item to localstorage
            localStorage.setItem('switchedTheme', 'true');
            themeSwitcher(true);
        } else {
            // Remove item if theme is switched back to normal
            localStorage.removeItem('switchedTheme');
            themeSwitcher(false);
        }
    });

    setInterval(function () {
        for (const timeFrame of timeframesRoster) {
            checkReset(timeFrame);
            countDown(timeFrame);
        }
        for (const timeFrame of timeframesCharacter) {
            if (charactersStored !== null) {
                let characterArray = charactersStored.split(',');
                for (const index in characterArray) {
                    character = characterArray[index];
                    checkReset(timeFrame, character);
                }
            }
        }
    }, 1000);
};
