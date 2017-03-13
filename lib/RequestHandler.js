const errors = require("./errors");

class RequestHandler {

	constructor(validator) {
		if (new.target === RequestHandler) {
			throw "cannot instantiate RequestHandler";
		}		
		this._validator = validator;		
	}
	
	validate(req, validator = this._validator) {
		let validationRes = validator(req.data);

		if(!validationRes.valid) {
			errors.throw("BAD_REQUEST", validationRes.errors.map(err => err.message).join("\n"));
		}	
	}

	handle(req) {
		this.validate(req);
	}

}

module.exports = RequestHandler;