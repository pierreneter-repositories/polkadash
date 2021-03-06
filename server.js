var express = require('express')
var serveBonds = require('./ws').serveBonds
let {Polkadot, bytesToHex} = require('./polkadot.js')
let {Bond} = require('oo7')

let config = {};
try {
	config = JSON.parse(require('fs').readFileSync(__dirname + '/config.json', 'utf8'))
} catch (e) {
	console.log(`Error reading config.json: ${e}. Using defaults`)
}

var app = express()

let port = config.port || 3000;
let serveFiles = {
	'': 'index.html',
	'bundle.js': 'bundle.js',
	'styles.css': 'styles.css'
}

Object.keys(serveFiles).forEach(k =>
	app.get('/' + k, (req, res) => 
		res.sendFile(__dirname + '/client/dist/' + serveFiles[k])
	)
)
app.listen(port, function () {
	console.log(`Listening on port ${port}!`)
})

process.on('unhandledRejection', error => {
	// Will print "unhandledRejection err is not defined"
	console.log('unhandledRejection', error.message);
});

let polkadot = new Polkadot
serveBonds({
	height: polkadot.height,
	codeSize: polkadot.codeSize,
	codeHash: polkadot.codeHash.map(bytesToHex),
	authorities: polkadot.authorities
		.map(v => v.map(who => ({
			who,
			ownBalance: polkadot.staking.votingBalance(who),
			otherBalance: polkadot.staking.currentNominatedBalance(who)
		})), 2)
		.map(v => v
			.map(i => Object.assign({balance: i.ownBalance.add(i.otherBalance)}, i))
			.sort((a, b) => b.balance - a.balance)
		),
	/*nextThreeUp: polkadot.staking.intentions.map(
		l => ([polkadot.authorities, l.map(who => ({
			who, ownBalance: polkadot.staking.votingBalance(who), otherBalance: polkadot.staking.nominatedBalance(who)
		}) ) ]), 3
	).map(([c, l]) => l
		.map(i => Object.assign({balance: i.ownBalance.add(i.otherBalance)}, i))
		.sort((a, b) => b.balance - a.balance)
		.filter(i => !c.some(x => x+'' == i.a+''))
		.slice(0, 3)
	),*/
	now: polkadot.timestamp.now,
	blockPeriod: polkadot.timestamp.blockPeriod,
	validatorLimit: polkadot.authorities.map(who =>
		polkadot.staking.currentStakingBalance(who[who.length - 1])
	),

	sessionBlocksRemaining: polkadot.session.blocksRemaining,
	sessionLength: polkadot.session.length,
	percentLate: polkadot.session.percentLate,
	brokenPercentLate: polkadot.session.brokenPercentLate,
	currentIndex: polkadot.session.currentIndex,
	currentStart: polkadot.session.currentStart,
	lastLengthChange: polkadot.session.lastLengthChange,

	sessionsPerEra: polkadot.staking.sessionsPerEra,
	currentEra: polkadot.staking.currentEra,
	eraBlocksRemaining: polkadot.staking.eraBlocksRemaining,
	eraSessionsRemaining: polkadot.staking.eraSessionsRemaining,
	eraLength: polkadot.staking.eraLength,
	nextValidators: polkadot.staking.nextValidators,

	proposed: polkadot.democracy.proposed,
	launchPeriod: polkadot.democracy.launchPeriod,
	minimumDeposit: polkadot.democracy.minimumDeposit,
	votingPeriod: polkadot.democracy.votingPeriod,
	activeReferenda: Bond.all([polkadot.democracy.active, polkadot.height])
		.map(([active, h]) =>
			active.map(i => Object.assign({ remaining: i.ends - h }, i)
		))
}, {
//	percentLate: 'value'
})