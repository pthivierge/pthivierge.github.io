// Code goes here
(function() {

  var app = angular.module("githubStats", ["ngTable", "ui.bootstrap"]);


  function AppCtrl($scope, $http, $filter, NgTableParams) {

    var API = "https://api.github.com/";
    var REPOS = "users/pthivierge"; // for an org: "orgs/github";


    function onOrgComplete(response) {

      $scope.org = response.data;

      $http.get($scope.org.repos_url)
        .then(onReposComplete, onError)
    }

    function onReposComplete(response) {
      
      $scope.repos = $scope.repos.concat(response.data);

      // githup API returns a link in the header to continue 
      // querying data if there is more data:
      var link_header = response.headers("Link");
      console.debug(link_header);
      if (link_header !== null) {
        var links = parse_link_header(link_header);
        if ("next" in links) {
          $http.get(links["next"])
            .then(onReposComplete, onError);
        }


      }
      
      getCommitsStats($scope.repos);
      getPullRequestCount($scope.repos)
      
      computeStatistics();
      configureDataTable();

    }
    
    
    // calculates the number of commits since last year
    function getCommitsStats(repos)
    {
      
      for (var i=0; i<repos.length;i++)
      {
        var url=API + "repos/" + REPOS + "/" + repos[i].name + "/stats/commit_activity";
        
           $http.get(url,{ cache: true}).success((function(i)
           { 
               return function(data) 
              { 
                
              
               var commit_data=data;
       
               var total_commits=0;
               for(var j=0;j<commit_data.length;j++)
               {
                  total_commits+=commit_data[j].total;
               }
               
               $scope.repos[i].total_commits=total_commits;
              
              }
           }(i)));
     
      }
    }
    
    function getPullRequestCount(repos)
    {
      //https://api.github.com/search/issues?q=+type:pr+repo:osisoft/qi-docs
      
      for (var i=0; i<repos.length;i++)
      {
        var url=API + "search/issues?q=+type:pr+repo:" + REPOS + "/" + repos[i].name;
        
           $http.get(url,{ cache: true}).success((function(i)
           { 
               return function(data) 
              { 
              
               var pr_data=data;
               var total_pr=pr_data.total_count;
   
               $scope.repos[i].total_pullRequests=total_pr;
              
              }
           }(i)));
     
      }
    }


    // https://gist.github.com/niallo/3109252
    // JBKahn
    function parse_link_header(header) {
      if (header.length === 0) {
        throw new Error("input must not be of zero length");
      }

      // Split parts by comma
      var parts = header.split(',');
      var links = {};
      // Parse each part into a named link
      for (var i = 0; i < parts.length; i++) {
        var section = parts[i].split(';');
        if (section.length !== 2) {
          throw new Error("section could not be split on ';'");
        }
        var url = section[0].replace(/<(.*)>/, '$1').trim();
        var name = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[name] = url;
      }
      return links;
    }


    function onError(reason) {
      $scope.error = "could not fetch all the required content from the API";
      console.log(reason);
    }


    function configureDataTable() {
      $scope.tableParams = new NgTableParams({
        sorting: {
          name: "asc"
        },
        count: 25,

      }, {
        total: $scope.repos.length, // length of data
        getData: function($defer, params) {
          //  $defer.resolve($filter('orderBy')($scope.repos, params.orderBy()));
          // $defer.resolve($filter('orderBy')($scope.repos.slice((params.page() - 1) * params.count(), params.page() * params.count()),params.orderBy()));

          var filteredData = params.filter() ? $filter('filter')($scope.repos, params.filter()) : $scope.repos;
          var orderedData = params.sorting() ? $filter('orderBy')(filteredData, params.orderBy()) : filteredData;
          params.total(filteredData.length);
          $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));

        }
      });
    }


    function computeStatistics() {

      $scope.total_stargazers = 0;
      $scope.total_forks = 0;
      $scope.total_size = 0;
      $scope.total_watchers = 0;
      $scope.total_pullRequests = 0;
      $scope.total_repositories = $scope.repos.length + 1;


      for (var i = 0; i < $scope.repos.length; i++) {
       
        var repo = $scope.repos[i];

        $scope.total_stargazers += parseInt(repo.stargazers_count, 10);
        $scope.total_forks += parseInt(repo.forks_count, 10);
        $scope.total_size += parseInt(repo.size, 10);
        $scope.total_watchers += parseInt(repo.watchers_count, 10);
        $scope.total_pullRequests+= parseInt(repo.total_pullRequests, 10);

      }


    }

    $scope.run=function() {

      $scope.repos=[];

      // gets the organization information
      //$http.get(API + "orgs/" + REPOS).then(onOrgComplete, onError)
      $http.get(API + REPOS).then(onOrgComplete, onError)


    }

    $scope.run();


  }


  app.controller("AppCtrl", ["$scope", "$http", "$filter", "NgTableParams", AppCtrl]);

}());