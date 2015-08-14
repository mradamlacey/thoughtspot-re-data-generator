var colors = require('colors/safe'),
    faker = require('faker/locale/en'),
	fs = require('fs'),
	path = require('path'),
	_ = require('lodash'),
	util = require('util'),
	contextObj = null,
	moment = require('moment');

module.exports.getMetadataFromTemplate = function(templateName){

	var templateFilePath = path.join(__dirname, '/../templates', templateName + '.json');
    if (!fs.existsSync(templateFilePath)) {
        console.log(colors.red('Unable to find template named: ' + templateName));
		process.exit(1);
    }
	
	var templateDef = JSON.parse(fs.readFileSync(templateFilePath));
	
	return {
		index: templateDef['_index'],
		type: templateDef['_type']
	};
}

module.exports.generateFromTemplate = function(templateName, contextData, limit, batchSize, batchHandlerFn){
	
	limit = limit ? limit : 1;
	
	var templateFilePath = path.join(__dirname, '/../templates', templateName + '.json');
    if (!fs.existsSync(templateFilePath)) {
        console.log(colors.red('Unable to find template named: ' + templateName));
		process.exit(1);
    }
	
	var templateDef = JSON.parse(fs.readFileSync(templateFilePath));
		
	var i = 0,
	    batchIdx = 0,
	    batch = [],
		directiveRegEx = /{{(.*?)}}/g,
		functionNameRegEx = /(.?\(.?\))/;
	
	while(i < limit){
	
	    var batchItem = contextData ? _.cloneDeep(contextData) : {};
		
		contextObj = batchItem;
		
		// Generate the random data in the batch item, use the template definition
	    _.forIn(templateDef, function(val, key){
		    //console.log(colors.gray('\t', key, val));
			
			// Skip metadata
			if(key == '_index' || key == '_type'){
				return;
			}
			
			//console.log('handling property: ' + key + ':' + val);
			
			if(contextObj[key]){
				val = contextObj[key];
			}
			else{
				val = val.replace(directiveRegEx, function (searchVal, replaceVal) {			    
					//console.log('replace: ' + searchVal + ', ' + replaceVal);
							
					var retVal;
					try {
						var expr = searchVal.replace(/{/g, '').replace(/}/g, '');
					
						//console.log('eval: ' + expr);
						retVal = eval(expr);
						//console.log('retVal: ' + retVal);	
					}
					catch (ex) {
						var innerMessage = util.inspect(ex, { depth: 2 });
						console.log(colors.red(innerMessage));
						throw new Error('Unable to execute handler function: ' + searchVal);
					}

					return retVal;
				});
			}	
			
			batchItem[key] = val;
			
			/*
			var match = directiveRegEx.exec(val),
			    retVal = null;
				
			if(match){
				var directive = match.length >= 1 ? match[1] : null;
				
				if(!directive){
					throw new Error('Unable to find directive name: ' + key);
				}
				
				var fnMatch = functionNameRegEx.exec(directive);
				if(fnMatch){
					var fnName = fnMatch.length >= 2 ? fnMatch[1] : null,
					    argsStr = fnMatch.length >= 2 ? fnMatch[2] : null;
					
					if(!directiveProcessorDictionary[fnName]){
						throw new Error('Unable to find directive name: ' + fnName + ' in handlers');
					}
					
					var fnExpr = 'directiveProcessorDictionary.' + directive;
					try{
					    retVal = eval(fnExpr);	
					}
					catch(ex){
						var innerMessage = util.inspect(ex, {depth: 2});
						console.log(colors.red(innerMessage));
						throw new Error('Unable to execute handler function: ' + fnExpr);
					}					
					
					batchItem[key] = retVal;
				}
				else{
					throw new Error('Invalid directive expression: ' + directive);
				}
				
			}
			else{
				console.log(colors.gray('No directive found for: ' + key + ': ' + val));
				batchItem[key] = val;
			}
			*/
			
	    });
				
		batch.push(batchItem);
	
	    // Process a batch of records if we hit the batch size
		if(batchHandlerFn && batchIdx == batchSize){
				
		    batchHandlerFn(null, batch);
		    batch = [];
			batchSize = 0;
		}
			
	    i++;
		batchSize++;
	}
    
	// Process the last batch if we hit the limit
	if(batchHandlerFn && batchIdx < batchSize){
			
	    batchHandlerFn(null, batch);
	    batch = [];
		batchSize = 0;
	}

	var headers = [];
	_.forIn(templateDef, function (val, key) {
		if (key == '_index' || key == '_type') {
			return;
		}

		headers.push(key);
	});

	//console.log('Headers: ');
	//console.log(headers.join(' '));
		
	if(!batchHandlerFn){
		// console.log('Returning batch: ' + util.inspect(batch));
		return batch;
	}
		
}

    var context = function(propertyName){
		return contextObj[propertyName];
	}
	
	var objectId = function (directiveExpr) {
        return faker.random.uuid();
	};

	var index = function (directiveExpr) {
        return faker.random.uuid();
	};

	var street = function (directiveExpr) {
        return faker.address.streetName();
	};

	var streetNumber = function (directiveExpr) {
        return getRandomBetween(200, 15000);
	};
	
	var streetDirection = function (directiveExpr) {
        return faker.address.streetPrefix();
	};
	
	var city = function (directiveExpr) {
        return faker.address.city();
	};

	var county = function (directiveExpr) {
        return faker.address.county();
	};
	
	var country = function (directiveExpr) {
        return faker.address.country();
	};
	
	var stateAbbr = function (directiveExpr) {
        return faker.address.stateAbbr();
	};
	
	var state = function (directiveExpr) {
        return faker.address.state();
	};

	var zipCode = function (directiveExpr) {
        return faker.address.zipCode();
	};

	var lorem = function (num, loremType) {
        if(loremType){
			var fakerFn = faker.lorem[loremType];
			return fakerFn(num);
		}
		else{
		    return faker.lorem.words(num);	
		}
	};

	var numberBetween = function () {
		//console.log('numberBetween: ' + util.inspect(arguments));
		if(arguments.length > 0){
			return getRandomBetween(parseInt(arguments[0]), parseInt(arguments[1]));
		}
		else{
            return faker.random.number();			
		}
	};

	var amount = function (directiveExpr) {
        return faker.finance.amount();
	};
	
	var latLon = function (directiveExpr) {
        return faker.address.latitude() + ', ' + faker.address.longitude();
	};

	var company = function (directiveExpr) {
        return faker.company.companyName();
	};
	
	var dateBetween = function (fromDate, toDate) {
		// console.log('date between: ' + fromDate + ' to ' + toDate);
        var newDate = faker.date.between(fromDate, toDate);
		
		return moment(newDate).format();
	};
	
	var choose = function(){
		return arguments[getRandomBetween(0, arguments.length - 1)];
	};
	
function getRandomBetween(min, max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

