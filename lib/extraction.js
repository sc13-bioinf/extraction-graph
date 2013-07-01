

function Extraction (pdf_url)
{
return function ()
{
	var my = {};
	my["self"] = this;	

	
	my["node_modules"] = {};
	my["node_modules"]["util"] = require ("util");
	my["node_modules"]["PFParser"] = require ("/Users/sc13/nodejsprojects/nodejs_as_nodejs/projects/pdf2json/pdfparser");
	my["node_modules"]["fs"] = require("fs");
	my["node_modules"]["_"] = require("underscore");
	my["node_modules"]["sprintf"] = require("sprintf");
	
	my["pdfParser"] = new my["node_modules"]["PFParser"] ();
	my["vsprintf"] = my["node_modules"]["sprintf"]["vsprintf"];

	my["pdfFilePath"] = pdf_url;
	my["start_time"] = null;
	my["callback"] = null;
	my["root_node"] = null;	
	 
	my["maybe_log_error"] = function (err)
	{
		if (err)
		{
			console.log (err);
		}
	};

	my["elapsedTimeToString"] = function (e)
	{
		var ms = e % 1000;
		var hours = Math.floor (e / 3600000);
		var minutes = Math.floor ((e / 60000) - (hours * 60));
		var seconds = Math.floor((e / 1000) - (minutes * 60));
		
		return my["vsprintf"] ("%02d:%02d:%02d %03d",[hours, minutes,seconds,ms]);
	};

	my["_onPFBinDataReady"] = function (data)
	{	
		console.log ("_onPFBinDataReady");
		var parse_time = new Date ();
		if ( my["start_time"] instanceof Date )
		{
			console.log (["parsed PDF in ",my["elapsedTimeToString"] (parse_time - my["start_time"])].join (""));
		}
		else
		{
			console.log ("start_time not found");
		}
		
		for (var k in data["data"]["Pages"])
		{
			my["node_modules"]["fs"].writeFile (["output/", k, ".json"].join (""), JSON.stringifyCircular (data["PDFJS"]["pages"][k]), my["maybe_log_error"])
		};
		
		var write_time = new Date ();
		console.log (["logged parsed PDF data to disk in ",my["elapsedTimeToString"] (write_time - parse_time)].join (""));

		my["callback"] (null, my["root_node"], data["data"]);
	};

	my["_onPFBinDataError"] = function (data)
	{
		if ( data.hasOwnProperty ("data") )
		{
			my["callback"] (data["data"],null);
		}
		else
		{
			console.log ("_onPFBinDataError: "+my["node_modules"]["util"].inspect (data));
			my["callback"] ("_onPFBinDataError",null);
		}
	};
	
	my["pdfParser"].on("pdfParser_dataReady", my["node_modules"]["_"].bind(my["_onPFBinDataReady"], my["self"]));
	my["pdfParser"].on("pdfParser_dataError", my["node_modules"]["_"].bind(my["_onPFBinDataError"], my["self"]));

	var that = function (root_node, _)
	{
		console.log ("called extraction");
		//console.log ("root_node: "+root_node);
		//console.log ("callback: "+_);
		//console.log ("pdfFilePath: '"+my["pdfFilePath"]+"'");
		my["start_time"] = new Date ();
		my["root_node"] = root_node;
		my["callback"] = _;
		my["pdfParser"].loadPDF (my["pdfFilePath"]);
	};
	return that;
} ();
};

module.exports = Extraction;
