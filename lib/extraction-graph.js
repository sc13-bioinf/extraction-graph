


function ExtractionGraph (root_node_url, extraction_id)
{
return function ()
{
	var my = {};
	my["node_modules"] = {};
	my["node_modules"]["util"] = require ("util");
	my["node_modules"]["json-ptr"] = require ("json-ptr");
	my["node_modules"]["neo4j"] = require ("neo4j");
	my["node_modules"]["async"] = require ("async");

	my["url"] = root_node_url;
	my["server_url"] = root_node_url.match("^(http|https):\/\/[a-z\.]+:[0-9]+")[0];
	my["extraction_id"] = extraction_id;

	//my["neo4j_database"] = new my["node_modules"]["neo4j"].GraphDatabase (my["url"]);
	my["neo4j_database"] = new my["node_modules"]["neo4j"].GraphDatabase (my["server_url"]);

	my["cypher"] = {};
	my["cypher"]["child_count_for_node_id"] = "START root=node({id}) MATCH (root)<--(x) RETURN COUNT(x) AS count";

	my["ptrs"] = {};
	my["ptrs"]["/0/count"] = my["node_modules"]["json-ptr"].create ("/0/count"); 
	my["ptrs"]["/Agency"] = my["node_modules"]["json-ptr"].create ("/Agency");
	my["ptrs"]["/Pages"] = my["node_modules"]["json-ptr"].create ("/Pages");
	my["ptrs"]["/Width"] = my["node_modules"]["json-ptr"].create ("/Width");


	my["from_relation"] = function (from_node, relation, properties)
	{
		return function (to_node, _)
		{
			from_node.createRelationshipTo (to_node, relation, properties, _); 
		};
	};

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

	var assert_no_children = function (node, _)
	{
		var params = {"id": node.id};
		var collect = function (err, result)
		{
			var local_err = err;
			if ( err === null )
			{
				var child_count = my["ptrs"]["/0/count"].get (result);
				if ( child_count !== 0 )
				{
					local_err = ["Assert no children failed node '",node,"' has ",child_count," children"].join ("");
				}
			}
			_ (local_err, node);
		};
		console.log ("called assert_no_children");
		my["neo4j_database"].query (my["cypher"]["child_count_for_node_id"], params,collect);	
	};
	that["assert_no_children"] = assert_no_children;

	var load_extracted_pdf_data = function (root_node, pdf_data, _)
	{
		console.log ("Load pdf data into graph database: "+pdf_data);

		var local_err = null;
		
		var agency = my["ptrs"]["/Agency"].get (pdf_data);
		var pages = my["ptrs"]["/Pages"].get (pdf_data);
		var width = my["ptrs"]["/Width"].get (pdf_data);

		var load_waterfall = [];

		if (typeof agency === "string" && typeof pages === "object" && typeof width === "number" )
		{
			var meta_node_properties = {
				"agency": agency,
				"width": width	
			};
			var meta_node = my["neo4j_database"].createNode (meta_node_properties);
			load_waterfall.push (meta_node.save);
			load_waterfall.push (my["from_relation"] (root_node, "with", {}));	
		}
		else
		{
			local_err = "Agency is not a string or Pages is not an object or Wdth is not a number";
		}
		if ( local_err === null )
		{
			my["node_modules"]["async"].waterfall (load_waterfall, _);	
		}
		else
		{
			_ (local_err, root_node);
		}
	};
	that["load_extracted_pdf_data"] = load_extracted_pdf_data;

	return that;
} ();
};

//var Extraction = require ("./extraction.js");

module.exports.Extraction = require ("./extraction.js");
module.exports.ExtractionGraph = ExtractionGraph;
