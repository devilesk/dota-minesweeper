var board;
var difficulty;
var difficultySettings = [
    [8, 8, 10],
    [16, 16, 40],
    [16, 30, 99]
];
var GAME_NOT_STARTED = 0;
var GAME_IN_PROGRESS = 1;
var GAME_OVER = 2;
var BORDER = -1;
var UNKNOWN = 0;
var FLAGGED = 1;
var MARKED = 2;
/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function Board(panel, rows, columns, mineCount) {
    this.panel = panel;
    this.rows = rows;
    this.columns = columns;
    this.mineCount = mineCount;
    this.cells = [];
    this.mineCells = [];
    this.gameState = -1;
    this.numFlags = 0;
    this.numUnrevealed = this.rows * this.columns;
    this.startTime = Game.Time();
    this.init();
}
Board.prototype.init = function () {
    this.panel.RemoveAndDeleteChildren();
    for (var r = 0; r < this.rows + 2; r++) {
        var row = [];
        var rowPanel = $.CreatePanel("Panel", this.panel, "");
        rowPanel.AddClass("row");
        for (var c = 0; c < this.columns + 2; c++) {
            var cell = new Cell(this, rowPanel, r, c);
            if (r === 0 || r === this.rows + 1 || c === 0 || c === this.columns + 1) cell.state = BORDER;
            cell.render();
            row.push(cell);
        }
        this.cells.push(row);
    }
    this.gameState = GAME_NOT_STARTED;
    this.update();
}
Board.prototype.reset = function () {
    this.mineCells.length = 0;
    this.numFlags = 0;
    this.numUnrevealed = this.rows * this.columns;
    this.cells.forEach(function (row) {
        row.forEach(function (cell) {
            cell.reset();
            cell.render();
        });
    });
    this.gameState = GAME_NOT_STARTED;
    this.update();
    Game.EmitSound("Hero_Techies.LandMine.Plant");
}
Board.prototype.update = function () {
    $("#btn-new").SetHasClass("dead", this.gameState === GAME_OVER && this.mineCount !== this.numUnrevealed);
    $("#btn-new").SetHasClass("victory", this.gameState === GAME_OVER && this.mineCount === this.numUnrevealed);
    $("#board").SetHasClass("gameover", this.gameState === GAME_OVER);
    $("#board").SetHasClass("victory", this.mineCount === this.numUnrevealed);
    $("#mine-count").text = this.mineCount === this.numUnrevealed ? 0 : this.mineCount - this.numFlags;
}
Board.prototype.get = function (r, c) {
    return this.cells[r][c];
}
Board.prototype.getNeighbors = function (r, c) {
    //$.Msg("getNeighbors", r, c);
    return [
        this.cells[r - 1][c - 1],
        this.cells[r - 1][c],
        this.cells[r - 1][c + 1],
        this.cells[r][c - 1],
        this.cells[r][c + 1],
        this.cells[r + 1][c - 1],
        this.cells[r + 1][c],
        this.cells[r + 1][c + 1]
    ];
}
Board.prototype.start = function (startR, startC) {
    //$.Msg("start");
    while (this.mineCells.length < this.mineCount) {
        var r = getRandomInt(0, this.rows - 1) + 1;
        var c = getRandomInt(0, this.columns - 1) + 1;
        if (r === startR && c === startC) continue;
        var cell = this.get(r, c);
        if (!cell.hasMine()) {
            cell.setMine();
            this.mineCells.push(cell);
            var neighbors = this.getNeighbors(r, c);
            neighbors.forEach(function (neighbor) {
                neighbor.mineCount++;
            });
        }
    }
    this.startTime = Game.Time();
    this.gameState = GAME_IN_PROGRESS;
    this.reveal(startR, startC);
}
Board.prototype.revealNeighbors = function (r, c) {
    //$.Msg("revealNeighbors", r, c);
    var neighbors = this.getNeighbors(r, c);
    for (var i = 0 ; i < neighbors.length; i++) {
        var neighbor = neighbors[i];
        //$.Msg("revealNeighbors neighbor", neighbor.row, neighbor.col, neighbor.row, neighbor.state, neighbor.isBorder());
        if ((!neighbor.isUnknown() && !neighbor.hasMark()) || neighbor.revealed) continue;
        neighbor.revealed = true;
        neighbor.render();
        if (neighbor.mineCount === 0 && !neighbor.isBorder()) this.revealNeighbors(neighbor.row, neighbor.col);
    }
}
Board.prototype.reveal = function (r, c) {
    var cell = this.get(r, c);
    //$.Msg("reveal", cell.revealed);
    if (!cell.revealed) {
        cell.revealed = true;
        cell.render();
        if (cell.mineCount === 0) this.revealNeighbors(r, c);
        this.calcTotals();
    }
}
Board.prototype.revealMines = function () {
    this.mineCells.forEach(function (cell) {
        cell.revealed = true;
        cell.render();
    });
}
Board.prototype.end = function () {
    //$.Msg("end");
    this.revealMines();
    this.gameState = GAME_OVER;
    this.update();
    if (this.gameState === GAME_OVER && this.mineCount !== this.numUnrevealed) Game.EmitSound("Hero_Techies.LandMine.Detonate");
    if (this.gameState === GAME_OVER && this.mineCount === this.numUnrevealed) Game.EmitSound("Hero_Techies.Fireworks");
}
Board.prototype.print = function () {
    this.cells.forEach(function (row, index) {
        //$.Msg(row.join(''), index);
    });
}
Board.prototype.calcTotals = function () {
    this.numFlags = 0;
    this.numUnrevealed = 0;
    for (var r = 1; r <= this.rows; r++) {
        for (var c = 1; c <= this.columns; c++) {
            var cell = this.get(r, c);
            if (cell.hasFlag()) this.numFlags++;
            if (!cell.revealed) this.numUnrevealed++;
        }
    }
    this.update();
    if (this.numUnrevealed === this.mineCount) this.end();
    //$.Msg("calcTotals", this.numFlags, this.numUnrevealed);
}

