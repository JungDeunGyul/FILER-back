function removeJoinRequest(team, userId) {
  team.joinRequests = team.joinRequests.filter(
    (request) => !request.user.equals(userId),
  );
}

module.exports = removeJoinRequest;
