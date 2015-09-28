(function() {

    var module = angular.module("big-pharma-tool", []);

    function applicationController(scope, dataService) {
        scope.data = {};

        dataService.getEffects().then(function(data) { scope.data = data; });
    }

    module.controller("app-controller", ["$scope", "data-service", applicationController]);

    function dataServiceImpl(http, q) {
        
        this.getEffects = function() {
            var def = q.defer();
            http.get("/data/effects.json")
                .then(function(response) {
                    def.resolve(response);
                });
            return def.promise;
        }
    }

    module.service("data-service", ["$http", "$q", dataServiceImpl]);


}());