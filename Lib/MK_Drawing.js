/**
 * Returns a drawFunction for MKTile which
 * will draw the tile using a Symbol.
 *
 * @author m1b
 * @version 2025-07-12
 * @param {Document|Layer|Group} container - the container for the tiles.
 * @param {point} [center] - the center of the tiling (default: [0,0]).
 * @param {Document} doc - an Illustrator Document.
 * @param {Symbol|Array<Symbol>} [symbol] - the symbol, or symbols, to place for each tile (default: none, will make new symbols).
 * @param {Boolean} [separateTileTypes] - whether to make a symbol for each different tile type rather than teh same symbol for every tile type (default: false).
 * @return {Function}
 */
function drawBySymbol(doc, symbol, separateTileTypes) {

    if (!doc)
        throw new Error('drawBySymbolItem: no `doc` supplied.');

    var tileTypeCount = 0;
    var symbolsByTileType = [];

    for (var key in MKTileType) {
        tileTypeCount++;
        symbolsByTileType.push((symbol && 'Symbol' === symbol.constructor.name) ? symbol : undefined);
    }

    if (symbol && 'Array' === symbol.constructor.name) {
        symbolsByTileType = symbol.slice(0, tileTypeCount);
        while (symbolsByTileType.length < tileTypeCount)
            symbolsByTileType.push(symbolsByTileType[0])
    }

    /**
     * Tile drawing function that placed symbol items for each tile.
     * If no symbols are provided, it will make them.
     * It will make
     */
    return function placeSymbolItem(container, center) {

        if (!this.hasOwnProperty('points'))
            throw new Error('placeSymbolItem: no points to draw.');

        var wedge = this.parent;
        var krinkle = wedge.parent;

        // get translated points
        var tilePoints = getTranslatedPoints(this.points, center);

        var symbolTileType = separateTileTypes ? this.tileType : MKTileType.BASE;

        var symbolItem;

        if (!symbolsByTileType[symbolTileType]) {

            // see if the symbol exists already
            var existingSymbol = getThing(doc.symbols, 'name', this.toString(false));

            if (existingSymbol)
                // found the symbol
                symbolsByTileType[symbolTileType] = existingSymbol;

            else {

                // draw this tile and replace with a symbol
                var tile = ModuloKrinkle.drawBasicTile.call(this, container, center);

                // the default name eg. 'MK-2-5-2-B' or 'MK-2-5-2'
                var name = separateTileTypes ? this.toString(false) : krinkle.toString();

                symbolItem = makeSymbolFromItem(doc, tile, tile.pathPoints[0].anchor, name);
                symbolsByTileType[symbolTileType] = symbolItem.symbol;

            }


        }

        if (
            !symbolItem
            && symbolsByTileType[symbolTileType]
        ) {
            symbolItem = container.symbolItems.add(symbolsByTileType[symbolTileType]);
            symbolItem.rotate(angleBetweenPoints(tilePoints[0], tilePoints[1]));
            moveCenter(symbolItem, tilePoints[0]);
        }

        // name the symbol item for the specific tile
        symbolItem.name = this.toString(true);

        return symbolItem;

    };

};

/**
 * Returns a drawFunction for mkTile that draws the tile
 * and assigns a color from the given array.
 * @author m1b
 * @version 2025-07-16
 * @param {Object} [colors] - the colors to assign.
 * @return {Function}
 */
function drawWithColors(colors) {

    var counter = 0;

    return function drawTileWithColors(container, center) {

        if (!this.hasOwnProperty('points'))
            throw new Error('rainbowTile: no points to draw.');

        var wedge = this.parent;
        var krinkle = wedge.parent;
        var tile = ModuloKrinkle.drawBasicTile.call(this, container, center);

        tile.stroked = true;
        tile.filled = true;

        // each wedge can have a different color
        // tile.fillColor = colors[this.wedgeIndex % colors.length];

        // or, each layer can have a different color
        // tile.fillColor = colors[this.layerIndex % colors.length];

        // or, both
        // tile.fillColor = colors[(this.wedgeIndex * 1000 + this.layerIndex) % colors.length];

        // or, just cycle the colors one after the other
        tile.fillColor = colors[(counter++) % colors.length];

        return tile;

    };

};

