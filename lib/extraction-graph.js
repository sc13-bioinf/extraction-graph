


function ExtractionGraph (url, extraction_id)
{
return function ()
{
	var my = {};
	my["node_modules"] = {};
	my["node_modules"]["neo4j"] = require ("neo4j");

	my["url"] = url;
	my["extraction_id"] = extraction_id;

	my["neo4j_database"] = new my["node_modules"]["neo4j"].GraphDatabase (my["url"]);

	var that = {};
	
	var exists = function ()
	{
		console.log ("Checking for existence of extraction graph for extraction-id: '"+my["extraction_id"]+"'");
	};
	that["exists"] = exists;

	return that;
} ();
};

module.exports.ExtractionGraph = ExtractionGraph;
