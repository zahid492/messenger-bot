'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const botBuilder = require('claudia-bot-builder');
const rp = require('minimal-request-promise');
const app = express()
const TEXTS = require('./texts.js');
const _ = require('underscore');

app.set('port', (process.env.PORT || 4041))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot')
})



const fbTemplate = botBuilder.fbTemplate;






//database connection
const mongoose = require('mongoose');
const dbconfig = require('./lib/config');

//////CONECTION FOR OPENSHIFT
mongoose.connect(dbconfig.options.uri); // connect to our database


// When successfully connected
mongoose.connection.on('connected', function() {
    console.log('Mongoose default connection open to ' + dbconfig.options.uri);
});

// If the connection throws an error
mongoose.connection.on('error', function(err) {
    console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
mongoose.connection.on('disconnected', function() {
    console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
    mongoose.connection.close(function() {
        console.log('Mongoose default connection disconnected through app termination');
        process.exit(0);
    });
});




const quickLocation = {
	"text": "Tell me where you are now - a name of the city, address, a zipcode or just tap on the location icon below.",
	"quick_replies": [{
		"content_type": "location"
	}]
};


const mainMenu =
	new fbTemplate.Generic()
	.addBubble("Food", "Cool places to eat")
	.addButton('Food', 'food')
	.addBubble("Drink", "Cool places to drink")
	.addButton('Drinks', 'drinks')
	.addBubble("Coffee", "A perfect cup of coffee")
	.addButton('Coffee', 'coffee')
	.addBubble("Specials", "Save $ on special offers")
	.addButton('Specials', 'specials')
	.addBubble("Trending", "Latest coolness")
	.addButton('Trending', 'trending')
	.addBubble("Top Picks", "Feeling lucky?")
	.addButton('Top Picks', 'topPicks')
	.addBubble("Shops", "Spend some money")
	.addButton('Shops', 'shops')
	.addBubble("Outdoors", "Have fun outside")
	.addButton('Outdoors', 'outdoors')
	.addBubble("Sights", "Stay stunned")
	.addButton('Sights', 'sights')
	.get();

// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.PAGE_ACCESS_TOKEN
const token = "EAAC3EdKuMoUBAHuMeYqMrqpkXBVCojEvL7yZB1KEfPZCkNrFLPlZAS7JOBNFho5dzCIjPXfRJOENUdnebM5zzZAEdADqCkZCwfODwTJkfzobA3KlU0ecvwHtdy6iQlLqgshZCwhgFUP6oleQCoZCNC7xajHzb8LOyMxeCFNrwqmJgZDZD";

function welcomeMessage(senderFBId,callback) {
	return getFBInfo(senderFBId).then(user => {
		console.log({user:user});
		callback(
			`Hi ${user.first_name}, welcome to Place Explorer!`,
			_.sample(TEXTS.welcome),
			quickLocation
		);
	});
}

// Get the Facebook info of user we are talking to
function getFBInfo(fbUserId) {
	console.log({fbUserId:fbUserId});
	return rp({
			method: 'GET',
			hostname: 'graph.facebook.com',
			path: `/v2.6/${fbUserId}?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=` + token,
			port: 443
		})
		.then(response => {
			return JSON.parse(response.body);
		}).catch((error) => {
            return JSON.parse(error);
      });
}
// for facebook verification
app.get('/webhook/', function (req, res) {

	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge'])
	}else{
	res.send('Error, wrong token')
    }
})

// to post data
app.post('/webhook/', function (req, res) {

	let messaging_events = req.body.entry[0].messaging
	console.log(JSON.stringify(messaging_events));
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]

		let sender = event.sender.id
		console.log({'sender':sender})
		if (event.message && event.message.text) {
			let text = event.message.text
			if (text === 'Generic') {
				sendGenericMessage(sender)
				continue
			}

            //console.log({Welcome:JSON.stringify(welcomeMessage(sender))});
			welcomeMessage(sender,function(data) {
				// body...
				console.log({data:data});
				sendTextMessage(sender,data);
			});
			
		}
		if (event.postback) {
			let text = JSON.stringify(event.postback)
			sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
			continue
		}
	}
	res.sendStatus(200)
})



function sendTextMessage(recipientId, text) {

/*  var messageData = {
    recipient: {
      id: recipientId
    },
   message: {
	"text": "Tell me where you are now - a name of the city, address, a zipcode or just tap on the location icon below.",
	"quick_replies": [{
		"content_type": "location",
		"payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_LOCATION"
	}]
    }
  };  */

	let messageData = { 
		text:text 
	}

  console.log(messageData);
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:recipientId},
			message: messageData,
		}}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s", 
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s", 
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });  
}

function sendGenericMessage(sender) {
	let messageData = {
		"attachment": {
			"type": "template",
			"payload": {
				"template_type": "generic",
				"elements": [{
					"title": "First card",
					"subtitle": "Element #1 of an hscroll",
					"image_url": "http://messengerdemo.parseapp.com/img/rift.png",
					"buttons": [{
						"type": "web_url",
						"url": "https://www.messenger.com",
						"title": "web url"
					}, {
						"type": "postback",
						"title": "Postback",
						"payload": "Payload for first element in a generic bubble",
					}],
				}, {
					"title": "Second card",
					"subtitle": "Element #2 of an hscroll",
					"image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
					"buttons": [{
						"type": "postback",
						"title": "Postback",
						"payload": "Payload for second element in a generic bubble",
					}],
				}]
			}
		}
	}
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: {access_token:token},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
			console.log('Error sending messages: ', error)
		} else if (response.body.error) {
			console.log('Error: ', response.body.error)
		}
	})
}

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
