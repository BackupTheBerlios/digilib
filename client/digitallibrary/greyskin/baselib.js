/* Copyright (C) 2003,2004 IT-Group MPIWG, WTWG Uni Bern and others

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.
 
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA
 
Authors: 
  Christian Luginbuehl, 01.05.2003 (first version)
  DW 24.03.2004 (Changed for digiLib in Zope)
  Robert Casties, 2.11.2004
  Martin Raspe, 12.12.2005 (changes for Digilib NG)

*/

// was: function base_init() {
baseLibVersion = "2.007";
browserType = getBrowserType();


function getInt(n) {
    // returns always an integer
    n = parseInt(n);
    if (isNaN(n)) return 0;
    return n;
}

function defined(x) {
    // returns if x is defined
    return (typeof arguments[0] != "undefined");
}

function cropFloat(x) {
    // auxiliary function to crop senseless precision
    return parseInt(10000 * x) / 10000;
}

function getBrowserType() {
    // browser sniffer
    var bt = Object();
    bt.doDHTML = false;
    bt.versIE = 0;

    if ((! document.cssonly && document.layers) || document.all || document.getElementById) {
        var vers = navigator.appVersion.split('MSIE ');
        vers = vers[vers.length - 1];
        bt.versIE = getInt(vers);
        bt.isIE = navigator.userAgent.indexOf('MSIE') >= 0;
        bt.isMac = navigator.platform.indexOf('Mac') >= 0;
        bt.isWin = navigator.platform.indexOf('Win') >= 0;
        bt.isN4 = (navigator.userAgent.indexOf('Mozilla/4.') >= 0) && ! bt.isIE;
        bt.isIEWin = bt.versIE > 0 && bt.isWin;
        if (navigator.appVersion.indexOf('MSIE') < 0 || ! bt.isMac || bt.versIE >= 5) {
            bt.doDHTML = true;
            bt.isOpera = navigator.userAgent.indexOf(' Opera ') >= 0;
            bt.isKonq = navigator.userAgent.indexOf(' Konqueror') >= 0;
        }
    }
    return bt;
}

// fixes for javascript < 1.2
if (! Array.prototype.push) {
    Array.prototype.push = function(val) {
        this[this.length] = val;
        return this.length;
    }
    Array.prototype.pop = function() {
        var val = this[this.length-1];
        this.length -= 1;
        return val;
    }
}


/* **********************************************
 *     geometry classes
 * ******************************************** */

/*
 * Size class
 */
function Size(w, h) {
    this.width = parseFloat(w);
    this.height = parseFloat(h);
    return this;
}
Size.prototype.toString = function() {
    return this.width + "x" + this.height;
}
Size.prototype.equals = function(other) {
	return (this.width == other.width
        &&  this.height == other.height)
    }

/*
 * Position class
 */
function Position(x, y) {
    this.x = parseFloat(x);
    this.y = parseFloat(y);
    return this;
}
Position.prototype.toString = function() {
    return this.x + "," + this.y;
}
Position.prototype.equals = function(other) {
	return (this.x == other.x
        &&  this.y == other.y)
    }
/*
 * Rectangle class
 */
function Rectangle(x, y, w, h) {
    this.x = parseFloat(x);
    this.y = parseFloat(y);
    this.width = parseFloat(w);
    this.height = parseFloat(h);
    return this;
}
Rectangle.prototype.toString = function() {
    return this.width+"x"+this.height+"@"+this.x+","+this.y;
}
Rectangle.prototype.copy = function() {
    // returns a copy of this Rectangle
    return new Rectangle(this.x, this.y, this.width, this.height);
}
Rectangle.prototype.getPosition = function() {
    // returns the position of this Rectangle
    return new Position(this.x, this.y);
}
Rectangle.prototype.getPt1 = Rectangle.prototype.getPosition;

