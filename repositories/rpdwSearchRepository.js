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
	
module.exports.getLeaseBuildingAvailabilities = function(marketName, limit){
	
    limit = limit ? limit : 100;
    
	var deferred = q.defer();
    console.log(colors.gray('Requesting lease building availabilities (' + limit + ')'));
    
    var requestData = {
      query: {
          match_all: {}
      },
      filter: {
          term: { 'property.market_name.raw': marketName }
      },
      size: limit 
    };
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + config.get('elasticsearch:rpdwSearchIndex') + '/lease-building-availability/_search',
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
        console.log('Resp: ');
        console.log(util.inspect(body, {depth: 3}));
        //var response = JSON.parse(body.toString());

        deferred.resolve(body);
    });

    return deferred.promise;
}

module.exports.getTenantsInMarkets = function(limit, marketName){
	
    limit = limit ? limit : 100;
    
	var deferred = q.defer();
    console.log(colors.gray('Requesting TIMs (' + limit + ')'));
    
    var requestData = {
      query: {
          match_all: {}
      },
      filter: {
          term: { 'markets.raw': marketName }
      },
      size: limit 
    };
    
    if(!marketName){
        delete requestData.filter;
    }
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + config.get('elasticsearch:rpdwSearchIndex') + '/tim/_search',
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
        console.log('Resp: ');
        console.log(util.inspect(body, {depth: 3}));
        //var response = JSON.parse(body.toString());

        deferred.resolve(body);
    });

    return deferred.promise;
}
