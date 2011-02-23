/** optional digilib regions plugin

markup a digilib image with rectangular regions

TODO:
- store region in params/cookie, regarding zoom, mirror, rotation (like marks)
- set regions programmatically
- read regions from params/cookie and display
- backlink mechanism
- don't write to data.settings?
*/

(function($) {
    // the digilib object
    var digilib;
    // the data object passed by digilib
    var data;
    // the functions made available by digilib
    var fn;
    // affine geometry plugin
    var geom;

    var FULL_AREA;

    var ID_PREFIX = "digilib-region-";

    var buttons = {
        addregion : {
            onclick : "defineRegion",
            tooltip : "define a region",
            icon : "addregion.png"
            },
        delregion : {
            onclick : "removeRegion",
            tooltip : "delete the last region",
            icon : "delregion.png"
            },
        regions : {
            onclick : "toggleRegions",
            tooltip : "show or hide regions",
            icon : "regions.png"
            },
        regioninfo : {
            onclick : "toggleRegionInfo",
            tooltip : "show information about regions",
            icon : "regioninfo.png"
            }
        };

    var defaults = {
        // are regions shown?
        'isRegionVisible' : true,
        // are region numbers shown?
        'showRegionNumbers' : false,
        // is region info shown?
        'showRegionInfo' : false,
        // should digilib look for region content in the page?
        'includeRegionContent' : false,
        // turn any region into a clickable link to its detail view
        'autoRegionLinks' : false,
        // class name for content divs (must additionally be marked with class "keep")
        'regionContentSelector' : 'div.regioncontent',
        // buttonset of this plugin
        'regionSet' : ['regions', 'addregion', 'delregion', 'regioninfo', 'lessoptions'],
        // url param for regions
        'rg' : null,
        };

    var actions = { 

        // define a region interactively with two clicked points
        "defineRegion" : function(data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var $elem = data.$elem;
            var $body = $('body');
            var bodyRect = geom.rectangle($body);
            var $scaler = data.$scaler;
            var scalerRect = geom.rectangle($scaler);
            var pt1, pt2;
            // overlay prevents other elements from reacting to mouse events 
            var $overlay = $('<div class="digilib-overlay"/>');
            $body.append($overlay);
            bodyRect.adjustDiv($overlay);
            var $regionDiv = addRegionDiv(data, data.regions.length);

            // mousedown handler: start sizing
            var regionStart = function (evt) {
                pt1 = geom.position(evt);
                // setup and show zoom div
                pt1.adjustDiv($regionDiv);
                $regionDiv.width(0).height(0);
                $regionDiv.show();
                // register mouse events
                $overlay.bind("mousemove.dlRegion", regionMove);
                $overlay.bind("mouseup.dlRegion", regionEnd);
                return false;
            };

            // mousemove handler: size region
            var regionMove = function (evt) {
                pt2 = geom.position(evt);
                var rect = geom.rectangle(pt1, pt2);
                rect.clipTo(scalerRect);
                // update region
                rect.adjustDiv($regionDiv);
                return false;
            };

            // mouseup handler: end sizing
            var regionEnd = function (evt) {
                pt2 = geom.position(evt);
                // assume a click and continue if the area is too small
                var clickRect = geom.rectangle(pt1, pt2);
                if (clickRect.getArea() <= 5) return false;
                // unregister mouse events and get rid of overlay
                $overlay.unbind("mousemove.dlRegion", regionMove);
                $overlay.unbind("mouseup.dlRegion", regionEnd);
                $overlay.remove();
                // clip region
                clickRect.clipTo(scalerRect);
                clickRect.adjustDiv($regionDiv);
                storeRegion(data, $regionDiv);
                // fn.redisplay(data);
                fn.highlightButtons(data, 'addregion', 0);
                redisplay(data);
                return false;
            };

            // bind start zoom handler
            $overlay.one('mousedown.dlRegion', regionStart);
            fn.highlightButtons(data, 'addregion', 1);
        },

        // remove the last added region
        "removeRegion" : function (data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var region = data.regions.pop();
            if (region == null) return;
            var $regionDiv = region.$div; 
            $regionDiv.remove();
            redisplay(data);
        },

        // show/hide regions 
        "toggleRegions" : function (data) {
            var show = !data.settings.isRegionVisible;
            data.settings.isRegionVisible = show;
            fn.highlightButtons(data, 'regions', show);
            showRegionDivs(data, 1);
        },

        // show/hide region info 
        "toggleRegionInfo" : function (data) {
            var show = !data.settings.showRegionInfo;
            data.settings.showRegionInfo = show;
            fn.highlightButtons(data, 'regioninfo', show);
            var $info = $('.regioninfo');
            if (show) {
                $info.fadeIn();
            } else {
                $info.fadeOut();
            }
        }
    };

    var addRegion = actions.addRegion;

    // store a region div
    var storeRegion = function (data, $regionDiv) {
        var regions = data.regions;
        var rect = geom.rectangle($regionDiv);
        var regionRect = data.imgTrafo.invtransform(rect);
        regionRect.$div = $regionDiv;
        regions.push(regionRect);
        console.debug("regions", data.regions, "regionRect", regionRect);
    };

    // add a region to data.$elem
    var addRegionDiv = function (data, index) {
        var nr = index + 1; // we count regions from 1
        // create a digilib URL for this detail
        var regionUrl = getRegionUrl(data, index);
        var $regionDiv = $('<div class="region overlay" style="display:none"/>');
        $regionDiv.attr("id", ID_PREFIX + nr);
        data.$elem.append($regionDiv);
        if (data.settings.showRegionNumbers) {
            var $regionNr = $('<div class="regionnumber"/>');
            var $regionLink = $('<a/>');
            $regionLink.attr('href', regionUrl);
            $regionLink.text(nr);
            $regionNr.append($regionLink);
            $regionDiv.append($regionNr);
        }
        if (data.settings.autoRegionLinks) {
            $regionDiv.bind('click.dlRegion', function() {
                 window.location = regionUrl;
            })
        }
        return $regionDiv;
    };

    // add region info
    var addRegionInfo = function (region) {
        var $regionDiv = region.$div;
        var $regionInfoDiv = $('<div class="regioninfo" />');
        $regionInfoDiv.text(region.toString());
        $regionDiv.append($regionInfoDiv);
    }

    // add region content
    var addRegionContent = function (region, $elem) {
        var $regionDiv = region.$div;
        $regionDiv.append($elem);
    }

    // create a region div from the data.regions collection
    var createRegionDiv = function (regions, index) {
        var region = regions[index];
        var $regionDiv = addRegionDiv(data, index);
        region.$div = $regionDiv;
        addRegionInfo(region);
        return $regionDiv;
    };

    // create regions 
    var createRegionDivs = function (data) {
        var regions = data.regions;
        for (var i = 0; i < regions.length ; i++) {
            createRegionDiv(regions, i);
        }
    };

    // create regions from HTML
    var createRegionsFromHTML = function (data) {
        var regions = data.regions;
        var selector = data.settings.regionContentSelector;
        var $content = data.$elem.find(selector);
        console.debug("createRegionsFromHTML", $content);
        $content.each(function(index, elem) {
            var $div = $(elem); 
            var r = $div.attr('title');
            var pos = r.split("/", 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            regions.push(rect);
            var $regionDiv = createRegionDiv(regions, index);
            $regionDiv.append($div);
            $div.show();
        });
    };

    // show a region on top of the scaler image 
    var showRegionDiv = function (data, index, anim) {
        if (!data.imgTrafo) return;
        var $elem = data.$elem;
        var regions = data.regions;
        if (index > regions.length) return;
        var region = regions[index]
        var $regionDiv = region.$div;
        if (!$regionDiv) {
            console.debug("showRegionDiv: region has no $div", region);
            // alert("showRegionDiv: region has no $div to show");
            return;
        }
        var regionRect = region.copy();
        var show = data.settings.isRegionVisible;
        if (show && data.zoomArea.overlapsRect(regionRect)) {
            regionRect.clipTo(data.zoomArea);
            var screenRect = data.imgTrafo.transform(regionRect);
            screenRect.adjustDiv($regionDiv);
            if (anim) {
                $regionDiv.fadeIn();
            } else{
                $regionDiv.show();
            }
        } else {
            if (anim) {
                $regionDiv.fadeOut();
            } else{
                $regionDiv.hide();
            }
        }
    };

    // show regions 
    var showRegionDivs = function (data, anim) {
        for (var i = 0; i < data.regions.length ; i++) {
            showRegionDiv(data, i, anim);
        }
    };

    var unpackRegions = function (data) { 
        // create regions from parameters
        var rg = data.settings.rg;
        if (rg == null) return;
        var regions = data.regions;
        var rs = rg.split(",");
        for (var i = 0; i < rs.length; i++) {
            var r = rs[i];
            var pos = r.split("/", 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            regions.push(rect);
            }
    };

    // pack regions array into a parameter string
    var packRegions = function (data) {
        var regions = data.regions;
        if (!regions.length) {
            data.settings.rg = null;
            return;
        }
        var rg = '';
        for (var i = 0; i < regions.length; i++) {
            region = regions[i];
            if (i) {
                rg += ',';
            }
            rg += [
                fn.cropFloatStr(region.x), 
                fn.cropFloatStr(region.y),
                fn.cropFloatStr(region.width),
                fn.cropFloatStr(region.height)
                ].join('/');
        }
        data.settings.rg = rg;
    };

    // reload display after a region has been added or removed
    var redisplay = function (data) {
        if (!data.settings.includeRegionContent) {
            packRegions(data);
        }
        fn.redisplay(data);
    };

    // for turning region numbers/region divs into links to zoomed details 
    var getRegionUrl = function (data, index) {
        var region = data.regions[index];
        var settings = data.settings;
        var params = {
            "fn" : settings.fn,
            "pn" : settings.pn
            };
        fn.packArea(params, region);
        fn.packMarks(params, data.marks);
        fn.packScalerFlags(params, data.scalerFlags);
        var paramNames = digilib.defaults.digilibParamNames;
        // build our own digilib URL without storing anything
        var queryString = fn.getParamString(params, paramNames, digilib.defaults);
        return settings.digilibBaseUrl + '?' + queryString;
    };

    // event handler, reads region parameter and creates region divs
    var handleSetup = function (evt) {
        data = this;
        console.debug("regions: handleSetup", data.settings.rg);
        // regions with content are given in HTML divs
        if (data.settings.includeRegionContent) {
            createRegionsFromHTML(data);
        // regions are defined in the URL
        } else {
            unpackRegions(data);
            createRegionDivs(data);
        }
    };

    // event handler, sets buttons and shows regions
    var handleUpdate = function (evt) {
        data = this;
        fn.highlightButtons(data, 'regions' , data.settings.isRegionVisible);
        fn.highlightButtons(data, 'regioninfo' , data.settings.showRegionInfo);
        showRegionDivs(data);
        console.debug("regions: handleUpdate", data.settings.rg);
    };

    // event handler, redisplays regions (e.g. in a new position)
    var handleRedisplay = function (evt) {
        data = this;
        showRegionDivs(data);
        console.debug("regions: handleRedisplay");
    };

    // event handler
    var handleDragZoom = function (evt, zoomArea) {
        // console.debug("regions: handleDragZoom, zoomArea:", zoomArea);
        // data = this;
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing regions plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        FULL_AREA = geom.rectangle(0,0,1,1);
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising regions plugin. data:', data);
        var $data = $(data);
        // regions array
        data.regions = [];
        // no URL-defined regions, no buttons when regions are predefined in HTML
        if (!data.settings.includeRegionContent) {
            // add "rg" to digilibParamNames
            data.settings.digilibParamNames.push('rg');
            // additional buttons
            var buttonSettings = data.settings.buttonSettings.fullscreen;
            // configure buttons through digilib "regionSet" option
            var buttonSet = data.settings.regionSet || regionSet; 
            // set regionSet to [] or '' for no buttons (when showing regions only)
            if (buttonSet.length && buttonSet.length > 0) {
                buttonSettings['regionSet'] = buttonSet;
                buttonSettings.buttonSets.push('regionSet');
            }
        }
        // install event handler
        $data.bind('setup', handleSetup);
        $data.bind('update', handleUpdate);
        $data.bind('redisplay', handleRedisplay);
        $data.bind('dragZoom', handleDragZoom);
    };

    // plugin object with name and install/init methods
    // shared objects filled by digilib on registration
    var pluginProperties = {
            name : 'region',
            install : install,
            init : init,
            buttons : {},
            actions : {},
            fn : {},
            plugins : {}
    };

    if ($.fn.digilib == null) {
        $.error("jquery.digilib.regions must be loaded after jquery.digilib!");
    } else {
        $.fn.digilib('plugin', pluginProperties);
    }
})(jQuery);
