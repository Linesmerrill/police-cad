var mongoose = require('mongoose');

// Read-only Mongoose handle on the `communities` collection. The schema is
// intentionally minimal — the canonical Go API owns the full community shape
// (roles, tenCodes, fines, penalCodes, departments, etc.). The legacy
// createCommunity / createPoliceCommunity / createEmsCommunity methods that
// used to live here produced permission-less docs and have been removed;
// website routes now proxy to POST /api/v1/community instead.
var communitySchema = mongoose.Schema({
  community: {
    name: String,
    ownerID: String,
    code: String,
    activePanics: Map,
    activeSignal100: Boolean,
    activeHoldTraffic: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
});

module.exports = mongoose.model('Community', communitySchema);
