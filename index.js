/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.on('pull_request.opened', async context => {
    const pullRequest = context.payload.pull_request;
    const branchName = pullRequest.head.ref;
    const issueNumber = parseInt(branchName);

    if (isNaN(issueNumber)) {
      app.log(`branch: ${branchName} does not contain a valid number`);
      return;
    }

    const pullRequestNumber = parseInt(pullRequest.number);
    const owner = context.payload.repository.owner.login;
    const repo = context.payload.repository.name;

    let eventsRes;

    try {
      eventsRes = await context.github.issues.listEventsForTimeline({
        owner,
        repo,
        number: issueNumber,
      });
    } catch (err) {
      // usually we will get an error if the number in the pull request doesn't match an existing issue
      app.log('Invalid response received. Terminating.');
      return;
    }

    if (eventsRes.status !== 200) {
      app.log('Invalid response code received. Terminating.');
      return;
    }

    const isCrossReferenced = e =>
      e.event === 'cross-referenced' &&
      e.source &&
      e.source.type === 'issue' &&
      parseInt(e.source.issue.number) === pullRequestNumber;

    const hasBeenReferenced = eventsRes.data.some(isCrossReferenced);

    if (!hasBeenReferenced) {
      const issueComment = context.issue({
        body: `We added a reference to issue #${issueNumber} based off your feature branch naming convention.`,
      });
      return context.github.issues.createComment(issueComment);
    }
  });
};