Rectangle.prototype.getPt2 = function() {
    // returns the second point position of this Rectangle
    return new Position(this.x + this.width, this.y + this.height);
}
Rectangle.prototype.setPt1 = function(pos) {
    // sets the first point to position pos
    this.x = pos.x;
    this.y = pos.y;
    return this;
}
Rectangle.prototype.setPt2 = function(pos) {
    // sets the second point to position pos
    this.width = pos.x - this.x;
    this.height = pos.y - this.y;
    return this;
}
Rectangle.prototype.getCenter = function() {
    // returns the center position of this Rectangle
    return new Position(this.x + this.width / 2, this.y + this.height / 2);
}
Rectangle.prototype.setCenter = function(pos) {
    // moves this Rectangle's center to position pos
    this.x = pos.x - this.width / 2;
    this.y = pos.y - this.height / 2;
    return this;
}
Rectangle.prototype.getSize = function() {
    // returns the size of this Rectangle
    return new Size(this.width, this.height);
}
Rectangle.prototype.equals = function(other) {
    // equal props
    return (this.getPosition().equals(other.getPosition())
        &&  this.getSize().equals(other.getSize())
        );
}
Rectangle.prototype.getArea = function() {
    // returns the area of this Rectangle
    return (this.width * this.height);
}
Rectangle.prototype.normalize = function() {
    // eliminates negative width and height
    var p = this.getPt2();
    this.x = Math.min(this.x, p.x);
    this.y = Math.min(this.y, p.y);
    this.width = Math.abs(this.width);
    this.height = Math.abs(this.height);
    return this;
}
Rectangle.prototype.containsPosition = function(pos) {
    // returns if Position "pos" lies inside of this rectangle
    return ((pos.x >= this.x)
        && (pos.y >= this.y)
    && (pos.x <= this.x + this.width)
    && (pos.y <= this.y + this.width)
    );
}
Rectangle.prototype.containsRect = function(rect) {
    // returns if rectangle "rect" is contained in this rectangle
    return (this.containsPosition(rect) 
        && this.containsPosition(new Position(
        rect.x + rect.width,
        rect.y + rect.height
        )));
}
Rectangle.prototype.stayInside = function(rect) {
    // changes this rectangle's x/y values so it stays inside of rectangle rect
    // keeping the proportions
    if (this.x < rect.x) this.x = rect.x;
    if (this.y < rect.y) this.y = rect.y;
    if (this.x + this.width > rect.x + rect.width) 
        this.x = rect.x + rect.width - this.width;
    if (this.y + this.height > rect.y + rect.height)
        this.y = rect.y + rect.height - this.height;
    return this;
}
Rectangle.prototype.clipTo = function(rect) {
    // clips this rectangle so it stays inside of rectangle rect
    p1 = rect.getPt1();
    p2 = rect.getPt2();
    this2 = this.getPt2();
    this.setPt1(new Position(Math.max(this.x, p1.x), Math.max(this.y, p1.y)));
    this.setPt2(new Position(Math.min(this2.x, p2.x), Math.min(this2.y, p2.y)));
    return this;
}
Rectangle.prototype.intersect = function(rect) {
    // returns the intersection of the given Rectangle and this one
    // FIX ME: not really, it should return null if there is no overlap 
    var sec = rect.copy();
    if (sec.x < this.x) {
        sec.width = sec.width - (this.x - sec.x);
        sec.x = this.x;
    }
    if (sec.y < this.y) {
        sec.height = sec.height - (this.y - sec.y);
        sec.y = this.y;
    }
    if (sec.x + sec.width > this.x + this.width) {
        sec.width = (this.x + this.width) - sec.x;
    }
    if (sec.y + sec.height > this.y + this.height) {
        sec.height = (this.y + this.height) - sec.y;
    }
    return sec;
}
Rectangle.prototype.fit = function(rect) {
    // returns a Rectangle that fits into this one (by moving first)
    var sec = rect.copy();
    sec.x = Math.max(sec.x, this.x);
    sec.y = Math.max(sec.y, this.x);
    if (sec.x + sec.width > this.x + this.width) {
        sec.x = this.x + this.width - sec.width;
    }
    if (sec.y + sec.height > this.y + this.height) {
        sec.y = this.y + this.height - sec.height;
    }
    return sec.intersect(this);
}

/*
 * Transform class
 *
 * defines a class of affine transformations
 */
