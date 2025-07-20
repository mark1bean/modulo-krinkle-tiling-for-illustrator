/**
 * @file MK_UI.js
 *
 * A convenient UI for "ModuloKrinkle.js"
 *
 * See "Draw Modulo Krinkle Tiling.js" for
 * example usage.
 */

if ('function' !== typeof ModuloKrinkle)
    throw new Error('ModuloKrinkle.js must load first.');

/**
 * Provides UI for configuring a Modulo Krinkle tiled pattern.
 * @returns {1|2} - the result code (1 means proceed, 2 means cancel).
 */
function MK_UI(settings) {

    const MIN_M = 1;
    const MAX_M = 49;

    const MIN_K = 2;
    const MAX_K = 50;

    const MIN_T = 2;
    const MAX_T = 10;

    const MIN_UNIT = 1; // these are multiplied by 5
    const MAX_UNIT = 10;

    const MIN_LAYER = 1;
    const MAX_LAYER = 10;

    const MAX_PREVIEW_N = 150;
    const PREVIEW_LAYER_COUNT = 2;
    const PREVIEW_SIZE = 300;
    const LABEL_WIDTH = 40;
    const SLIDER_WIDTH = 150;

    var oldKrinkleParams = {};
    var newKrinkleParams = settings.krinkleParams;
    var previewKrinkle;
    var previewScaleFactor = 1;

    var sliderEventHandlers = { onChanging: updateUI, onChange: updateUIAndPreview };

    var w = new Window("dialog", 'Modulo Krinkle Tiling', undefined, { closeButton: false }),

        previewControls = w.add('group {orientation:"row", alignment:["fill","top"], margins:[10,10,10,0] }'),
        previewLabel = previewControls.add('staticText {alignment:["fill","center"], justify:"left"}'),
        zoomButtons = previewControls.add('group {orientation:"row", alignment:["right","center"] }'),
        smallerButton = new PlainCircleButton(zoomButtons, [18, 18], drawMinus, function () { previewScaleFactor = Math.max(0.1, previewScaleFactor - 0.25); preview.notify('onDraw') }),
        largerButton = new PlainCircleButton(zoomButtons, [18, 18], drawPlus, function () { previewScaleFactor = Math.min(3, previewScaleFactor + 0.25); preview.notify('onDraw') }),

        previewWrapper = w.add('group {orientation:"row", alignment:["fill","top"], margins:[10,0,10,0] }'),
        preview = previewWrapper.add("CustomView {alignment:['fill','fill']}"),

        controls = w.add('group {orientation:"column", alignment:["fill","top"], margins:[10,10,5,10] }'),

        mGroup = controls.add('group {orientation:"row", alignment:["fill","top"], alignChildren:["fill","top"] }'),
        mLabel = mGroup.add('staticText', undefined, { preferredSize: [LABEL_WIDTH, -1] }),
        mControl = mGroup.add('group {orientation:"row", alignment:["fill","top"], alignChildren:["fill","top"] }'),
        mMinusButton = new PlainCircleButton(mControl, [18, 18], drawMinus, function () { mSlider.setValue(newKrinkleParams.m - 1, true) }),
        mSlider = new ExponentialSlider({ id: 'm', container: mControl, value: 1, minValue: 1, maxValue: MAX_M, growthConstant: 0.025, eventHandlers: sliderEventHandlers, }),
        mPlusButton = new PlainCircleButton(mControl, [18, 18], drawPlus, function () { mSlider.setValue(newKrinkleParams.m + 1, true) }),

        kGroup = controls.add('group {orientation:"row", alignment:["fill","top"], alignChildren:["fill","top"] }'),
        kLabel = kGroup.add('staticText', undefined, { preferredSize: [LABEL_WIDTH, -1] }),
        kControl = kGroup.add('group {orientation:"row", alignment:["fill","top"], alignChildren:["fill","top"] }'),
        kMinusButton = new PlainCircleButton(kControl, [18, 18], drawMinus, function () { kSlider.setValue(newKrinkleParams.k - 1, true) }),
        kSlider = new ExponentialSlider({ id: 'k', container: kControl, value: 2, minValue: 1, maxValue: MAX_K, growthConstant: 0.025, eventHandlers: sliderEventHandlers, }),
        kPlusButton = new PlainCircleButton(kControl, [18, 18], drawPlus, function () { kSlider.setValue(newKrinkleParams.k + 1, true) }),

        tGroup = controls.add('group {orientation:"row", alignment:["fill","top"], alignChildren:["fill","top"] }'),
        tLabel = tGroup.add('staticText', undefined, { preferredSize: [LABEL_WIDTH, -1] }),
        tControl = tGroup.add('group {orientation:"row", alignment:["fill","top"], alignChildren:["fill","top"] }'),
        tMinusButton = new PlainCircleButton(tControl, [18, 18], drawMinus, function () { tSlider.setValue(newKrinkleParams.t - 1, true) }),
        tSlider = new ExponentialSlider({ id: 't', container: tControl, value: 2, minValue: 1, maxValue: MAX_K, growthConstant: 0.025, eventHandlers: sliderEventHandlers, }),
        tPlusButton = new PlainCircleButton(tControl, [18, 18], drawPlus, function () { tSlider.setValue(newKrinkleParams.t + 1, true) }),

        offsetGroup = controls.add('group {orientation:"column", alignment:["fill","top"],margins:[10,0,30,10] }'),
        offsetCheckbox = controls.add('checkbox {text:"Offset", alignment:["fill","top"] }'),

        fieldsGroup = controls.add('group {orientation:"row", alignment:["left","top"], alignChildren:["left","top"], margins:[0,20,0,10] }'),
        lGroup = fieldsGroup.add('group {orientation:"row" }'),
        lLabel = lGroup.add('staticText {text:"Layer Count"}'),
        layersField = lGroup.add('edittext {text:"", characters: 6}'),

        uGroup = fieldsGroup.add('group {orientation:"row", margins:[10,0,0,0] }'),
        uLabel = uGroup.add('staticText {text:"Unit Length"}'),
        unitField = uGroup.add('edittext {text:"", characters: 6}'),

        drawingWrapper = w.add('panel {orientation:"column", alignment:["fill","top"], margins:[0,0,0,0] }'),
        drawingGroup = drawingWrapper.add('group {orientation:"column", alignment:["fill","top"], alignChildren:["fill","top"], margins:[10,10,10,10] }'),
        radio1 = drawingGroup.add('radiobutton {text:"Draw as paths"}'),
        radio2 = drawingGroup.add('radiobutton {text:"Draw using a symbol"}'),
        radio2 = drawingGroup.add('radiobutton {text:"Draw using multiple symbols"}'),

        buttonGroup = w.add('group {orientation:"row", alignment:["fill","bottom"], alignChildren: ["right","bottom"], margins: [0,15,0,0] }'),
        cancelButton = buttonGroup.add('button', undefined, 'Done', { name: 'cancel' }),
        drawButton = buttonGroup.add('button', undefined, 'Draw', { name: 'ok' });

    // set values from settings
    mSlider.setValue(newKrinkleParams.m, false);
    kSlider.setValue(newKrinkleParams.k, false);
    tSlider.setValue(newKrinkleParams.t, false);
    unitField.text = newKrinkleParams.unitLength + 'pt';
    layersField.text = String(newKrinkleParams.layerCount);
    drawingGroup.children[settings.drawType].value = true;

    // metrics
    preview.preferredSize = [PREVIEW_SIZE, PREVIEW_SIZE];
    mLabel.preferredSize = [LABEL_WIDTH, -1];
    kLabel.preferredSize = [LABEL_WIDTH, -1];
    tLabel.preferredSize = [LABEL_WIDTH, -1];
    mSlider.slider.preferredSize = [SLIDER_WIDTH, -1];
    kSlider.slider.preferredSize = [SLIDER_WIDTH, -1];
    tSlider.slider.preferredSize = [SLIDER_WIDTH, -1];

    // graphics
    var gfx = preview.graphics;
    var pen = gfx.newPen(gfx.PenType.SOLID_COLOR, [0.25, 0.8, 0.9], 2);

    // event handlers
    preview.onDraw = drawPreview;
    drawButton.onClick = close;
    offsetCheckbox.onClick = updateUIAndPreview;
    drawingGroup.getActiveRadioIndex = getActiveRadioIndex;
    unitField.onChange = function () { newKrinkleParams.unitLength = getUnitStringAsPoints(unitField.text) || 10 };
    layersField.onChange = function () { var l = Number(unitField.text); if (isNaN(l)) newKrinkleParams.layerCount = l; };

    updateUIAndPreview();

    w.center();
    return w.show();

    function close() {
        settings.drawType = drawingGroup.getActiveRadioIndex();
        w.close(1);
    };

    function updateUIAndPreview() {
        updateUI(true);
    };

    /** updates the UI */
    function updateUI(updatePreview) {

        var n = newKrinkleParams.offset
            ? 2 * (newKrinkleParams.t * newKrinkleParams.k - newKrinkleParams.m)
            : newKrinkleParams.t * newKrinkleParams.k;

        newKrinkleParams.m = Math.ceil(mSlider.getValue());
        newKrinkleParams.k = Math.ceil(kSlider.getValue());
        newKrinkleParams.t = Math.ceil(tSlider.getValue());
        newKrinkleParams.offset = offsetCheckbox.value;

        if (newKrinkleParams.k < MIN_K)
            newKrinkleParams.k = MIN_K;

        // m must be less than k
        if (newKrinkleParams.m >= newKrinkleParams.k)
            newKrinkleParams.m = newKrinkleParams.k - 1;

        if (newKrinkleParams.m < MIN_M)
            newKrinkleParams.m = MIN_M;

        if (newKrinkleParams.t < MIN_T)
            newKrinkleParams.t = MIN_T;

        if (newKrinkleParams.t > MAX_T)
            newKrinkleParams.t = MAX_T;

        // no slider if k == 2
        mSlider.enabled = newKrinkleParams.k > 2;

        mSlider.setValue(newKrinkleParams.m, false);
        kSlider.setValue(newKrinkleParams.k, false);
        tSlider.setValue(newKrinkleParams.t, false);
        offsetCheckbox.value = newKrinkleParams.offset;
        mLabel.text = 'm = ' + newKrinkleParams.m;
        kLabel.text = 'k = ' + newKrinkleParams.k;
        tLabel.text = 't = ' + newKrinkleParams.t;

        if (!updatePreview)
            return;

        // update the preview label
        previewLabel.text = 'MK(' + newKrinkleParams.m + ', ' + newKrinkleParams.k + ', ' + n + ')';

        if (n > MAX_PREVIEW_N) {
            previewKrinkle = null;
            preview.notify('onDraw');
        }

        else if (
            !previewKrinkle
            || !shallowCompare(newKrinkleParams, oldKrinkleParams)
        ) {
            // update the preview krinkle
            previewKrinkle = newPreviewKrinkle();
            preview.notify('onDraw');
        }

        else {
            // update the old params
            oldKrinkleParams = shallowCopy(newKrinkleParams);
        }

    };

    /**
     * Make a new preview krinkle.
     * @returns {ModuloKrinkle}
     */
    function newPreviewKrinkle() {

        // and make the new one
        return new ModuloKrinkle(newKrinkleParams.m, newKrinkleParams.k, newKrinkleParams.t, newKrinkleParams.offset, PREVIEW_SIZE / 25, PREVIEW_LAYER_COUNT);

    };

    /** draws the tiling preview */
    function drawPreview() {

        var width = this.size[0];
        var height = this.size[1];

        gfx.newPath();
        gfx.rectPath(0, 0, width, height);
        gfx.strokePath(pen);

        if (previewKrinkle)
            // draw the preview krinkle
            previewKrinkle.draw(gfx, [width / 2, height / 2], drawPreviewTile);

        else
            // there is no preview
            gfx.drawString("Preview too slow", pen, 5, 5);

    };

    /**
     * Draw a tile to the preview.
     * @this {MKTile}
     * @param {ScriptUIGraphics} gfx - the SUI Graphics context to draw to.
     * @param {point} center - the center of the krinkle.
     */
    function drawPreviewTile(gfx, center) {

        var scaledCenter = [
            center[0] * (1 / previewScaleFactor),
            center[1] * (1 / previewScaleFactor)
        ];

        // get translated points
        var points = getTranslatedPoints(this.points, scaledCenter, previewScaleFactor);

        gfx.newPath();
        gfx.moveTo(points[0][0], points[0][1]);

        for (var i = 1; i < points.length; i++)
            gfx.lineTo(points[i][0], points[i][1]);

        gfx.strokePath(pen);

    };

};

