/**
 * @file ModuloKrinkle.js
 *
 * This code is my implementation of Modulo Krinkle tiling as described in:
 * @citation Miki Imura, A new non-periodic tiling based on modulo arithmetic, arXiv:2506.07638
 * @url https://arxiv.org/abs/2506.07638
 *
 * @author m1b
 * @version 2025-07-20
 */

/**
 * Constructs a Modulo Krinkle tiling object created by Miki Imura.
 * @citation Miki Imura, A new non-periodic tiling based on modulo arithmetic, arXiv:2506.07638
 * @url https://arxiv.org/abs/2506.07638
 *
 * Example usage:
 *
 * 1. To construct the MK tiling object, but not draw it:
 *
 *      var krinkle = new ModuloKrinkle(2, 5, 2, false, 10, 5);
 *
 * 2. Draw the tiling to Adobe Illustrator
 *
 *      krinkle.draw(layer, [0,0]);
 *
 * Note: the drawing function can be extended in various ways. See MK_Drawing.js.
 *
 * @author m1b
 * @version 2025-07-12
 * @constructor
 * @param {Number} [m] - positive integer such that m < k (default: 3).
 * @param {Number} [k] - parameter k, positive integer which is the number of directions in each half of the mkTile (default: 7).
 * @param {Number} [t] - the rotation parameter, positive integer such that t >= 2 (default: 2).
 * @param {Boolean} [offset] - whether the tiling is offset (default: false).
 * @param {Number} [unitLength] - the length of the unit vector, in points, for each direction (default: 10).
 * @param {Number} [layerCount] - the number of levels to draw, out from the center (default: 3).
 */
