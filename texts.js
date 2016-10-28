
'use strict';
/*
These are some replies that bot will randomly select in various occassions.
If you wan't to be funny, and give your bot a 'personality', this is the place to do so.
*/

module.exports = {
	'welcome': [
		"I can help you find some cool places that are near you.\nWhenever you type in something I will assume you are giving me a new address to start searching.",
		"I will show you some cool places near you.\nYou can type type in your address, ZIP, or nearby place at any time and I'll do the search."
	],
	'location': [
		"Awesome! What would you like to see?",
		"Thanks! What would you like to explore?",
		"Got you! What are you intersted in?",
		"Thanks! What would you like to explore?"
	],
	'geolocation1': [
		"Awesome! Here is where I think you are:",
		"Thanks! I beleive you are here:",
		"Got you! I figured out that you are here:",
		"Thanks! According to my records, you are here:"
	],
	'geolocation2': [
		"If I'm wrong, just type in another address.\nIf I'm right, select what would you like to see:",
		"If I'm not right, just type another address, ZIP, etc.\nIf I'm right, select what would you like to see:",
		"But, I'm just a machine - If I'm wrong, just type in another address.\nIf I'm right, select what would you like to see:",
		"You can alwayd type in another address if I'm wrong.\nWhat would you like to explore:"
	],
	'wrong1': [
		"Sorry - didn't get that!",
		"Duh - didn't get it!",
		"Ooops - couldn't figure out that.",
		"Server error 500!\nOK, just kidding - but I really don't understand this."
	],
	'wrong2': [
		"Please tell me again where you are - a name of the city, address, a zipcode or just tap on the location icon below.",
		"Let's try again: type in a name of the city, address, a zipcode or just tap on the location icon below. "
	],
	'noSpecials':[
		"Nothing speacial near you :(. Try something else.",
		"Could not find any special deal near you. How about the coffee, or something to eat instead?"
	],
	'farAway':[
		"This place is too far for walking from where you are.",
		"You can't get there by foot - it is too far away.",
		"Don't try to walk there - too far away."
	],
	'noReviews': [
		"No reviews for this place.",
		"Huh - seems like nobody had anything to say about this place.",
		"Not so many people commented about this place..."
	]
}