/**
 * Returns a drawFunction for mkTile:
 * draws lines between matching points on
 * the upper and lower edges of the tile.
 * @author m1b
 * @version 2025-07-09
 * @param {Boolean} [includeFirst] - whether to draw the first pair of points (default: false).
 * @param {Boolean} [includeLast] - whether to draw the last pair of points (default: false).
 * @param {Boolean} [includeMiddle] - whether to draw all the middle pairs of points (default: true).
 * @param {Object} [appearance] - properties to apply to each line.
 * @return {Function}
 */
function drawByCrossWeave(includeFirst, includeLast, includeMiddle, appearance) {

    // draw the first pair of points
    includeFirst = true === includeFirst;
    // draw the last pair of points
    includeLast = true === includeLast;
    // draw all the middle pairs of points
    includeMiddle = false !== includeMiddle;

    appearance = appearance || {
        stroked: true,
        strokeColor: makeColor([100]),
        filled: false,
        strokeWidth: 2,
        closed: false,
    };

    return function crossweave(container, center) {

        if (!this.hasOwnProperty('points'))
            throw new Error('drawByCrossWeave: no points to draw.');

        var wedge = this.parent;
        var krinkle = wedge.parent;

        // get translated points
        var tilePoints = getTranslatedPoints(this.points, center);

        var paths = [];

        var len = tilePoints.length;
        var half = Math.floor(len / 2);

        var s = includeFirst ? 0 : 1;
        var e = includeLast ? 0 : 1;

        for (var j = 1 + s; j < half - e; j++) {

            appearance.name = String(j);
            paths.push(drawPolygon(container, [tilePoints[len - j], tilePoints[j]], appearance));

        }

        return paths;

    };

};

/**
 * Returns a drawFunction for mkTile:
 * draws circles at specified points of the tile.
 * @author m1b
 * @version 2025-07-09
 * @param {Number} [size] - the circle size, in points (default: 3).
 * @param {Array<Number>} [indices] - indices to which points to draw the circles at (default: [0,-1]).
 * @param {Object} [appearance] - properties to apply to each circle.
 * @return {Function}
 */
function drawCircles(size, indices, appearance) {

    size = size || 3;

    // default: first and last point
    // note: "-1" here means the furthest from the start point
    indices = indices || [0, -1];

    appearance = appearance || {
        filled: true,
        fillColor: makeColor([100]),
        stroked: false,
    };

    return function circlesOnPoints(container, center) {

        if (!this.hasOwnProperty('points'))
            throw new Error('drawByCrossWeave: no points to draw.');

        var wedge = this.parent;
        var krinkle = wedge.parent;

        // get translated points
        var tilePoints = getTranslatedPoints(this.points, center);

        var circles = [];
        var len = tilePoints.length;
        var half = Math.floor(len / 2);

        for (var i = 0; i < indices.length; i++) {

            var index = indices[i] % len;

            if (index < 0)
                index = half - (index + 1);

            circles.push(drawCircle(container, tilePoints[index], size, appearance));

        }

        return circles;

    };

};

/**
 * Returns a drawFunction for mkTile:
 * draws lines between specified points of the tile.
 * @author m1b
 * @version 2025-07-09
 * @param {Array<Number>} [indices] - indices to which points to draw the circles at (default: [0,-1]).
 * @param {Object} [appearance] - properties to apply to each circle.
 * @return {Function}
 */