function ModuloKrinkle(m, k, t, offset, unitLength, layerCount) {

    this.m = m || 3;
    this.k = k || 7;
    this.t = t || 2;
    this.offset = (true === offset);
    this.unitLength = unitLength || 10;
    this.layerCount = layerCount || 3;

    if (m < 1)
        throw new Error('Krinkle: bad `m` supplied. Must be greater than zero.');

    if (m > k)
        throw new Error('Krinkle: `m` is greater than `k`.');

    if (k < 1)
        throw new Error('Krinkle: bad `k` supplied. Must be greater than zero.');

    if (t < 2)
        throw new Error('Krinkle: bad `t` supplied. Must be greater than two.');

    // we adjust m and k if gcd > 1
    var gcd = greatestCommonDivisor(this.m, this.k);
    if (gcd > 1) {
        this.m /= gcd;
        this.k /= gcd;
    }

    // for convenience
    m = this.m;
    k = this.k;
    t = this.t;

    // calculate n, which is the number of directions
    var n = this.offset ? 2 * (t * k - m) : t * k;
    this.n = n;

    this.angle = (2 * Math.PI) / n;

    /* ------------------------------- *
     *  Generate directions sequence   *
     * ------------------------------- */
    this.directions = [];

    // lower half
    for (var j = 0; j < k; j++)
        this.directions.push((m * j) % k);
    // end point
    this.directions.push(k);
    // upper half, matches lower half but with first and last direction swapped
    this.directions = this.directions.concat(this.directions.slice().reverse());
    var tmp = this.directions[k + 1];
    this.directions[k + 1] = this.directions[2 * k + 1];
    this.directions[2 * k + 1] = tmp;

    // generate unit vectors for directions
    this.unitVectors = [];
    for (var i = 0, angleOffset; i < this.n; i++) {
        angleOffset = this.angle * i;
        this.unitVectors.push([Math.cos(angleOffset), Math.sin(angleOffset)]);
    }

    this.wedges = [];
    this.frontBoundary = [];

    /* ------------------------------- *
     *  Draw the foundational wedges   *
     * ------------------------------- *
     * These are the wedges generated  *
     * before performing rotations.    *
     * ------------------------------- */
    var wedgesCount = this.offset ? n / 2 : k;

    for (var i = 0, tx = 0, ty = 0; i < wedgesCount; i++) {

        var wedgeDirection = i;

        // position to upper boundary
        searchBoundary:
        for (var j = 0; j < this.frontBoundary.length; j++) {

            if (this.frontBoundary[j].direction === wedgeDirection) {

                // found a place to connect
                tx = this.frontBoundary[j].point[0];
                ty = this.frontBoundary[j].point[1];

                // remove invalidated points from the front boundary
                this.frontBoundary.splice(j);

                break searchBoundary;

            }

        }

        var wedge = new MKWedge(this, wedgeDirection, [tx, ty]);
        this.wedges.push(wedge);
        wedge.wedgeIndex = this.wedges.length - 1;
        wedge.sectorIndex = 0;

        // add the new wedge's upperBoundary
        this.frontBoundary = this.frontBoundary.concat(wedge.upperBoundary);

    }

    /* --------------------------------------------------- *
     *  Rotate foundation sector to complete tiling        *
     * --------------------------------------------------- */
    var rotation = this.offset ? Math.PI : (2 * Math.PI) / t;
    var center = [0, 0];
    var wedgesCount = this.wedges.length;

    for (var r = 1; r < t; r++) {

        if (this.offset) {

            // when offset, we rotate around the point midway between the base points
            var p0 = this.wedges[0].layers[0][0].points[0];
            var p1 = this.wedges[0].layers[0][0].points[1];

            center = [(p1[0] - p0[0]) / 2, (p0[1] + p1[1]) / 2];

        }

        for (var w = 0; w < wedgesCount; w++) {

            var sourceWedge = this.wedges[w];

            // make a fake wedge with just what we need (no need for a proper MKWedge)
            var dupWedge = {
                parent: this,
                wedgeIndex: (wedgesCount * r) + w,
                sectorIndex: r,
                tiles: [],
                layers: [],
                draw: sourceWedge.draw,
            };

            this.wedges.push(dupWedge);

            layersLoop:
            for (var i = 0, layer; i < sourceWedge.layers.length; i++) {

                layer = [];
                dupWedge.layers.push(layer);

                mkTilesLoop:
                for (var j = 0; j < sourceWedge.layers[i].length; j++) {

                    // while we're here, add the indices to the source tile
                    sourceWedge.layers[i][j].wedgeIndex = w;
                    sourceWedge.layers[i][j].sectorIndex = 0;
                    sourceWedge.layers[i][j].layerIndex = i;

                    // make a fake tile with just what we need (no need for a proper MKTile)
                    var dupTile = {
                        parent: dupWedge,
                        points: [],
                        wedgeIndex: (wedgesCount * r) + w,
                        sectorIndex: r,
                        layerIndex: i,
                        draw: sourceWedge.layers[i][j].draw,
                        tileType: sourceWedge.layers[i][j].tileType,
                        toString: MKTile.prototype.toString,
                    };
                    layer.push(dupTile);

                    pointsLoop:
                    for (var p = 0; p < sourceWedge.layers[i][j].points.length; p++)
                        dupTile.points.push(rotateAroundOrigin(sourceWedge.layers[i][j].points[p], r * rotation, center));

                }

            }

        }

    }

};

/**
 * String representation of the MKTile.
 * @returns {String}
 */
ModuloKrinkle.prototype.toString = function mkTileToString() {

    return 'MK-' + this.m + '-' + this.k + '-' + this.n;

};

/**
 * Draws the Modulo Krinkle tiling.
 * Note: the return value may depend on the drawFunction.
 * @author m1b
 * @version 2025-07-12
 * @param {Document|Layer|Group} container - the container for the tiles.
 * @param {point} [center] - the center of the tiling (default: [0,0]).
 * @param {Function} [drawFunction] - a custom draw function (default: none).
 * @returns {Array<PathItem>|*}
 */
