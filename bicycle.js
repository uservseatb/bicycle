;
var bicycle = (function () {

    var EventBus = function () {
        var $bus = $({});
        this.subscribe = function (eventHandler) {
            $bus.bind(eventHandler.name, eventHandler.handler);
        };

        this.unsubscribe = function (eventHandler) {
            $bus.unbind(eventHandler.name);
        };

        this.throwEvent = function (event) {
            setTimeout(function () {
                $bus.trigger(event.name, [event.args]);
            }, 0);
        };
    };

    var Event = function (name, args) {
        this.name = name;
        this.args = args;
    };

    var EventHandler = function (name, handler) {
        this.name = name;
        this.handler = handler;
    };

    document.eventBus = new EventBus();
    var EVENT_BUS = document.eventBus;
    var Events = {};

    $.extend(Events, {
        _APP: {
            _START: '21c90023-52bd-4179-b07c-cf99fc90eda7',
            _Loaded: 'ac7d1eb9-dede-4203-93e5-b0a868a3d193'
        },
        _VIEW: {
            _ATTACH: '.view.attach.event',
            _ATTACHED: '.view.attached.event',
            _DETACH: '.view.detach.event',
            _BEFORE_DETACHED: '.view.before.detached.event',
            _DETACHED: '.view.detached.event',
            _SET_HANDLERS: '.view.set.handlers.event'
        }
    });

    var _show_debug_info = false;

    var EventMonitor = function () {
        var subscribedEvents = {};

        this.put = function (eventName) {
            if (!subscribedEvents[eventName]) {
                subscribedEvents[eventName] = 1;
            } else {
                subscribedEvents[eventName] += 1;
            }
        };

        this.drop = function (eventName) {
            if (subscribedEvents[eventName]) {
                subscribedEvents[eventName] = undefined;
                delete subscribedEvents[eventName];
            }
        };

        this.check = function (eventName, args) {
            if (!subscribedEvents[eventName] && _show_debug_info) {
                console.warn("there is no subscribers for event [" + eventName + "] in global event bus, please add subscribers to take some effect");
                console.warn("passed args:");
                console.warn(args);
                console.warn("---------------------------------------------------------------------------------------------------------------------------------------")
            }
        };
    };

    var monitor = new EventMonitor();

    var MVStarHelper = function () {
        var self = this;

        this.on = function (eventName, handler) {
            var eventHandler = new EventHandler(eventName, handler);
            subscribe(eventHandler);
            monitor.put(eventName);
        };

        this.once = function (eventName, handler) {
            var proxyHandler = function (event, args) {
                self.off(eventName);
                handler(event, args);
            };
            self.on(eventName, proxyHandler);
        };

        this.many = function (eventNames, handler) {
            $.each(eventNames, function () {
                self.on("" + this, handler);
            });
        };

        this.off = function (eventName) {
            EVENT_BUS.unsubscribe(new EventHandler(eventName));
            monitor.drop(eventName);
        };

        var ViewRequest = function (_viewName) {
            var viewName = _viewName;
            var viewModel;
            this.model = function (_viewModel) {
                viewModel = _viewModel;
                return this;
            };
            this.attach = function () {
                bc.trigger(viewName + Events._VIEW._ATTACH, {model: viewModel});
            };
            this.attachToContainer = function (container) {
                bc.trigger(viewName + Events._VIEW._ATTACH, {model: viewModel, container: container});
            };
            this.detach = function () {
                bc.trigger(viewName + Events._VIEW._DETACH);
            };
            this.setHandlers = function (eventHandlers) {
                bc.trigger(viewName + Events._VIEW._SET_HANDLERS, {eventHandlers: eventHandlers});
            };
        };

        this.view = function (viewName) {
            return new ViewRequest(viewName);
        };

        // views
        this.renderView = function (_$containerSelector, templateUrl, model, _eventBinder, viewScope) {

            var eventBinder = _eventBinder || function () {
                };

            if ($(_$containerSelector) && $(_$containerSelector).length > 0) {

                var templateProcessorResult = TP.processTemplate(templateUrl, model);

                // append rendered view content to specified view contatiner
                $(_$containerSelector).append(templateProcessorResult.template);

                // ensure view scope
                viewScope = viewScope || {};

                var postBindings = extendViewScope(
                    viewScope,
                    templateProcessorResult.viewElementSelectors,
                    templateProcessorResult.viewElementFunctions,
                    templateProcessorResult.viewElementOnFunctions
                );

                if (_show_debug_info) {
                    console.log("EVENT BINDER`s call: ---------------------------------------");
                    console.log(templateUrl);
                    console.log(viewScope);
                    console.log(model);
                    console.log("------------------------------------------------------------");
                }
                eventBinder(viewScope, model);
                if (postBindings.size > 0) {
                    extendViewScope(viewScope, undefined, postBindings.postBinding);
                }
            } else {
                console.error("container: '" + _$containerSelector + "' is not exist");
            }
        };


        var extendViewScope = function (viewScope, viewElementSelectors, viewElementFunctions, viewElementOnFunctions) {
            var postBindingFuncs = {};
            var count = 0;

            var elementKey;
            for (elementKey in viewElementSelectors) {
                if (!viewElementSelectors.hasOwnProperty(elementKey))continue;
                var element = $(viewElementSelectors[elementKey]);
                if (element) {
                    viewScope[elementKey] = $(viewElementSelectors[elementKey]);
                }
            }
            for (elementKey in viewElementFunctions) {
                if (!viewElementFunctions.hasOwnProperty(elementKey))continue;
                var scopeHandler = viewScope[elementKey];
                if (scopeHandler) {
                    $.each(viewElementFunctions[elementKey], function (index) {
                        var element = $(viewElementFunctions[elementKey][index]);
                        if (element.length > 0) {
                            element.on('click', viewScope[elementKey]);
                        }
                    });
                } else {
                    count++;
                    postBindingFuncs[elementKey] = viewElementFunctions[elementKey];
                }
            }

            for (elementKey in viewElementOnFunctions) {
                if (!viewElementOnFunctions.hasOwnProperty(elementKey))continue;

                var events = viewElementOnFunctions[elementKey];

                var func = bc.fetchFunction(elementKey);

                $.each(events, function (index) {
                    var event = events[index];
                    if (event["ONRENDER"] !== undefined) {
                        func($(event["ONRENDER"]));
                    }
                });
            }

            return {
                postBinding: postBindingFuncs,
                size: count
            }
        };

        this.detachView = function (_$containerSelector, viewSelector) {
            var $el = $(_$containerSelector);
            if ($el && $el.length > 0) {
                var view = $el.find(viewSelector);
                if (view.length > 0) {
                    view.off();
                    view.remove();
                }
            }
        };

        var subscribe = function (handler) {
            EVENT_BUS.subscribe(handler);
        };

        return this;
    };

    // Stateful. It`s creating on start of application.
    // Stores templates
    var TemplateProcessor = function (_appStartEventName) {

        var self = this;
        var templateUrls;
        var templates = {};
        var functions = {};

        var init = function () {
            self.on(_appStartEventName, handleAppStart);
        };

        var handleAppStart = function (event, args) {
            templateUrls = args.templateUrls;
            functions = args.functions;
            var countLoaded = 0;
            var countFact = 0;
            $.each(templateUrls, function (key) {
                countFact++;
                var url = templateUrls[key];
                $.ajax({
                    url: url,
                    success: function (viewTemplateContent) {
                        templates[url] = doT.template(removeComments(viewTemplateContent));
                        countLoaded++;
                        if (countFact == countLoaded) {
                            bc.trigger(Events._APP._Loaded);
                        }
                    }
                });
            });
        };


        var removeComments = function (_html) {
            return _html.replace(/\<\!\-\-.*?\-\-\>/gi, "");
        };

        var preProcessBCAttributes = function (_data) {

            var bcJQContainer = _data.match(/bc\-jq\-container\=\".*?\"/gi);
            var bcQJElements = _data.match(/bc\-jq-el=\".*?\"/gi);
            var bcQJFunc = _data.match(/bc\-jq\-click=\".*?\"/gi);
            var bcOnFunc = _data.match(/bc\-on.*?=\".*?\"/gi);

            var viewElementSelectors = {};
            var viewElementFunctions = {};
            var viewElementOnFunctions = {};

            if (bcJQContainer != null && bcJQContainer.length > 0) {
                var containerSelector = bcJQContainer[0]
                        .substr(0, bcJQContainer[0].length - 1)
                        .replace(/bc\-jq\-container\=\"/, "") + " ";

                if (bcQJElements != null) {
                    $.each(bcQJElements, function (index) {
                        var current = bcQJElements[index]
                            .substr(0, bcQJElements[index].length - 1)
                            .replace(/bc\-jq-el=\"/, "")
                            .split(" ");
                        if (!viewElementSelectors[current[1]]) {
                            viewElementSelectors[current[1]] = containerSelector + current[0];
                        } else {
                            console.error("you cant define equal element ids [" + current[1] + "]");
                        }
                    });
                }

                if (bcQJFunc != null) {
                    $.each(bcQJFunc, function (index) {
                        var current = bcQJFunc[index]
                            .substr(0, bcQJFunc[index].length - 1)
                            .replace(/bc\-jq-click=\"/, "")
                            .replace(/\(\)/, "")
                            .split(" ");
                        if (!viewElementFunctions[current[1]]) {
                            viewElementFunctions[current[1]] = [containerSelector + current[0]];
                        } else {
                            viewElementFunctions[current[1]].push(containerSelector + current[0]);
                        }
                    });
                }

                if (bcOnFunc != null) {
                    $.each(bcOnFunc, function (index) {

                        var current = bcOnFunc[index];
                        var extractResult = extractOnMethod(current)

                        var onMethod = extractResult.onMethod.replace(/[-,_]/gi, "").toUpperCase();

                        var element = {};

                        element[onMethod] = containerSelector + extractResult.selector;

                        if (!viewElementOnFunctions[extractResult.functionName]) {
                            viewElementOnFunctions[extractResult.functionName] = [element];
                        } else {
                            viewElementOnFunctions[extractResult.functionName].push(element);
                        }
                    });
                }

                function extractOnMethod(currentBcDeclaration) {
                    var result = currentBcDeclaration.substr("bc-".length);
                    var onMethodNameLength = result.indexOf('="');

                    var elements = result
                        .substr(onMethodNameLength + 2, result.length - onMethodNameLength - 3)
                        .split(" ");

                    return {
                        "onMethod": result.substr(0, onMethodNameLength),
                        "selector": elements[0],
                        "functionName": elements[1]
                    };
                }
            }

            var template = _data
                .replace(/bc\-jq\-container\=\".*?\"/gi, "")
                .replace(/bc\-jq-el=\".*?\"/gi, "")
                .replace(/bc\-jq\-click=\".*?\"/gi, "")
                .replace(/bc\-on.*?=\".*?\"/gi, "");

            return {
                viewElementSelectors: viewElementSelectors,
                viewElementFunctions: viewElementFunctions,
                viewElementOnFunctions: viewElementOnFunctions,
                template: template
            };
        };


        var postProcess = function (html, viewModel) {

            var postProcessFor = function (html, tag) {

                function replacementFor(tag) {
                    function isBcTag() {
                        return tag.indexOf("<bc ") == 0;
                    }

                    function parseTagValue() {
                        return /\>(.*?)\</gi.exec(tag)[1];
                    }

                    function tagOperation() {
                        var op = /bc[\s,\-](\w*)=\"([\w,\-]{1,})\"/gi.exec(tag)
                        return {
                            name: op[1],
                            value: op[2]
                        }
                    }

                    var operation = tagOperation();
                    var tagValue = parseTagValue();

                    if (operation && operation.name === 'apply' && functions[operation.value]) {
                        var newValue = functions[operation.value](tagValue);

                        if (isBcTag()) {
                            return newValue;
                        } else {
                            return tag;
                        }
                    } else {
                        return tag;
                    }
                }

                return html.replace(tag, replacementFor(tag));
            };

            var searchPostTags = function (html) {
                return html.match(/(\<bc\s.*?\<\/bc\>)/gi) || [];
            };

            var searchPostAttrs = function (html) {
                return html.match(/(\<\w{1,30}\sbc\-.*?\<\/\w{1,30}\>)/gi) || [];
            };

            var i;

            var postStatements = [];
            postStatements = postStatements.concat(searchPostTags(html));
            postStatements = postStatements.concat(searchPostAttrs(html));

            for (i = 0; i < postStatements.length; i++) {
                var current = postStatements[i];
                html = postProcessFor(html, current);
            }

            return html;
        };


        this.processTemplate = function (templateKey, viewModel) {
            var result = templates[templateKey];

            var htmlToBeRendered = result(viewModel);

            var preprocessed = preProcessBCAttributes(htmlToBeRendered);
            preprocessed.template = postProcess(preprocessed.template, viewModel);

            return preprocessed;
        };


        init();
        return this;
    };

    TemplateProcessor.prototype = new MVStarHelper();
    TemplateProcessor.prototype.constructor = TemplateProcessor;

    document.templateProcessor = new TemplateProcessor(Events._APP._START);
    var TP = document.templateProcessor;


    /**
     * This is interface of this library
     *
     * @constructor
     */
    var Bicycle = function () {
        var components = [];
        var functions = {};
        var apiURL = '';

        this.setWindowLocationHref = function (url) {
            window.location.href = apiURL + url;
        };

        this.sendAjax = function (data) {
            data.url = apiURL + data.url;
            $.ajax(data);
        };

        this.setApiUrl = function (_apiURL) {
            apiURL = _apiURL;
        };

        this.run = function (app) {
            $.each(components, function () {
                createComponent(this);
            });
            if (app.templateUrls) {
                EVENT_BUS.throwEvent(new Event(Events._APP._START, {
                    templateUrls: app.templateUrls,
                    functions: functions
                }));
            } else {
                console.info("template urls is not defined");
                EVENT_BUS.throwEvent(new Event(Events._APP._Loaded, {}));
            }
        };

        this.createFunction = function (name, func) {
            if (!(func instanceof Function)) {
                console.error("the function " + name + " is not a function");
                return;
            }
            if (name !== "") {
                functions[name] = func;
            } else {
                console.error("name of function can not be empty");
            }
        };

        this.fetchFunction = function (name) {
            var func;
            if (name === "") {
                console.error("name of function can not be empty");
            }
            func = functions[name.replace(/[\(,\)]/gi, "")];
            if (func == undefined) {
                console.error("function " + name + " is not found");
            }
            return func;
        };

        this.createComponent = function (name, component) {
            if (!name) {
                console.error("name of component is required");
            }
            if (!(component instanceof Function)) {
                console.error('component ' + name + ' is not a function. Please pass neme of the component before');
                return;
            }
            component.prototype = new MVStarHelper();
            component.prototype.constructor = component;
            setComponentName(component, name);
            components.push(component);
        };

        this.showDebug = function (show) {
            _show_debug_info = show;
        };

        var View = function (_viewName) {

            var self = this;
            var _viewElementId;
            var _template;
            var _eventBinder;
            var _eventHandlers;
            var _container;

            var init = function () {
                self.on(_viewName + Events._VIEW._ATTACH, function (event, args) {
                    if (args.container) {
                        self.attachToContainer(args.container, args.model);
                    } else {
                        self.attach(args.model);
                    }
                    bc.trigger(_viewName + Events._VIEW._ATTACHED, {
                        model: args.model,
                        viewScope: _eventHandlers
                    }, false);
                });
                self.on(_viewName + Events._VIEW._DETACH, function () {
                    bc.trigger(_viewName + Events._VIEW._BEFORE_DETACHED, {}, false);
                    self.detach();
                    bc.trigger(_viewName + Events._VIEW._DETACHED, {}, false);
                });
                self.on(_viewName + Events._VIEW._SET_HANDLERS, function (event, args) {
                    _eventHandlers = args.eventHandlers;
                });
            };

            this.attach = function (model) {
                self.detachView(_container, "#" + _viewElementId);
                self.renderView(_container, _template, model, _eventBinder, _eventHandlers);
            };

            this.attachToContainer = function (container, model) {
                if (!container) {
                    container = "body";
                    console.info("container is not defined, the view will attach to document body!");
                }
                self.detachView(container, " #" + _viewElementId);
                self.renderView(container, _template, model, _eventBinder, _eventHandlers);
            };

            this.detach = function () {
                self.detachView(_container, "#" + _viewElementId);
            };

            this.viewElementId = function (viewElementId) {
                _viewElementId = viewElementId;
                return this;
            };
            this.template = function (template) {
                _template = template;
                return this;
            };
            this.initView = function (eventBinder) {
                _eventBinder = eventBinder;
                return this;
            };
            this.eventHandlers = function (eventHandlers) {
                _eventHandlers = eventHandlers;
                return this;
            };
            this.container = function (container) {
                _container = container;
                return this;
            };

            init();
            return this;
        };

        View.prototype = new MVStarHelper();
        View.prototype.constructor = View;

        this.createView = function (viewName) {
            if (!viewName) {
                console.error("view name should be defined");
            }
            return new View(viewName);
        };

        this.clone = function (object) {
            if (!object) return null;
            return JSON.parse(JSON.stringify(object));
        };

        this.trigger = function (eventName, args, monitoringRequired) {
            args = args || {};
            EVENT_BUS.throwEvent(new Event(eventName, args));
            if (monitoringRequired == undefined || monitoringRequired == true) {
                monitor.check(eventName, args);
            }
        };

        var setComponentName = function (component, name) {
            component.prototype.getName = function () {
                return name;
            };
        };

        var createComponent = function (component) {
            var comp = new component();
            if (comp.init) {
                comp.init(comp);
            } else {
                console.error("method init is not defined in " + comp.getName());
            }
        }
    };

    Bicycle.prototype.Events = Events;

    return new Bicycle();
})();