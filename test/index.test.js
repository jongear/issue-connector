const nock = require('nock');
const issueConnectorApp = require('..');
const { Probot } = require('probot');

nock.disableNetConnect();

describe('Issue Connector', () => {
  let probot;

  beforeEach(() => {
    probot = new Probot({});
    // Load our app into probot
    const app = probot.load(issueConnectorApp);

    // return a test token
    app.app = () => 'test';

    nock('https://api.github.com')
      .post('/app/installations/1/access_tokens')
      .reply(200, { token: 'test' });
  });

  describe('Given pull request has issue number in name', () => {
    describe('Given issue number exists', () => {
      describe('Given issue has a timeline', () => {
        test("creates a cross reference when finds that one hasn't been made yet", async () => {
          const payload = require('./fixtures/pullRequestPayload');
          const timelinePayload = require('./fixtures/timelineNoCrossReferencePayload');
          const expected = {
            body:
              'We added a reference to issue #1 based off your feature branch naming convention.',
          };

          nock('https://api.github.com')
            .get('/repos/jongear/tester/issues/1/timeline')
            .reply(200, timelinePayload);

          // Test that a comment is posted
          nock('https://api.github.com')
            .post('/repos/jongear/tester/issues/2/comments', actual => {
              expect(actual).toMatchObject(expected);
              return true;
            })
            .reply(200);

          await probot.receive({ name: 'pull_request', payload });
        });

        test('when only timeline event is a comment, creates a cross reference', async () => {
          const payload = require('./fixtures/pullRequestPayload');
          const timelinePayload = require('./fixtures/timelineCommentPayload');
          const expected = {
            body:
              'We added a reference to issue #1 based off your feature branch naming convention.',
          };

          nock('https://api.github.com')
            .get('/repos/jongear/tester/issues/1/timeline')
            .reply(200, timelinePayload);

          // Test that a comment is posted
          nock('https://api.github.com')
            .post('/repos/jongear/tester/issues/2/comments', actual => {
              expect(actual).toMatchObject(expected);
              return true;
            })
            .reply(200);

          await probot.receive({ name: 'pull_request', payload });
        });
      });

      test('does not creates a cross reference if finds that one was already made', async () => {
        const payload = require('./fixtures/pullRequestPayload');
        const timelinePayload = require('./fixtures/timelinePayload');

        nock('https://api.github.com')
          .get('/repos/jongear/tester/issues/1/timeline')
          .reply(200, timelinePayload);

        // Test that a comment is posted
        const scope = nock('https://api.github.com')
          .post('/repos/jongear/tester/issues/2/comments')
          .reply(200);

        await probot.receive({ name: 'pull_request', payload });

        expect(scope.isDone()).toBeFalsy(); //scope will be false if the call was never made
      });
    });

    describe('Given issue number that does not exist', () => {
      test('does not creates a cross reference', async () => {
        const payload = require('./fixtures/pullRequestPayload');

        nock('https://api.github.com')
          .get('/repos/jongear/tester/issues/1/timeline')
          .reply(404);

        // Test that a comment is posted
        const scope = nock('https://api.github.com')
          .post('/repos/jongear/tester/issues/2/comments')
          .reply(200);

        await probot.receive({ name: 'pull_request', payload });

        expect(scope.isDone()).toBeFalsy(); //scope will be false if the call was never made
      });
    });
  });

  describe('Given pull request does not have issue number in name', () => {
    test('does not call timeline', async () => {
      const payload = require('./fixtures/pullRequestInvalidPayload');

      const scope = nock('https://api.github.com')
        .get('/repos/jongear/tester/issues/1/timeline')
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });

      expect(scope.isDone()).toBeFalsy(); //scope will be false if the call was never made
    });

    test('does not post comment', async () => {
      const payload = require('./fixtures/pullRequestInvalidPayload');

      // Test that a comment is posted
      const scope = nock('https://api.github.com')
        .post('/repos/jongear/tester/issues/2/comments')
        .reply(200);

      await probot.receive({ name: 'pull_request', payload });

      expect(scope.isDone()).toBeFalsy(); //scope will be false if the call was never made
    });
  });
});
