/* kevinlynx
 * based on kitty.js
 */
(function (global, document) {
   
    function blank() {}
    var mods = {}
    var id_seed = 0

    var STATUS = {
        UNFETCH: 0,
        FETCHING: 1,
        FETCHED: 2,
        LOADING: 3,
        LOADED: 4,
        EXECUTED: 5,
    }

    function getId() {
        return '.dummy.' + id_seed++;
    }

    function each(source, iterator) {
        for (var i = 0, len = source.length; i < len; i++) {
            if (iterator(source[i], i) === false) {
                break;
            }
        }
    }

    function isType(obj, type) {
        return toString.call(obj) === '[object ' + type + ']';
    }

    function getModule(id) {
        return mods[id] || (mods[id] = new Module(id))
    }

    function Module(id) {
        var mod = this
        mod.id = id
        mod.uri = id
        mod.deps = [] 
        mod.factory = blank
        mod.callback = blank
        mod.listeners = []
        mod.exports = {}
        mod.status = STATUS.UNFETCH

        // load all dependent modules recursively but their factory not executed
        mod.load = function() {
            console.log('to load mod: ', mod.id)
            if (mod.status == STATUS.FETCHING) return
            if (mod.status == STATUS.UNFETCH) {
                return mod.fetch()
            }
            mod.remain = mod.deps.length
            function callback() {
                mod.remain--
                if (mod.remain === 0) {
                    mod.onload()
                }
            }
            each(mod.deps, function (dep) {
                console.log('load dep:', dep)
                var m = getModule(dep)     
                if (m.status >= STATUS.LOADED || m.status == STATUS.LOADING) {
                    mod.remain--
                    return
                }
                m.listeners.push(callback)
                if (m.status < STATUS.LOADING) {
                    m.load()
                }
            })
            if (mod.remain == 0) {
                mod.onload()
            }
        }

        // execute this and its deps
        mod.exec = function() {
            var mod = this
            console.log('execute module:', mod.id)
            if (mod.status >= STATUS.EXECUTED) { return mod.exports }
            var args = mod.getDepsExport()
            console.log('apply module factory:', mod.id)
            var ret = mod.factory.apply(null, args)
            mod.exports = ret 
            mod.status = STATUS.EXECUTED
            return mod.exports
        }
        
        mod.getDepsExport = function() {
            var mod = this
            var exports = []
            var deps = mod.deps
            var argsLen = mod.factory.length < deps.length ? mod.factory.length : deps.length
            for (var i = 0; i < argsLen; i++) {
                exports.push(mod.require(deps[i]))
            }
            return exports
        }

        mod.fetch = function() {
            var mod = this
            console.log('to fetch mod:', mod.id)
            mod.status = STATUS.FETCHING

            function onloadListener() {
                var readyState = script.readyState;
                if (typeof readyState === 'undefined' || /^(loaded|complete)$/.test(readyState)) {
                    mod.status = STATUS.FETCHED
                    console.log('mod fetched:', mod.id)
                    mod.load()
                }
            }

            var uri = mod.uri
            var script = document.createElement('script')

            if (script.readyState) {
                script.onreadystatechange = onloadListener
            } else {
                script.onload = onloadListener;
            }

            script.src = uri + '.js';
            script.async = true;
            appendScript(script);
        }

        var headElement = document.getElementsByTagName('head')[0];
        var baseElement = document.getElementsByTagName('base')[0];

        if (baseElement) {
            headElement = baseElement.parentNode;
        }
        
        function appendScript(script) {
            baseElement
                ? headElement.insertBefore(script, baseElement)
                : headElement.appendChild(script);
        }

        mod.onload = function() {
            var mod = this
            mod.status = STATUS.LOADED
            console.log('mod loaded, callback:', mod.id)
            each(mod.listeners, function (listener) {
                listener()
            })
            mod.callback && mod.callback()
        }

        mod.require = function(dep) {
            var mod = getModule(dep)
            return mod.exec()
        }
    }

    function require(deps, callback) {
        var mod = new Module(getId())
        mod.deps = deps
        mod.factory = callback
        mod.callback = function () {
            mod.exec()
        }
        mod.status = STATUS.FETCHED
        mod.load()
    }

    function define(id, deps, factory) {
        var mod = getModule(id)
        mod.deps = deps
        mod.factory = factory
        mod.status = STATUS.FETCHED
    }

    global.require = require
    global.define = define

})(window, document)