function Transform() {
    this.m00 = 1.0;
    this.m01 = 0.0;
    this.m02 = 0.0;
    this.m10 = 0.0;
    this.m11 = 1.0;
    this.m12 = 0.0;
    this.m20 = 0.0;
    this.m21 = 0.0;
    this.m22 = 1.0;
    return this;
}
Transform.prototype.concat = function(traf) {
    // add Transform traf to this Transform
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            var c = 0.0;
            for (var k = 0; k < 3; k++) {
                c += traf["m"+i+k] * this["m"+k+j];
            }
            this["m"+i+j] = c;
        }
    }
    return this;
}
Transform.prototype.transform = function(rect) {
    // returns transformed Rectangle or Position with this Transform applied
    var x = this.m00 * rect.x + this.m01 * rect.y + this.m02;
    var y = this.m10 * rect.x + this.m11 * rect.y + this.m12;
    if (rect.width) {
        var width = this.m00 * rect.width + this.m01 * rect.height;
        var height = this.m10 * rect.width + this.m11 * rect.height;
        return new Rectangle(x, y, width, height);
    }
    return new Position(x, y);
}
Transform.prototype.invtransform = function(pos) {
    // returns transformed Position pos with the inverse of this Transform applied
    var det = this.m00 * this.m11 - this.m01 * this.m10;
    var x = (this.m11 * pos.x - this.m01 * pos.y - this.m11 * this.m02 + this.m01 * this.m12) / det;
    var y = (- this.m10 * pos.x + this.m00 * pos.y + this.m10 * this.m02 - this.m00 * this.m12) / det;
    return new Position(x, y);
}
function getRotation(angle, pos) {
    // returns a Transform that is a rotation by angle degrees around [pos.x, pos.y]
    var traf = new Transform();
    if (angle != 0) {
        var t = 2.0 * Math.PI * parseFloat(angle) / 360.0;
        traf.m00 = Math.cos(t);
        traf.m01 = - Math.sin(t);
        traf.m10 = Math.sin(t);
        traf.m11 = Math.cos(t);
        traf.m02 = pos.x - pos.x * Math.cos(t) + pos.y * Math.sin(t);
        traf.m12 = pos.y - pos.x * Math.sin(t) - pos.y * Math.cos(t);
    }
    return traf;
}
function getTranslation(pos) {
    // returns a Transform that is a translation by [pos.x, pos,y]
    var traf = new Transform();
    traf.m02 = pos.x;
    traf.m12 = pos.y;
    return traf;
}
function getScale(size) {
    // returns a Transform that is a scale by [size.width, size.height]
    var traf = new Transform();
    traf.m00 = size.width;
    traf.m11 = size.height;
    return traf;
}


/* **********************************************
 *     parameter routines
 * ******************************************** */
dlParams = new Object();

function newParameter(name, defaultValue, detail) {
    // create a new parameter with a name and a default value
    if (!defined(dlParams[name])) dlParams[name] = new Object(); // no error condition
        //alert("Fatal: An object with name '" + name + "' already exists - cannot recreate!");
        //return false;
    dlParams[name].defaultValue = defaultValue;
    dlParams[name].hasValue = false;
    dlParams[name].value = defaultValue;
    dlParams[name].detail = detail;
    return dlParams[name];
    }

function resetParameter(name) {
    // resets the given parameter to its default value
    if (!defined(dlParams[name])) {
    alert("Could not reset non-existing parameter '" + name + "'");
    return false;
        }
    dlParams[name].hasValue = false;
    dlParams[name].value = defaultValue;
    return dlParams[name];
    }

function deleteParameter(name) {
    // create a new parameter with a name and a default value
    if (!defined(dlParams[name])) return false;
    delete dlParams[name];
    return true;
    }

function getParameter(name) {
    // returns the named parameter value or its default value
    if (!defined(dlParams[name])) return null;
    if (dlParams[name].hasValue)
        return dlParams[name].value;
    else
            return dlParams[name].defaultValue;
    }

function setParameter(name, value, relative) {
    // sets parameter value (relative values with +/- unless literal)
    if (!defined(dlParams[name])) return null;
    var p = dlParams[name];
    if (relative && value.slice) {
        var sign = value.slice(0, 1);
        if (sign == '+') {
            p.value = parseFloat(p.value) + parseFloat(value.slice(1));
        } else if (sign == '-') {
            p.value = parseFloat(p.value) - parseFloat(value.slice(1));
        } else {
            p.value = value;
        }
    } else p.value = value;
    p.hasValue = true;
    return p.value;
    }

function hasParameter(name) {
    // returns if the parameter's value has been set
    if (!defined(dlParams[name])) return null;
    return dlParams[name].hasValue;
    }

function getAllParameters(detail) {
    // returns a string of all parameters in query format
    if (! detail) {
        detail = 255;
    }
    var params = new Array();
    for (param in dlParams) {
        if (((dlParams[param].detail & detail) > 0)
        && (dlParams[param].hasValue)) {
            var val = getParameter(param);
            if (val != "") {
                params.push(param + "=" + val);
            }
        }
    }
    return params.join("&");
}

function parseParameters(query) {
    // gets parameter values from query format string
    var params = query.split("&");
    for (var i = 0; i < params.length; i++) {
        var keyval = params[i].split("=");
        if (keyval.length == 2) {
            setParameter(keyval[0], keyval[1]);
        }
    }
}

