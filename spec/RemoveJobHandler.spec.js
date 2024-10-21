const testUtils = require("fruster-test-utils");
const bus = require("fruster-bus");

const constants = require("../constants");
const fixtures = require("./support/fixtures");
const specConstants = require("./support/spec-constants");
const errors = require("../lib/errors");

describe("RemoveJobHandler", () => {
	testUtils.startBeforeEach(
		specConstants.testUtilsOptions(async ({ db }) => {
			try {
				await db
					.collection(constants.collections.invocations)
					.deleteMany({});
				await db.collection(constants.collections.jobs).deleteMany({});
			} catch (err) {
				console.error(err);
			}
		})
	);

	it("should fail validation job", async () => {
		try {
			await bus.request(constants.exposing.removeJob, {
				reqId: "reqId",
				data: {},
			});
			fail();
		} catch (err) {
			expect(err.status).toBe(400);
			expect(err.error.code).toBe(errors.badRequest().error.code);
		}
	});

	it("should fail to remove job that does not exist", async () => {
		try {
			await bus.request(constants.exposing.removeJob, {
				reqId: "reqId",
				data: {
					id: "foooo",
				},
			});

			fail();
		} catch (err) {
			expect(err.error.code).toBe(errors.notFound().error.code);
		}
	});

	it("should remove a job", async () => {
		const jobReq = fixtures.jobReq();
		const removeJobReq = fixtures.removeJobReq({
			id: jobReq.data.id,
		});

		await bus.request(constants.exposing.createJob, jobReq);
		const resp = await bus.request(
			constants.exposing.removeJob,
			removeJobReq
		);

		expect(resp.status).toBe(200);
		expect(resp.data.id).toBe(jobReq.data.id);
		expect(resp.data.subject).toBe(jobReq.data.subject);
		expect(resp.data.cron).toBe(jobReq.data.cron);
	});
});