ModuloKrinkle.prototype.draw = function drawKrinkle(container, center, drawFunction) {

    var self = this;

    center = center || [0, 0];
    container = container || app.activeDocument.activeLayer;

    if (container.hasOwnProperty('pathItems')) {

        if (
            container.hasOwnProperty('locked')
            && container.locked
        )
            throw new Error('ModuloKrinkle.prototype.draw: `container` is locked.');

        if (
            container.hasOwnProperty('visible')
            && !container.visible
        )
            throw new Error('ModuloKrinkle.prototype.draw: `container` is hidden.');

    }

    var tiles = [];

    /* -------------- *
     *  Draw wedges   *
     * -------------- */
    for (var i = 0; i < self.wedges.length; i++) {
        self.wedges[i].draw(container, center, drawFunction);
        tiles = tiles.concat(self.wedges[i].tiles);
    }

    return tiles;

};

/**
 * Draws the tile as an Illustrator PathItem.
 * @author m1b
 * @version 2025-07-12
 * @this {MKTile} - the tile to draw.
 * @param {Document|Layer|Group} [container] - the container for the tiles.
 * @param {point} [center] - the center of the tiling being drawn.
 * @returns {PathItem} - the drawn item.
 */
ModuloKrinkle.drawBasicTile = function (container, center) {

    // get translated points
    var points = getTranslatedPoints(this.points, center);

    // draw path in Illustrator
    var path = container.pathItems.add();
    path.name = this.toString(true);
    path.setEntirePath(points);
    path.closed = true;
    path.stroked = true;
    path.strokeWidth = 1;
    path.filled = false;

    return path;

};

/**
 * Rotates point `p` by `angle` radians, around point `origin`.
 * @author m1b
 * @version 2025-07-09
 * @param {point} p - the point [x,y] to rotate.
 * @param {Number} angle - the angle of rotation, in radians.
 * @param {point} origin - the fulcrum point [x,y].
 * @returns {point}
 */
function rotateAroundOrigin(p, angle, origin) {

    if (0 === angle)
        return p;

    var x = p[0] - origin[0];
    var y = p[1] - origin[1];

    var cos = Math.cos(angle);
    var sin = Math.sin(angle);

    var xr = x * cos - y * sin;
    var yr = x * sin + y * cos;

    return [xr + origin[0], yr + origin[1]];

};

/**
 * Returns the sum of two vectors.
 * @param {vector} a - a vector [x,y].
 * @param {vector} b - a vector [x,y].
 * @returns {vector} - [x,y]
 */
function addVector(a, b) {

    return [
        a[0] + b[0],
        a[1] + b[1],
    ];

};

/**
 * A wedge of MKTiles, organised in layers, from a single
 * central tile in layer 0, two tiles in layer 1, three
 * in layer 2, etc.
 * @author m1b
 * @version 2025-07-09
 * @constructor
 * @param {ModuloKrinkle} krinkle - the parent Kringle.
 * @param {Number} direction - the direction index of the wedge (0..n).
 * @param {vector} translation - the translation offset of the wedge, in pts (default: [0,0])
 */
