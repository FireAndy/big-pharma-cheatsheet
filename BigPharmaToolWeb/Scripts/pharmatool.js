(function () {

    var module = angular.module("big-pharma-tool", []);

    function applicationController(scope, dataService) {
        var families = {};

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

        function sum(array) {
            var val = 0,
                i;
            for (i = 0; i < array.length; i++) {
                val += array[i];
            }
            if (array.length === 0) {
                return null;
            }
            return val;
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
                        total: null,
                        dev: 0,
                        effects: effectsInFamily(effects, rootEffect.family)
                    };
                }),
                i;

            scope.effectFamilies = effectGroups;
            for (i = 0; i < effectGroups.length; i++) {
                families[effectGroups[i].name] = effectGroups[i];
            }
        }

        function levelAvg(level) {
            return avg($.map($.grep(scope.effectFamilies, function (f) { return f.effects[level] && f.effects[level].price; }), function (f) { return f.effects[level].price; }));
        }

        function familySum(familyName) {
            return sum($.map($.grep(families[familyName].effects, function(eff) { return eff.price; }), function(eff) { return eff.price; }));
        }

        function familyDev(familyName) {
            return sum($.map($.grep(families[familyName].effects, function (eff) { return eff.price; }), function (eff) { return diffFromAvg(eff); }));
        }

        function diffFromAvg(effect) {
            var diff;
            if (!effect.price) {
                return null;
            }
            diff = effect.price - scope.levels[effect.level].avg;
            return diff;
        }

        scope.sort = function (level) {
            scope.effectFamilies.sort(function (a, b) {
                if (a.effects[level] && b.effects[level] && a.effects[level].price && b.effects[level].price) {
                    return b.effects[level].price - a.effects[level].price;
                }
                if ((!a.effects[level] || !a.effects[level].price) && (!b.effects[level] || !b.effects[level].price)) {
                    return 0;
                }
                if (!b.effects[level] || !b.effects[level].price) {
                    return -1;
                }
                if (!a.effects[level] || !a.effects[level].price) {
                    return 1;
                }
                return 0;
            });
        }

        scope.sortByConc = function(level) {
            scope.effectFamilies.sort(function (a, b) {
                if (a.effects[level] && b.effects[level]) {
                    return avg([b.effects[level].boundary[0], b.effects[level].boundary[1]])
                            - avg([a.effects[level].boundary[0], a.effects[level].boundary[1]]);
                }
                if (!a.effects[level]  && !b.effects[level]) {
                    return 0;
                }
                if (!b.effects[level]) {
                    return -1;
                }
                if (!a.effects[level]) {
                    return 1;
                }
                return 0;
            });
        }

        scope.sortFamilies = function() {
            scope.effectFamilies.sort(function (a, b) {
                if (a.dev === b.dev) {
                    return 0;
                }
                if (b.dev == null) {
                    return -1;
                }
                if (a.dev == null) {
                    return 1;
                }
                return b.dev - a.dev;
            });
        }

        scope.boxClass = function(boundary, index) {
            var value = index + 1,
                isInBoundary;
            if (!boundary) {
                return "";
            }
            isInBoundary = boundary[0] <= value && boundary[1] >= value;
            return isInBoundary ? "ib" : "oob";
        }

        scope.dev = function(effect) {
            return diffFromAvg(effect);
        }

        scope.$on("effect.price.updated", function(evt, effect) {
            scope.levels[effect.level].avg = levelAvg(effect.level);
            families[effect.family].total = familySum(effect.family);
            $.each(scope.effectFamilies, function(i, fam) {
                fam.dev = familyDev(fam.name);
            });
        });

        scope.boxes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        scope.levels = [{}, {}, {}, {}, {}];
        scope.effectFamilies = [];
        dataService
            .getEffects()
            .then(groupEffects)
            .then(function() {
                scope.sortByConc(2);
                scope.sortByConc(3);
                scope.sortByConc(4);
            });
    }

    module.controller("app-controller", ["$scope", "data-service", applicationController]);

    function effectController(scope) {
        scope.$watch("effect.price", function() {
            scope.$emit("effect.price.updated", scope.effect);
        });
    }

    module.controller("effect-controller", ["$scope", effectController]);

    function signedFilter() {
        return function(value) {
            if (value < 0) {
                return "" + value;
            } else if (value > 0) {
                return "+" + value;
            } else {
                return "-";
            }
        }
    }

    module.filter("signed", signedFilter);

    function dataServiceImpl(http, q) {

        this.getEffects = function () {
            var def = q.defer();
            http.get("/data/effects.json")
                .then(function (response) {
                    def.resolve(response.data);
                    return;
                });
            return def.promise;
        }
    }

    module.service("data-service", ["$http", "$q", dataServiceImpl]);

    function scrollableDirective() {
        var all = [],
            totalWidth = 1620;

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
                        newX;
                    if (moving) {
                        relX = evt.pageX - elementStartX;
                        deltaX = startX - relX;
                        newX = Math.max(Math.min(elementStartX - deltaX, initialX), initialX + element.parent().width() - totalWidth);
                        $(all).offset({ left: newX });
                        if (newX == initialX) {
                            startX = evt.pageX - initialX;
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