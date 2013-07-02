


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

	my["neo4j_database"] = new my["node_modules"]["neo4j"].GraphDatabase (my["server_url"]);

	my["cypher"] = {};
	my["cypher"]["child_count_for_node_id"] = "START root=node({id}) MATCH (root)<--(x) RETURN COUNT(x) AS count";
	my["cypher"]["clean_all_descendents"] = "START root=node({id}) MATCH root<-[rels*]-(o) FOREACH (r in rels : DELETE r) DELETE o";

	my["ptrs"] = {};
	my["ptrs"]["/0/count"] = my["node_modules"]["json-ptr"].create ("/0/count"); 
	my["ptrs"]["/Agency"] = my["node_modules"]["json-ptr"].create ("/Agency");
	my["ptrs"]["/Pages"] = my["node_modules"]["json-ptr"].create ("/Pages");
	my["ptrs"]["/Width"] = my["node_modules"]["json-ptr"].create ("/Width");

	my["inject_node"] = function (node)
	{
		return function (callback) { callback (null, node); };
	};

	my["save_node"] = function (node)
	{
		return function (root_node, _)
		{
			console.log ("saving node: "+node);
			var collect = function (err)
			{
				if (err)
				{
					 _ (err);
				}
				else
				{
					_ (null, root_node);
				}
			};
			node.save (collect);
		};
	};
	
	my["from_relation"] = function (to_node, relation, properties)
	{
		return function (from_node, _)
		{
			to_node.createRelationshipFrom (from_node, relation, properties, _);
		};
	};

	my["to_relation"] = function (from_node, relation, properties)
	{
		return function (to_node, _)
		{
			from_node.createRelationshipTo (to_node, relation, properties, _); 
		};
	};

	my["from_node"] = function (relationship, _)
	{
		_ (null, relationship.start);
	};

	my["to_node"] = function (relationship, _)
	{
		_ (null, relationship.end);
	};

	my["load_pages"] = function (pages)
	{
		return function (root_node, _)
		{
			var collect = function (err, results)
			{
				for ( var pageId in Object.keys (results) )
				{
					console.log (["Result for pageId '",pageId,"' is ",results[pageId]].join (""));
				}
				_ (err, root_node);
			};
			var page_tasks = {};

			for ( var pageId in Object.keys (pages) )
			{
				console.log ("Add page task for pageId: "+pageId);
				var page_task = (function (local_pageId)
				{
					return function (callback)
					{
						var page_waterfall = [my["inject_node"] (root_node)];
						var page_node_properties = {
							"pageId": local_pageId
						};
						console.log ("Create node with properties: "+my["node_modules"]["util"].inspect(page_node_properties));
						var page_node = my["neo4j_database"].createNode (page_node_properties);

						page_waterfall.push (my["save_node"] (page_node));
						page_waterfall.push (my["to_relation"] (page_node, "data", {}));
						page_waterfall.push (my["from_node"]);

						my["node_modules"]["async"].waterfall (page_waterfall, callback);
					};
				}) (pageId);
				page_tasks[pageId] = page_task;
			}
			
			my["node_modules"]["async"].parallel (page_tasks, collect);
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
		var params = {"id": root_node.id};
		var collect = function (err, result)
		{
			var local_err = err;
			if ( err === null )
			{
				console.log ("Successfully cleared graph");
			}
			_ (local_err, root_node);
		};
		console.log (["Clean extraction graph from root: ",root_node].join (""));
		my["neo4j_database"].query (my["cypher"]["clean_all_descendents"], params, collect);
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
		my["neo4j_database"].query (my["cypher"]["child_count_for_node_id"], params, collect);
	};
	that["assert_no_children"] = assert_no_children;

	var load_extracted_pdf_data = function (root_node, pdf_data, _)
	{
		console.log ("Load pdf data into graph database: "+pdf_data);

		var local_err = null;
		
		var agency = my["ptrs"]["/Agency"].get (pdf_data);
		var pages = my["ptrs"]["/Pages"].get (pdf_data);
		var width = my["ptrs"]["/Width"].get (pdf_data);
		
		var load_waterfall = [my["inject_node"] (root_node)];

		if (typeof agency === "string" && typeof pages === "object" && typeof width === "number" )
		{
			var meta_node_properties = {
				"agency": agency,
				"width": width	
			};
			var meta_node = my["neo4j_database"].createNode (meta_node_properties);
			//console.log ("meta_node: "+my["node_modules"]["util"].inspect (meta_node));
			load_waterfall.push (my["save_node"] (meta_node));
			load_waterfall.push (my["to_relation"] (meta_node, "meta", {}));
			load_waterfall.push (my["to_node"]);
			load_waterfall.push (my["load_pages"] (pages));
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
			_ (local_err);
		}
	};
	that["load_extracted_pdf_data"] = load_extracted_pdf_data;

	return that;
} ();
};

//var Extraction = require ("./extraction.js");

module.exports.Extraction = require ("./extraction.js");
module.exports.ExtractionGraph = ExtractionGraph;