function MKWedge(krinkle, direction, translation) {

    translation = translation || [0, 0];

    this.parent = krinkle;
    this.direction = direction;

    // for convenience
    var k = this.parent.k,
        directions = this.parent.directions,
        unitVectors = this.parent.unitVectors,
        unitLength = this.parent.unitLength;

    // translate the first tile in a layer to the first tile in the next higher layer
    var translateToNextLayer;

    // translate from the first tile in a layer to the next tile in the same layer
    var translateToNextTile;

    for (var i = 0, tx = 0, ty = 0; i <= k + 1; i++) {

        var vec = unitVectors[directions[i]];

        if (i > k)
            // reverse direction for upper half
            vec = [vec[0] * -1, vec[1] * -1];

        tx += vec[0];
        ty += vec[1];

        if (i === k - 1) {
            translateToNextLayer = [tx, ty];
            tx = 0;
            ty = 0
        }

        else if (i === k + 1)
            translateToNextTile = [tx, ty];

    }

    // scale translation to correct size
    translateToNextLayer[0] *= unitLength;
    translateToNextLayer[1] *= unitLength;
    translateToNextTile[0] *= unitLength;
    translateToNextTile[1] *= unitLength;

    // the mkTile objects
    this.layers = [];

    // the illustrator path items
    this.tiles = [];

    // layer 0: the base mkTile
    var layer = [];
    this.layers.push(layer);
    var mkTile = new MKTile(this, [0, 0], direction, translation, MKTileType.BASE);
    layer.push(mkTile);

    var tx = 0;
    var ty = 0;

    for (var i = 0; i < krinkle.layerCount - 1; i++) {

        layer = [];
        this.layers.push(layer);

        // the first mkTile in the layer
        tx += translateToNextLayer[0];
        ty += translateToNextLayer[1];

        mkTile = new MKTile(this, [tx, ty], direction, translation, MKTileType.RIGHT)
        layer.push(mkTile);

        // the subsequent mkTiles in this layer
        for (var j = 0, tileType; j <= i; j++) {

            tx += translateToNextTile[0];
            ty += translateToNextTile[1];

            if (j === i)
                tileType = MKTileType.LEFT;
            else
                tileType = MKTileType.MIDDLE;

            mkTile = new MKTile(this, [tx, ty], direction, translation, tileType);
            layer.unshift(mkTile);

        }

        // assign tileType to the central tile, if there is one
        if (1 === layer.length % 2)
            layer[Math.floor(layer.length / 2)].tileType = MKTileType.CENTER;

        tx += translateToNextTile[0] * -1 * (i + 1);
        ty += translateToNextTile[1] * -1 * (i + 1);

    }

    // update the wedge boundaries
    this.lowerBoundary = [];
    this.upperBoundary = [];

    for (var i = 0; i < this.layers.length; i++) {

        var upperMKTile = this.layers[i][0];
        this.upperBoundary = this.upperBoundary.concat(upperMKTile.upperBoundary);

        var lowerMKTile = this.layers[i][this.layers[i].length - 1];
        this.lowerBoundary = this.lowerBoundary.concat(lowerMKTile.lowerBoundary);

    }

};

/**
 * Draws the wedge in Illustrator
 * and returns a group of drawn tiles.
 * @this {MKWedge} - the wedge to draw.
 * @param {Document|Layer|Group} container - the container for the tiles.
 * @param {point} center - the center of the tiling.
 * @returns {GroupItem|*}
 */
MKWedge.prototype.draw = function drawWedge(container, center, drawFunction) {

    for (var i = 0; i < this.layers.length; i++) {

        for (var j = 0; j < this.layers[i].length; j++) {
            var mkTile = this.layers[i][j];
            this.tiles.push(mkTile.draw(container, center, drawFunction));
        }
    }

    if (
        !this.tiles[0]
        || 'function' !== this.tiles[0].move
    )
        // if the returned value from the draw function
        // is not a page item, we can't group it
        return this.tiles;

    // put the wedge's tiles into a group
    var wedgeGroup = container.groupItems.add();

    for (var i = this.tiles.length - 1; i >= 0; i--)
        this.tiles[i].move(wedgeGroup, ElementPlacement.PLACEATBEGINNING);

    return wedgeGroup;

};

/**
 * A Modulo Krinkle prototile.
 * @author m1b
 * @version 2025-07-06
 * @constructor
 * @param {point} origin - the origin point [x,y] for the mkTile.
 * @param {Number} tileDirection - the index of the direction of this tile.
 * @param {vector} translation - the translation offset of the mkTile, in pts (default: [0,0]).
 * @param {MKTileType} [tileType] - the tile type (default: none).
 */