function drawLines(indices, appearance) {

    // default: first and last point
    // note: "-1" here means the furthest from the start point
    // so [0,-1] will draw a line from the start the end point
    indices = indices || [0, -1];

    appearance = appearance || {
        filled: false,
        stroked: true,
        strokeWidth: 2,
        strokeColor: makeColor([100]),
    };

    if ('Array' !== indices[0].constructor.name)
        indices = [indices];

    return function linesBetweenPoints(container, center) {

        if (!this.hasOwnProperty('points'))
            throw new Error('drawByCrossWeave: no points to draw.');

        var wedge = this.parent;
        var krinkle = wedge.parent;

        // get translated points
        var tilePoints = getTranslatedPoints(this.points, center);

        var paths = [];

        var len = tilePoints.length;
        var half = Math.floor(len / 2);

        for (var i = 0; i < indices.length; i++) {

            var points = [];

            for (var j = 0; j < indices[i].length; j++) {

                var index = indices[i][j] % len;

                if (index < 0)
                    index = half - ((index + 1) % half);

                points.push(tilePoints[index]);

            }

            paths.push(drawPolygon(container, points, appearance));

        }

        return paths;

    };

};

/**
 * Draws a path item of straight line segments.
 * @param {Document|Layer|GroupItem} container - the container for the new path item.
 * @param {Array<point>} points - array of the points [x,y] to draw.
 * @param {RGBColor} color
 * @param { * } name
 */
function drawPolygon(container, points, appearance) {

    if (!container.hasOwnProperty('pathItems'))
        throw Error('drawPolygon: bad `container` supplied.');

    var item = container.pathItems.add();
    item.setEntirePath(points);

    if (appearance != undefined)
        setProperties(item, appearance);

    return item;

};

/**
 * Draws and returns a circle.
 * @param {Document|Layer|GroupItem} container - the container for the circle.
 * @param {Array<Number>|PathPoint} c - center of circle [cx, cy].
 * @param {Number} radius - radius of circle.
 * @param {Object} [appearance] - object with properties to be applied to the circle.
 * @returns {PathItem}
 */
function drawCircle(container, center, radius, appearance) {

    if (!container.hasOwnProperty('pathItems'))
        throw Error('drawCircle: bad `container` supplied.');

    if (center.hasOwnProperty('anchor'))
        center = center.anchor;

    var circle = container.pathItems.ellipse(center[1] + radius, center[0] - radius, radius * 2, radius * 2);

    if (appearance != undefined)
        setProperties(circle, appearance);

    return circle;

};

/**
 * Apply properties to `item`.
 * @author m1b
 * @version 2025-07-09
 * @param {PageItem} item - the item to style.
 * @param {Object} properties - the properties to apply.
 */
function setProperties(item, properties) {

    for (var key in properties)
        if (
            properties.hasOwnProperty(key)
            && item.hasOwnProperty(key)
        )
            item[key] = properties[key];

};

/**
 * Moves `item` such that the center of its geometricBounds is `p`
 * @author m1b
 * @version 2025-07-10
 * @param {PageItem} item - the item to move.
 * @param {point} newCenter - the new center point [x,y].
 */
function moveCenter(item, newCenter) {

    var bounds = item.geometricBounds;
    var cx = bounds[0] + (bounds[2] - bounds[0]) / 2;
    var cy = bounds[1] + (bounds[3] - bounds[1]) / 2;

    item.translate(-cx + newCenter[0], -cy + newCenter[1]);

};

/**
 * Replaces `item` with a SymbolItem, created of iteself,
 * with the anchor point specified. Due to limitations in
 * Illustrator's scripting API, we control the anchor point
 * placement by drawing an unpainted circular path item
 * around the anchor point as large as necessary such that
 * the desired anchor point is in the center of the circle.
 * Padding can be included to make the circle bigger, which
 * is useful to allow for edits to the symbol contents
 * without repositioning existing symbol items.
 * @author m1b
 * @version 2025-07-10
 * @param {Document} doc - an Illustrator Document.
 * @param {PageItem} item - will be the contents of the new symbol.
 * @param {point} anchor - the point [x,y] on the path that should become the symbol anchor
 * @param {String} [name] - whether to replace `item` with a new symbolItem (default: true).
 * @param {Number} [padding] - the amount of extra padding, in points, to add to the symbol radius (default: 0).
 * @returns {SymbolItem}
 */