getQueryString = getAllParameters;

/* **********************************************
 *     HTML/DOM routines
 * ******************************************** */

function getElement(tagid, quiet) {
    // returns the element object with the id tagid
    var e;
    if (document.getElementById) {
        e = document.getElementById(tagid);
    } else if (document.all) {
        alert("document.all!");
        e = document.all[tagid];
    } else if (document.layers) {
        e = document.layers[tagid];
    } 
    if (e) {
        return e;
    } else {
        if (! quiet) {
            alert("unable to find element: "+tagid);
        }
        return null;
    }
}

function getElementPosition(elem) {
    // returns a Position with the position of the element
    var x = 0;
    var y = 0;
    if (defined(elem.offsetLeft)) {
        var e = elem;
        while (e) {
            if (defined(e.clientLeft)) {
                // special for IE
                if (browserType.isMac) {
                    if (e.offsetParent.tagName == "BODY") {
                        // IE for Mac extraspecial
                        x += e.clientLeft;
                        y += e.clientTop;
                        break;
                    }
                } else {
                    if ((e.tagName != "TABLE") && (e.tagName != "BODY")) {
                        x += e.clientLeft;
                        y += e.clientTop;
                    }
                }
            }
            x += e.offsetLeft;
            y += e.offsetTop;
            e = e.offsetParent;
        }
    } else if (defined(elem.x)) {
        x = elem.x;
        y = elem.y;
    } else if (defined(elem.pageX)) {
        x = elem.pageX;
        y = elem.pageY;
    } else {
        alert("unable to get position of " + elem + " (id:" + elem.id + ")");
    }
    return new Position(getInt(x), getInt(y));
}

function getElementSize(elem) {
    // returns a Rectangle with the size of the element
    var width = 0;
    var height = 0;
    if (defined(elem.offsetWidth)) {
        width = elem.offsetWidth;
        height = elem.offsetHeight;
    } else if (defined(elem.width)) {
        width = elem.width;
        height = elem.height;
    } else if (defined(elem.clip.width)) {
        width = elem.clip.width;
        height = elem.clip.height;
    } else {
        alert("unable to get size of " + elem + " (id:" + elem.id + ")");
    }
    return new Size(getInt(width), getInt(height));
}

function getElementRect(elem) {
    // returns a Rectangle with the size and position of the element
    // FIX ME: what about borders?
    var pos = getElementPosition(elem);
    var size = getElementSize(elem);
    return new Rectangle(pos.x, pos.y, size.width, size.height);
}

function moveElement(elem, rect) {
    // moves and sizes the element
    if (elem.style) {
        if (defined(rect.x)) {
            elem.style.left = Math.round(rect.x) + "px";
            elem.style.top = Math.round(rect.y) + "px";
        }
        if (defined(rect.width)) {
            elem.style.width = Math.round(rect.width) + "px";
            elem.style.height = Math.round(rect.height) + "px";
        }
    } else if (document.layers) {
        if (defined(rect.x)) {
            elem.pageX = getInt(rect.x);
            elem.pageY = getInt(rect.y);
        }
        if (defined(rect.width)) {
            elem.clip.width = getInt(rect.width);
            elem.clip.height = getInt(rect.height);
        }
    } else {
        alert("moveElement(): element has no style or layer property!");
        return false;
    }
    return true;
}

function showElement(elem, show) {
    // shows or hides the element
    if (elem.style)
        elem.style.visibility = show ? "visible" : "hidden";
    else if (defined(elem.visibility))
        elem.visibility = show ? "show" : "hide";
    else
        alert("showElement(): element has no style or layer property!");
    return true;
}

function evtPosition(evt) {
    // returns the on-screen Position of the Event 
    var x;
    var y;
    evt = (evt) ? evt : window.event;
    if (!evt) {
        alert("no event found! " + evt);
        return;
        }
    if (defined(evt.pageX)) {
        x = parseInt(evt.pageX);
        y = parseInt(evt.pageY);
    } else if (defined(evt.clientX)) {
        x = parseInt(document.body.scrollLeft + evt.clientX);
        y = parseInt(document.body.scrollTop  + evt.clientY);
    } else {
        alert("evtPosition(): don't know how to deal with " + evt);
        }
    return new Position(x, y);
}

