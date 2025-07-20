/**
 * @file ModuloKrinkle Drawing Examples.js
 *
 * Some examples of drawing a ModuloKrinkle tiling.
 *
 * @author m1b
 * @version 2025-07-12
 */
//@include '../Lib/MK.js'
//@include '../Lib/MK_Drawing.js'
//@include '../Lib/MK_UI.js'
(function () {

    var doc = app.activeDocument;
    var layer = doc.activeLayer;

    if (layer.locked)
        return alert('Please unlock the layer and try again.');

    if (!layer.visible)
        return alert('Please unhide the layer and try again.');

    var center = getCenterOfActiveArtboard(doc);

    // var krinkle = new ModuloKrinkle(7, 17, 2, false, 10, 3);

    var krinkle = new ModuloKrinkle(2, 5, 2, false, 10, 4);

    // the ModuloKrinkle is not drawn yet
    // choose an example drawing method:
    switch (2) {

        case 1: // no custom drawing function: plain tile drawing using default
            krinkle.draw(layer, center);
            break;

        case 2: // basic drawing function but add coloring
            krinkle.draw(layer, center, drawWithColors([
                makeColor([255, 215, 0]),
                makeColor([255, 255, 153]),
                makeColor([50, 178, 178]),
            ]));
            break;

        case 3: // make and use a symbol for each tile
            krinkle.draw(layer, center, drawBySymbol(doc, undefined, false));
            break;

        case 4: // make symbols for the different types of tiles
            krinkle.draw(layer, center, drawBySymbol(doc, undefined, true));
            break;

        case 5: // draw all tiles with an existing symbol
            var symbolName = 'MK-2-5-2-B';
            var symbol = getThing(doc.symbols, 'name', symbolName);
            if (!symbol)
                return alert('Symbol "' + symbolName + '"not found.');
            krinkle.draw(layer, center, drawBySymbol(doc, symbol));
            break;

        case 6: // draw tiles using specified symbols for each tile type
            var prefix = krinkle.toString() + '-';
            var symbolNames = [prefix + 'B', prefix + 'L', prefix + 'M', prefix + 'C', prefix + 'R'];
            var symbols = [];
            // load the symbols
            for (var i = 0; i < symbolNames.length; i++) {
                symbols[i] = getThing(doc.symbols, 'name', symbolNames[i]);
                if (!symbols[i])
                    return alert('Symbol "' + symbolNames[i] + '" not found.');
            }

            krinkle.draw(layer, center, drawBySymbol(doc, symbols, true));
            break;

        case 7: // draw circles at the start and end points
            krinkle.draw(layer, center, drawCircles(3, [0, -1]));
            break;

        case 8: // draw circles up one side of each tile
            krinkle.draw(layer, center, drawCircles(3, [1, 2, 3, 4, 5, 6]));
            break;

        case 9: // draw lines from the tiles start point to end point
            krinkle.draw(layer, center, drawLines([0, -1]));
            break;

        case 10: // draw lines across each tile at pairs of points
            krinkle.draw(layer, center, drawByCrossWeave(true, true, true));
            break;

        default:
            break;
    }

})();

/**
 * Returns the center [x,y] of the active artboard of `doc`.
 * @param {Document} doc - an Illustrator Document.
 * @returns {point}
 */
function getCenterOfActiveArtboard(doc) {

    var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;

    return [
        ab[0] + (ab[2] - ab[0]) / 2,
        ab[1] + (ab[3] - ab[1]) / 2
    ];

};