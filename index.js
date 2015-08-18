 var config = require('nconf'),
     q = require('q'),
     yargs = require('yargs'),
	 colors = require('colors/safe'),
     jsonTemplateHandler = require('./handlers/jsonTemplateHandler.js'),
     elasticsearchBatchHandler = require('./handlers/elasticsearchBatchHandler.js'),
     rpdwSearchRepository = require('./repositories/rpdwSearchRepository.js'),
     thoughtspotSearchRepository = require('./repositories/thoughtspotSearchRepository.js'),
     fs = require('fs'),
     path = require('path'),
     util = require('util'),
     _ = require('lodash'),
     moment = require('moment'),
     faker = require('faker/locale/en');
	 
q.longStackSupport = true;	 

process.on('uncaughtException', function (err) {
    console.log(colors.red(err));
    console.log(colors.red(err.stack));
});

var configFilePath = path.join(__dirname, 'config', 'config.json');
if (fs.existsSync(path.join(process.cwd(), 'config.json'))) {
    configFilePath = path.join(process.cwd(), 'config.json');
}

console.log(colors.grey('Config file path: ' + configFilePath));

config.argv()
    .env()
    .file({ file: configFilePath });

if(config.get('http:proxy')){
    console.log(colors.gray('Using HTTP proxy: ' + config.get('http:proxy')));
}

yargs.usage('Usage: -d [data type] -l [limit of generated records] -b [batch size]')
     .demand(['d'])
	 .alias('d', 'data')
     .alias('l', 'limit')
     .alias('b', 'batch')
     .alias('i', 'index')
     .alias('t', 'type')
     .alias('m', 'market');
	 
