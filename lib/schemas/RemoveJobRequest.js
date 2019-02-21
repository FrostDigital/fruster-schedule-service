module.exports = {
    id: "RemoveJobRequest",
    type: "object",
    description: "Request for creating a scheduled job",
    properties: {
        id: {
            type: "string",
            description: "Id of job to remove",
            default: "fruster-user-service.sync-birthdays"
        }
    },
    required: ["id"]
}