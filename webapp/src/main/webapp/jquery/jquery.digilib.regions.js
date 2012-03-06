/** optional digilib regions plugin

Mark up a digilib image with rectangular regions.

If hasRegionInfo=true reads regions from page HTML.
Element with regions has to be in digilib element, e.g.

<div class="dl-keep dl-regioncontent">
   <a href="http://www.mpiwg-berlin.mpg.de" coords="0.1,0.1,0.4,0.1">MPI fuer Wissenschaftsgeschichte</a>
   <a href="http://www.biblhertz.it" coords="0.5,0.8,0.4,0.1">Bibliotheca Hertziana</a>
   <a coords="0.3,0.5,0.15,0.1" />
</div>

*/

(function($) {
    // the digilib object
    var digilib = null;
    // the functions made available by digilib
    var fn = null;
    // affine geometry plugin
    var geom = null;

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
        regionhtml : {
            onclick : "showRegionInfo",
            tooltip : "show information about regions",
            icon : "regioninfo.png"
            }
        };

    var defaults = {
        // are regions shown?
        'isRegionVisible' : true,
        // are region numbers shown?
        'showRegionNumbers' : true,
        // is window with region HTML shown?
        'showRegionInfo' : false,
        // is there region content in the page?
        'hasRegionContent' : false,
        // turn any region into a clickable link to its detail view
        'autoRegionLinks' : false,
        // class name for content divs (must additionally be marked with class "keep")
        'regionContentSelector' : 'div.dl-regioncontent',
        // buttonset of this plugin
        'regionSet' : ['regions', 'addregion', 'delregion', 'regionhtml', 'lessoptions'],
        // url param for regions
        'rg' : null
        };

    var actions = { 

        // define a region interactively with two clicked points
        "defineRegion" : function(data) {
            if (!data.settings.isRegionVisible) {
                alert("Please turn on regions visibility!");
                return;
            }
            var cssPrefix = data.settings.cssPrefix;
            var $elem = data.$elem;
            var $body = $('body');
            var bodyRect = geom.rectangle($body);
            var $scaler = data.$scaler;
            var scalerRect = geom.rectangle($scaler);
            var pt1, pt2;
            // overlay prevents other elements from reacting to mouse events 
            var $overlay = $('<div class="'+cssPrefix+'overlay" style="position:absolute"/>');
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
                $overlay.on("mousemove.dlRegion", regionMove);
                $overlay.on("mouseup.dlRegion", regionEnd);
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
                $overlay.off("mousemove.dlRegion", regionMove);
                $overlay.off("mouseup.dlRegion", regionEnd);
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
            renderRegions(data, 1);
        },

        // show/hide region HTML code 
        "showRegionInfo" : function (data) {
            var show = !data.settings.showRegionInfo;
            data.settings.showRegionInfo = show;
            fn.highlightButtons(data, 'regionhtml', show);
            var $html = data.$htmlDiv;
            if (!show) {
                // empty the div
                $html.fadeOut(function () { 
                    $html.contents().remove();
                    });
                return;
            }
            regionInfo(data);
        }

    };

    // store a region div
    var storeRegion = function (data, $regionDiv) {
        var regions = data.regions;
        var rect = geom.rectangle($regionDiv);
        var regionRect = data.imgTrafo.invtransform(rect);
        regionRect.$div = $regionDiv;
        regions.push(regionRect);
        console.debug("regions", data.regions, "regionRect", regionRect);
    };

    // clickable header
    var regionInfoHeader = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'infoheader"/>');
        var $h01 = $('<div class="'+cssPrefix+'infobutton">HTML</div>'); 
        var $h02 = $('<div class="'+cssPrefix+'infobutton">SVG</div>'); 
        var $h03 = $('<div class="'+cssPrefix+'infobutton">Digilib</div>'); 
        var $h04 = $('<div class="'+cssPrefix+'infobutton">X</div>');
        var bind = function($div, name) {
            $div.on('click.regioninfo', function () {
                var $top = $(this).parent().parent();
                $top.find('.'+cssPrefix+'info').hide();
                $top.find('.'+cssPrefix+ name).show();
                });
            };
        bind($h01, 'html');
        bind($h02, 'svgattr');
        bind($h03, 'digilib');
        var $html = data.$htmlDiv;
        $h04.on('click.regioninfo', function () {
            data.settings.showRegionInfo = false;
            fn.highlightButtons(data, 'regionhtml', false);
            $html.fadeOut(function () { 
                $html.contents().remove();
                });
            });
        $infoDiv.append($h01, $h02, $h03, $h04);
        return $infoDiv;
    };

    // html for later insertion
    var regionInfoHTML = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'html"/>');
        $infoDiv.append($('<div/>').text('<div class="'+cssPrefix+'keep '+cssPrefix+'regioncontent">'));
        $.each(data.regions, function(index, r) {
            var area = [
                fn.cropFloatStr(r.x),
                fn.cropFloatStr(r.y),
                fn.cropFloatStr(r.width),
                fn.cropFloatStr(r.height)].join(',');
            $infoDiv.append($('<div/>').text('<a coords="' + area + '" >'));
            });
        $infoDiv.append($('<div/>').text('</div>'));
        return $infoDiv;
    };

    // SVG-style
    var regionInfoSVG = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'svgattr"/>');
        $.each(data.regions, function(index, r) {
            var area = [
                fn.cropFloatStr(r.x),
                fn.cropFloatStr(r.y),
                fn.cropFloatStr(r.width),
                fn.cropFloatStr(r.height)].join(' ');
            $infoDiv.append($('<div/>').text('"' + area + '"'));
            });
        return $infoDiv;
    };

    // digilib-style
    var regionInfoDigilib = function (data) {
        var cssPrefix = data.settings.cssPrefix;
        var $infoDiv = $('<div class="'+cssPrefix+'info '+cssPrefix+'digilib"/>');
        $.each(data.regions, function(index, r) {
            var area = r.toString();
            $infoDiv.append($('<div/>').text(area));
            });
        return $infoDiv;
    };

    // show region info in a window
    var regionInfo = function (data) {
        var $html = data.$htmlDiv;
        $html.append(regionInfoHeader(data));
        $html.append(regionInfoHTML(data));
        $html.append(regionInfoSVG(data));
        $html.append(regionInfoDigilib(data));
        $html.fadeIn();
    };

    // add a region to data.$elem
    var addRegionDiv = function (data, index, attributes) {
        var cssPrefix = data.settings.cssPrefix;
        var nr = index + 1; // we count regions from 1
        var $regionDiv = $('<div class="'+cssPrefix+'region '+cssPrefix+'overlay" style="display:none"/>');
        data.$elem.append($regionDiv);
        if (data.settings.showRegionNumbers) {
            var $regionLink = $('<a class="'+cssPrefix+'regionnumber">'+nr+'</a>');
            if (attributes) $regionLink.attr(attributes);
            $regionDiv.append($regionLink);
        }
        if (data.settings.autoRegionLinks) {
            var url = null;
            if (attributes) {
                if (attributes.href != null) {
                    url = attributes.href;
                }
                delete attributes.href;
                $regionDiv.attr(attributes);
            }
            var region = data.regions[index];
            $regionDiv.on('click.dlRegion', function() {
                if (url != null) {
                    window.location = url;
                } else {
                    digilib.actions['zoomArea'](data, region);
                }
            });
        }
        return $regionDiv;
    };

    // create a region div from the data.regions array
    var createRegionDiv = function (data, regions, index, attributes) {
        var $regionDiv = addRegionDiv(data, index, attributes);
        var region = regions[index];
        region.$div = $regionDiv;
        return $regionDiv;
    };

    // create regions from URL parameters
    var createRegionsFromURL = function (data) {
        unpackRegions(data);
        var regions = data.regions;
        $.each(regions, function(i) {
            createRegionDiv(data, regions, i);
            });
    };

    // create regions from HTML
    var createRegionsFromHTML = function (data) {
        var regions = data.regions;
        var selector = data.settings.regionContentSelector;
        // regions are defined in "a" tags
        var $content = data.$elem.contents(selector).contents('a');
        console.debug("createRegionsFromHTML. elems: ", $content);
        $content.each(function(index, a) {
            var $a = $(a); 
            // the "coords" attribute contains the region coords (0..1)
            var coords = $a.attr('coords');
            var pos = coords.split(",", 4);
            var rect = geom.rectangle(pos[0], pos[1], pos[2], pos[3]);
            regions.push(rect);
            // copy some attributes
            var attributes = {};
            for (var n in {'id':1, 'href':1, 'title':1, 'target':1, 'style':1}) {
                attributes[n] = $a.attr(n);
            }
            // create the div
            var $regionDiv = createRegionDiv(data, regions, index, attributes);
            var $contents = $a.contents().clone();
            $regionDiv.append($contents);
        });
    };

    // show a region on top of the scaler image 
    var renderRegion = function (data, index, anim) {
        if (!data.imgTrafo) return;
        var $elem = data.$elem;
        var regions = data.regions;
        var zoomArea = data.zoomArea;
        if (index > regions.length) return;
        var region = regions[index];
        var $regionDiv = region.$div;
        if (!$regionDiv) {
            console.error("renderRegion: region has no $div", region);
            // alert("renderRegion: region has no $div to show");
            return;
        }
        var regionRect = region.copy();
        var show = data.settings.isRegionVisible;
        if (show && zoomArea.overlapsRect(regionRect)) {
            regionRect.clipTo(zoomArea);
            var screenRect = data.imgTrafo.transform(regionRect);
            console.debug("renderRegion: pos=",geom.position(screenRect));
            if (anim) {
                $regionDiv.fadeIn();
            } else{
                $regionDiv.show();
            }
            // adjustDiv sets wrong coords when called BEFORE show()
            screenRect.adjustDiv($regionDiv);
        } else {
            if (anim) {
                $regionDiv.fadeOut();
            } else{
                $regionDiv.hide();
            }
        }
    };

    // show regions 
    var renderRegions = function (data, anim) {
        for (var i = 0; i < data.regions.length ; i++) {
            renderRegion(data, i, anim);
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
            var region = regions[i];
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
        if (!data.settings.hasRegionContent) {
            packRegions(data);
        }
        fn.redisplay(data);
    };

    // event handler, reads region parameter and creates region divs
    var handleSetup = function (evt) {
        var data = this;
        console.debug("regions: handleSetup", data.settings.rg);
        // regions with content are given in HTML divs
        if (data.settings.hasRegionContent) {
            createRegionsFromHTML(data);
        // regions are defined in the URL
        } else {
            createRegionsFromURL(data);
            fn.highlightButtons(data, 'regionhtml', data.settings.showRegionInfo);
        }
    };

    // event handler, sets buttons and shows regions when scaler img is reloaded
    var handleUpdate = function (evt) {
        var data = this;
        console.debug("regions: handleUpdate");
        var settings = data.settings;
        fn.highlightButtons(data, 'regions' , settings.isRegionVisible);
        fn.highlightButtons(data, 'regionhtml' , settings.showRegionInfo);
        renderRegions(data);
    };

    // plugin installation called by digilib on plugin object.
    var install = function(plugin) {
        digilib = plugin;
        console.debug('installing regions plugin. digilib:', digilib);
        fn = digilib.fn;
        // import geometry classes
        geom = fn.geometry;
        // add defaults, actions, buttons
        $.extend(digilib.defaults, defaults);
        $.extend(digilib.actions, actions);
        $.extend(digilib.buttons, buttons);
    };

    // plugin initialization
    var init = function (data) {
        console.debug('initialising regions plugin. data:', data);
        var $elem = data.$elem;
        var cssPrefix = data.settings.cssPrefix;
        // regions array
        data.regions = [];
        // regions div
        var $html = $('<div class="'+cssPrefix+'keep '+cssPrefix+'regionHTML"/>');
        $elem.append($html);
        data.$htmlDiv = $html;
        // install event handler
        var $data = $(data);
        $data.on('setup', handleSetup);
        $data.on('update', handleUpdate);
        var settings = data.settings;
        // neither URL-defined regions nor buttons when regions are predefined in HTML
        if (!settings.hasRegionContent) {
            var mode = settings.interactionMode;
            // add "rg" to digilibParamNames
            settings.digilibParamNames.push('rg');
            // additional buttons
            var buttonSettings = settings.buttonSettings[mode];
            // configure buttons through digilib "regionSet" option
            var buttonSet = settings.regionSet || regionSet; 
            // set regionSet to [] or '' for no buttons (when showing regions only)
            if (buttonSet.length && buttonSet.length > 0) {
                buttonSettings.regionSet = buttonSet;
                buttonSettings.buttonSets.push('regionSet');
            }
        }
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
