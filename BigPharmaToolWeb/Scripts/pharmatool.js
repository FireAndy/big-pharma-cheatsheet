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
            def.resolve(effectsData);
            return def.promise;

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


    var effectsData = [
        {
            "id": "painkiller",
            "family": "pain",
            "level": 0,
            "baseValue": 95,
            "sensitivity": 2250,
            "helpRate": 100,
            "boundary": [5, 12],
            "reaction": { "upgrade": { "machine": "evaporator", "product": "migraine", "conc": [7, 10] } }
        },
        {
            "id": "migraine",
            "family": "pain",
            "level": 1,
            "baseValue": 173,
            "sensitivity": 2100,
            "helpRate": 100,
            "contractionRate": { "cyclic": { "mag": 200, "offset": 15, "period": 365 } },
            "boundary": [5, 9],
            "reaction": { "upgrade": { "machine": "agglomerator", "combine": "catalyst1", "product": "antiseizure", "conc": [15, 18] } }
        },
        {
            "id": "antiseizure",
            "family": "pain",
            "level": 2,
            "baseValue": 463,
            "sensitivity": 1050,
            "helpRate": 100,
            "cureRate": 5,
            "boundary": [11, 15],
            "reaction": { "upgrade": { "machine": "uv_curer", "combine": "catalyst3", "product": "anesthetic", "conc": [0, 4] } }
        },
        {
            "id": "anesthetic",
            "family": "pain",
            "level": 3,
            "helpRate": 90,
            "baseValue": 979,
            "sensitivity": 675,
            "boundary": [14, 18]
        },
        {
            "id": "hypertension",
            "family": "blood",
            "level": 0,
            "baseValue": 97,
            "sensitivity": 1800,
            "boundary": [9, 13],
            "helpRate": 100,
            "cureRate": 10,
            "reaction": { "upgrade": { "machine": "ioniser", "product": "angina", "conc": [0, 6] } }
        },
        {
            "id": "angina",
            "family": "blood",
            "level": 1,
            "helpRate": 80,
            "cureRate": 10,
            "contractionRate": { "follow": "hypertension" },
            "baseValue": 253,
            "sensitivity": 1350,
            "boundary": [6, 12],
            "reaction": { "upgrade": { "machine": "autoclave", "product": "stroke", "conc": [9, 14] } }
        },
        {
            "id": "stroke",
            "family": "blood",
            "level": 2,
            "helpRate": 60,
            "cureRate": 10,
            "contractionRate": { "follow": "hypertension" },
            "baseValue": 487,
            "sensitivity": 675,
            "boundary": [10, 15],
            "reaction": { "upgrade": { "machine": "chromatograph", "product": "sicklecell", "conc": [14, 17] } }
        },
        {
            "id": "sicklecell",
            "family": "blood",
            "level": 3,
            "helpRate": 40,
            "cureRate": 5,
            "baseValue": 796,
            "sensitivity": 375,
            "boundary": [13, 17]
        },
        {
            "id": "antidepressants",
            "family": "psychological",
            "level": 0,
            "helpRate": 60,
            "cureRate": 5,
            "sensitivity": 1350,
            "baseValue": 100,
            "boundary": [15, 20],
            "reaction": { "upgrade": { "combine": "catalyst1", "machine": "dissolver", "product": "adhd", "conc": [7, 11] } }
        },
        {
            "id": "adhd",
            "family": "psychological",
            "level": 1,
            "sensitivity": 1050,
            "baseValue": 334,
            "boundary": [15, 20],
            "helpRate": 60,
            "cureRate": 5,
            "reaction": { "upgrade": { "combine": "catalyst2", "machine": "ioniser", "product": "bipoladisorder", "conc": [12, 14] } }
        },
        {
            "id": "bipoladisorder",
            "family": "psychological",
            "level": 2,
            "sensitivity": 675,
            "baseValue": 641,
            "boundary": [15, 20],
            "helpRate": 50,
            "cureRate": 5,
            "reaction": { "upgrade": { "combine": "catalyst3", "machine": "autoclave", "product": "schizophrenia", "conc": [13, 15] } }
        },
        {
            "id": "schizophrenia",
            "family": "psychological",
            "level": 3,
            "sensitivity": 450,
            "baseValue": 1023,
            "boundary": [16, 20],
            "helpRate": 40,
            "cureRate": 5,
            "reaction": { "upgrade": { "combine": "catalyst4", "machine": "uv_curer", "product": "alzheimers", "conc": [14, 16] } }
        },
        {
            "id": "alzheimers",
            "family": "psychological",
            "level": 4,
            "helpRate": 30,
            "cureRate": 5,
            "sensitivity": 900,
            "baseValue": 1488,
            "boundary": [17, 20]
        },
        {
            "id": "antihistamine",
            "family": "relaxants",
            "level": 0,
            "sensitivity": 2100,
            "baseValue": 95,
            "boundary": [2, 8],
            "helpRate": 80,
            "contractionRate": { "cyclic": { "mag": 500, "offset": 197, "period": 365 } },
            "reaction": { "upgrade": { "machine": "dissolver", "product": "insomnia", "conc": [4, 6] } }
        },
        {
            "id": "insomnia",
            "family": "relaxants",
            "level": 1,
            "sensitivity": 1500,
            "baseValue": 245,
            "boundary": [12, 17],
            "helpRate": 70,
            "cureRate": 10,
            "reaction": { "upgrade": { "combine": "catalyst2", "machine": "cooler", "product": "anxiety", "conc": [11, 14] } }
        },
        {
            "id": "anxiety",
            "family": "relaxants",
            "level": 2,
            "helpRate": 50,
            "cureRate": 8,
            "sensitivity": 825,
            "baseValue": 624,
            "boundary": [2, 6]
        },
        {
            "id": "cough",
            "family": "lungs",
            "level": 0,
            "sensitivity": 2100,
            "baseValue": 95,
            "boundary": [6, 13],
            "helpRate": 90,
            "contractionRate": { "cyclic": { "mag": 250, "offset": 15, "period": 365 } },
            "reaction": { "upgrade": { "machine": "agglomerator", "product": "asthma", "conc": [8, 11] } }
        },
        {
            "id": "asthma",
            "family": "lungs",
            "level": 1,
            "sensitivity": 1500,
            "baseValue": 225,
            "boundary": [4, 10],
            "helpRate": 80,
            "cureRate": 5,
            "reaction": { "upgrade": { "combine": "catalyst1", "machine": "dissolver", "product": "bronchitis", "conc": [17, 20] } }
        },
        {
            "id": "bronchitis",
            "family": "lungs",
            "level": 2,
            "sensitivity": 750,
            "baseValue": 455,
            "boundary": [6, 11],
            "helpRate": 80,
            "reaction": { "upgrade": { "machine": "cooler", "product": "tuberculosis", "conc": [9, 12] } }
        },
        {
            "id": "tuberculosis",
            "family": "lungs",
            "level": 3,
            "contractionRate": { "formula": [-2, 4.5, 0, 0, 0, 0, 0, -0.15] },
            "cureRate": 80,
            "sensitivity": 3000,
            "baseValue": 520,
            "boundary": [1, 6]
        },
        {
            "id": "rash",
            "family": "skin",
            "level": 0,
            "sensitivity": 1800,
            "baseValue": 97,
            "boundary": [8, 12],
            "helpRate": 75,
            "cureRate": 10,
            "contractionRate": { "cyclic": { "mag": 200, "offset": 197, "period": 365 } },
            "reaction": { "upgrade": { "combine": "catalyst1", "machine": "evaporator", "product": "acne", "conc": [10, 12] } }
        },
        {
            "id": "acne",
            "family": "skin",
            "level": 1,
            "sensitivity": 1500,
            "baseValue": 310,
            "boundary": [3, 8],
            "helpRate": 80,
            "cureRate": 20,
            "reaction": { "upgrade": { "machine": "sequencer", "product": "hairloss", "conc": [1, 5] } }
        },
        {
            "id": "hairloss",
            "family": "skin",
            "level": 2,
            "sensitivity": 900,
            "baseValue": 628,
            "boundary": [10, 19],
            "helpRate": 70,
            "cureRate": 20
        },
        {
            "id": "cold",
            "family": "viral",
            "level": 0,
            "sensitivity": 2250,
            "baseValue": 95,
            "boundary": [3, 10],
            "helpRate": 90,
            "contractionRate": { "cyclic": { "mag": 400, "offset": 15, "period": 365 } },
            "reaction": { "upgrade": { "machine": "agglomerator", "product": "antibiotics", "conc": [4, 8] } }
        },
        {
            "id": "antibiotics",
            "family": "viral",
            "level": 1,
            "sensitivity": 1200,
            "baseValue": 236,
            "boundary": [12, 18],
            "helpRate": 60,
            "reaction": { "upgrade": { "combine": "catalyst2", "machine": "cooler", "product": "antimalarial", "conc": [6, 11] } }
        },
        {
            "id": "antimalarial",
            "family": "viral",
            "level": 2,
            "sensitivity": 3000,
            "baseValue": 320,
            "boundary": [11, 16],
            "cureRate": 80,
            "contractionRate": { "formula": [-2, 4.5, 0, 0, 0, 0, 0, -0.15] },
            "reaction": { "upgrade": { "combine": "catalyst4", "machine": "chromatograph", "product": "aids", "conc": [8, 11] } }
        },
        {
            "id": "aids",
            "family": "viral",
            "level": 3,
            "sensitivity": 3000,
            "baseValue": 709,
            "boundary": [12, 18],
            "helpRate": 60,
            "contractionRate": { "follow": "hiv" },
            "reaction": { "upgrade": { "combine": "catalyst5", "machine": "hadron", "product": "hiv", "conc": [2, 3] } }
        },
        {
            "id": "hiv",
            "family": "viral",
            "level": 4,
            "cureRate": 50,
            "contractionRate": { "start": "aids" },
            "sensitivity": 3000,
            "baseValue": 1266,
            "boundary": [16, 20]
        },
        {
            "id": "acidreflux",
            "family": "digestion",
            "level": 0,
            "sensitivity": 1650,
            "baseValue": 94,
            "boundary": [15, 19],
            "helpRate": 70,
            "reaction": { "upgrade": { "machine": "evaporator", "product": "gastroenteritis", "conc": [16, 18] } }
        },
        {
            "id": "gastroenteritis",
            "family": "digestion",
            "level": 1,
            "sensitivity": 1350,
            "baseValue": 218,
            "boundary": [8, 12],
            "helpRate": 50,
            "reaction": { "upgrade": { "machine": "autoclave", "product": "appetite", "conc": [6, 8] } }
        },
        {
            "id": "appetite",
            "family": "digestion",
            "level": 2,
            "sensitivity": 600,
            "baseValue": 475,
            "boundary": [11, 15],
            "helpRate": 30,
            "reaction": { "upgrade": { "machine": "uv_curer", "product": "boweldisease", "conc": [8, 10] } }
        },
        {
            "id": "boweldisease",
            "family": "digestion",
            "level": 3,
            "sensitivity": 750,
            "baseValue": 800,
            "boundary": [14, 18],
            "cureRate": 10
        },
        {
            "id": "diabetes",
            "family": "bodyresponse",
            "level": 0,
            "sensitivity": 1200,
            "baseValue": 99,
            "boundary": [1, 5],
            "helpRate": 80,
            "cureRate": 1,
            "reaction": { "upgrade": { "machine": "ioniser", "product": "hyperthyroidism", "conc": [10, 12] } }
        },
        {
            "id": "hyperthyroidism",
            "family": "bodyresponse",
            "level": 1,
            "sensitivity": 900,
            "baseValue": 257,
            "boundary": [11, 15],
            "helpRate": 50,
            "cureRate": 5,
            "reaction": { "upgrade": { "combine": "catalyst3", "machine": "chromatograph", "product": "cancersymptoms", "conc": [1, 2] } }
        },
        {
            "id": "cancersymptoms",
            "family": "bodyresponse",
            "level": 2,
            "sensitivity": 600,
            "baseValue": 592,
            "boundary": [2, 7],
            "helpRate": 40,
            "contractionRate": { "follow": "cancervaccine" },
            "reaction": { "upgrade": { "combine": "catalyst4", "machine": "sequencer", "product": "multiplesclerosis", "conc": [19, 20] } }
        },
        {
            "id": "multiplesclerosis",
            "family": "bodyresponse",
            "level": 3,
            "sensitivity": 300,
            "baseValue": 998,
            "boundary": [12, 15],
            "helpRate": 30,
            "reaction": { "upgrade": { "combine": "catalyst5", "machine": "hadron", "product": "cancervaccine", "conc": [5, 6] } }
        },
        {
            "id": "cancervaccine",
            "family": "bodyresponse",
            "level": 4,
            "sensitivity": 2500,
            "baseValue": 1474,
            "boundary": [16, 20],
            "cureRate": 40,
            "contractionRate": { "start": "cancersymptoms" }
        },
        {
            "id": "gout",
            "family": "liver",
            "level": 0,
            "sensitivity": 1350,
            "baseValue": 97,
            "boundary": [5, 9],
            "helpRate": 80,
            "reaction": { "upgrade": { "combine": "catalyst1", "machine": "dissolver", "product": "liverdisease", "conc": [6, 8] } }
        },
        {
            "id": "liverdisease",
            "family": "liver",
            "level": 1,
            "sensitivity": 900,
            "baseValue": 372,
            "boundary": [16, 19],
            "cureRate": 30,
            "contractionRate": { "formula": [0.8] }
        },
        {
            "id": "warts",
            "family": "sex",
            "level": 0,
            "sensitivity": 1800,
            "baseValue": 92,
            "boundary": [11, 16],
            "helpRate": 75,
            "reaction": { "upgrade": { "machine": "ioniser", "product": "femalecontraceptive", "conc": [13, 15] } }
        },
        {
            "id": "femalecontraceptive",
            "family": "sex",
            "level": 1,
            "sensitivity": 2250,
            "baseValue": 225,
            "boundary": [1, 6],
            "helpRate": 100,
            "contractionRate": { "followdown": "malecontraceptive" },
            "reaction": { "upgrade": { "combine": "catalyst2", "machine": "agglomerator", "product": "erectiledysfunction", "conc": [17, 19] } }
        },
        {
            "id": "erectiledysfunction",
            "family": "sex",
            "level": 2,
            "sensitivity": 750,
            "baseValue": 596,
            "boundary": [9, 13],
            "helpRate": 60,
            "cureRate": 5,
            "reaction": { "upgrade": { "machine": "uv_curer", "product": "malecontraceptive", "conc": [7, 9] } }
        },
        {
            "id": "malecontraceptive",
            "family": "sex",
            "contractionRate": { "start": "femalecontraceptive" },
            "level": 3,
            "sensitivity": 1050,
            "baseValue": 1021,
            "boundary": [15, 17],
            "cureRate": 50
        },
        {
            "id": "narrowedpupils",
            "level": -1,
            "boundary": [1, 8]
        },
        {
            "id": "sleepiness",
            "level": -1,
            "boundary": [1, 13],
            "reaction": { "remove": { "machine": "ioniser", "conc": [14, 19] } }

        },
        {
            "id": "drymouth",
            "level": -1,
            "boundary": [2, 10]
        },
        {
            "id": "constipation",
            "level": -1,
            "boundary": [3, 11],
            "reaction": { "remove": { "machine": "evaporator", "conc": [13, 17] } }
        },
        {
            "id": "headaches",
            "level": -1,
            "boundary": [4, 12]
        },
        {
            "id": "pinsandneedles",
            "level": -1,
            "boundary": [3, 14],
            "reaction": { "remove": { "machine": "dissolver", "conc": [3, 4] } }
        },
        {
            "id": "nausea",
            "level": -1,
            "boundary": [6, 14]
        },
        {
            "id": "fatigue",
            "level": -1,
            "boundary": [5, 16],
            "reaction": { "remove": { "machine": "agglomerator", "conc": [0, 5] } }
        },
        {
            "id": "highbloodpressure",
            "level": -1,
            "boundary": [8, 16]
        },
        {
            "id": "inflamesskin",
            "level": -1,
            "boundary": [10, 18]
        },
        {
            "id": "nightmares",
            "level": -1,
            "boundary": [12, 20]
        },
        {
            "id": "dizziness",
            "level": -2,
            "catalyst": "catalyst1",
            "boundary": [1, 9],
            "reaction": { "remove": { "machine": "ioniser", "conc": [13, 17] } }
        },
        {
            "id": "fainting",
            "catalyst": "catalyst1",
            "level": -2,
            "boundary": [2, 12],
            "reaction": { "remove": { "machine": "ioniser", "conc": [12, 14] } }
        },
        {
            "id": "blursvision",
            "catalyst": "catalyst1",
            "level": -2,
            "boundary": [3, 11],
            "reaction": { "remove": { "machine": "agglomerator", "conc": [0, 3] } }
        },
        {
            "id": "encouragesanxiety",
            "catalyst": "catalyst1",
            "level": -2,
            "boundary": [5, 17],
            "reaction": { "remove": { "machine": "agglomerator", "conc": [1, 5] } }
        },
        {
            "id": "urinaryretention",
            "catalyst": "catalyst2",
            "level": -3,
            "boundary": [12, 20],
            "reaction": { "remove": { "machine": "cooler", "conc": [5, 9] } }
        },
        {
            "id": "vomiting",
            "catalyst": "catalyst2",
            "level": -3,
            "boundary": [1, 12],
            "reaction": { "remove": { "machine": "autoclave", "conc": [13, 18] } }
        },
        {
            "id": "breathingdifficulties",
            "catalyst": "catalyst2",
            "level": -3,
            "boundary": [6, 15],
            "reaction": { "remove": { "machine": "agglomerator", "conc": [17, 20] } }
        },
        {
            "id": "analleakage",
            "catalyst": "catalyst3",
            "level": -4,
            "boundary": [1, 7],
            "reaction": { "remove": { "machine": "autoclave", "conc": [10, 14] } }
        },
        {
            "id": "hallucinations",
            "catalyst": "catalyst3",
            "level": -4,
            "boundary": [4, 11],
            "reaction": { "remove": { "machine": "uv_curer", "conc": [1, 20] } }
        },
        {
            "id": "fits",
            "catalyst": "catalyst3",
            "level": -4,
            "occurenceFactor": 7,
            "boundary": [10, 17],
            "reaction": { "remove": { "machine": "cooler", "conc": [5, 9] } }
        },
        {
            "id": "blackouts",
            "catalyst": "catalyst4",
            "level": -5,
            "boundary": [6, 14],
            "reaction": { "remove": { "machine": "uv_curer", "conc": [1, 5] } }
        },
        {
            "id": "memoryloss",
            "catalyst": "catalyst4",
            "level": -5,
            "boundary": [12, 20],
            "reaction": { "remove": { "machine": "chromatograph", "conc": [7, 11] } }
        },
        {
            "id": "carcinogenic",
            "catalyst": "catalyst4",
            "level": -5,
            "boundary": [2, 8],
            "reaction": { "remove": { "machine": "cooler", "conc": [13, 15] } }
        },
        {
            "id": "paralysis",
            "catalyst": "catalyst5",
            "level": -6,
            "boundary": [5, 15],
            "reaction": { "remove": { "machine": "sequencer", "conc": [7, 11] } }
        }
    ];

}());