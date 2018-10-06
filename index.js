var http = require('http');
var urlParser = require('url');
var createWebhookHandler = require('github-webhook-handler');
var updateTargetRepo = require('./lib/updateTargetRepo');
var webhookHandler = createWebhookHandler({ path: '/github-webhook', secret: process.env.GITHUB_HOOK_SECRET });
var port = process.env.PORT || 8080;

http.createServer(function (req, res) {
    webhookHandler(req, res, function () {
        res.statusCode = 404;
        res.end('No such location');
    });
}).listen(port, function () {
    console.log('Server listening on port:', port);
});

webhookHandler.on('error', function (err) {
    console.error('Error:', err.message);
});

webhookHandler.on('push', function (e) {
    var parsedUrl = urlParser.parse(e.url, true);
    var targetRepoUrl = parsedUrl.query.targetRepoUrl;

    if (!targetRepoUrl) {
        throw new Error('Target repo url is mandatory!');
    }

    var ref = e.payload.ref;
    var sourceRepoUrl = e.payload.repository.ssh_url;

    updateTargetRepo(
        sourceRepoUrl,
        targetRepoUrl,
        process.env.SSH_PUBLIC_KEY,
        process.env.SSH_PRIVATE_KEY,
        process.env.SSH_KEY_PASSPHRASE,
        ref).catch(function (err) {
        console.log('Error syncing remote repo.')
    });
});