function makeSymbolFromItem(doc, item, anchor, name, padding) {

    padding = padding || 0;

    var itemIsGroup = ('GroupItem' === item.constructor.name);
    var group = itemIsGroup ? group = item : item.parent.groupItems.add();

    var size = getEnclosingRadius(item.visibleBounds, anchor);
    drawCircle(group, anchor, size + padding, { filled: false, stroked: false, locked: true });

    if (!itemIsGroup)
        item.move(group, ElementPlacement.PLACEATBEGINNING);


    var symbol = doc.symbols.add(group);

    if (name) {

        // overwrite protection for `name`
        var counter = 1;
        while (getThing(doc.symbols, 'name', name))
            name = name.replace(/\s\(\d+\)$|$/, ' (' + (++counter) + ')')

        symbol.name = name;

    }

    var symbolItem = group.parent.symbolItems.add(symbol);
    symbolItem.position = group.position;
    symbolItem.selected = item.selected;

    group.remove();

    return symbolItem;

};

/**
 * Draws and returns a circle.
 * @author m1b
 * @version 2025-07-09
 * @param {Document|Layer|GroupItem} container - the container for the circle.
 * @param {Array<Number>|PathPoint} c - center of circle [cx, cy].
 * @param {Number} radius - radius of circle.
 * @param {Object} [appearance] - object with properties to be applied to the circle.
 * @returns {PathItem}
 */
function drawCircle(container, center, radius, appearance) {

    if (!container.hasOwnProperty('pathItems'))
        throw Error('drawCircle: bad `container` supplied.');

    if (center.hasOwnProperty('anchor'))
        center = center.anchor;

    var circle = container.pathItems.ellipse(center[1] + radius, center[0] - radius, radius * 2, radius * 2);

    if (appearance != undefined)
        setProperties(circle, appearance);

    return circle;

};

/**
 * Returns the radius of a circle centered at `anchor`
 * that fully contains `bounds`.
 * @author m1b
 * @version 2025-07-10
 * @param {bounds} bounds - the bounds to encircle [L, T, R, B].
 * @param {point} anchor - the center of the enclosing circle [x, y].
 * @returns {Number} - the enclosing radius.
 */
function getEnclosingRadius(bounds, anchor) {

    var l = bounds[0],
        t = bounds[1],
        r = bounds[2],
        b = bounds[3];

    // distances from anchor to each corner
    var corners = [
        [l, t],
        [r, t],
        [r, b],
        [l, b],
    ];

    var maxDist = 0;

    for (var i = 0; i < corners.length; i++) {

        var dx = corners[i][0] - anchor[0];
        var dy = corners[i][1] - anchor[1];
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist)
            maxDist = dist;

    }

    return maxDist;

};

/**
 * Returns a thing with matching property.
 * @param {Array|collection} things - the things to look through, eg. PageItems.
 * @param {String} key - the property name, eg. 'name'.
 * @param {*} value - the value to match.
 * @returns {*} - the thing.
 */
function getThing(things, key, value) {

    for (var i = 0; i < things.length; i++)
        if (things[i][key] == value)
            return things[i];

};

/**
 * Returns the angle in degrees from point A to point B.
 * Angle is measured counterclockwise from the horizontal axis.
 * @param {point} a - First point [x, y].
 * @param {point} b - Second point [x, y].
 * @returns {Number} angle in degrees.
 */
function angleBetweenPoints(a, b) {

    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var degrees = Math.atan2(dy, dx) * 180 / Math.PI;

    return (degrees + 360) % 360; // Normalize to 0–360

};


