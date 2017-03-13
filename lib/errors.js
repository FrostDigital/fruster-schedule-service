const frusterErrors = require("fruster-errors");

const errors = [
	{
		status: 400,
		code: "BAD_REQUEST",
		title: "Request body has missing or invalid fields",
		detail: (missingFields) => `Request body is missing required fields ${missingFields}`
	},
	{
		status: 404,
		code: "NOT_FOUND",
		title: "The requested resource does not exist"		
	}
];

module.exports = frusterErrors("schedule-service", errors);