function Cell(board, parentPanel, r, c) {
    this.board = board;
    this.row = r;
    this.col = c;
    this.state = UNKNOWN;
    this.mined = false;
    this.revealed = false;
    this.mineCount = 0;
    this.panel = $.CreatePanel("Panel", parentPanel, this.row + "-" + this.col);
    this.panel.AddClass("cell");
    this.panel.SetPanelEvent("onmouseactivate", this.onLeftClick.bind(this));
    this.panel.SetPanelEvent("oncontextmenu", this.onRightClick.bind(this));
    this.render();
}
Cell.prototype.onLeftClick = function () {
        //$.Msg("click", this.panel.id, this.isBorder(), this.board.gameState, GAME_NOT_STARTED);
        if (!this.isUnknown() || this.isBorder()) return;
        switch (this.board.gameState) {
            case GAME_NOT_STARTED:
                //$.Msg("starting...");
                this.board.start(this.row, this.col);
                break;
            case GAME_IN_PROGRESS:
                if (this.hasMine()) {
                    this.board.end();
                }
                else {
                    this.board.reveal(this.row, this.col);
                }
                break;
        }
}
Cell.prototype.onRightClick = function () {
    //$.Msg("click", this.panel.id);
    if (this.revealed || this.isBorder()) return;
    switch (this.board.gameState) {
        case GAME_NOT_STARTED:
        case GAME_IN_PROGRESS:
            this.nextState();
            this.render();
            this.board.calcTotals();
            break;
    }
}
Cell.prototype.reset = function () {
    this.revealed = false;
    this.mined = false;
    this.mineCount = 0;
    this.state = this.state === BORDER ? BORDER : UNKNOWN;
}
Cell.prototype.setMine = function () {
    this.mined = true;
}
Cell.prototype.hasMine = function () {
    return this.mined;
}
Cell.prototype.hasFlag = function () {
    return this.state === FLAGGED;
}
Cell.prototype.hasMark = function () {
    return this.state === MARKED;
}
Cell.prototype.isBorder = function () {
    return this.state === BORDER;
}
Cell.prototype.isUnknown = function () {
    return this.state === UNKNOWN;
}
Cell.prototype.nextState = function () {
    //$.Msg("nextState");
    if (this.state >= 0 && this.state < 3) this.state = (this.state + 1) % 3;
}
Cell.prototype.render = function () {
    this.panel.visible = !this.isBorder();
    this.panel.SetHasClass("up", !this.revealed);
    this.panel.SetHasClass("flag", this.hasFlag());
    this.panel.SetHasClass("q", !this.revealed && this.hasMark());
    for (var i = 1; i <= 8; i++) {
        this.panel.SetHasClass("n" + i, this.revealed && this.mineCount === i && !this.hasMine());
    }
    this.panel.SetHasClass("mine", this.revealed && this.hasMine());
}
Cell.prototype.toString = function () {
    if (this.revealed) return "-";
    if (this.isBorder()) return "+";
    if (this.hasMine()) return "X";
    if (this.hasFlag()) return "F";
    if (this.hasMark()) return "M";
    return this.mineCount.toString();
}

function OnSetDifficulty(newDifficulty) {
    if (difficulty !== newDifficulty) {
        difficulty = newDifficulty;
        board = new Board($("#board"), difficultySettings[difficulty][0], difficultySettings[difficulty][1], difficultySettings[difficulty][2]);
        Game.EmitSound("Hero_Techies.LandMine.Plant");
    }
    else {
        board.reset();
    }
    $("#optionsbar").SetHasClass("difficulty_beginner", difficulty === 0);
    $("#optionsbar").SetHasClass("difficulty_intermediate", difficulty === 1);
    $("#optionsbar").SetHasClass("difficulty_expert", difficulty === 2);
}

function OnNewGame() {
    //$.Msg("OnNewGame");
    board.reset();
}

function pad(num, size, ch) {
    ch = ch || "0";
    var s = num + "";
    while (s.length < size) s = ch + s;
    return s;
}

function formatTime(t) {
    return pad(Math.floor(t / 60), 2) + ":" + pad(Math.floor(t) % 60, 2);
}


function UpdateTimer() {
    if (board && board.gameState === GAME_IN_PROGRESS) {
        $("#time").text = formatTime(Game.Time() - board.startTime);
    }
    else if (board && board.gameState !== GAME_OVER) {
        $("#time").text = "00:00";
    }
    $.Schedule(0.01, UpdateTimer);
}

UpdateTimer();

OnSetDifficulty(0);

GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_TIMEOFDAY, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_HEROES, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_FLYOUT_SCOREBOARD, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_PANEL, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_MINIMAP, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_PANEL, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_SHOP, false);
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_MENU_BUTTONS, false);