/**
 * Returns an RGBColor corresponding to a hue between startHue and endHue.
 * Handles hue wrapping and allows flipping the direction of value mapping.
 *
 * Example:
 *
 *   var items = doc.selection;
 *
 *   var rainbowOptions = {
 *           min: 0,
 *           max: items.length,
 *           startHue: 0,  // red
 *           endHue: 60,   // yellow
 *       };
 *
 *   for (var i = 0; i < items.length; i++) {
 *       rainbowOptions.value = i;
 *       items[i].fillColor = rainbowColor(rainbowOptions);
 *   }
 *
 * @author m1b
 * @version 2025-07-16
 * @param {Object} options - Minimum input value.
 * @param {number} options.min - Minimum input value.
 * @param {number} options.max - Maximum input value.
 * @param {number} options.value - Actual input value to map.
 * @param {number} [options.startHue] - Starting hue in degrees 0–359 (default: 0).
 * @param {number} [options.endHue] - Ending hue in degrees 0–359 (default: 360).
 * @param {boolean} [options.flip] - If true, traverse the hues in the other direction (default: false).
 * @param {number} [options.offset] - Offset the hue in degrees 0–359 (default: 0).
 * @param {boolean} [options.counterclockwise] - if true, goes counterclockwise around the hues (default: false).
 * @returns {RGBColor}
 */
function rainbowColor(options) {

    options = options || {};

    var min = options.min;
    var max = options.max;
    var value = options.value;
    var startHue = undefined == options.startHue ? 0 : options.startHue;
    var endHue = undefined == options.endHue ? 360 : options.endHue;
    var flip = (true === options.flip);
    var offset = options.offset || 0;
    var counterclockwise = (true === options.counterclockwise);
    var saturation = Math.min(Math.abs(options.saturation ? options.saturation : 1), 1);
    var brightness = Math.min(Math.abs(options.brightness ? options.brightness : 1), 1);

    if (min === max)
        value = 0;
    else
        value = Math.max(min, Math.min(max, value));

    var t = (value - min) / (max - min);

    if (flip)
        // reverse interpolation
        t = 1 - t;

    // normalize hues to 0–360
    startHue = ((startHue % 360) + 360) % 360;
    endHue = 360 === endHue ? 360 : ((endHue % 360) + 360) % 360;

    // calculate span
    var span;
    if (counterclockwise) {
        span = startHue - endHue;
        t = 1 - t;
    }
    else {
        span = endHue - startHue;
    }

    if (span < 0)
        span += 360;

    var hue = ((startHue + t * span) + offset) % 360;

    var rgb = hsbToRgb(hue, saturation, brightness);

    return makeColor([rgb[0] * 255, rgb[1] * 255, rgb[2] * 255]);

};

/**
 * Returns a color object when given an array of channel values.
 *   [50] will return GrayColor
 *   [255,128,0] will return RGBColor
 *   [10,20,30,0] will return CMYKColor
 *
 * @author m1b
 * @version 2022-02-08
 * @param {Array<Number>} values - the values per channel.
 * @returns {GrayColor|RGBColor|CMYKColor}
 */
function makeColor(values) {

    var col;

    switch (values.length) {

        case 1: // [K]
            col = new GrayColor();
            col.gray = values[0];
            break;

        case 3: // [R,G,B]
            col = new RGBColor();
            col.red = values[0], col.green = values[1], col.blue = values[2];
            break;

        case 4: // [C,M,Y,K]
            col = new CMYKColor();
            col.cyan = values[0], col.magenta = values[1], col.yellow = values[2], col.black = values[3];
            break;

        default:
            throw new Error('makeColor: bad `values` supplied. (' + values + ')');

    }

    return col;

};

/**
 * Converts HSB (hue in degrees, sat/bright in 0-1) to RGB (0-1)
 * @returns {[r, g, b]}
 */
function hsbToRgb(h, s, v) {

    var c = v * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = v - c;
    var r, g, b;

    if (h < 60) {
        r = c;
        g = x;
        b = 0;
    }
    else if (h < 120) {
        r = x;
        g = c;
        b = 0;
    }
    else if (h < 180) {
        r = 0;
        g = c;
        b = x;
    }
    else if (h < 240) {
        r = 0;
        g = x;
        b = c;
    }
    else if (h < 300) {
        r = x;
        g = 0;
        b = c;
    }
    else {
        r = c;
        g = 0;
        b = x;
    }

    return [r + m, g + m, b + m];

};