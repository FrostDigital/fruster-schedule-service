const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus").testBus;
const constants = require("../constants");
const fixtures = require("./support/fixtures");
const specConstants = require("./support/spec-constants");
const errors = require("../lib/errors");

describe("CreateJobHandler", () => {

	testUtils.startBeforeEach(specConstants.testUtilsOptions());

	it("should fail validation", async () => {
		try {
			await bus.request({
				subject: constants.exposing.createJob,
				message: {
					data: {}
				}
			});
		} catch (err) {
			expect(err.status).toBe(400);
			expect(err.error.code).toBe(errors.badRequest().error.code);
		}
	});

	it("should create a job", async () => {
		const jobReq = fixtures.jobReq();

		const publishMock = testUtils.mockService({
			subject: constants.publishing.jobCreated,
			response: { status: 200 }
		});

		const { status, data } = await bus.request({
			subject: constants.exposing.createJob,
			message: jobReq
		});

		expect(status).toBe(200);
		expect(data.id).toBe(jobReq.data.id);
		expect(data.subject).toBe(jobReq.data.subject);
		expect(data.cron).toBe(jobReq.data.cron);
		expect(publishMock.requests[0].data.id).toBe(jobReq.data.id);
	});

});
