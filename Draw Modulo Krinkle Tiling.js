/**
 * @file Draw Modulo Krinkle Tiling.js
 *
 * @author m1b
 * @version 2025-07-15
 */
//@include './Lib/MK.js'
//@include './Lib/MK_Drawing.js'
//@include './Lib/MK_UI.js'
(function () {

    var settings = {
        krinkleParams: { m: 2, k: 5, t: 2, offset: false, unitLength: 10, layerCount: 5 },
        drawType: 1,
    };

    var doc = app.activeDocument;
    var layer = doc.activeLayer;

    if (layer.locked)
        return alert('Please unlock the layer and try again.');

    if (!layer.visible)
        return alert('Please unhide the layer and try again.');

    // this will be the center of the tiling
    var center = getCenterOfActiveArtboard(doc);

    // show UI
    var result = MK_UI(settings);

    if (2 === result)
        // user cancelled
        return;

    // instantiate the krinkle
    var p = settings.krinkleParams;
    var krinkle = new ModuloKrinkle(p.m, p.k, p.t, p.offset, p.unitLength, p.layerCount);

    if (!krinkle)
        return alert('Could not make the Modulo Krinkle with current settings.');

    // draw the krinkle
    switch (settings.drawType) {

        case 0: // plain tile drawing
            krinkle.draw(layer, center);
            break;

        case 1: // make and use the same symbol for every tile
            krinkle.draw(layer, center, drawBySymbol(doc, undefined, false));
            break;

        case 2: // make and use symbols for the different tile types
            krinkle.draw(layer, center, drawBySymbol(doc, undefined, true));
            break;

    }

})();