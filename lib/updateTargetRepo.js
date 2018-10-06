var path = require('path');
var rimraf = require('rimraf');
var Git = require('nodegit');
var Promise = require('bluebird');
var mkdirp = require('mkdirp');
var getUniqueID = require('./getUniqueID');
var mkdir = Promise.promisify(mkdirp);
var rmdir = Promise.promisify(rimraf);
var tmpProjectDir = path.resolve(__dirname, '../projects');

module.exports = function updateTargetRepo(
    sourceRepoUrl,
    targetRepoUrl,
    sshPublicKey,
    sshPrivateKey,
    sshKeyPassphrase,
    ref
) {
    console.log('Starting sync process.',
        '\nsource:', sourceRepoUrl,
        '\ntarget:', targetRepoUrl,
        '\npublic key length:', sshPublicKey.length,
        '\nprivate key length:', sshPrivateKey.length,
        '\nssh key passphrase:', sshKeyPassphrase,
        '\nref:', ref
    );

    var repoId = getUniqueID();
    var repoDir = path.resolve(tmpProjectDir, repoId);
    var repo;
    var targetRemote;

    function getCredentials(url, userName) {
        return Git.Cred.sshKeyMemoryNew(
            userName,
            sshPublicKey,
            sshPrivateKey,
            sshKeyPassphrase || ''
        );
    }

    function certificateCheck() {
        return 1;
    }

    return mkdir(tmpProjectDir).then(function () {
        return Git.Clone(sourceRepoUrl, repoDir, {
            fetchOpts: {
                callbacks: {
                    certificateCheck: certificateCheck,
                    credentials: getCredentials
                }
            }
        }).then(function (repository) {
            console.log('Cloned.');
            repo = repository;
        });
    }).then(function () {
        return Git.Remote.create(repo, 'target', targetRepoUrl).then(function (remote) {
            console.log('Remote "target" added.');
            targetRemote = remote;
        });
    }).then(function () {
        return repo.getBranch(ref).then(function (reference) {
            return repo.checkoutRef(reference).then(function () {
                console.log('Checkout completed.');
            });
        });
    }).then(function () {
        return targetRemote.push(
            [ref + ':' + ref],
            {
                callbacks: {
                    certificateCheck: certificateCheck,
                    credentials: getCredentials
                }
            }
        ).then(function () {
            console.log('Pushed to remote "target".');
        });
    }).finally(function () {
        return rmdir(repoDir).then(function () {
            console.log('Temporary project removed.');
        }).catch(function (err) {
            console.log('Cannot remove temporary project:', err);
        });
    });
}
