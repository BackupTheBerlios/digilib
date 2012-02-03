/**
 * digilib pan arrows for scrolling the zoomed area.
 */

(function($) {

    // affine geometry
    var geom = null;
    // plugin object with digilib data
    var digilib = null;

    var FULL_AREA = null;

    var defaults = {
        // arrow bars for moving the zoomed area
        'showZoomArrows' : true,
        // zoom arrow bar minimal width (for small images)
        'zoomArrowMinWidth' : 6,
        // zoom arrow bar standard width
        'zoomArrowWidth' : 32,
        // by what percentage should the arrows move the zoomed area?
        'zoomArrowMoveFactor' : 0.5,
        // defaults for digilib buttons
        'buttonSettings' : {
            'fullscreen' : {
                // path to button images (must end with a slash)
                'imagePath' : 'img/fullscreen/',
                'buttonSetWidth' : 36,
                'arrowSet' : [ "up", "down", "left", "right" ],
            },
            'embedded' : {
                'imagePath' : 'img/embedded/16/',
                'buttonSetWidth' : 18,
                'arrowSet' : [ "up", "down", "left", "right" ],
            }
        }
    };

    var buttons = {
        up : {
            onclick : [ "moveZoomArea", 0, -1 ],
            tooltip : "move zoom area up",
            icon : "up.png"
        },
        down : {
            onclick : [ "moveZoomArea", 0, 1 ],
            tooltip : "move zoom area down",
            icon : "down.png"
        },
        left : {
            onclick : [ "moveZoomArea", -1, 0 ],
            tooltip : "move zoom area left",
            icon : "left.png"
        },
        right : {
            onclick : [ "moveZoomArea", 1, 0 ],
            tooltip : "move zoom area right",
            icon : "right.png"
        }
    };

    var actions = {
        /**
         * move zoomed area
         * 
         * @param data
         * @param dx
         * @param dy
         */
        moveZoomArea : function(data, dx, dy) {
            var za = data.zoomArea.copy();
            var factor = data.settings.zoomArrowMoveFactor;
            var deltaX = dx * factor * za.width;
            var deltaY = dy * factor * za.height;
            var delta = geom.position(deltaX, deltaY);
            za.addPosition(delta);
            za = FULL_AREA.fit(za);
            digilib.fn.setZoomArea(data, za);
            digilib.fn.redisplay(data);
        }

    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing arrows plugin. digilib:', digilib);
        // import geometry classes
        geom = digilib.fn.geometry;
        FULL_AREA = geom.rectangle(0, 0, 1, 1);
        // add defaults, actions
        $.extend(true, digilib.defaults, defaults); // make deep copy
        $.extend(digilib.buttons, buttons);
        $.extend(digilib.actions, actions);
    };

    // plugin initialization
    var init = function(data) {
        console.debug('initialising arrows plugin. data:', data);
        var $data = $(data);
        // adjust insets
        data.currentInsets['arrows'] = getInsets(data);
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        // $data.bind('redisplay', handleRedisplay);
    };

    var handleSetup = function(evt) {
        console.debug("arrows: handleSetup");
        var data = this;
        setupZoomArrows(data);
    };

    var handleUpdate = function(evt) {
        console.debug("arrows: handleUpdate");
        var data = this;
        renderZoomArrows(data);
    };


    /** 
     * returns insets for arrows (based on canMove and buttonSetWidth
     */
    var getInsets = function(data) {
        var settings = data.settings;
        var insets = {
            'x' : 0,
            'y' : 0
        };
        if (settings.showZoomArrows) {
            var mode = settings.interactionMode;
            var bw = settings.buttonSettings[mode].buttonSetWidth;
            if (digilib.fn.canMove(data, 0, -1))
                insets.y += bw;
            if (digilib.fn.canMove(data, 0, 1))
                insets.y += bw;
            if (digilib.fn.canMove(data, -1, 0))
                insets.x += bw;
            if (digilib.fn.canMove(data, 1, 0))
                insets.x += bw;
        }
        return insets;
    };

    /**
     * creates HTML structure for a single button
     */
    var createButton = function(data, $div, buttonName, show) {
        var $elem = data.$elem;
        var settings = data.settings;
        var mode = settings.interactionMode;
        var imagePath = settings.buttonSettings[mode].imagePath;
        // make relative imagePath absolute
        if (imagePath.charAt(0) !== '/' && imagePath.substring(0, 3) !== 'http') {
            imagePath = settings.digilibBaseUrl + '/jquery/' + imagePath;
        }
        var buttonConfig = settings.buttons[buttonName];
        // button properties
        var action = buttonConfig.onclick;
        var tooltip = buttonConfig.tooltip;
        var icon = imagePath + buttonConfig.icon;
        // construct the button html
        var $button = $('<div class="keep"><a href=""><img class="button" src="' + icon + '"/></a></div>');
        if (!show) {
            $button.hide();
        }
        $div.append($button);
        // add attributes and bindings
        $button.attr('title', tooltip);
        $button.addClass('arrow-' + buttonName);
        // create handler for the buttons on the div (necessary for horizontal
        // scroll arrows)
        $div.on('click.digilib', function(evt) {
            // the handler function calls digilib with action and parameters
            console.debug('click action=', action, ' evt=', evt);
            $elem.digilib.apply($elem, action);
            return false;
        });
        return $button;
    };

    /**
     * create arrows for moving the zoomed area.
     */
    var setupZoomArrows = function(data) {
        var $elem = data.$elem;
        var settings = data.settings;
        var show = settings.showZoomArrows;
        console.log('zoom arrows:', show);
        if (!show)
            return;
        var mode = settings.interactionMode;
        var arrowNames = settings.buttonSettings[mode].arrowSet;
        if (arrowNames == null) {
            console.error("No buttons for scroll arrows!");
            settings.showZoomArrows = false;
            return;
        }
        // wrap scaler img in table
        data.$scaler.wrap('<table class="scalertable"><tbody><tr class="midrow"><td/></tr></tbody></table>');
        // middle row with img has three elements
        data.$scaler.parent().before('<td class="arrow left" valign="middle"/>').after('<td class="arrow right" valign="middle"/>');
        // first and last row has only one
        var $table = $elem.find('table.scalertable');
        $table.find('tr.midrow').before('<tr class="firstrow"><td colspan="3" class="arrow up" align="center"/></tr>').after(
                '<tr class="lasttrow"><td colspan="3" class="arrow down" align="center"/></tr>');
        // add arrow buttons
        var ar = {};
        ar.$up = createButton(data, $table.find('td.up'), 'up', digilib.fn.canMove(data, 0, -1));
        ar.$down = createButton(data, $table.find('td.down'), 'down', digilib.fn.canMove(data, 0, 1));
        ar.$left = createButton(data, $table.find('td.left'), 'left', digilib.fn.canMove(data, -1, 0));
        ar.$right = createButton(data, $table.find('td.right'), 'right', digilib.fn.canMove(data, 1, 0));
        data.arrows = ar;

    };

    /**
     * show or hide arrows, called after scaler img is loaded.
     * 
     */
    var renderZoomArrows = function(data) {
        var settings = data.settings;
        var arrows = data.arrows;
        if (digilib.fn.isFullArea(data.zoomArea) || !settings.showZoomArrows) {
            arrows.$up.hide();
            arrows.$down.hide();
            arrows.$left.hide();
            arrows.$right.hide();
            data.currentInsets['arrows'] = {'x' : 0, 'y' : 0};
            return;
        }
        if (digilib.fn.canMove(data, 0, -1)) {
            arrows.$up.show();
        } else {
            arrows.$up.hide();
        }
        if (digilib.fn.canMove(data, 0, 1)) {
            arrows.$down.show();
        } else {
            arrows.$down.hide();
        }
        if (digilib.fn.canMove(data, -1, 0)) {
            arrows.$left.show();
        } else {
            arrows.$left.hide();
        }
        if (digilib.fn.canMove(data, 1, 0)) {
            arrows.$right.show();
        } else {
            arrows.$right.hide();
        }
        // adjust insets
        data.currentInsets['arrows'] = getInsets(data);
    };

    // plugin object with name and init
    // shared objects filled by digilib on registration
    var plugin = {
        name : 'arrows',
        install : install,
        init : init,
        buttons : {},
        actions : {},
        fn : {},
        plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.arrows must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', plugin);
    }
})(jQuery);
