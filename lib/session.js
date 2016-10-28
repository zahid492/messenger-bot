'use strict';


const cfg = require('./config.js');

// Maximum session duration is 30 min - should be enough to find a place to go
const SESSION_DURATION = 1800000;

// Before using this script, you need to create the four_sessions table on DynamoDB.
// This can be done in AWS console, or in prompt:
/*
aws dynamodb create-table --table-name four_sessions \
  --attribute-definitions AttributeName=user_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
  --query TableDescription.TableArn --output text
*/
const TABLE_NAME = 'four_sessions';


var session = function(obj) {
	if (obj instanceof session) return obj;
	if (!(this instanceof session)) return new session(obj);
	this._session = obj;
};


session.getSession = function(userId, request) {
	var params = {
		TableName: TABLE_NAME,
		Key: {
			"user_id": "" + userId
		}
	};
	return dynamoDb.get(params).promise().then(function(response) {
		var newSess = {};
		if (typeof response.Item !== 'undefined') {
			newSess = response.Item;
			var fnow = new Date().getTime();
			// If session is older than SESSION_DURATION, treat it as a new session
			if (fnow - newSess.last_seen > SESSION_DURATION) {
				newSess = session.newSession(userId);
				newSess.is_new = true;
			} else {
				newSess.last_seen = fnow;
				newSess.is_new = false;
			}
		} else {
			// No session found
			newSess = session.newSession(userId);
			newSess.is_new = true;
		}
		session.saveSession(newSess);

		return {
			"sessObj": newSess,
			"req": request
		};
	}, function(reason) {
		// handle error that occured because of reason...
	});
};

session.saveSession = function(sessObj) {
	var params = {
		TableName: TABLE_NAME,
		Item: sessObj
	};
	dynamoDb.put(params, function(err, data) {
		// Nothing smart here, really...			
	});
};

session.newSession = function(userId) {
	var nowis = new Date().getTime();
	return {
		"cate": "trending",
		"last_seen": nowis,
		"loc": "null",
		"is_new": false,
		"offset": {
			"coffee": 0,
			"drinks": 0,
			"food": 0,
			"outdoors": 0,
			"shops": 0,
			"sights": 0,
			"specials": 1,
			"topPicks": 0,
			"trending": 0
		},
		"user_id": "" + userId
	}
}

module.exports = session;