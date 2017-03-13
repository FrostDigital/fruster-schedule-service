const uuid = require("uuid");

const entities = [
    "job",
    "fireOnceJob",
    "cronJob",
    "invocation"
];

entities.forEach(entity => {

    // Create method to get fixture for an entity, i.e. fixture.purchase()
    module.exports[entity] = (extend) => clone(eval(entity), extend);

    // Create method to get fixture wrapped in a req for an entity, i.e. fixture.purchaseReq()
    module.exports[`${entity}Req`] = (extend) => {
        return {
            reqId: uuid.v4(),
            data: clone(eval(entity), extend)
        };
    };
});

const job = {
    id: "send-daily-report",
    subject: "notification-service.send-report",
    cron: "0 0 * * * *"
};

const fireOnceJob = {
    id: "fire-once-job",
    subject: "foo-service.fire-once",
    at: "2017-03-11 08:38:47.213Z",
    state: "scheduled",
    data: "fireOnceJobData"
};

const cronJob = {
    id: "cron-job",
    subject: "foo-service.cron",
    cron: "0 0 * * * *",
    state: "scheduled",
    data: "cronJobData"
};

const invocation = {
    jobId: "cron-job",
    startTime: new Date(),
    endTime: new Date(),
    responseData: {},
    reqId: "d42105cc-6d66-43bf-884b-ccf022619550"
};


function clone(o, extend) {
    return Object.assign(JSON.parse(JSON.stringify(o)), extend);
}
