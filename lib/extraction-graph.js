


function ExtractionGraph (root_node_url, extraction_id)
{
return function ()
{
	var my = {};
	my["node_modules"] = {};
	my["node_modules"]["util"] = require ("util");
	my["node_modules"]["json-ptr"] = require ("json-ptr");
	my["node_modules"]["neo4j"] = require ("neo4j");

	my["url"] = root_node_url;
	my["server_url"] = root_node_url.match("^(http|https):\/\/[a-z\.]+:[0-9]+")[0];
	my["extraction_id"] = extraction_id;

	//my["neo4j_database"] = new my["node_modules"]["neo4j"].GraphDatabase (my["url"]);
	my["neo4j_database"] = new my["node_modules"]["neo4j"].GraphDatabase (my["server_url"]);

	my["cypher"] = {};
	my["cypher"]["child_count_for_node_id"] = "START root=node({id}) MATCH (root)<--(x) RETURN COUNT(x) AS child_count";

	var that = {};
	
	var root_node = function (_)
	{
		// _ ~ fn(err, result)
		console.log (["Get node for graph extraction-id: '",my["extraction_id"],"' url: '",my["url"],"'"].join (""));
		my["neo4j_database"].getNode (my["url"],_);
	};
	that["root_node"] = root_node;

	var clean = function (root_node, _)
	{
		console.log (["Clean extraction graph from root: ",root_node].join (""));
		_(null, root_node);
	};
	that["clean"] = clean;

	var assert_no_children = function (root_node, _)
	{
		var collect = function (err, result)
		{
			var local_err = err;
			if ( err === null )
			{
				console.log ("collect of assert_no_children, result: "+my["node_modules"]["util"].inspect(result));
				if ( result.length === 1 )
			}
			_ (local_err, root_node);
		};
		console.log ("called assert_no_children");
		my["neo4j_database"].query (my["cypher"]["child_count_for_node_id"], {"id": 2},collect);	
	};
	that["assert_no_children"] = assert_no_children;

	return that;
} ();
};

module.exports.ExtractionGraph = ExtractionGraph;
