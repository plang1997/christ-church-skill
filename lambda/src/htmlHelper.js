'use strict';

// const fs = require('fs');
// const entities = require('html-entities').AllHtmlEntities;
const request = require('request');
// const striptags = require('striptags');
const constants = require('./constants');
const htmlparser = require('htmlparser2');

const htmlParser = function () {
    return {
        getHTML : function (fileName, callback) {
            let url = constants.contactsUrl;
            let outputText = '';
            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    //console.log(body) // Show the HTML for the Google homepage. 
                    let output = false;
                    let parser = new htmlparser.Parser({
                        onopentag: function(tagname, attribs){
                            if(tagname === "div" && attribs.class === "text-content editable text-1"){
                                output = true;
                            }
                        },
                        ontext: function(text){
                            if(output == true){
                                console.log(text);
                                outputText += text;
                            }
                        },
                        onclosetag: function(tagname){
                            if(tagname === "div") {
                                output = false;
                            }
                        }
                    }, {decodeEntities: true});
                    parser.write(body);
                    parser.end();
                    callback(null, body, outputText); 
                }
            });   
        }
    };
}();

module.exports = htmlParser;
