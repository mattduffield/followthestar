// What the wise men say when clicked as they stand about in the evening, each in his own voice (made by
// docs/sound/sayings.py with Chatterbox into audio/voice-N-say-PLACE-I.mp3; edit a line here and run it again).
// 1 the crimson king (gold), 2 the blue king (frankincense, the eldest), 3 the green king (myrrh).
//   fire   at the fire on the way to Bethlehem      road   at the fire on the way home
//   herod  at Herod's palace in Jerusalem            christmas   kneeling at the manger      home   home again
//   rest   home in the East through the year (January 7 to September 30)      easter   Easter morning at home
var KING_SAYINGS = {
	1: {
		fire: ['The Star has never led us wrong.', 'Rest well, my friends. Tomorrow we ride again.', 'Look how bright it shines tonight.',
			'A King is born. We must not be late.', 'I counted the miles today. I stopped at a thousand.'],
		road: ['I still see his face, every time I close my eyes.', 'We came looking for a king, and we found one.', 'The road home feels shorter, somehow.'],
		herod: ['Where is he that is born King of the Jews?', 'Herod smiles, but his eyes do not.'],
		christmas: ['Gold, for a King.', 'All this way... and here he is.'],
		home: ['Home at last.', 'Nothing will ever be the same.'],
		easter: ['He is risen!', 'The King we found as a baby has conquered death.'],
		rest: ['I still have the Star map we drew. Shall we go again?', 'Every night I look east and remember.', 'The camels are rested and strong.', 'Come October, we ride.']
	},
	2: {
		fire: ['In all my years, I have never seen a star like this.', 'My old bones feel every mile.', 'The prophets spoke of this.',
			'Patience. The Star knows the way.', 'Come closer to the fire, brothers. The night is cold.'],
		road: ['We have seen him. That is enough for an old man.', 'We go home another way, as the angel warned us.', 'Glory to God for all we have seen.'],
		herod: ['I do not trust this king Herod.', 'Bethlehem, the scribes say. The Star agrees.'],
		christmas: ['Frankincense, for the one we have come to worship.', 'Glory to God in the highest.'],
		home: ['The Lord has kept us, going out and coming in.', 'I can rest now. I have seen him.'],
		easter: ['The tomb is empty, just as he said.', 'Glory to God! He is alive.'],
		rest: ['The heavens declare the glory of God.', 'Watch the sky with me, little one.', 'I have written it all down, so no one forgets.', 'Old as I am, I would go again.']
	},
	3: {
		fire: ['Each night, Bethlehem draws a little nearer.', 'The camels are tired, but they will not give up.', 'I wonder what kind of King he will be.',
			'The desert is quiet tonight.', 'Sleep now. The Star will wait for us.'],
		road: ['Every mile was worth it.', 'Did you see how his mother smiled?', 'I will tell my children of this night.'],
		herod: ['We saw his star in the East, and have come to worship him.', 'We must not tarry long in this palace.'],
		christmas: ['Myrrh, a gift from far away.', 'We have come to worship him.'],
		home: ['What a journey that was, my friends.', 'I will never forget the Star.'],
		easter: ['Death could not hold him.', 'He is risen indeed!'],
		rest: ['I tell the children about the baby King every night.', 'Look, Orion is rising.', 'I wonder how he is growing.', 'One day, we will see the Star again.']
	}
};
