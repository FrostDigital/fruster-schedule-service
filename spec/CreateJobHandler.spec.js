const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");
const scheduleService = require("../schedule-service");
const constants = require("../constants");
const fixtures = require("./support/fixtures");

describe("CreateJobHandler", () => {

	testUtils.startBeforeAll({
		mongoUrl: "mongodb://localhost:27017/schedule-service-test",
		service: scheduleService,
		bus: bus,
		mockNats: true,
		afterStart: () => {
			return Promise.resolve();
		}
	});

	it("should fail validation", (done) => {
		bus.request(constants.exposing.createJob, {
			reqId: "reqId",
			data: {}
		})
			.catch(err => {
				expect(err.status).toBe(400);
				expect(err.error.code).toBe("BAD_REQUEST");

				done();
			});
	});

	it("should create a job", (done) => {
		const jobReq = fixtures.jobReq();

		const mockJobCreated = testUtils.mockService({
			subject: constants.publishing.jobCreated,
			response: {
				status: 200
			}
		});

		bus.request(constants.exposing.createJob, jobReq)
			.then(resp => {
				expect(resp.status).toBe(200);
				expect(resp.data.id).toBe(jobReq.data.id);
				expect(resp.data.subject).toBe(jobReq.data.subject);
				expect(resp.data.cron).toBe(jobReq.data.cron);
				expect(mockJobCreated.invocations).toBe(1);
				done();
			});
	});

});
