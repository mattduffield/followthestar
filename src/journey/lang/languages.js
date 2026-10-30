// The languages The Journey is in. "ready": shown to visitors (the language switch, and search engines). A language
// that isn't ready yet can still be opened at its address to check it (and shows in the switch in test mode). "ask" and
// "yes": the one-time suggestion to someone whose browser is set to that language. Add a language: docs/journey-lang.py.
var JOURNEY_LANGUAGES = [
	{"code": "en", "name": "English", "word": "Language", "locale": "en-US", "href": "/journey/", "ready": true, "ask": "See The Journey in English?", "yes": "Yes"},
	{"code": "es", "name": "Español", "word": "Idioma", "locale": "es-US", "href": "/es/journey/", "ready": true, "ask": "¿Ver El Viaje en español?", "yes": "Sí"},
	{"code": "ru", "name": "Русский", "word": "Язык", "locale": "ru-RU", "href": "/ru/journey/", "ready": true, "ask": "Открыть «Путешествие» на русском?", "yes": "Да", "css": "/assets/css/lang-ru.css"}
];