/**
 * Shallow copy `obj` object.
 * @param {Object} obj - The source object.
 * @returns {Object}
 */
function shallowCopy(obj) {

    var copy = {};

    for (var key in obj)
        if (obj.hasOwnProperty(key))
            copy[key] = obj[key];

    return copy;

};

/**
 * Returns true if `a` has the same keys and values as `b`.
 * @param {Object} a - an object to compare.
 * @param {Object} b - an object to compare.
 * @returns {Boolean}
 */
function shallowCompare(a, b) {

    for (var key in a)
        if (a[key] != b[key])
            return false;

    return true;

};

/**
 * A Script UI Slider helper that provides
 * an exponential function. For example that
 * a range 0..1000 allows much finer control
 * in the lower numbers so it is still easy
 * to select 1, 2, 3 etc, but still possible
 * to choose up to 1000.
 * ----------------------------------------------
 * Example:
 *
 *   var mySlider = new ExponentialSlider({
 *     container: sliderGroup,
 *     bounds: undefined,
 *     value: 1,
 *     minValue: 1,
 *     maxValue: 5000,
 *     eventHandlers: {
 *       onChanging: function () {
 *         test1Field.text = this.controller.getValue().toString();
 *       },
 *       onChange: function () {
 *         test1Field.text = this.controller.getValue().toString();
 *         drawThing();
 *       },
 *     },
 *   });
 * ----------------------------------------------
 * @author m1b
 * @version 2025-07-15
 * @constructor
 * @param {Object} options
 * @param {String} options.id - the slider's ID.
 * @param {SUI container} options.container - the container for the slider.
 * @param {Number} options.value - the current slider value.
 * @param {Number} options.minValue - the minimum slider value.
 * @param {Number} options.maxValue - the maximum slider value.
 * @param {Object} [options.growthConstant] - the exponential growth constant (default: calculated).
 * @param {Object} [options.scaleFactor] - the exponential scaling factor (default: calculated).
 * @param {Object} [options.decimals] - the number of decimal places in the returned values (default: 0).
 * @param {Object} [options.bounds] - the bounds of the slider control.
 * @param {Object} [options.eventHandlers] - object indexed by event name, eg. "onClick" with event handler functions (default: none).
 */
