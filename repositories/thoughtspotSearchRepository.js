var colors = require('colors/safe'),
    faker = require('faker/locale/en'),
	fs = require('fs'),
	path = require('path'),
	_ = require('lodash'),
	util = require('util'),
	contextObj = null,
	moment = require('moment'),
	request = require('request'),
    q = require('q'),
    config = require('nconf');

module.exports.getLeaseBuildingAvailabilitiesCount = function(marketName){
    
    var deferred = q.defer();
    console.log(colors.gray('Requesting lease building availabilities count from market: ' + marketName));
    
    var requestData = {
      query: {
          match_all: {}
      },
      filter: {
          term: { 'MARKET_NAME.raw': marketName }
      }
    };
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + 
             config.get('elasticsearch:thoughtspotIndex') + '/lease-building-availability/_search?search_type=count',
        json: true,
        headers: { contentType: 'application/json' },
        body: requestData
    };

    if(config.get('http:proxy')){
        options.proxy = config.get('http:proxy');
    }

    request(options, function(err, res, body){
        if(err){
            return deferred.reject(err);
        }
        if(res.statusCode >= 400){
            return deferred.reject('Error in response: ', util.inspect(body));
        }
        
        // console.log('Resp: ');
        // console.log(util.inspect(body, {depth: 3}));
        // var response = JSON.parse(body.toString());

        deferred.resolve(body.hits.total);
    });

    return deferred.promise; 
};

module.exports.getLeaseBuildingAvailabilities = function(marketName, from, limit){
	
    limit = limit ? limit : 100;
    
	var deferred = q.defer();
    console.log(colors.gray('Requesting lease building availabilities (' + limit + ') from market: ' + marketName));
    
    var requestData = {
      query: {
          match_all: {}
      },
      filter: {
          term: { 'MARKET_NAME.raw': marketName }
      },
      from: from,
      size: limit 
    };
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + 
             config.get('elasticsearch:thoughtspotIndex') + '/lease-building-availability/_search',
        json: true,
        headers: { contentType: 'application/json' },
        body: requestData
    };

    if(config.get('http:proxy')){
        options.proxy = config.get('http:proxy');
    }

    request(options, function(err, res, body){
        if(err){
            return deferred.reject(err);
        }
        // console.log('Resp: ');
        // console.log(util.inspect(body, {depth: 3}));
        //var response = JSON.parse(body.toString());

        deferred.resolve(body);
    });

    return deferred.promise;
}

module.exports.getTenantsInMarkets = function(limit){
	
    limit = limit ? limit : 100;
    
	var deferred = q.defer();
    console.log(colors.gray('Requesting TIMs (' + limit + ')'));
    
    var requestData = {
      query: {
          match_all: {}
      },
      size: limit 
    };
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + config.get('elasticsearch:thoughtspotIndex') + '/tim/_search',
        json: true,
        headers: { contentType: 'application/json' },
        body: requestData
    };

    if(config.get('http:proxy')){
        options.proxy = config.get('http:proxy');
    }

    request(options, function(err, res, body){
        if(err){
            return deferred.reject(err);
        }
        // console.log('Resp: ');
        // console.log(util.inspect(body, {depth: 3}));
        //var response = JSON.parse(body.toString());

        deferred.resolve(body);
    });

    return deferred.promise;
};

module.exports.getTenantInMarketsByTimIds = function(ids){
    
	var deferred = q.defer();
    console.log(colors.gray('Requesting (' + ids.length + ') TIMs'));
   //  console.log(colors.gray('TIM ids: ' + ids.join(', ')));
    
    var requestData = {
      query: {
          match_all: {}
      },
      filter: {
          terms: { 'TIM_ID': ids }
      },
      size: ids.length
    };
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + 
             config.get('elasticsearch:thoughtspotIndex') + '/tim/_search',
        json: true,
        headers: { contentType: 'application/json' },
        body: requestData
    };

    if(config.get('http:proxy')){
        options.proxy = config.get('http:proxy');
    }

    request(options, function(err, res, body){
        if(err){
            return deferred.reject(err);
        }
        // console.log('Resp: ');
        // console.log(util.inspect(body, {depth: 3}));
        //var response = JSON.parse(body.toString());

        deferred.resolve(body);
    });

    return deferred.promise;    
};

module.exports.getTenantInMarketLocations = function(filter, limit){
    limit = limit ? limit : 100;
    
	var deferred = q.defer();
    console.log(colors.gray('Requesting TIM locations (' + limit + ')'));
    
    var requestData = {
      query: {
          match_all: {}
      },
      filter: {
          term: { 'MARKET_NAME.raw': filter.market }
      },
      size: limit 
    };
    
    if(!filter.market){
        delete requestData.filter;
    }
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + 
             config.get('elasticsearch:thoughtspotIndex') + '/tim-location/_search',
        json: true,
        headers: { contentType: 'application/json' },
        body: requestData
    };

    if(config.get('http:proxy')){
        options.proxy = config.get('http:proxy');
    }

    request(options, function(err, res, body){
        if(err){
            return deferred.reject(err);
        }
        // console.log('Resp: ');
        // console.log(util.inspect(body, {depth: 3}));
        //var response = JSON.parse(body.toString());

        deferred.resolve(body);
    });

    return deferred.promise;   
};