


function ExtractionGraph ()
{
return function ()
{
	var my = {};
	my["node_modules"] = {};
	my["node_modules"]["neo4j"] = require ("neo4j");

	var that = {};
	return that;
} ();
};

module.exports.ExtractionGraph = ExtractionGraph;
