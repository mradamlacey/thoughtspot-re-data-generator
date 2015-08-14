var request = require('request'),
    q = require('q'),
	_ = require('lodash'),
	colors = require('colors/safe'),
	util = require('util'),
    config = require('nconf');
	

module.exports.bulk = function(indexName, indexType, data){
	var deferred = q.defer();
	
	var bulkData = '';
	_.each(data, function(row){
		var index = { 
                     'index' : { 
                         '_index' : indexName, 
                         '_type' : indexType, 
                         '_id': row._id 
                     } 
                 };
				 
		bulkData = bulkData + JSON.stringify(index) + '\r\n';
        bulkData = bulkData + JSON.stringify(row) + '\r\n';
		
		//console.log(colors.gray('Bulk data: '));
		//console.log(colors.gray(bulkData));
	});
    
    sendBulkUpdateRequest(indexName, indexType, bulkData, data.length)
            .then(function(resp){
                console.log('Successful bulk request sent: ' + data.length);
                deferred.resolve(resp);
            })
            .fail(function(err){
                throw new Error(err);
            });
	
	return deferred.promise;
}

var sendBulkUpdateRequest = function(index, type, bulkData, numDocuments){
    
    var deferred = q.defer();
    console.log(colors.gray('Sending bulk update request for (' + numDocuments + ')'));
    
    var options = {
        method: 'POST',
        url: 'http://' + config.get('elasticsearch:hosts')[0] + '/' + index + '/_bulk',
        encoding: null,
        body: bulkData
    };

    if(config.get('http:proxy')){
        options.proxy = config.get('http:proxy');
    }

    request(options, function(err, res, body){
        if(err){
            return deferred.reject(err);
        }
        
        var response = JSON.parse(body.toString());
        
        //console.log(util.inspect(response, {depth: 1} ));
        console.log('Bulk response took: ' + response.took + '; items: ' + response.items.length);
        
        var numErrors = 0;
        if(response.errors){
            _.each(response.items, function(item){
                
                _.forIn(item, function(details, operationName){
                    if(details.status >= 400){
                        console.log(colors.red('Error in bulk operation: ' + operationName + '; document id: ' + details._id));
                        console.log(colors.red('\t' + details.error));
                        
                        numErrors++;
                    } 
                });
                 
            });
            
            console.log(colors.red('Number of bulk operation errors: ' + numErrors));
        }

        deferred.resolve({ status: res.statusCode, response: response });
    });

    return deferred.promise;
}