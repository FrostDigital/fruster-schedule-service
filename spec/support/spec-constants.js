const bus = require("fruster-bus");
const service = require("../../schedule-service");

module.exports = {
	/**
	 * @param {Function=} afterStart
	 */
	testUtilsOptions: (afterStart) => {
		return {
			mockNats: true,
			bus,
			service,
			afterStart,
			mongoUrl: "mongodb://localhost:27017/fruster-schedule-service-test",
		};
	}
};
