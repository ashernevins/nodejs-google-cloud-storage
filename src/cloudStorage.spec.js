/*jshint expr: true*/

if(!require("fs").existsSync("../config.js")) {
	
	var error = 'In order to run unit tests, create ' + require("path").dirname(__dirname) + '/config.js with this information: \n\nmodule.exports = {\n\t"storageBucket": 	"google-storage-bucket-name",\n\t"servicesEmail": 	"*******@developer.gserviceaccount.com",\n\t"privateKey": 		"/path/to/google-services.pem"\n};';;
	
	throw error;
}

var config = require("../config");
	
var rest = require("restler"),
	CloudStorage = require("./cloudStorage")(config.servicesEmail, config.storageBucket, config.privateKey),
	_ = require("underscore"),
	jade = require("jade"),
	
	chai = require("chai"),
	expect = chai.expect;

// Lets set our default acl

describe("CloudStorage", function() {
	
	var filePath = __dirname+"/test.txt",
		testKey = "test/test-"+Date.now()+".txt",
		testKey2 = "test/test-"+Date.now()+"-2.txt",
		testKey3 = "test/test-"+Date.now()+"-3.txt",
		testKey4 = "test/test-"+Date.now()+"-4.txt",
		testKey5 = "test/test-"+Date.now()+"-5.txt";
		
	before(function(done) {

		var callback = _.after(2, done);

		// Lets open up our cors so we don't get any errors uploading from the browser.
		CloudStorage.cors(jade.renderFile(__dirname+'/cors.jade', {}), callback);
		CloudStorage.defaultAcl("public-read",callback);
		
	})

	it("can check if a file exisits", function(done) {
		
		// Lets see if the file exists
		CloudStorage.exisits(testKey, function(exists) {
			expect(exists).to.be.false;
			done();
		});
		
	});
	
	it("can upload a file (as attachment) and confirm that its publicly accessible", function(done) {
	
		// Lets upload a file as attachment.
		CloudStorage.upload(filePath, testKey, true, null, function(success) {
			expect(success).to.be.true;
	
			// Lets confirm that the file is there
			CloudStorage.exisits(testKey, function(exists) {
				expect(exists).to.be.true;
	
				// Lets access this file via a public url
				rest.get(CloudStorage.getPublicUrl(testKey)).on("complete", function(data, res) {
					
					// Expect to see the text content
					expect(data).to.equal('Hello World');
					
					// Lets make sure this is set to download as an attachment
					expect(res.headers["content-disposition"]).to.equal('attachment; filename=test.txt');
	
					done();
	
				});
			});
		});		
	});
	
	it("can remove an existing file", function(done) {
		
		// Lets confirm the file exists
		CloudStorage.exisits(testKey, function(exists) {
			expect(exists).to.be.true;
			
			// Lets remove it.
			CloudStorage.remove(testKey, function() {
				
				// Lets make sure its gone.
				CloudStorage.exisits(testKey, function(exists) {
					expect(exists).to.be.false;
					done();
				});
				
			});
			
		});		
		
	});
	
	it("can make a file private and accessible with a private url", function(done) {
		
		this.timeout(5*1000);
		
		// Lets upload a brand new file to make sure nothing is cached.
		CloudStorage.upload(filePath, testKey2, true, null, function() {
		
			// Lets make it private.
			CloudStorage.makePrivate(testKey2, function() {
		
				// Lets confirm the file exists
				CloudStorage.exisits(testKey2, function(exists) {
					expect(exists).to.be.true;
			
					// Lets access this file via a public url
					rest.get(CloudStorage.getPublicUrl(testKey2)).on("complete", function(data, res) {
						expect(res.statusCode).to.equal(403);
	
						// Lets access via a private url
						rest.get(CloudStorage.getPrivateUrl(testKey2)).on("complete", function(data, res) {
							
							// Expect to see the text content
							expect(data).to.equal('Hello World');
							
							expect(res.statusCode).to.equal(200);
							done();
						});
	
					});
			
				});	
			
			});	
		
		});
		
	});
	
	it("can make a file private and then public again", function(done) {
		
		this.timeout(5*1000);
		
		// Lets upload a brand new file to make sure nothing is cached.
		CloudStorage.upload(filePath, testKey3, true, null, function() {
		
			// Lets make it private.
			CloudStorage.makePrivate(testKey3, function() {
				
				// Lets make it public.
				CloudStorage.makePublic(testKey3, function() {
			
					// Lets access this file via a public url
					rest.get(CloudStorage.getPublicUrl(testKey3)).on("complete", function(data, res) {
						
						// Expect to see the text content
						expect(data).to.equal('Hello World');
						
						expect(res.statusCode).to.equal(200);
						done();
					});
			
				});	
			
			});	
		
		});
		
	});
	
	
	it("can upload a file (as inline) and confirm that its publicly accessible and displayed as inline", function(done) {
	
		// Lets upload a file as attachment.
		CloudStorage.upload(filePath, testKey4, false, null, function(success) {
			expect(success).to.be.true;
	
			// Lets confirm that the file is there
			CloudStorage.exisits(testKey4, function(exists) {
				expect(exists).to.be.true;
	
				// Lets access this file via a public url
				rest.get(CloudStorage.getPublicUrl(testKey4)).on("complete", function(data, res) {
					
					// Lets make sure this is set to download as an attachment
					expect(res.headers["content-disposition"]).to.be.undefined;
	
					done();
	
				});
			});
		});		
	});
	
	it("can set custom x-goog-meta header", function(done) {
		
		this.timeout(5*1000);
	
		// Lets upload a file as attachment.
		CloudStorage.upload(filePath, testKey5, false, {example: 'this is some text'}, function(success) {
			expect(success).to.be.true;
	
			// Lets access this file via a public url
			rest.get(CloudStorage.getPublicUrl(testKey5)).on("complete", function(data, res) {
				
				// Expect to see the meta data in the header
				expect(res.headers['x-goog-meta-example']).to.equal('this is some text');
				
				var cleanup = _.after(4, function() { done() });
				
				CloudStorage.remove(testKey2, cleanup);
				CloudStorage.remove(testKey3, cleanup);
				CloudStorage.remove(testKey4, cleanup);
				CloudStorage.remove(testKey5, cleanup);

			});
			
		});		
	});
	
	
});