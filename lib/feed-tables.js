/**
 * Feed-Tables - JavaScript parser for Google spreadsheet tables
 * works for both client-side and node.js (server-side) JavaScript
 *
 * Feed-Tables provide parses for a Google spreadsheet that is in a form of a table,
 * that is, it has a header in the first row with field names and
 * values in remaining rows of the table.
 *
 * @author
 * Tomas Vitvar, http://vitvar.com
 *
 * patches and updates:
 * senorpedro - large sheets handling (translateCellname)
 *
 * @version
 * 0.1.3
 *
 * @Licesne
 * MIT License
 */

/**
 * Parser for list feeds. Since list feeds do not always contain
 * all header fields, they must be provided explicitly when creating the parser.
 * They are much smaller in size comparing to cells feeds though.
 *
 * @param data JSON data of the list feed
 * @param headers array that contains names of header fields
 */
var ListFeed = function(data, headers) {

    // check if this is what we are expecting
    if (!data || !data.feed || !data.feed.category || data.feed.category.length === 0 ||
        data.feed.category[0].scheme != "http://schemas.google.com/spreadsheets/2006" ||
        data.feed.category[0].term != "http://schemas.google.com/spreadsheets/2006#list")
            throw "The data must be in Google Spreadsheet List feed format!";

    this.data = data.feed;
    this.headers = headers;

    for (var i = 0; i < this.headers.length; i++)
        this.headers[i] = this.headers[i].toLowerCase();

    // gets the cell value at row:col
    this.getValueRC = function(row, col) {
        if (row < this.length && col < this.headers.length) {
            var r = this.data.entry[row];

            if (col === 0)
                return r.title.$t;
            else {
                for (var z = col; z < this.headers.length; z++) {
                	var s = ".*" + this.headers[col] + ":\s*(.*)" +
                        (z < this.headers.length - 1 ? (", " + this.headers[z+1] + ".*") : "");
            		var re = new RegExp(s);
            		if (re.test(r.content.$t))
            			return RegExp.$1;
            	}
            	return null;
            }
        } else
            throw new Error('Index out of bounds (' + row + ',' + col +').');
    };

    // gets the value in the column with label header at specified row
    this.getValue = function(header, row) {
        var col = this.headers.indexOf(header.toLowerCase());
        if (col == -1)
            throw new Error('Header with value \'' + header + '\' does not exist!');
        return this.getValueRC(row, col);
    };

    // gets the whole row as the object
    this.getRow = function(row) {
        if (row < this.length) {
            var o = {};
            for (var inx = 0; inx < this.headers.length; inx++)
                o[this.headers[inx].toLowerCase()] =
                    this.getValue(this.headers[inx], row);
            return o;
        } else
            throw new Error('Index out of bounds (' + row + ')');
    };

    // returns the length of the table
    this.__defineGetter__('length', function() {
        return Math.floor(this.data.entry.length);
    });

};

/**
 * Parser for cells feed.
 *
 * @param data JSON data of the cells feed
 */
var CellsFeed = function(data) {

    // check if this is what we are expecting
    if (!data || !data.feed || !data.feed.category || data.feed.category.length === 0 ||
        data.feed.category[0].scheme != "http://schemas.google.com/spreadsheets/2006" ||
        data.feed.category[0].term != "http://schemas.google.com/spreadsheets/2006#cell")
            throw "The data must be in Google Spreadsheet List feed format!";

    this.data = data.feed;
    this.headers = [];
    this.cellMap = {};

    for (var i = 0, ele; ele = this.data.entry[i]; ++i) {
        var key = ele.gs$cell.col + '|' + ele.gs$cell.row;
        this.cellMap[key] = i;
    }

    var col = 0;
    var t = this.data.entry[col].title.$t;

    // get cells from the table's header
    while (t.substring(t.length - 1) == "1") {
        this.headers.push(this.data.entry[col].content.$t);
        col++;

        // check if data column even exists
        if (typeof this.data.entry[col] !== 'undefined') {
            t = this.data.entry[col].title.$t;
        } else {
            break;
        }
    }

    // gets the cells value at row:col
    // all sheet cells are ordered and empty cells are not included;
    // this uses the binary search to retrieve the value
    this.getValueRC = function(row, col) {
        col = col + 1;
        row = row + 2;
        var key = col + '|' + row;

        if (key in this.cellMap) {
            return this.data.entry[this.cellMap[key]].content.$t;
        } else {
            return null;
        }
    };

    this.getValue = function(header, row) {
        var col = this.headers.indexOf(header.toUpperCase());
        if (col == -1)
            throw new Error('Header with value \'' + header + '\' does not exist!');
        return this.getValueRC(row, col);
    };

    this.getRow = function(row) {
        if (row < this.length) {
            var o = {};
            for (var col = 0; col < this.headers.length; col++) {
                var val = this.getValueRC(row, col);
                o[this.headers[col].toLowerCase()] = val ? val : "";
            }
            return o;
        } else
            throw new Error('Index out of bounds (' + row + ')');
    };

    this.__defineGetter__('length', function() {
        return parseInt(this.data.entry[this.data.entry.length - 1].title.$t.match("[0-9]+$")) - 1;
    });

};


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
    // asume we are in node.js
    exports.CellsFeed = CellsFeed;
    exports.ListFeed = ListFeed;
}

