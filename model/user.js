var mongoose = require('mongoose');

var Schema = mongoose.Schema;




var UserSchema = new Schema({
	psid: { type: String},
    first_name:{ type: String},
	last_name: { type: String},
	phone_number:{ type: String,unique:true},
	address:{ type:String},
});





module.exports = mongoose.model('User', UserSchema);