var argv = yargs.argv,
    limit = argv.l ? argv.l : 1000,
    batch = argv.b ? argv.b : 1000,
    index = argv.i,
    type = argv.t,
    market = argv.m ? argv.m.replace(/"/g, '') : argv.m;

console.log('m: ' + argv.m + '; market: ' + market);

if (argv.data == 'lease-building-availability') {
    
    rpdwSearchRepository.getLeaseBuildingAvailabilities(market, limit)
        .then(function (results) {

            var templateMetadata = jsonTemplateHandler.getMetadataFromTemplate('lease-building-availability');
            var bulk = [];
                
            _.each(results.hits.hits, function (hit) {

// console.log('Processing hit: ' + util.inspect(hit));

                hit = hit._source;
                
                var context = {
                    LEASE_BUILDING_AVAILABILITY_ID: hit.property.id,
                    PROPERTY_ID: hit.property.id,
                    REGION_NAME: hit.property.region_name,
                    MARKET_NAME: hit.property.market_name,
                    SUBMARKET_NAME: hit.property.sub_market_name,
                    DISTRICT_NAME: hit.property.district_name,
                    PRIMARY_PROPERTY_TYPE: hit.property.pri_prop_type_name,
                    PROPERTY_TYPE: hit.property.property_type_name,
                    BUILDING_NAME: hit.property.name,
                    STREETNUMBER1: hit.property.street_number1,
                    PRE_STREET_DIRECTION: hit.property.street_direction,
                    STREET_NAME: hit.property.street_name,
                    CITY_NAME: hit.property.city,
                    COUNTY: hit.property.county,
                    STATE_PROVINCE: hit.property.state,
                    POSTAL_CODE: hit.property.postal_code,
                    COUNTRY: hit.property.country,
                    ADDRESS: hit.property.address,
                    YEARBUILT: hit.property.year_built,
                    CLASS: hit.property.class_name,
                    STATUS: hit.property.property_status_name,
                    LOCATION: hit.property.location
                };

                for (var year = 2010; year <= 2015; year++) {

                    for (var month = 1; month <= 12; month++) {
                        context.TIMESTAMP = getTimestampFromYearAndMonth(year, month);
                        var generated = jsonTemplateHandler.generateFromTemplate('lease-building-availability', context);
                        bulk.push(generated[0]);
                                              
                        if (bulk.length % batch == 0) {
                            index = templateMetadata.index ? templateMetadata.index : index;
                            type = templateMetadata.type ? templateMetadata.type : type;
                            //console.log(colors.white(util.inspect(data, {depth: 3})));
       
                            elasticsearchBatchHandler.bulk(index, type, bulk)
                                .then(function (results) {
                                    console.log(colors.green('Successful handling of bulk request'));
                                })
                                .fail(function (err) {
                                    throw err;
                                });
                                
                            bulk = [];
                        }
                        
                    }

                }

            });

            if (bulk.length > 0) {
                index = templateMetadata.index ? templateMetadata.index : index;
                type = templateMetadata.type ? templateMetadata.type : type;
                //console.log(colors.white(util.inspect(data, {depth: 3})));
       
                elasticsearchBatchHandler.bulk(index, type, bulk)
                    .then(function (results) {
                        console.log('Successful handling of bulk request');
                    })
                    .fail(function (err) {
                        throw err;
                    });
            }
                        
        })        
        .fail(function(err){
                console.log(colors.red(err));
                process.exit(1);  
            });;
        

} 
else if (argv.data == 'tim'){
   
       rpdwSearchRepository.getTenantsInMarkets(limit)
         .then(function (results) {

            var bulk = [],
                locationBulk = [],
                templateMetadata = jsonTemplateHandler.getMetadataFromTemplate('tim'),
                locationTemplateMetadata = jsonTemplateHandler.getMetadataFromTemplate('tim-location');

            _.each(results.hits.hits, function (hit) {
                
                hit = hit._source;
                
                var context = {
                    COMPANY_NAME: hit.COMPANY_NAME.id,
                    REGION_NAME: hit.REGION_NAME,
                    PROPERTY_TYPE: hit.PROPERTY_TYPE_NAME,
                    CURRENTLOCATION: hit.CURRENTLOCATION,
                    MIN_SPACE_REQUIRED: hit.MIN_SPACE_REQUIRED,
                    MAX_SPACE_REQUIRED: hit.MAX_SPACE_REQUIRED
                };
                                              
                var year,
                    month;

                for (year = 2010; year <= 2015; year++) {

                    for (month = 1; month <= 12; month++) {
                        
                        context.TIM_ID = null;
                        var random = getRandomBetween(0, 100);
                        // 5% of the time we should make this company in the market
                        if (random < 5) {

                            var monthsInMarket = getRandomBetween(1, 9),
                                m = 0;
                                
                            var inMarketDate = moment();
                            inMarketDate.month(month);
                            inMarketDate.year(year);
                            
                            while (m < monthsInMarket) {
                                //console.log('year: ' + year + ' month: ' + month);
                                                               
                                inMarketDate.add(1, 'month');

                                context.TIMESTAMP = getTimestampFromYearAndMonth(inMarketDate.year(), inMarketDate.month());

                                //console.log('Tim: ' + context.TIM_ID + ' timestamp: ' + context.TIMESTAMP);
                                var generated = jsonTemplateHandler.generateFromTemplate('tim', context);
                                // Reuse the TIM_ID and agent company
                                context.AGENT_COMPANY = generated[0].AGENT_COMPANY;
                                context.TIM_ID = generated[0].TIM_ID;
                                
                                //console.log('Agent company: ' + generated[0].TIM_ID + ' ' + generated[0].TIMESTAMP + ' ' + context.AGENT_COMPANY);
                                
                                bulk.push(generated[0]);
                                
                                if (bulk.length % batch == 0) {
                                    index = templateMetadata.index ? templateMetadata.index : index;
                                    type = templateMetadata.type ? templateMetadata.type : type;
                                    
                                    console.log(colors.white('Sending batch request, size: ' + bulk.length));
       
                                    elasticsearchBatchHandler.bulk(index, type, bulk)
                                        .then(function (results) {
                                            console.log(colors.green('Successful handling of bulk request'));
                                        })
                                        .fail(function (err) {
                                            throw err;
                                        });
                                        
                                    bulk = [];
                                }
                                
                                var locationContext = {
                                    TIM_ID: generated[0].TIM_ID,
                                    MARKET_NAME: hit.markets.length > 0 ? hit.markets[0].name : null,
                                    SUBMARKET_NAME: hit.submarkets.length > 0 ? hit.submarkets[0].name : null,
                                    DISTRICT_NAME: hit.districts.length > 0 ? hit.districts[0].name : null
                                };
                                var generatedLocation = jsonTemplateHandler.generateFromTemplate('tim-location', locationContext);
                                locationBulk.push(generatedLocation[0]);
                                
                                if (locationBulk.length % batch == 0) {
                                    console.log(colors.white('Sending batch request, size: ' + locationBulk.length));

                                    elasticsearchBatchHandler.bulk(locationTemplateMetadata.index, 
                                                                   locationTemplateMetadata.type, locationBulk)
                                        .then(function (results) {
                                            console.log(colors.green('Successful handling of bulk request'));
                                        })
                                        .fail(function (err) {
                                            throw err;
                                        });

                                    locationBulk = [];
                                }
            
                                m++;
                            }


                        }
                        
                    }
                    
                }
                
                    
            });
            
            if (bulk.length > 0) {
                index = templateMetadata.index ? templateMetadata.index : index;
                type = templateMetadata.type ? templateMetadata.type : type;

                console.log(colors.white('Sending batch request, size: ' + bulk.length));

                elasticsearchBatchHandler.bulk(index, type, bulk)
                    .then(function (results) {
                        console.log(colors.green('Successful handling of bulk request'));
                    })
                    .fail(function (err) {
                        throw err;
                    });

                bulk = [];
            }
            if (locationBulk.length > 0) {
                console.log(colors.white('Sending batch request, size: ' + locationBulk.length));

                elasticsearchBatchHandler.bulk(locationTemplateMetadata.index, locationTemplateMetadata.type, locationBulk)
                    .then(function (results) {
                        console.log(colors.green('Successful handling of bulk request'));
                    })
                    .fail(function (err) {
                        throw err;
                    });

                locationBulk = [];
            }
                      
        })
        .fail(function(err){
                console.log(colors.red(err));
                process.exit(1);  
            });
}
else if (argv.data = 'lease-comp'){
    
    var templateMetadata = jsonTemplateHandler.getMetadataFromTemplate('lease-comp');
    
    var getTimLocations = function(marketName){
        // Right now there is a simple 1:1 between TIMs and TIM locations... if this 
        // changes we will need to limit the result to unique TIM_ID's
        return thoughtspotSearchRepository.getTenantInMarketLocations({market: marketName}, limit)
            .then(function(results){
                
                var timLocations = _.pluck(results.hits.hits, '_source');              
                return timLocations;
                                
            });
    }
    
    var getTims = function(timLocations){
        
        console.log('Getting TIMs for  ' + timLocations.length + ' locations');
        
        var ids = _.pluck(timLocations, 'TIM_ID');
        
        return thoughtspotSearchRepository.getTenantInMarketsByTimIds(ids)
            .then(function(results){
                var tims = _.pluck(results.hits.hits, '_source');
                
                // We could have multiple hits as TIM is over time
                var uniqueTims = _.groupBy(tims, function(tim){
                   return tim.TIM_ID; 
                });
                
                // Pick the first one
                var aggregatedTims = [];
                _.forIn(uniqueTims, function(tims, uniqueTimId){
                    // console.log('Unique tim id: ' + uniqueTimId)
                    aggregatedTims.push(tims[0]);
                });
                _.each(aggregatedTims, function(tim){
                    tim.location = _.find(timLocations, { 'TIM_ID' : tim.TIM_ID });    
                });
                                
                return aggregatedTims;
            });
    }
    
    var getRandomLeaseAvailability = function (marketName) {

        return thoughtspotSearchRepository.getLeaseBuildingAvailabilitiesCount(marketName)
            .then(function (total) {
                
                var idx = getRandomBetween(0, total - 1);

                return thoughtspotSearchRepository.getLeaseBuildingAvailabilities(marketName, idx, 1)
                    .then(function(results){
                        return results.hits.hits.length > 0 ? results.hits.hits[0]._source : null; 
                    });
            });
    }
    
    var generateLeaseComps = function(tims){
        
        console.log('Generating lease comps for ' + tims.length + ' TIMs');
        
        var deferred = q.defer(),
            leaseAvailabilityPromises = [];
        
        _.each(tims, function(tim){
                    
            //console.log('Generating a lease comp from tim: ', util.inspect(tim)); 
            var context = {
                TIM_ID : tim.TIM_ID
            };
            
            var promise = getRandomLeaseAvailability(tim.location.MARKET_NAME)
                .then(function(leaseAvailability){
                    
                    if(!leaseAvailability){
                        console.warn('Unable to find a lease availability in market: ' + tim.location.MARKET_NAME + ', skipping...');
                        return;
                    }
                    
                   // console.log('Generating a lease comp from lease availability: ', util.inspect(leaseAvailability));
                    
                    context.LEASE_AVAILABILITY_ID = leaseAvailability.LEASE_BUILDING_AVAILABILITY_ID;
                    context.TIMESTAMP = leaseAvailability.TIMESTAMP;
                    context.LEASE_SF = getRandomBetween(10000, leaseAvailability.AVAIL_SF_TOTAL);
                    context.RENT_RATE_MONTHLY = getRandomBetween(50, leaseAvailability.LEASE_RATEMAXDIRECT_MONTHLY);
                    
                    var leaseDateAvailableTo = moment(leaseAvailability.LEASE_DATE_AVAILABLE);
                    var randomDays = getRandomBetween(5, 90);
                    leaseDateAvailableTo.add(randomDays, 'days');
                    var occupancyDate = faker.date.between(leaseAvailability.LEASE_DATE_AVAILABLE, 
                                                           leaseDateAvailableTo.format('YYYY-MM-DD'));		
		            context.OCCUPANCY_DATE = moment(occupancyDate).format('YYYY-MM-DD');
                    
                    context.LEASE_SIGNED_DATE = leaseAvailability.LEASE_SIGNED_DATE;
                    context.LEASE_AGENCY = leaseAvailability.LEASE_AGENCY;
                    
                    //console.log('Lease comp:');
                    //console.log(util.inspect(context));
                    
                    return context;
                });
            
            leaseAvailabilityPromises.push(promise);
        });
        
        // Wait for all the requests to get a random lease availability to resolve - this will be
        // exactly 1 request per TIM that is processed
        q.all(leaseAvailabilityPromises)
            .then(function(results){
                deferred.resolve(results);
            })
            .fail(function(err){
                deferred.reject(err);  
            });
        
        return deferred.promise;
    }
    
    var bulkIndexLeaseComps = function(leaseComps){
        
        var bulk = [];
        
        _.each(leaseComps, function(leaseComp){
            
            if(!leaseComp){
                return;
            }
            
            bulk.push(leaseComp);
            
            if (bulk.length % batch == 0) {
                console.log(colors.white('Sending (' + templateMetadata.type + ') batch request, size: ' + bulk.length));

                elasticsearchBatchHandler.bulk(templateMetadata.index,
                    templateMetadata.type, bulk)
                    .then(function (results) {
                        console.log(colors.green('Successful handling of bulk request'));
                    })
                    .fail(function (err) {
                        throw err;
                    });

                bulk = [];
            }

        });
        
        if (bulk.length > 0) {
            index = templateMetadata.index ? templateMetadata.index : index;
            type = templateMetadata.type ? templateMetadata.type : type;

            console.log(colors.white('Sending (' + type + ') batch request, size: ' + bulk.length));

            elasticsearchBatchHandler.bulk(index, type, bulk)
                .then(function (results) {
                    console.log(colors.green('Successful handling of bulk request'));
                })
                .fail(function (err) {
                    throw err;
                });

            bulk = [];
        }
    }
    
    getTimLocations(market)
       .then(getTims)
       .then(generateLeaseComps)
       .then(bulkIndexLeaseComps)
       .fail(function(err){
           console.log(colors.red(err.stack));
       });
    
}
else if (argv.data == 'random') {
    
    jsonTemplateHandler.generateFromTemplate('lease-building-availability', limit, batch, function (err, data) {
        console.log(colors.gray('Batch size of: ' + data.length));

        var templateMetadata = jsonTemplateHandler.getMetadataFromTemplate('lease-building-availability');

        index = templateMetadata.index ? templateMetadata.index : index;
        type = templateMetadata.type ? templateMetadata.type : type;
        //console.log(colors.white(util.inspect(data, {depth: 3})));
       
        elasticsearchBatchHandler.bulk(index, type, data)
            .then(function (results) {
                console.log('Successful handling of bulk request');
            })
            .fail(function (err) {
                throw err;
            });
    });
    
}
else{
	throw new Error('Must supply supported value for \'-d\' option');
}

function getRandomBetween(min, max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function getTimestampFromYearAndMonth(year, month) {
    var timestamp = moment();
    timestamp.month(month);
    timestamp.year(year);
    timestamp.date(1);
    timestamp.hour(0);
    timestamp.minute(0);
    timestamp.second(0);

    return timestamp.format('YYYY-MM-DD');
}