function registerEvent(type, elem, handler) {
    // register the given event handler on the indicated element
    if (elem.addEventListener) {
        elem.addEventListener(type, handler, false);    // bubble
        }
    else if (elem.attachEvent) {
        elem.attachEvent("on" + type, handler);
        }
    else if (elem.captureEvents) {
        if (Event) { 
            t = type.toUpperCase();
            elem.captureEvents(Event[t]);
            elem[ "on" + type ] = handler;
            }
        }
    else {
        alert("Could not register event of type " + type);
        return false;
        }
    return true;
    }
    
function unregisterEvent(type, elem, handler) {
    // unregister the given event handler from the indicated element
    if (elem.removeEventListener) {
        elem.removeEventListener(type, handler, false);
            }
    else if (elem.detachEvent) {
        elem.detachEvent("on" + type, handler);
        }
    else if (elem.releaseEvents) {
        if (Event) { 
            t = type.toUpperCase();
            elem.releaseEvents(Event[t]);
            elem[ "on" + type ] = null;
            }
        }
    else {
        alert("Could not register event of type " + type);
        return false;
        }
    return true;
}

function registerEventById(type, id, handler) {
    registerEvent(type, document.getElementById(id), handler);
    }

function unregisterEventById(type, id, handler) {
    unregisterEvent(type, document.getElementById(id), handler);
    }

function stopEvent(e) {
    if (!e) var e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    return false;
}

function getEventSrc(e) {
    if (e.target) return e.target;
    if (e.srcElement) return e.srcElement;
}

// old registerXXYY API for compatibility
function registerMouseDown(elem, handler) {
    return registerEvent("mousedown", elem, handler);
}
function unregisterMouseDown(elem, handler) {
    return unregisterEvent("mousedown", elem, handler);
}
function registerMouseMove(elem, handler) {
    return registerEvent("mousemove", elem, handler);
}
function unregisterMouseMove(elem, handler) {
    return unregisterEvent("mousemove", elem, handler);
}
function registerKeyDown(handler) {
    return registerEvent("keypress", elem, handler);
}


function getWinSize() {
    // returns a Size with the current window size (mostly from www.quirksmode.org)
    var wsize = new Size(100, 100);
    if (defined(self.innerHeight))  {
        // all except Explorer
        if ((self.innerWidth == 0)||(self.innerHeight == 0)) {
            // Safari 1.2 bug
            if (parent) {
                parent.innerHeight;
                parent.innerWidth;
            }
        }
        wsize.width = self.innerWidth;
        wsize.height = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) {
        // Explorer 6 Strict Mode
        wsize.width = document.documentElement.clientWidth;
        wsize.height = document.documentElement.clientHeight;
    } else if (document.body) {
        // other Explorers
        wsize.width = document.body.clientWidth;
        wsize.height = document.body.clientHeight;
    }
    return wsize;
}

function getWinRect() {
    var size = getWinSize();
    return new Rectangle(0, 0, size.width, size.height);
}
    
function openWin(url, name, params) {
    // open browser window
    var ow = window.open(url, name, params);
    ow.focus();
}

/* **********************************************
 *     cookie class
 * ******************************************** */

function Cookie() {
    return this.read();
}

Cookie.prototype.read = function() {
    var s = document.cookie;
    var lines = s.split("; ");  // semicolon and space for all browsers?
    for (var i in lines) {
        var line = lines[i];
        var sep = line.indexOf("=");
        if (sep != -1) this.add(
            line.substr(0, sep),
            line.substr(sep + 1)
            );
        }
	return this;
}

Cookie.prototype.store = function() {
    var lines = new Array();
    for (var i in this) {
        var item = this[i];
        if (typeof(item) == typeof(lines)) // Array
            lines.push(i + "=" + item.join(","));
        else if (typeof(item) != "function") // single item
            lines.push(i + "=" + item);
        }
    // var s = lines.join(";")
	for (line in lines) document.cookie = lines[line];
    return this;
	}

Cookie.prototype.add = function(key, value) {
    value = value.toString();
    if (value.indexOf(",") == -1) 
            this[key] = value;  // single value
        else
            this[key] = value.split(",");   // list of values
    return this[key];
    }

Cookie.prototype.get = function(key) {
    return this[key];
    }

Cookie.prototype.addbool = function(key, value) {
    this[key] = Boolean(value).toString();
    return this[key];
    }

Cookie.prototype.getbool = function(key) {
    var val = this[key];
    return (val > "") && (val != "0") && (val != "false");
    }

Cookie.prototype.remove = function(key) {
    delete this[key];
    }

// :tabSize=4:indentSize=4:noTabs=true:

