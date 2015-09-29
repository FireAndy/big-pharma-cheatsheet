(function () {

    var module = angular.module("big-pharma-tool", []);

    function applicationController(scope, dataService) {
        function avg(array) {
            var sum = 0,
                i;
            for (i = 0; i < array.length; i++) {
                sum += array[i];
            }
            if (array.length === 0) {
                return null;
            }
            return Math.round(sum / array.length);
        }

        function effectsInFamily(effects, family) {
            return $.grep(
                    effects,
                    function(effect) {
                        return effect.family === family;
                    }
                )
                .sort(function(a, b) {
                    return a.level - b.level;
                });
        }

        function groupEffects(effects) {
            var rootEffects = $.grep(effects, function (effect) { return effect.level === 0; }),
                effectGroups = $.map(rootEffects, function (rootEffect) {
                    return {
                        name: rootEffect.family,
                        effects: effectsInFamily(effects, rootEffect.family)
                    };
                });

            scope.effectFamilies = effectGroups;
        }

        scope.sort = function(level) {
            scope.effectFamilies.sort(function (a, b) {
                if (!b.effects[level].price) {
                    return -1;
                } else if (!a.effects[level].price) {
                    return 1;
                }
                return b.effects[level].price - a.effects[level].price;
            });
        }

        scope.boxClass = function(effect, index) {
            var value = index + 1,
                isInBoundary = effect.boundary[0] <= value && effect.boundary[1] >= value;
            return isInBoundary ? "ib" : "oob";
        }

        scope.avg = function(level) {
            return avg($.map($.grep(scope.effectFamilies, function (f) { return f.effects[level] && f.effects[level].price; }), function (f) { return f.effects[level].price; }));
        }

        scope.dev = function(effect) {
            var diff;
            if (!effect.price) {
                return null;
            }
            diff = effect.price - scope.avg(effect.level);
            if (diff < 0) {
                return "" + diff;
            } else if (diff > 0) {
                return "+" + diff;
            } else {
                return "-";
            }
        }

        scope.boxes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        scope.levels = [0, 1, 2, 3, 4];
        scope.effectFamilies = [];
        dataService
            .getEffects()
            .then(groupEffects);
    }

    module.controller("app-controller", ["$scope", "data-service", applicationController]);

    function dataServiceImpl(http, q) {

        this.getEffects = function () {
            var def = q.defer();
            http.get("/data/effects.json")
                .then(function (response) {

                    def.resolve(response.data);
                    return;

                    var effects = {},
                        effect,
                        i;
                    for (i = 0; i < response.data.length; i++) {
                        effect = response.data[i];
                        effects[effect.id] = effect;
                    }

                    def.resolve(effects);
                });
            return def.promise;
        }
    }

    module.service("data-service", ["$http", "$q", dataServiceImpl]);

    function scrollableDirective() {
        var all = [],
            totalWidth = 1500;

        return {
            restrict: "A",
            link: function (scope, element, attr) {
                var initialX = element.offset().left,
                    elementStartX,
                    startX,
                    moving = false;

                all.push(element.get(0));

                element.on("mousedown touchstart pointerdown", function(evt) {
                    var offset = element.offset();
                    elementStartX = offset.left;
                    startX = evt.pageX - elementStartX;
                    moving = true;
                });

                element.on("mousemove touchmove pointermove", function (evt) {
                    var relX,
                        deltaX,
                        newX,
                        offsetX;
                    if (moving) {
                        relX = evt.pageX - elementStartX;
                        deltaX = startX - relX;
                        newX = elementStartX - deltaX;
                        offsetX = newX - initialX;
                        console.log("initial " + initialX + " newX " + newX + " offset by " + offsetX + " so " + (offsetX + totalWidth) + " > parent " + element.parent().width() + " || " + (element.parent().width() > totalWidth));
                        if (offsetX < 0 && (offsetX + totalWidth >= element.parent().width())) {
                            $(all).offset({ left: newX });
                        }
                    }
                });

                $(document).on("mouseup touchend pointerup", function(evt) {
                    moving = false;
                });

                $(window).resize(function () {
                    initialX = element.parent().offset().left;
                    if (element.parent().width() >= totalWidth) {
                        $(all).offset({ left: initialX });
                    } else if (element.offset().left - initialX + totalWidth < element.parent().width()) {
                        $(all).offset({ left: initialX + element.parent().width() - totalWidth });
                    }
                });
            }
        }
    }

    module.directive("bpDraggable", [scrollableDirective]);

}());