function ExponentialSlider(options) {

    options = options || {};

    this.container = options.container;

    if ('function' !== typeof this.container.add)
        throw new Error('ExponentialSlider: bad `container` function.');

    this.id = options.id || '';
    this.value = options.value || 0;
    this.minValue = options.minValue || 0;
    this.maxValue = options.maxValue || 100;
    this.internalMinValue = 0;
    this.internalMaxValue = 100;

    // larger values means more dramatic function curve
    this.growthConstant = options.growthConstant || 0.05;
    this.scaleFactor = (this.maxValue - this.minValue) / (Math.exp(this.growthConstant * this.internalMaxValue) - 1);

    // the SUI slider
    this.slider = this.container.add('slider', options.bounds, 0, this.internalMinValue, this.internalMaxValue);
    this.slider.controller = this;

    // the number of decimal places in returned values
    this.decimals = options.decimals || 0;

    // assign event handlers
    if (options.eventHandlers) {
        for (var key in options.eventHandlers)
            this.slider[key] = options.eventHandlers[key];
    }

};

/**
 * Returns the slider's public value.
 * @returns {Number}
 */
ExponentialSlider.prototype.getValue = function getPublicValue() {
    var publicValue = this.scaleFactor * (Math.exp(this.growthConstant * this.slider.value) - 1);
    return this.minValue + round(publicValue, this.decimals);
};