function MKTile(wedge, origin, tileDirection, translation, tileType) {

    this.parent = wedge;
    var krinkle = wedge.parent;

    this.origin = origin;
    this.direction = tileDirection;
    this.translation = translation || [0, 0];
    this.points = [origin.slice()];
    this.tileType = tileType;

    // transformations
    var angle = krinkle.angle * tileDirection;
    var translation = this.translation;

    var len = krinkle.directions.length - 1;
    var pos = origin.slice();
    var k = krinkle.k;

    for (var i = 0, vec, flip; i < len; i++) {

        // the unit vector for the current direction
        vec = krinkle.unitVectors[krinkle.directions[i]];

        // if the direction is in the upper half, flip the direction
        flip = (i > k ? -1 : 1);

        // calculate the position
        pos = [pos[0] + vec[0] * krinkle.unitLength * flip, pos[1] + vec[1] * krinkle.unitLength * flip];
        this.points.push(pos);

    }

    // perform rotation and translation
    for (var i = 0; i < this.points.length; i++)
        this.points[i] = addVector(rotateAroundOrigin(this.points[i], angle, [0, 0]), translation);

    // boundary of edges from start to end on the lower side of the tile
    this.lowerBoundary = [];
    for (var i = 0; i <= k; i++) {
        this.lowerBoundary.push({
            direction: krinkle.directions[i] + tileDirection,
            point: this.points[i + 1],
        });
    }

    // boundary of edges from start to end on the lower side of the tile
    this.upperBoundary = [];
    for (var i = krinkle.directions.length - 1; i > k; i--) {
        this.upperBoundary.push({
            direction: krinkle.directions[i] + tileDirection,
            point: this.points[i + 1] || this.points[0],
        });
    }

};

/**
 * Draws the KrinkleTile.
 * @author m1b
 * @version 2025-07-12
 * @param {Document|Layer|Group} container - the container for the tiles.
 * @param {point} center - the center of the tiling.
 * @param {Function} [drawFunction] - custom function to draw the tile (default: ModuloKrinkle.drawBasicTile).
 * @returns {PathItem|*} - Note that the returned value depends on the drawFunction.
 */
MKTile.prototype.draw = function drawMKTile(container, center, drawFunction) {

    return (drawFunction || ModuloKrinkle.drawBasicTile).call(this, container, center);

};

/**
 * String representation of the MKTile.
 * @param {Boolean} specific - whether to return a specific tile's string, or a general MKTile string.
 * @returns {String}
 */
MKTile.prototype.toString = function mkTileToString(specific) {

    var krinkle = this.parent.parent;

    return specific
        // for this specific tile, including sector, wedge and layer indices
        ? 'S' + this.sectorIndex + ' W' + this.wedgeIndex + ' L' + this.layerIndex + ' (' + 'BLMCR'[this.tileType] + ')'
        // generic for any tile of this tileType
        : krinkle.toString() + '-' + 'BLMCR'[this.tileType];

};

/**
 * The type of MKTile. This is not used for actual tiling
 * but gives more options for drawing the tiling.
 * @enum {Number}
 */
var MKTileType = {
    /** a central tile, touching the origin */
    BASE: 0,
    /** the leftmost tile in a wedge layer */
    LEFT: 1,
    /** a middle tile in a wedge layer */
    MIDDLE: 2,
    /** the central tile in a wedge layer (every 2nd layer has one of these) */
    CENTER: 3,
    /** the rightmost  tile in a wedge layer */
    RIGHT: 4,
};

/**
 * Returns the greatest common divisor of two integers using Euclid's algorithm.
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} Greatest common divisor
 */
function greatestCommonDivisor(a, b) {

    a = Math.abs(a);
    b = Math.abs(b);
    var tmp;

    // euclid's algorithm
    while (0 !== b) {
        tmp = b;
        b = a % b;
        a = tmp;
    }

    return a;

};

/**
 * Returns a copy of `points` translated by `translation`.
 * @author m1b
 * @version 2025-07-14
 * @param {Array<point>} points - the points [x,y] to translate.
 * @param {vector} vector - the translation vector [tx, ty].
 * @param {Number} [scaleFactor] - the scale factor to use (default: 1).
 * @returns {Array<point>}
 */
function getTranslatedPoints(points, vector, scaleFactor) {

    scaleFactor = scaleFactor || 1;
    var _points = [];

    for (var i = 0; i < points.length; i++) {
        _points.push([
            (points[i][0] + vector[0]) * scaleFactor,
            (points[i][1] + vector[1]) * scaleFactor,
        ]);
    }

    return _points;

};