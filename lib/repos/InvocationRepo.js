const constants = require("../../constants");
const uuid = require("uuid");

class InvocationRepo {

	constructor(db) {
		this.collection = db.collection(constants.collections.invocations);        
	}	
    
    get(id) {
		return this.collection.findOne({id: id}, {_id: 0});
	}

	findAll() {
		return this.collection.find({}, { _id: 0}).toArray();
    }
    
	async create(jobId, invocation) {
        invocation.id = uuid.v4();
        invocation.jobId = jobId;

        await this.collection.insert(invocation);
        
        return invocation;
    }
    	
}

module.exports = InvocationRepo;