/**
 * Sets the slider's public value.
 * @param {Boolean} [notify] - whether to notify the slider (default: false).
 */
ExponentialSlider.prototype.setValue = function setPublicValue(newValue, notify) {

    if (isNaN(newValue))
        return false;

    this.slider.value = this.getPrivateValue(newValue - this.minValue);

    if (true === notify)
        this.slider.notify('onChange');

};

/**
 * Returns the slider's private value.
 * @param {Number} [externalValue] a value to convert to slider's private scale.
 * @returns {Number}
 */
ExponentialSlider.prototype.getPrivateValue = function getPrivateValue(externalValue) {
    if (0 === externalValue) return 0;
    return Math.log(Number(externalValue || this.slider.value) / this.scaleFactor + 1) / this.growthConstant;
};

/**
 * Rounds a single number or an array of numbers.
 * @author m1b
 * @version 2022-08-02
 * @param {Number|Array<Number>} nums - a Number or Array of Numbers.
 * @param {Number} [places] - round to this many decimal places (default: 0).
 * @return {Number|Array<Number>} - the rounded Number(s).
 */
function round(nums, places) {

    if (places == undefined)
        places = 0;

    places = Math.pow(10, places);

    var result = [];

    if (nums.constructor.name != 'Array')
        nums = [nums];

    for (var i = 0; i < nums.length; i++)
        result[i] = Math.round(nums[i] * places) / places;

    return nums.length == 1 ? result[0] : result;

};

