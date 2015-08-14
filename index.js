 var config = require('nconf'),
     q = require('q'),
     yargs = require('yargs'),
	 colors = require('colors/safe'),
     jsonTemplateHandler = require('./handlers/jsonTemplateHandler.js'),
     elasticsearchBatchHandler = require('./handlers/elasticsearchBatchHandler.js'),
     rpdwSearchRepository = require('./repositories/rpdwSearchRepository.js'),
     fs = require('fs'),
     path = require('path'),
     util = require('util'),
     _ = require('lodash'),
     moment = require('moment');
	 
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
    market = argv.m;

if (argv.data == '_all') {
    
    rpdwSearchRepository.getLeaseBuildingAvailabilities(market, 1000)
        .then(function (results) {

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

                var templateMetadata = jsonTemplateHandler.getMetadataFromTemplate('lease-building-availability');
                var bulk = [];

                for (var year = 2000; year <= 2015; year++) {

                    for (var month = 1; month <= 12; month++) {

                        var timestamp = moment();
                        timestamp.month(month);
                        timestamp.year(year);
                        timestamp.date(1);
                        timestamp.hour(0);
                        timestamp.minute(0);
                        timestamp.second(0);
                        
                        context.TIMESTAMP = timestamp.format();
                        var generated = jsonTemplateHandler.generateFromTemplate('lease-building-availability', context);
                        bulk.push(generated[0]);

                    }

                }

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


            });

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