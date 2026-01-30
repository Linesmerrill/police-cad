# List of Mongo Indexes:

## Compound Indexes:

- db.civilians.createIndex({"civilian.firstName": "text", "civilian.lastName": "text"})
- db.vehicles.createIndex({"vehicle.plate": "text"})

### Community Collection Indexes:

- db.communities.createIndex({ "\_id": 1 });
- db.communities.createIndex({ "members": 1 });

### Users Collection

- db.users.createIndex({ "\_id": 1 });

### BOLOs Collection

- db.bolos.createIndex({ "communityId": 1, "departmentId": 1, "status": 1 });

### Calls Collection

- db.calls.createIndex({ "communityId": 1, "status": 1 });
