var mongoose = require('mongoose');

var Schema = mongoose.Schema;




var SessionSchema = new Schema({
	
	user_id: { type: String, required: true},
	pickup_coordinates: {
	        type: [Number],   // format will be [ <longitude> , <latitude> ]
            index: '2d'       // create the geospatial index},
        },
    destination_coordinates:{
    		type: [Number],   // format will be [ <longitude> , <latitude> ]
            index: '2d'       // create the geospatial index},
    },
    pickup_location: { type: String},
	destination_location: { type: String},
	schedule:{ type: Date},
	is_new:{ type: Boolean, default: true},
	last_seen: { type: Date, default: Date.now },
	createDate: { type: Date, default: Date.now }

});





module.exports = mongoose.model('Session', SessionSchema);