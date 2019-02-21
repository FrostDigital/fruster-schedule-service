const mongo = require("mongodb");
const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const scheduleService = require("../schedule-service");
const constants = require("../constants");
const fixtures = require("./support/fixtures");

describe("RemoveJobHandler", () => {

	testUtils.startBeforeAll({
		mongoUrl: "mongodb://localhost:27017/schedule-service-test",
		service: scheduleService,
		bus: bus,
		mockNats: true,
		afterStart: (connection) => {
			return Promise.resolve();
		}
	});

	it("should fail validation job", (done) => {
		bus.request(constants.exposing.removeJob, {
			reqId: "reqId",
			data: {}
		})
			.catch(err => {
				expect(err.status).toBe(400);
				expect(err.error.code).toBe("BAD_REQUEST");

				done();
			});
	});

	it("should fail to remove job that does not exist", (done) => {
		bus.request(constants.exposing.removeJob, {
			reqId: "reqId",
			data: {
				id: "foooo"
			}
		})
			.catch(err => {
				expect(err).toBeError("NOT_FOUND");
				done();
			});
	});

	it("should remove a job", (done) => {
		const jobReq = fixtures.jobReq();
		const removeJobReq = fixtures.removeJobReq({
			id: jobReq.data.id
		});

		bus.request(constants.exposing.createJob, jobReq)
			.then(() => bus.request(constants.exposing.removeJob, jobReq))
			.then(resp => {
				expect(resp.status).toBe(200);
				expect(resp.data.id).toBe(jobReq.data.id);
				expect(resp.data.subject).toBe(jobReq.data.subject);
				expect(resp.data.cron).toBe(jobReq.data.cron);
				done();
			});
	});

});