/**
 * Returns index of the active radio button,
 * or -1 if no buttons are active.
 * @this {SUI Group}
 * @returns {Number}
 */
function getActiveRadioIndex() {

    for (var i = 0; i < this.children.length; i++)
        if (true === this.children[i].value)
            return i;

    return -1;

};

/**
 * Returns `str` converted to points.
 * eg. '10 mm' returns 28.34645669,
 *     '1 inch' returns 72
 * @author m1b
 * @version 2024-09-10
 * @param {String} str - the string to parse.
 * @returns {Number}
 */
function getUnitStringAsPoints(str) {

    if ('Number' === str.constructor.name)
        return str;

    var rawNumber = Number((str.match(/[\d.-]+/) || 0)[0])

    if (isNaN(rawNumber))
        return;

    var convertToPoints = 1;

    if (str.search(/mm/) != -1)
        convertToPoints = 2.834645669;

    else if (str.search(/cm/) != -1)
        convertToPoints = 28.34645669;

    else if (str.search(/(in|inch|\")/) != -1)
        convertToPoints = 72;

    return (rawNumber * convertToPoints);

};

/**
 * A bare bones circle ScriptUI Button.
 * @author m1b
 * @version 2025-07-20
 * @constructor
 * @param {SUI container} container - the button's location.
 * @param {Array<Number>} preferredSize - the button's preferredSize
 * @param {Function} drawFunction - a function to draw over the circle background.
 * @param {Function} clickFunction - a function to handle a button click.
 */
function PlainCircleButton(container, preferredSize, drawFunction, clickFunction) {

    this.button = container.add('button {}');
    this.button.preferredSize = preferredSize;

    var gfx = this.button.graphics;
    var inactiveStroke = gfx.newPen(gfx.PenType.SOLID_COLOR, [.9, .9, .9], 1);
    var activeStroke = gfx.newPen(gfx.PenType.SOLID_COLOR, [.33, .33, .33], 1.5);
    var inactiveFill = gfx.newBrush(gfx.BrushType.SOLID_COLOR, [0.33, 0.33, 0.33]);
    var activeFill = gfx.newBrush(gfx.BrushType.SOLID_COLOR, [0.25, 0.8, 0.9]);
    var width = this.button.preferredSize[0];
    var height = this.button.preferredSize[1];

    if (clickFunction)
        this.button.onClick = clickFunction;

    this.button.onActivate = function () { this.active = true };
    this.button.onDeactivate = function () { this.active = false };

    this.button.onDraw = function () {

        // circle background
        gfx.newPath();
        gfx.ellipsePath(0, 0, width, height);
        gfx.fillPath(this.active ? activeFill : inactiveFill);

        if (drawFunction)
            drawFunction(gfx, width, height, this.active ? activeStroke : inactiveStroke, this.active ? activeFill : inactiveFill);

    };

};

/** Draws a plus symbol on the button. */
function drawPlus(gfx, width, height, pen, brush) {
    gfx.newPath();
    gfx.moveTo(0 + 5, height / 2);
    gfx.lineTo(width - 5, height / 2);
    gfx.moveTo(width / 2, 0 + 5);
    gfx.lineTo(width / 2, height - 5);
    gfx.strokePath(pen);
};

/** Draws a minus symbol on the button. */
function drawMinus(gfx, width, height, pen, brush) {
    gfx.newPath();
    gfx.moveTo(0 + 5, height / 2);
    gfx.lineTo(width - 5, height / 2);
    gfx.strokePath(pen);
};